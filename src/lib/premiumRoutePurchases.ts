export type PurchasedRouteSummary = {
  id: string
  title: string
  location: string
  distance: string
  terrain: string
}

export const premiumRouteSummaries: PurchasedRouteSummary[] = [
  { id: 'nevado-ruiz-adventure', title: 'Nevado del Ruiz Adventure', location: 'Manizales - Murillo - Líbano', distance: '168 km', terrain: 'Adventure' },
  { id: 'pack-eje-cafetero', title: 'Pack Eje Cafetero', location: 'Salento, Filandia, Cocora y Buenavista', distance: '420 km', terrain: 'Touring' },
  { id: 'chicamocha-touring', title: 'Cañón del Chicamocha Touring', location: 'Bucaramanga - Barichara', distance: '236 km', terrain: 'Pavimento' },
  { id: 'alta-guajira-expedition', title: 'Alta Guajira Expedition', location: 'Riohacha - Punta Gallinas', distance: '392 km', terrain: 'Off-road' },
]

export const demoOwnedRouteIds = ['nevado-ruiz-adventure', 'pack-eje-cafetero']

function storageKey(userId?: string) {
  return `motocare:premium-routes:${userId || 'demo'}`
}

export function readOwnedRouteIds(userId?: string) {
  try {
    const stored = localStorage.getItem(storageKey(userId))
    return stored ? (JSON.parse(stored) as string[]) : demoOwnedRouteIds
  } catch {
    return demoOwnedRouteIds
  }
}

export function writeOwnedRouteIds(ids: string[], userId?: string) {
  localStorage.setItem(storageKey(userId), JSON.stringify(ids))
  window.dispatchEvent(new Event('motocare:premium-routes-updated'))
}
