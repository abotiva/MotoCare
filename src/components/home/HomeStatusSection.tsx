import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Gauge, History, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { MaintenanceRecord, Motorcycle, Reminder } from '@/types/database'

type StatusItem = { id: string; title: string; detail: string; urgent: boolean; icon: typeof Wrench }

function daysUntil(date: string | null) {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86_400_000)
}

function dateDetail(date: string) {
  const days = daysUntil(date) ?? 0
  if (days < 0) return `Vencido hace ${Math.abs(days)} días`
  if (days === 0) return 'Para hoy'
  return `En ${days} días`
}

function reminderDetail(reminder: Reminder, mileage: number) {
  if (reminder.due_mileage !== null) {
    const distance = reminder.due_mileage - mileage
    return distance <= 0 ? `Vencido por ${Math.abs(distance).toLocaleString('es-CO')} km` : `En ${distance.toLocaleString('es-CO')} km`
  }
  if (reminder.due_date) return dateDetail(reminder.due_date)
  return 'Sin fecha o kilometraje definido'
}

function reminderIcon(title: string) {
  const normalized = title.toLowerCase()
  if (normalized.includes('soat') || normalized.includes('tecnomec') || normalized.includes('document')) return FileText
  if (normalized.includes('kilometr')) return Gauge
  return Wrench
}

export function HomeStatusSection({ motorcycle, reminders, latestMaintenance }: { motorcycle: Motorcycle; reminders: Reminder[]; latestMaintenance: MaintenanceRecord | null }) {
  const reminderItems: StatusItem[] = reminders.map((reminder) => {
    const dateDays = daysUntil(reminder.due_date)
    return {
      id: reminder.id,
      title: reminder.title,
      detail: reminderDetail(reminder, motorcycle.mileage),
      urgent: (reminder.due_mileage !== null && reminder.due_mileage <= motorcycle.mileage) || (dateDays !== null && dateDays <= 30),
      icon: reminderIcon(reminder.title),
    }
  })
  const documentItems: StatusItem[] = []
  if (motorcycle.soat_expires_on) documentItems.push({ id: 'soat', title: 'SOAT', detail: dateDetail(motorcycle.soat_expires_on), urgent: (daysUntil(motorcycle.soat_expires_on) ?? 31) <= 30, icon: FileText })
  if (motorcycle.technical_review_expires_on) documentItems.push({ id: 'technical-review', title: 'Tecnomecánica', detail: dateDetail(motorcycle.technical_review_expires_on), urgent: (daysUntil(motorcycle.technical_review_expires_on) ?? 31) <= 30, icon: FileText })
  const seenTitles = new Set(reminderItems.map((item) => item.title.toLowerCase()))
  const items = [...reminderItems, ...documentItems.filter((item) => !seenTitles.has(item.title.toLowerCase()))].sort((a, b) => Number(b.urgent) - Number(a.urgent)).slice(0, 5)
  const urgentCount = items.filter((item) => item.urgent).length

  return <div className="space-y-5">
    <section aria-labelledby="motorcycle-status-title">
      <Card className={`border py-0 ${urgentCount > 0 ? 'border-amber-400/25 bg-amber-400/[0.07]' : 'border-moto-orange/25 bg-moto-orange/[0.07]'}`}><CardContent className="flex items-center gap-4 p-5 sm:p-6">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${urgentCount > 0 ? 'bg-amber-400/15 text-amber-300' : 'bg-moto-orange text-moto-darker'}`}>{urgentCount > 0 ? <AlertTriangle className="h-7 w-7" aria-hidden="true" /> : <CheckCircle2 className="h-7 w-7" aria-hidden="true" />}</div>
        <div className="min-w-0 flex-1"><p className="text-sm text-gray-400">Estado de tu moto</p><h2 id="motorcycle-status-title" className="mt-1 text-xl font-bold sm:text-2xl">{urgentCount > 0 ? `${urgentCount} ${urgentCount === 1 ? 'alerta requiere' : 'alertas requieren'} atención` : 'Todo bien con lo registrado'}</h2><p className="mt-1 text-xs leading-5 text-gray-400">{urgentCount > 0 ? 'Revisa los próximos elementos antes de volver a rodar.' : 'No hay vencimientos ni mantenimientos pendientes cercanos.'}</p></div>
      </CardContent></Card>
    </section>

    <section aria-labelledby="upcoming-title">
      <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-moto-orange">Lo que viene</p><h2 id="upcoming-title" className="mt-1 text-xl font-bold">Próximos elementos</h2></div><Link to="/app/my-bikes#reminders" className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-moto-orange hover:bg-moto-orange/10">Ver todos</Link></div>
      {items.length > 0 ? <div className="grid gap-3 sm:grid-cols-2">{items.map((item) => <Card key={item.id} className="border-white/10 bg-moto-gray py-0"><CardContent className="flex min-h-28 items-center gap-4 p-4">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.urgent ? 'bg-amber-400/15 text-amber-300' : 'bg-moto-orange/15 text-moto-orange'}`}><item.icon className="h-5 w-5" aria-hidden="true" /></div>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold">{item.title}</h3>{item.urgent && <Badge variant="outline" className="border-amber-300/25 text-[10px] text-amber-200">Atención</Badge>}</div><p className="mt-1 text-sm text-gray-400">{item.detail}</p></div>
      </CardContent></Card>)}</div> : <Card className="border-dashed border-white/15 bg-moto-gray/60 py-0"><CardContent className="p-5 sm:p-6"><div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-gray-400"><CalendarClock className="h-5 w-5" aria-hidden="true" /></div>
        <div><h3 className="font-semibold">Aún no hay próximos mantenimientos</h3><p className="mt-1 text-sm leading-6 text-gray-400">Cuando agregues un recordatorio o una fecha de documento, aparecerá aquí.</p><Link to="/app/my-bikes#reminders" className="mt-3 inline-flex text-sm font-semibold text-moto-orange hover:underline">Agregar un recordatorio</Link></div>
      </div></CardContent></Card>}
    </section>

    {latestMaintenance && <section aria-label="Último mantenimiento"><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm"><History className="h-5 w-5 shrink-0 text-moto-orange" aria-hidden="true" /><p className="min-w-0 text-gray-300">Último registro: <strong className="text-white">{latestMaintenance.service_type}</strong> <span className="whitespace-nowrap">· {latestMaintenance.service_date}</span></p></div></section>}
  </div>
}
