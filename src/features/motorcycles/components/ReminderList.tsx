import { CalendarClock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dateStatus } from '@/features/motorcycles/utils/dateStatus'
import type { Motorcycle, Reminder } from '@/types/database'

type ReminderListProps = {
  reminders: Reminder[]
  motorcycle: Motorcycle
  onEdit: (reminder: Reminder) => void
  onCancel: (reminder: Reminder) => void
  onComplete: (reminder: Reminder) => void
}

export function ReminderList({ reminders, motorcycle, onEdit, onCancel, onComplete }: ReminderListProps) {
  if (reminders.length === 0) {
    return <div className="rounded-xl border border-white/5 bg-moto-darker p-5 text-center text-gray-400">No tienes pendientes para esta moto.</div>
  }

  return (
    <div className="space-y-3">
      {reminders.map((reminder) => {
        const mileageDelta = reminder.due_mileage === null ? null : reminder.due_mileage - motorcycle.mileage
        const status = dateStatus(reminder.due_date, 15)
        return (
          <article key={reminder.id} className="flex flex-col gap-3 rounded-xl bg-moto-darker p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-yellow-500/20">
                <CalendarClock className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="break-words font-medium">{reminder.title}</h3>
                <p className="text-sm text-gray-400">
                  {reminder.due_date ? `Fecha: ${reminder.due_date}` : 'Sin fecha'}
                  {reminder.due_mileage !== null ? ` · ${reminder.due_mileage.toLocaleString('es-CO')} km` : ''}
                </p>
                {mileageDelta !== null
                  ? <p className={`text-xs ${mileageDelta <= 0 ? 'text-red-400' : mileageDelta <= 300 ? 'text-yellow-400' : 'text-moto-orange'}`}>{mileageDelta <= 0 ? `${Math.abs(mileageDelta).toLocaleString('es-CO')} km vencido` : `Faltan ${mileageDelta.toLocaleString('es-CO')} km`}</p>
                  : <p className={`text-xs ${status.tone}`}>{status.label}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
              <Button size="sm" variant="outline" className="border-white/10" onClick={() => onEdit(reminder)}>Editar</Button>
              <Button size="sm" variant="outline" className="border-white/10" onClick={() => onCancel(reminder)}><XCircle className="mr-1 h-4 w-4" />Cancelar</Button>
              <Button size="sm" variant="outline" className="border-white/10" onClick={() => onComplete(reminder)}>Completar</Button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
