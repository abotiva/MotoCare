export function defaultIntervalForMaintenance(title: string) {
  const normalizedTitle = title.toLowerCase()
  if (normalizedTitle.includes('aceite')) return 3000
  if (normalizedTitle.includes('freno')) return 8000
  if (normalizedTitle.includes('arrastre') || normalizedTitle.includes('cadena')) return 10000
  if (normalizedTitle.includes('llanta')) return 12000
  if (normalizedTitle.includes('revisión') || normalizedTitle.includes('revision')) return 5000
  return 3000
}
