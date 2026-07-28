import { Bike, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Motorcycle } from '@/types/database'

type MotorcycleSelectorProps = {
  motorcycles: Motorcycle[]
  selectedId: string | null
  primaryId: string | null | undefined
  onSelect: (motorcycle: Motorcycle) => void
  onSetPrimary?: (motorcycle: Motorcycle) => void
  canSetPrimary?: boolean
}

export function MotorcycleSelector({ motorcycles, selectedId, primaryId, onSelect, onSetPrimary, canSetPrimary = false }: MotorcycleSelectorProps) {
  const healthLabel = (motorcycle: Motorcycle) => {
    const days = [motorcycle.soat_expires_on, motorcycle.technical_review_expires_on]
      .filter((date): date is string => Boolean(date))
      .map((date) => Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86_400_000))
    if (days.some((value) => value < 0)) return { label: 'Vencida', className: 'bg-red-500/15 text-red-300' }
    if (days.some((value) => value <= 30)) return { label: 'Atención', className: 'bg-amber-500/15 text-amber-300' }
    return { label: 'Al día', className: 'bg-emerald-500/15 text-emerald-300' }
  }

  return (
    <div className="mb-6 grid gap-3" role="group" aria-label="Seleccionar moto">
      {motorcycles.map((motorcycle) => {
        const isSelected = selectedId === motorcycle.id
        const health = healthLabel(motorcycle)
        return (
          <div
            key={motorcycle.id}
            className={`flex min-h-20 min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moto-orange ${
              isSelected ? 'border-moto-orange bg-moto-orange/20' : 'border-white/5 bg-moto-gray hover:border-white/20'
            }`}
          >
            <button type="button" aria-pressed={isSelected} onClick={() => onSelect(motorcycle)} className="contents">
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-moto-darker">
              {motorcycle.image_url ? (
                <img src={motorcycle.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Bike className="h-8 w-8 text-moto-orange" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate font-semibold">{motorcycle.brand} {motorcycle.model}</span>
                {motorcycle.id === primaryId && <Badge className="shrink-0 bg-moto-orange text-moto-darker">Predeterminada</Badge>}
                <Badge className={`shrink-0 ${health.className}`}>{health.label}</Badge>
              </span>
              <span className="block truncate text-sm text-gray-400">
                {motorcycle.year ?? 'Sin año'} · {motorcycle.plate ?? 'Sin placa'}
              </span>
            </span>
            </button>
            {canSetPrimary && motorcycle.id !== primaryId && onSetPrimary && (
              <Button type="button" variant="ghost" size="sm" className="ml-auto shrink-0 text-moto-orange" onClick={() => onSetPrimary(motorcycle)}>
                <Star className="mr-1 h-4 w-4" /> Principal
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
