import { CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { MaintenanceRecord } from '@/types/database'

type MaintenanceTimelineProps = {
  records: MaintenanceRecord[]
  onOpen: (record: MaintenanceRecord) => void
}

export function MaintenanceTimeline({ records, onOpen }: MaintenanceTimelineProps) {
  if (records.length === 0) {
    return <div className="rounded-xl border border-white/5 bg-moto-darker p-5 text-center text-gray-400">Aún no hay mantenimientos registrados.</div>
  }

  return (
    <ol className="relative space-y-3 border-l border-white/10 pl-5">
      {records.map((record) => (
        <li key={record.id} className="relative rounded-xl bg-moto-darker p-4">
          <span className="absolute -left-[1.85rem] top-5 grid h-5 w-5 place-items-center rounded-full bg-green-500 text-moto-darker">
            <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold">{record.service_type}</p>
              <p className="mt-1 text-sm text-gray-400">{record.service_date} · {record.mileage.toLocaleString('es-CO')} km</p>
              {record.cost !== null && <p className="mt-1 text-sm text-gray-300">${Number(record.cost).toLocaleString('es-CO')}</p>}
              {record.notes && <p className="mt-2 line-clamp-2 text-sm text-gray-500">{record.notes}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge className="bg-green-500/20 text-green-400">Completado</Badge>
              <Button size="sm" variant="outline" className="border-white/10" onClick={() => onOpen(record)}>Ver detalle</Button>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
