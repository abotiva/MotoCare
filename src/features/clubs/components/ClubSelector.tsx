import { Crown, MapPin, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Club } from '@/types/database'

type ClubSelectorProps = {
  clubs: Club[]
  selectedId: string | null
  primaryId: string | null | undefined
  onSelect: (club: Club) => void
  onSetPrimary: (club: Club) => void
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function ClubSelector({ clubs, selectedId, primaryId, onSelect, onSetPrimary }: ClubSelectorProps) {
  return (
    <div className="mb-6 grid gap-3" role="group" aria-label="Seleccionar club">
      {clubs.map((club) => {
        const isSelected = selectedId === club.id
        return (
          <div
            key={club.id}
            className={`flex min-h-20 min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-all ${
              isSelected ? 'border-moto-orange bg-moto-orange/20' : 'border-white/5 bg-moto-gray hover:border-white/20'
            }`}
          >
            <button type="button" aria-pressed={isSelected} onClick={() => onSelect(club)} className="contents">
              <Avatar className="h-14 w-14 rounded-lg bg-moto-darker">
                <AvatarImage src={club.image_url ?? undefined} className="object-cover" />
                <AvatarFallback className="rounded-lg text-moto-orange">{initials(club.name)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate font-semibold">{club.name}</span>
                  {club.id === primaryId && (
                    <Badge className="shrink-0 bg-moto-orange text-moto-darker">
                      <Crown className="mr-1 h-3 w-3" />
                      Principal
                    </Badge>
                  )}
                  {club.accepts_join_requests && (
                    <Badge className="shrink-0 bg-emerald-500/15 text-emerald-300">Acepta solicitudes</Badge>
                  )}
                </span>
                <span className="mt-1 flex items-center gap-1 truncate text-sm text-gray-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {club.city || 'Ciudad sin definir'}
                </span>
              </span>
            </button>
            {club.id !== primaryId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0 text-moto-orange"
                onClick={() => onSetPrimary(club)}
              >
                <Crown className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Principal</span>
              </Button>
            )}
            {club.id === primaryId && <Users className="ml-auto h-5 w-5 shrink-0 text-moto-orange sm:hidden" />}
          </div>
        )
      })}
    </div>
  )
}
