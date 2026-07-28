import type { Motorcycle, Reminder } from '@/types/database'

export type MotorcycleHealth = {
  level: 'healthy' | 'attention' | 'urgent'
  label: 'Al día' | 'Requiere atención' | 'Acción urgente'
  documentAlerts: Array<{ label: string; days: number }>
  overdueReminders: Reminder[]
  upcomingReminders: Reminder[]
  pendingCount: number
}

const DAY_MS = 86_400_000

export function daysUntil(date: string | null, now = new Date()) {
  if (!date) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const target = new Date(`${date}T00:00:00`).getTime()
  return Math.ceil((target - today) / DAY_MS)
}

export function getMotorcycleHealth(motorcycle: Motorcycle, reminders: Reminder[], now = new Date()): MotorcycleHealth {
  const pending = reminders.filter((reminder) => reminder.status === 'pending')
  const documentAlerts = [
    { label: 'SOAT', days: daysUntil(motorcycle.soat_expires_on, now) },
    { label: 'Revisión tecnomecánica', days: daysUntil(motorcycle.technical_review_expires_on, now) },
  ].filter((item): item is { label: string; days: number } => item.days !== null && item.days <= 30)

  const overdueReminders = pending.filter((reminder) => {
    const dueDays = daysUntil(reminder.due_date, now)
    const mileageRemaining = reminder.due_mileage === null ? null : reminder.due_mileage - motorcycle.mileage
    return (dueDays !== null && dueDays < 0) || (mileageRemaining !== null && mileageRemaining <= 0)
  })

  const upcomingReminders = pending.filter((reminder) => {
    const dueDays = daysUntil(reminder.due_date, now)
    const mileageRemaining = reminder.due_mileage === null ? null : reminder.due_mileage - motorcycle.mileage
    return (dueDays !== null && dueDays >= 0 && dueDays <= 15)
      || (mileageRemaining !== null && mileageRemaining > 0 && mileageRemaining <= 300)
  })

  const hasUrgentDocument = documentAlerts.some((document) => document.days < 0)
  const level = hasUrgentDocument || overdueReminders.length > 0
    ? 'urgent'
    : documentAlerts.length > 0 || upcomingReminders.length > 0
      ? 'attention'
      : 'healthy'

  return {
    level,
    label: level === 'urgent' ? 'Acción urgente' : level === 'attention' ? 'Requiere atención' : 'Al día',
    documentAlerts,
    overdueReminders,
    upcomingReminders,
    pendingCount: pending.length,
  }
}

export function formatShortDate(value: string | null) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}
