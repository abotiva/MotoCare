import { useEffect, useRef, useState } from 'react'
import type { RouteTrack } from '@/lib/gpx'

const EMPTY_CENTER = { lat: 4.711, lng: -74.0721 }
const googleMapsApiKey = (
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  || import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY
) as string | undefined

type LatLng = { lat: number; lng: number }
type GoogleMapInstance = object

type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance
  Polyline: new (options: Record<string, unknown>) => { setMap: (map: GoogleMapInstance | null) => void }
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

export function GpxMap({ track, className = 'h-64' }: { track: RouteTrack | null; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let routeLine: { setMap: (map: GoogleMapInstance | null) => void } | null = null

    const renderMap = async () => {
      try {
        setError(null)
        const maps = await loadGoogleMaps()
        if (cancelled) return

        const path = (track?.geometry.coordinates ?? []).map(([longitude, latitude]) => ({
          lat: latitude,
          lng: longitude,
        }))
        const map = new maps.Map(container, {
          center: path[0] ?? EMPTY_CENTER,
          zoom: path.length ? 10 : 8,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
        })

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
        ;(map as GoogleMapInstance & { fitBounds: (value: unknown, padding: number) => void }).fitBounds(bounds, 44)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No pudimos mostrar Google Maps.')
        }
      }
    }

    void renderMap()

    return () => {
      cancelled = true
      routeLine?.setMap(null)
      container.replaceChildren()
    }
  }, [track])

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
      {error && (
        <div className="absolute inset-x-3 bottom-3 rounded-lg bg-red-950/90 p-3 text-center text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  )
}
