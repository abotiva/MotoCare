const colombianNumber = new Intl.NumberFormat('es-CO')
const colombianDate = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatMileage(value: number) { return `${colombianNumber.format(value)} km` }
export function formatDate(value: string) { return colombianDate.format(new Date(`${value}T00:00:00`)).replace('.', '') }
export function daysUntil(value: string | null, now = new Date()) {
  if (!value) return null
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(`${value}T00:00:00`).getTime() - today.getTime()) / 86_400_000)
}
export function formatRelativeDate(value: string, now = new Date()) {
  const days = daysUntil(value, now) ?? 0
  if (days < 0) {
    const elapsed = Math.abs(days)
    return `Vencido hace ${elapsed} ${elapsed === 1 ? 'día' : 'días'}`
  }
  if (days === 0) return 'Para hoy'
  return `En ${days} días`
}
