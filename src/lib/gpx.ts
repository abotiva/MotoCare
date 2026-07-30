export type RouteTrack = {
  type: 'Feature'
  properties: { name?: string; source?: string }
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}

export type GpxAnalysis = {
  track: RouteTrack
  distanceKm: number
  elevationGainM: number | null
  durationMinutes: number | null
  pointCount: number
  suggestedLevel: 3 | 4 | 5
  suggestedCompatibility: string
  suggestedDescription: string
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

export function analyzeGpx(xml: string, source = 'archivo.gpx'): GpxAnalysis {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  if (document.querySelector('parsererror')) throw new Error('El archivo GPX no es XML válido.')

  const pointElements = Array.from(document.querySelectorAll('trkpt, rtept'))
  const track = parseGpx(xml, source)
  const elevations = pointElements
    .map((point) => Number(point.querySelector('ele')?.textContent))
    .filter(Number.isFinite)
  const timestamps = pointElements
    .map((point) => Date.parse(point.querySelector('time')?.textContent ?? ''))
    .filter(Number.isFinite)
  const distanceKm = trackDistanceKm(track)
  const elevationGainM = elevations.length >= 2
    ? Math.round(elevations.slice(1).reduce((gain, elevation, index) => (
        gain + Math.max(0, elevation - elevations[index])
      ), 0))
    : null
  const durationMinutes = timestamps.length >= 2
    ? Math.max(1, Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 60_000))
    : null
  const effortScore = distanceKm + (elevationGainM ?? 0) / 25
  const suggestedLevel: 3 | 4 | 5 = effortScore >= 280 ? 5 : effortScore >= 150 ? 4 : 3
  const suggestedCompatibility = suggestedLevel === 5
    ? 'Adventure o doble propósito; validar terreno y autonomía antes de publicar.'
    : suggestedLevel === 4
      ? 'Adventure, touring o doble propósito; ajustar según el tipo real de superficie.'
      : 'Touring, naked, scooter de alto cilindraje o adventure; confirmar el estado de la vía.'
  const routeName = track.properties.name || source.replace(/\.gpx$/i, '')
  const metrics = [
    `${distanceKm.toFixed(1)} km`,
    elevationGainM !== null ? `${elevationGainM.toLocaleString('es-CO')} m de ascenso acumulado` : null,
    durationMinutes !== null ? `${Math.floor(durationMinutes / 60)} h ${durationMinutes % 60} min registrados` : null,
  ].filter(Boolean).join(', ')

  return {
    track,
    distanceKm,
    elevationGainM,
    durationMinutes,
    pointCount: track.geometry.coordinates.length,
    suggestedLevel,
    suggestedCompatibility,
    suggestedDescription: `${routeName}: recorrido de ${metrics}. Revisa y completa la descripción con el terreno, clima, peajes y recomendaciones locales antes de publicarlo.`,
  }
}
