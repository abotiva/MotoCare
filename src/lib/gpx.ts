export type RouteTrack = {
  type: 'Feature'
  properties: { name?: string; source?: string }
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}

const EARTH_RADIUS_KM = 6371

function radians(value: number) {
  return (value * Math.PI) / 180
}

export function trackDistanceKm(track: RouteTrack) {
  return track.geometry.coordinates.slice(1).reduce((total, point, index) => {
    const previous = track.geometry.coordinates[index]
    const latDelta = radians(point[1] - previous[1])
    const lonDelta = radians(point[0] - previous[0])
    const a = Math.sin(latDelta / 2) ** 2
      + Math.cos(radians(previous[1])) * Math.cos(radians(point[1])) * Math.sin(lonDelta / 2) ** 2
    return total + EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }, 0)
}

export function parseGpx(xml: string, source = 'archivo.gpx'): RouteTrack {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  if (document.querySelector('parsererror')) throw new Error('El archivo GPX no es XML válido.')

  const points = Array.from(document.querySelectorAll('trkpt, rtept')).map((point) => {
    const latitude = Number(point.getAttribute('lat'))
    const longitude = Number(point.getAttribute('lon'))
    return [longitude, latitude] as [number, number]
  }).filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude))

  if (points.length < 2) throw new Error('El GPX debe contener al menos dos puntos de ruta.')

  return {
    type: 'Feature',
    properties: {
      name: document.querySelector('trk > name, rte > name')?.textContent?.trim() || source.replace(/\.gpx$/i, ''),
      source,
    },
    geometry: { type: 'LineString', coordinates: points },
  }
}
