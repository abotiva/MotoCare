import { CheckCircle, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { dateStatus } from '@/features/motorcycles/utils/dateStatus'
import type { Motorcycle } from '@/types/database'

type MotorcycleHealthCardProps = {
  motorcycle: Motorcycle
  score: number
  onUpdateMileage: () => void
}

export function MotorcycleHealthCard({ motorcycle, score, onUpdateMileage }: MotorcycleHealthCardProps) {
  const soat = dateStatus(motorcycle.soat_expires_on)
  const review = dateStatus(motorcycle.technical_review_expires_on)
  return (
    <>
      <Card className="border-white/5 bg-moto-gray">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-moto-orange/20"><Gauge className="h-6 w-6 text-moto-orange" /></span>
            <div><p className="text-sm text-gray-400">Kilometraje</p><p className="text-2xl font-bold">{motorcycle.mileage.toLocaleString('es-CO')} km</p></div>
          </div>
          <p className="mb-4 text-xs text-gray-500">Mantén este dato al día para activar pendientes por kilometraje.</p>
          <Button size="sm" variant="outline" className="w-full border-white/10" onClick={onUpdateMileage}><Gauge className="mr-2 h-4 w-4" />Actualizar km</Button>
        </CardContent>
      </Card>
      <Card className="border-white/5 bg-moto-gray">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-green-500/20"><CheckCircle className="h-6 w-6 text-green-500" /></span>
            <div><p className="text-sm text-gray-400">Estado general</p><p className="text-2xl font-bold text-green-500">{score}%</p></div>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-gray-400">SOAT</dt><dd className={soat.tone}>{soat.label}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-400">Tecnomecánica</dt><dd className={review.tone}>{review.label}</dd></div>
          </dl>
        </CardContent>
      </Card>
    </>
  )
}
