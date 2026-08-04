import { useEffect, useMemo, useRef, useState } from 'react'
import { LocateFixed, MapPin, Square } from 'lucide-react'
import type { RouteTrack } from '@/lib/gpx'

const EMPTY_CENTER = { lat: 4.711, lng: -74.0721 }
const googleMapsApiKey = (
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  || import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY
) as string | undefined
const googleMapsEmbedKey = (
  import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY
  || import.meta.env.VITE_GOOGLE_MAPS_API_KEY
) as string | undefined

type LatLng = { lat: number; lng: number }
type GoogleMapInstance = {
  fitBounds: (bounds: unknown, padding: number) => void
  panTo: (point: LatLng) => void
}
type MapElement = { setMap: (map: GoogleMapInstance | null) => void }

type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance
  Polyline: new (options: Record<string, unknown>) => MapElement
  Marker: new (options: Record<string, unknown>) => MapElement & { setPosition: (point: LatLng) => void }
  LatLngBounds: new () => { extend: (point: LatLng) => void }
}

declare global {
  interface Window {
    google?: { maps: GoogleMapsApi }
    __motocareGoogleMapsReady?: () => void
  }
}

let googleMapsPromise: Promise<GoogleMapsApi> | null = null

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (googleMapsPromise) return googleMapsPromise
  if (!googleMapsApiKey) return Promise.reject(new Error('Falta configurar la clave de Google Maps.'))

  googleMapsPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-motocare-google-maps]')
    window.__motocareGoogleMapsReady = () => {
      if (window.google?.maps) resolve(window.google.maps)
      else reject(new Error('Google Maps no respondió correctamente.'))
    }

    if (existingScript) {
      existingScript.addEventListener('error', () => reject(new Error('No pudimos cargar Google Maps.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.dataset.motocareGoogleMaps = 'true'
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&loading=async&callback=__motocareGoogleMapsReady&v=weekly&language=es&region=CO`
    script.addEventListener('error', () => {
      googleMapsPromise = null
      reject(new Error('No pudimos cargar Google Maps.'))
    }, { once: true })
    document.head.appendChild(script)
  })

  return googleMapsPromise
}

function directionsEmbedUrl(origin: string, destination: string) {
  if (!googleMapsEmbedKey) return null
  return `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(googleMapsEmbedKey)}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving`
}

function distanceKm(a: LatLng, b: LatLng) {
  const radians = (value: number) => value * Math.PI / 180
  const latitudeDelta = radians(b.lat - a.lat)
  const longitudeDelta = radians(b.lng - a.lng)
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function routeProgress(path: LatLng[], position: LatLng) {
  if (path.length < 2) return { nearestIndex: 0, progress: 0, distanceFromRouteKm: null }

  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY
  const cumulative = [0]
  for (let index = 0; index < path.length; index += 1) {
    const pointDistance = distanceKm(path[index], position)
    if (pointDistance < nearestDistance) {
      nearestDistance = pointDistance
      nearestIndex = index
    }
    if (index > 0) cumulative.push(cumulative[index - 1] + distanceKm(path[index - 1], path[index]))
  }

  const totalDistance = cumulative.at(-1) ?? 0
  return {
    nearestIndex,
    progress: totalDistance > 0 ? Math.min(100, Math.round((cumulative[nearestIndex] / totalDistance) * 100)) : 0,
    distanceFromRouteKm: nearestDistance,
  }
}

export function GpxMap({
  track,
  origin,
  destination,
  className = 'h-64',
}: {
  track: RouteTrack | null
  origin?: string | null
  destination?: string | null
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<GoogleMapInstance | null>(null)
  const mapsRef = useRef<GoogleMapsApi | null>(null)
  const positionMarkerRef = useRef<(MapElement & { setPosition: (point: LatLng) => void }) | null>(null)
  const completedLineRef = useRef<MapElement | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [distanceFromRouteKm, setDistanceFromRouteKm] = useState<number | null>(null)
  const hasTrack = Boolean(track?.geometry?.coordinates?.length && track.geometry.coordinates.length >= 2)
  const path = useMemo(() => (
    (track?.geometry.coordinates ?? []).map(([longitude, latitude]) => ({ lat: latitude, lng: longitude }))
  ), [track])
  const directionsUrl = !hasTrack && origin?.trim() && destination?.trim()
    ? directionsEmbedUrl(origin.trim(), destination.trim())
    : null

  useEffect(() => {
    if (!hasTrack && directionsUrl) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let routeLine: { setMap: (map: GoogleMapInstance | null) => void } | null = null

    const renderMap = async () => {
      try {
        setError(null)
        const maps = await loadGoogleMaps()
        if (cancelled) return

        const map = new maps.Map(container, {
          center: path[0] ?? EMPTY_CENTER,
          zoom: path.length ? 10 : 8,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
        })
        mapRef.current = map
        mapsRef.current = maps

        if (path.length < 2) return

        routeLine = new maps.Polyline({
          path,
          map,
          geodesic: true,
          strokeColor: '#f97316',
          strokeOpacity: 1,
          strokeWeight: 6,
        })

        const bounds = new maps.LatLngBounds()
        path.forEach((point) => bounds.extend(point))
        map.fitBounds(bounds, 44)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No pudimos mostrar Google Maps.')
        }
      }
    }

    void renderMap()

    return () => {
      cancelled = true
      mapRef.current = null
      mapsRef.current = null
      positionMarkerRef.current?.setMap(null)
      completedLineRef.current?.setMap(null)
      positionMarkerRef.current = null
      completedLineRef.current = null
      routeLine?.setMap(null)
      container.replaceChildren()
    }
  }, [directionsUrl, hasTrack, path])

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
  }, [])

  useEffect(() => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    watchIdRef.current = null
    setIsTracking(false)
    setProgress(null)
    setDistanceFromRouteKm(null)
    setLocationError(null)
  }, [track])

  const stopTracking = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    watchIdRef.current = null
    setIsTracking(false)
  }

  const startTracking = () => {
    if (!hasTrack) return
    if (!navigator.geolocation) {
      setLocationError('Este dispositivo no permite consultar la ubicación desde MotoCare.')
      return
    }

    setLocationError(null)
    setIsTracking(true)
    watchIdRef.current = navigator.geolocation.watchPosition((result) => {
      const position = { lat: result.coords.latitude, lng: result.coords.longitude }
      const routeState = routeProgress(path, position)
      setProgress(routeState.progress)
      setDistanceFromRouteKm(routeState.distanceFromRouteKm)

      const maps = mapsRef.current
      const map = mapRef.current
      if (!maps || !map) return
      if (!positionMarkerRef.current) {
        positionMarkerRef.current = new maps.Marker({
          map,
          position,
          title: 'Mi ubicación',
        })
      } else {
        positionMarkerRef.current.setPosition(position)
      }
      completedLineRef.current?.setMap(null)
      completedLineRef.current = new maps.Polyline({
        path: path.slice(0, routeState.nearestIndex + 1),
        map,
        geodesic: true,
        strokeColor: '#22c55e',
        strokeOpacity: 1,
        strokeWeight: 7,
      })
      map.panTo(position)
    }, (geolocationError) => {
      stopTracking()
      setLocationError(geolocationError.code === 1
        ? 'Permite el acceso a la ubicación para mostrar tu avance en MotoCare.'
        : 'No pudimos actualizar tu ubicación. Revisa el GPS y la conexión del celular.')
    }, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    })
  }

  if (directionsUrl) {
    return (
      <iframe
        title={`Ruta de ${origin} a ${destination}`}
        src={directionsUrl}
        className={`w-full rounded-xl border-0 ${className}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    )
  }

  if (!googleMapsApiKey) {
    return (
      <div className={`grid w-full place-items-center rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-400 ${className}`}>
        Configura `VITE_GOOGLE_MAPS_API_KEY` para mostrar el mapa y el trazado de la ruta.
      </div>
    )
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-xl ${className}`}>
      <div ref={containerRef} className="h-full w-full" aria-label="Mapa de Google con el trazado GPX" />
      {hasTrack && (
        <div className="absolute left-3 right-3 top-3 flex flex-col gap-2 sm:right-auto sm:max-w-xs">
          <div className="rounded-xl bg-moto-darker/95 p-3 text-xs text-gray-200 shadow-lg backdrop-blur">
            <p className="font-semibold text-white">Mapa informativo MotoCare</p>
            <p className="mt-1 text-gray-400">Para navegación paso a paso, abre el GPX con una aplicación externa.</p>
            {progress !== null && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <span><strong className="text-green-300">{progress}%</strong><br />avance estimado</span>
                <span><strong className={distanceFromRouteKm !== null && distanceFromRouteKm > 0.5 ? 'text-amber-300' : 'text-sky-300'}>{distanceFromRouteKm === null ? '—' : `${Math.round(distanceFromRouteKm * 1000)} m`}</strong><br />del trazado</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={isTracking ? stopTracking : startTracking}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-moto-darker/95 px-4 text-sm font-semibold text-white shadow-lg backdrop-blur hover:bg-moto-gray"
          >
            {isTracking ? <Square className="mr-2 h-4 w-4 text-red-300" /> : <LocateFixed className="mr-2 h-4 w-4 text-moto-orange" />}
            {isTracking ? 'Detener ubicación' : 'Mostrar mi ubicación'}
          </button>
          {distanceFromRouteKm !== null && distanceFromRouteKm > 0.5 && (
            <div className="rounded-lg bg-amber-950/95 p-3 text-xs text-amber-100 shadow-lg">
              <MapPin className="mr-1 inline h-4 w-4" /> Estás aproximadamente a {distanceFromRouteKm.toFixed(1)} km del trazado GPX.
            </div>
          )}
          {locationError && <div className="rounded-lg bg-red-950/95 p-3 text-xs text-red-100 shadow-lg">{locationError}</div>}
        </div>
      )}
      {!hasTrack && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-moto-darker/90 p-3 text-center text-xs text-gray-300">
          Define origen y destino o importa un GPX para visualizar la ruta.
        </div>
      )}
      {error && (
        <div className="absolute inset-x-3 bottom-3 rounded-lg bg-red-950/90 p-3 text-center text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  )
}
