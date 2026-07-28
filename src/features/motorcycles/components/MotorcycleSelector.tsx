import { Bike } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Motorcycle } from '@/types/database'

type MotorcycleSelectorProps = {
  motorcycles: Motorcycle[]
  selectedId: string | null
  primaryId: string | null | undefined
  onSelect: (motorcycle: Motorcycle) => void
}

export function MotorcycleSelector({ motorcycles, selectedId, primaryId, onSelect }: MotorcycleSelectorProps) {
  return (
    <div className="mb-6 grid gap-3" role="group" aria-label="Seleccionar moto">
      {motorcycles.map((motorcycle) => {
        const isSelected = selectedId === motorcycle.id
        return (
          <button
            key={motorcycle.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(motorcycle)}
            className={`flex min-h-20 min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moto-orange ${
              isSelected ? 'border-moto-orange bg-moto-orange/20' : 'border-white/5 bg-moto-gray hover:border-white/20'
            }`}
          >
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-moto-darker">
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
              </span>
              <span className="block truncate text-sm text-gray-400">
                {motorcycle.year ?? 'Sin año'} · {motorcycle.plate ?? 'Sin placa'}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
