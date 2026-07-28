export type DateStatus = {
  days: number | null
  label: string
  tone: string
  state: 'missing' | 'expired' | 'upcoming' | 'valid'
}

export function daysUntil(date: string | null, now = new Date()) {
  if (!date) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const target = new Date(`${date}T00:00:00`).getTime()
  return Math.ceil((target - today) / 86_400_000)
}

export function dateStatus(date: string | null, warningDays = 30): DateStatus {
  const days = daysUntil(date)
  if (days === null) return { days, label: 'Sin fecha', tone: 'text-gray-400', state: 'missing' }
  if (days < 0) return { days, label: `Vencido hace ${Math.abs(days)} días`, tone: 'text-red-400', state: 'expired' }
  if (days <= warningDays) return { days, label: `Vence en ${days} días`, tone: 'text-yellow-400', state: 'upcoming' }
  return { days, label: `Vigente hasta ${date}`, tone: 'text-green-500', state: 'valid' }
}

export function dateDistanceInDays(from: string, to: string) {
  const fromTime = new Date(`${from}T00:00:00`).getTime()
  const toTime = new Date(`${to}T00:00:00`).getTime()
  return Math.max(0, Math.round(Math.abs(toTime - fromTime) / 86_400_000))
}
