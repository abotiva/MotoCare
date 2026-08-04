export type PurchasedRouteSummary = {
  id: string
  title: string
  location: string
  distance: string
  terrain: string
}

export const premiumRouteSummaries: PurchasedRouteSummary[] = [
  { id: 'nevado-ruiz-adventure', title: 'Nevado del Ruiz Adventure', location: 'Manizales - Murillo - Líbano', distance: '168 km', terrain: 'Adventure' },
  { id: 'chicamocha-touring', title: 'Cañón del Chicamocha Touring', location: 'Bucaramanga - Barichara', distance: '236 km', terrain: 'Pavimento' },
  { id: 'alta-guajira-expedition', title: 'Alta Guajira Expedition', location: 'Riohacha - Punta Gallinas', distance: '392 km', terrain: 'Off-road' },
  { id: 'sierra-nevada-caribbean', title: 'Sierra Nevada Caribe', location: 'Santa Marta - Minca - San Lorenzo', distance: '124 km', terrain: 'Adventure' },
  { id: 'boyaca-lagunas', title: 'Circuito Lagunas de Boyacá', location: 'Tunja - Tota - Paipa', distance: '218 km', terrain: 'Pavimento' },
]
