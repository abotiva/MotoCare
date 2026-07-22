import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { RouteTrack } from '@/lib/gpx'

const EMPTY_CENTER: [number, number] = [-74.0721, 4.711]

export function GpxMap({ track, className = 'h-64' }: { track: RouteTrack | null; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: track?.geometry.coordinates[0] ?? EMPTY_CENTER,
      zoom: track ? 10 : 8,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

    map.on('load', () => {
      if (!track) return
      map.addSource('gpx-track', { type: 'geojson', data: track })
      map.addLayer({
        id: 'gpx-track-outline', type: 'line', source: 'gpx-track',
        paint: { 'line-color': '#111827', 'line-width': 8, 'line-opacity': 0.75 },
      })
      map.addLayer({
        id: 'gpx-track', type: 'line', source: 'gpx-track',
        paint: { 'line-color': '#f97316', 'line-width': 5 },
      })

      const bounds = track.geometry.coordinates.reduce(
        (nextBounds, coordinate) => nextBounds.extend(coordinate),
        new maplibregl.LngLatBounds(track.geometry.coordinates[0], track.geometry.coordinates[0]),
      )
      map.fitBounds(bounds, { padding: 44, maxZoom: 15, duration: 0 })
    })

    return () => map.remove()
  }, [track])

  return <div ref={containerRef} className={`w-full ${className}`} aria-label="Visor del trazado GPX" />
}
