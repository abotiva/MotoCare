import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bike, Calendar, CheckCircle2, Clock, ExternalLink, Flag, Loader2, MapPin, Navigation, PlayCircle, Route as RouteIcon, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { RouteWithOwner } from '@/types/database'

const routeStatusMeta: Record<RouteWithOwner['status'], { label: string; className: string; icon: typeof Flag }> = {
  planned: {
    label: 'Planeada',
    className: 'bg-sky-500/15 text-sky-300',
    icon: Flag,
  },
  in_progress: {
    label: 'En curso',
    className: 'bg-moto-orange text-moto-darker',
    icon: PlayCircle,
  },
  completed: {
    label: 'Realizada',
    className: 'bg-green-500/15 text-green-300',
    icon: CheckCircle2,
  },
}

function initials(name: string | null | undefined, username?: string | null) {
  const source = name || username || 'MC'
  return source
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDuration(minutes: number | null) {
  if (!minutes) return 'Sin duracion'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function formatRouteDates(route: RouteWithOwner) {
  if (!route.start_date && !route.end_date) return 'Sin fechas'
  const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('es-CO')
  if (route.start_date && route.end_date) return `${formatDate(route.start_date)} - ${formatDate(route.end_date)}`
  if (route.start_date) return `Inicia ${formatDate(route.start_date)}`
  return `Finaliza ${formatDate(route.end_date!)}`
}

function routeSearchValue(route: RouteWithOwner) {
  const points = [route.origin, route.destination].filter(Boolean)
  return points.length > 0 ? points.join(' to ') : route.title
}

function googleMapsUrl(route: RouteWithOwner) {
  const query = encodeURIComponent(routeSearchValue(route))
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

function googleMapsEmbedUrl(route: RouteWithOwner) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY as string | undefined
  if (!apiKey) return null

  const origin = route.origin?.trim()
  const destination = route.destination?.trim()

  if (origin && destination) {
    return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving`
  }

  return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(routeSearchValue(route))}`
}

function routeMotorcycleLabel(route: RouteWithOwner) {
  if (!route.motorcycles) return 'Sin moto asignada'
  return `${route.motorcycles.brand} ${route.motorcycles.model}${route.motorcycles.plate ? ` - ${route.motorcycles.plate}` : ''}`
}

export function RouteDetail() {
  const { routeId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [route, setRoute] = useState<RouteWithOwner | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadRoute = async () => {
      if (!supabase || !user || !routeId) return

      setIsLoading(true)
      const { data, error } = await supabase
        .from('routes')
        .select('*, profiles:owner_id(full_name, username, city, avatar_url), motorcycles:motorcycle_id(id, brand, model, plate)')
        .eq('id', routeId)
        .maybeSingle()

      if (error) {
        toast.error('No pudimos cargar la ruta', { description: error.message })
        setRoute(null)
      } else {
        setRoute((data as RouteWithOwner | null) ?? null)
      }

      setIsLoading(false)
    }

    void loadRoute()
  }, [routeId, user])

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando ruta...
      </div>
    )
  }

  if (!route) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24 lg:p-6">
        <Button variant="ghost" className="text-gray-300" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="p-8 text-center text-gray-400">
            <RouteIcon className="mx-auto mb-3 h-12 w-12 text-gray-600" />
            No encontramos esta ruta o no tienes permiso para verla.
          </CardContent>
        </Card>
      </div>
    )
  }

  const status = routeStatusMeta[route.status ?? 'planned']
  const StatusIcon = status.icon
  const owner = route.profiles
  const ownerName = owner?.full_name || owner?.username || 'Motero MotoCare'
  const mapEmbedUrl = googleMapsEmbedUrl(route)

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" className="text-gray-300 hover:text-white" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        {route.owner_id === user?.id && (
          <Button asChild className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark sm:w-auto">
            <Link to="/app/map">Editar en Mis rutas</Link>
          </Button>
        )}
      </div>

      <Card className="overflow-hidden border-white/5 bg-moto-gray py-0">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={status.className}>
                  <StatusIcon className="mr-1 h-3.5 w-3.5" />
                  {status.label}
                </Badge>
                <Badge className={route.visibility === 'community' ? 'bg-moto-orange text-moto-darker' : 'bg-white/10 text-gray-300'}>
                  {route.visibility === 'community' ? 'Comunidad' : 'Privada'}
                </Badge>
              </div>
              <div>
                <h1 className="break-words text-2xl font-bold text-white md:text-4xl">{route.title}</h1>
                <p className="mt-3 flex flex-wrap items-center gap-2 text-gray-300">
                  <MapPin className="h-5 w-5 text-moto-orange" />
                  {route.origin || 'Origen sin definir'} - {route.destination || 'Destino sin definir'}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3 rounded-xl bg-moto-darker p-3 lg:min-w-72">
              <Avatar className="h-12 w-12">
                <AvatarImage src={owner?.avatar_url ?? undefined} />
                <AvatarFallback>{initials(ownerName, owner?.username)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-400">Compartida por</p>
                <p className="truncate font-semibold text-white">{ownerName}</p>
                <p className="truncate text-xs text-gray-500">{owner?.city || 'Ciudad sin definir'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-moto-orange/15 p-3">
              <Bike className="h-5 w-5 text-moto-orange" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-400">Moto</p>
              <p className="truncate text-lg font-semibold">{routeMotorcycleLabel(route)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-moto-orange/15 p-3">
              <RouteIcon className="h-5 w-5 text-moto-orange" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Distancia</p>
              <p className="text-lg font-semibold">{route.distance_km ? `${route.distance_km.toLocaleString()} km` : 'Sin definir'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-sky-500/15 p-3">
              <Clock className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Duracion</p>
              <p className="text-lg font-semibold">{formatDuration(route.duration_minutes)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-green-500/15 p-3">
              <Calendar className="h-5 w-5 text-green-300" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Fechas</p>
              <p className="text-lg font-semibold">{formatRouteDates(route)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/5 bg-moto-gray py-0">
        <CardHeader className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Navigation className="h-5 w-5 text-moto-orange" />
            Mapa de la ruta
          </CardTitle>
          <Button asChild variant="outline" className="w-full border-white/10 sm:w-auto">
            <a href={googleMapsUrl(route)} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir en Google Maps
            </a>
          </Button>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {mapEmbedUrl ? (
            <iframe
              title={`Mapa de ${route.title}`}
              src={mapEmbedUrl}
              className="h-80 w-full rounded-xl border border-white/10 sm:h-[420px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-gray-400">
              Agrega `VITE_GOOGLE_MAPS_EMBED_KEY` para ver el mapa embebido.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/5 bg-moto-gray py-0">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-sm text-gray-400">
              <UserRound className="h-4 w-4" />
              ID de ruta
            </p>
            <p className="mt-1 break-all font-mono text-sm text-gray-300">{route.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Creada</p>
            <p className="mt-1 font-semibold">{new Date(route.created_at).toLocaleDateString('es-CO')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
