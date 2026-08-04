const allowedMapHosts = [
  'google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'goo.gl',
  'waze.com',
  'www.waze.com',
  'openstreetmap.org',
  'www.openstreetmap.org',
]

export function normalizeMapUrl(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    const host = url.hostname.toLowerCase()
    return allowedMapHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)) ? url.toString() : null
  } catch {
    return null
  }
}

function validCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}

export function extractCoordinatesFromMapUrl(value: string | null | undefined) {
  const normalized = normalizeMapUrl(value)
  if (!normalized) return null
  const url = new URL(normalized)
  const decoded = decodeURIComponent(`${url.pathname}${url.search}${url.hash}`)
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&#](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /#map=\d+(?:\.\d+)?\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/i,
    /[?&#]mlat=(-?\d+(?:\.\d+)?).*?[?&#]mlon=(-?\d+(?:\.\d+)?)/i,
  ]
  for (const pattern of patterns) {
    const match = decoded.match(pattern)
    if (!match) continue
    const latitude = Number(match[1])
    const longitude = Number(match[2])
    if (validCoordinates(latitude, longitude)) return { latitude, longitude }
  }
  return null
}

