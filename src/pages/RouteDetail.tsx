import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bike, Calendar, CheckCircle2, Clock, ExternalLink, Flag, Loader2, Lock, MapPin, Navigation, PlayCircle, Route as RouteIcon, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { GpxMap } from '@/components/GpxMap'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { serializeGpx } from '@/lib/gpx'
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
  if (!minutes) return 'Sin duración'
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
  const [isExternalAppPromptOpen, setIsExternalAppPromptOpen] = useState(false)

  useEffect(() => {
    const loadRoute = async () => {
      if (!supabase || !user || !routeId) return

      setIsLoading(true)
      await supabase.rpc('reconcile_premium_route_access')
      const { data, error } = await supabase
        .from('routes')
        .select('*, profiles:owner_id(full_name, username, city, avatar_url, is_premium), motorcycles:motorcycle_id(id, brand, model, plate)')
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
  const ownerName = owner?.full_name || owner?.username || 'Motero MotoCare Co'
  const mapEmbedUrl = googleMapsEmbedUrl(route)
  const isPremiumExpired = route.route_source === 'premium'
    && Boolean(route.premium_access_expires_at)
    && new Date(route.premium_access_expires_at!).getTime() <= Date.now()

  const openExternalNavigation = async () => {
    setIsExternalAppPromptOpen(false)
    if (!route.track_geojson) {
      window.open(googleMapsUrl(route), '_blank', 'noopener,noreferrer')
      return
    }

    const blob = new Blob([serializeGpx(route.track_geojson, route.title)], { type: 'application/gpx+xml' })
    const file = new File([blob], `${route.id}.gpx`, { type: 'application/gpx+xml' })
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({
          title: route.title,
          text: `Abrir la ruta ${route.title} con una aplicación compatible con GPX.`,
          files: [file],
        })
        return
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${route.id}.gpx`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.info('GPX descargado', { description: 'Abre el archivo con tu aplicación de rutas preferida.' })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.error('No pudimos abrir la ruta', { description: error instanceof Error ? error.message : 'Intenta nuevamente.' })
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" className="text-gray-300 hover:text-white" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        {route.owner_id === user?.id && (
          <Button asChild className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark sm:w-auto">
            <Link to="/app/map">{isPremiumExpired ? 'Renovar en Mis rutas' : 'Editar en Mis rutas'}</Link>
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
                {route.route_source === 'premium' && (
                  <Badge className={isPremiumExpired ? 'bg-red-500/15 text-red-300' : 'bg-violet-500/15 text-violet-300'}>
                    {isPremiumExpired ? 'Premium vencida' : 'Premium activa'}
                  </Badge>
                )}
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
              <Avatar premium={owner?.is_premium} className="h-12 w-12">
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
          {!isPremiumExpired && (
            <Button variant="outline" className="w-full border-white/10 sm:w-auto" onClick={() => setIsExternalAppPromptOpen(true)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {route.track_geojson ? 'Abrir con otra app' : 'Abrir mapa externo'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {isPremiumExpired ? (
            <div className="rounded-xl border border-moto-orange/20 bg-moto-orange/5 p-8 text-center">
              <Lock className="mx-auto h-9 w-9 text-moto-orange" />
              <p className="mt-3 font-semibold">El acceso a esta ruta venció</p>
              <p className="mt-2 text-sm text-gray-400">Conservamos tu historial. Renueva el acceso en “Mis rutas” para recuperar el mapa, el GPX y la edición.</p>
              <Button asChild className="mt-4 bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
                <Link to="/app/map">Ver opciones de renovación</Link>
              </Button>
            </div>
          ) : route.track_geojson ? (
            <GpxMap track={route.track_geojson} className="h-80 sm:h-[420px]" />
          ) : mapEmbedUrl ? (
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

      <Dialog open={isExternalAppPromptOpen} onOpenChange={setIsExternalAppPromptOpen}>
        <DialogContent className="border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>Abrir navegación externa</DialogTitle>
            <DialogDescription className="leading-6 text-gray-300">
              MotoCare mantiene este mapa como referencia informativa. Para recibir instrucciones giro a giro debes continuar en una aplicación externa.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-moto-orange/20 bg-moto-orange/5 p-3 text-sm text-gray-300">
            {route.track_geojson
              ? 'Compartiremos el archivo GPX para que elijas una aplicación compatible. La ubicación de MotoCare puede pausarse mientras usas otra app.'
              : 'Abriremos la búsqueda de esta ruta en una aplicación de mapas externa.'}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setIsExternalAppPromptOpen(false)}>Seguir en MotoCare</Button>
            <Button className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => void openExternalNavigation()}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Continuar en otra app
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
