import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bike, Calendar, CheckCircle2, Clock, Edit3, Eye, EyeOff, Flag, Loader2, Lock, MapPin, PackageCheck, PlayCircle, Plus, Route, Save, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import { parseGpx, trackDistanceKm } from '@/lib/gpx'
import type { RouteTrack } from '@/lib/gpx'
import { premiumRouteSummaries } from '@/lib/premiumRoutePurchases'
import type { Motorcycle, RoutePlan } from '@/types/database'

const GpxMap = lazy(() => import('@/components/GpxMap').then((module) => ({ default: module.GpxMap })))

type RouteForm = {
  motorcycle_id: string
  title: string
  origin: string
  destination: string
  distance_km: string
  duration_minutes: string
  start_date: string
  end_date: string
  visibility: 'private' | 'community'
  status: RoutePlan['status']
  track_geojson: RouteTrack | null
}

const emptyRouteForm: RouteForm = {
  motorcycle_id: '',
  title: '',
  origin: '',
  destination: '',
  distance_km: '',
  duration_minutes: '',
  start_date: '',
  end_date: '',
  visibility: 'private',
  status: 'planned',
  track_geojson: null,
}

const routeStatusMeta: Record<RoutePlan['status'], { label: string; className: string; icon: typeof Flag }> = {
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

function getRouteStatus(route: RoutePlan) {
  return routeStatusMeta[route.status ?? 'planned']
}

function isPremiumRouteExpired(route: RoutePlan) {
  return route.route_source === 'premium'
    && Boolean(route.premium_access_expires_at)
    && new Date(route.premium_access_expires_at!).getTime() <= Date.now()
}

function formatDuration(minutes: number | null) {
  if (!minutes) return 'Sin duración'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatRouteDates(route: RoutePlan) {
  if (!route.start_date && !route.end_date) return 'Sin fechas'
  const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('es-CO')
  if (route.start_date && route.end_date) return `${formatDate(route.start_date)} - ${formatDate(route.end_date)}`
  if (route.start_date) return `Inicia ${formatDate(route.start_date)}`
  return `Finaliza ${formatDate(route.end_date!)}`
}

function motorcycleLabel(motorcycle: Pick<Motorcycle, 'brand' | 'model' | 'plate'>) {
  return `${motorcycle.brand} ${motorcycle.model}${motorcycle.plate ? ` - ${motorcycle.plate}` : ''}`
}

function routePlannedNotificationRows(route: RoutePlan) {
  if (route.status !== 'planned' || !route.start_date) return []

  const startDate = new Date(`${route.start_date}T08:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (startDate < today) return []

  const scheduled = new Date(startDate)
  scheduled.setDate(startDate.getDate() - 7)

  return [
    {
      user_id: route.owner_id,
      type: 'route_planned',
      title: 'Ruta planeada cercana',
      message: `La ruta "${route.title}" está programada para el ${startDate.toLocaleDateString('es-CO')}.`,
      route_id: route.id,
      scheduled_for: scheduled.toISOString(),
    },
  ]
}

function routeOverdueNotificationRow(route: RoutePlan) {
  if (route.status !== 'in_progress' || !route.end_date) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(`${route.end_date}T08:00:00`)
  if (endDate >= today) return null

  return {
    user_id: route.owner_id,
    type: 'route_overdue',
    title: 'Ruta en curso vencida',
    message: `La ruta "${route.title}" sigue en curso y ya pasó su fecha final.`,
    route_id: route.id,
    scheduled_for: endDate.toISOString(),
  }
}

function RouteCard({
  route,
  isOwner,
  onOpen,
  onEdit,
  onDelete,
  onToggleVisibility,
  onUpdateStatus,
  onRenewAccess,
  motorcycleName,
}: {
  route: RoutePlan
  isOwner: boolean
  onOpen: (route: RoutePlan) => void
  onEdit?: (route: RoutePlan) => void
  onDelete?: (route: RoutePlan) => void
  onToggleVisibility?: (route: RoutePlan) => void
  onUpdateStatus?: (route: RoutePlan, status: RoutePlan['status']) => void
  onRenewAccess?: (route: RoutePlan) => void
  motorcycleName?: string
}) {
  const status = getRouteStatus(route)
  const StatusIcon = status.icon
  const isExpired = isPremiumRouteExpired(route)

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-white/5 bg-moto-darker p-4">
      <div className="mb-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{route.title}</h3>
          <p className="mt-1 break-words text-sm text-gray-400">
            {route.origin || 'Origen sin definir'}{' -> '}{route.destination || 'Destino sin definir'}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end">
          {route.route_source === 'premium' && (
            <Badge className={isExpired ? 'bg-red-500/15 text-red-300' : 'bg-violet-500/15 text-violet-300'}>
              {isExpired ? 'Premium vencida' : 'Premium activa'}
            </Badge>
          )}
          <Badge className={status.className}>
            <StatusIcon className="mr-1 h-3.5 w-3.5" />
            {status.label}
          </Badge>
          <Badge className={route.visibility === 'community' ? 'bg-moto-orange text-moto-darker' : 'bg-white/10 text-gray-300'}>
            {route.visibility === 'community' ? 'Comunidad' : 'Privada'}
          </Badge>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-sm text-gray-400">
        <span className="flex items-center gap-1">
          <Bike className="h-4 w-4 text-moto-orange" />
          {motorcycleName ?? 'Sin moto asignada'}
        </span>
        <span className="flex items-center gap-1">
          <Route className="h-4 w-4 text-moto-orange" />
          {route.distance_km ? `${route.distance_km.toLocaleString()} km` : 'Sin distancia'}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-moto-orange" />
          {formatDuration(route.duration_minutes)}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-moto-orange" />
          {formatRouteDates(route)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="w-full border-white/10 sm:w-auto" onClick={() => onOpen(route)}>
          Ver detalle
        </Button>
        {isOwner && onToggleVisibility && !isExpired && (
          <Button size="sm" variant="outline" className="hidden border-white/10 sm:inline-flex" onClick={() => onToggleVisibility(route)}>
            {route.visibility === 'community' ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {route.visibility === 'community' ? 'Hacer privada' : 'Compartir'}
          </Button>
        )}
        {isOwner && onEdit && !isExpired && (
          <Button size="sm" variant="outline" className="hidden border-white/10 sm:inline-flex" onClick={() => onEdit(route)}>
            <Edit3 className="mr-2 h-4 w-4" />
            Editar
          </Button>
        )}
        {isOwner && onDelete && (
          <Button size="sm" variant="outline" className="hidden border-red-500/30 text-red-300 hover:text-red-200 sm:inline-flex" onClick={() => onDelete(route)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        )}
        {isOwner && onUpdateStatus && !isExpired && (
          <select
            className="hidden min-h-10 rounded-md border border-white/10 bg-moto-gray px-3 text-sm text-white sm:block"
            value={route.status ?? 'planned'}
            onChange={(event) => onUpdateStatus(route, event.target.value as RoutePlan['status'])}
          >
            <option value="planned">Planeada</option>
            <option value="in_progress">En curso</option>
            <option value="completed">Realizada</option>
          </select>
        )}
        {isExpired && onRenewAccess && (
          <Button size="sm" className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark sm:w-auto" onClick={() => onRenewAccess(route)}>
            Renovar acceso
          </Button>
        )}
      </div>
    </div>
  )
}

type RouteMetric = 'routes' | 'kilometers' | 'shared' | 'completed'

export function Map() {
  const { user } = useAuth()
  const { effectivePlan, isLoadingSubscription } = useSubscription()
  const canUseRoutes = effectivePlan !== 'business'
  const canShareRoutes = effectivePlan === 'premium'
  const canUploadExternalGpx = effectivePlan === 'premium'
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([])
  const [myRoutes, setMyRoutes] = useState<RoutePlan[]>([])
  const [routeForm, setRouteForm] = useState<RouteForm>(emptyRouteForm)
  const [editingRoute, setEditingRoute] = useState<RoutePlan | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<RoutePlan | null>(null)
  const [showCreateRoute, setShowCreateRoute] = useState(false)
  const [showRouteDetail, setShowRouteDetail] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<RouteMetric | null>(null)
  const [renewingRoute, setRenewingRoute] = useState<RoutePlan | null>(null)
  const [lifetimePrice, setLifetimePrice] = useState<number | null>(null)
  const [isRequestingPurchase, setIsRequestingPurchase] = useState(false)
  const [routeStatusFilter, setRouteStatusFilter] = useState<'all' | RoutePlan['status']>('all')
  const [routeOriginSearch, setRouteOriginSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [ownedPremiumRouteIds, setOwnedPremiumRouteIds] = useState<string[]>([])
  const [searchParams, setSearchParams] = useSearchParams()

  const purchasedRoutes = useMemo(
    () => premiumRouteSummaries.filter((route) => ownedPremiumRouteIds.includes(route.id)),
    [ownedPremiumRouteIds],
  )

  useEffect(() => {
    if (!supabase || !user?.id) {
      setOwnedPremiumRouteIds([])
      return
    }
    const client = supabase

    const loadPremiumRoutes = async () => {
      const { data } = await client
        .from('premium_route_monthly_claims')
        .select('route_id')
        .gt('expires_at', new Date().toISOString())
      setOwnedPremiumRouteIds((data ?? []).map((claim) => claim.route_id))
    }

    void loadPremiumRoutes()
  }, [user?.id])

  const totalKm = useMemo(
    () => myRoutes.reduce((total, route) => total + (route.distance_km ?? 0), 0),
    [myRoutes]
  )

  const sharedCount = useMemo(
    () => myRoutes.filter((route) => route.visibility === 'community').length,
    [myRoutes]
  )

  const completedCount = useMemo(
    () => myRoutes.filter((route) => route.status === 'completed').length,
    [myRoutes]
  )

  const filteredMyRoutes = useMemo(() => {
    const origin = routeOriginSearch.trim().toLocaleLowerCase('es')
    return myRoutes.filter((route) => {
      const matchesStatus = routeStatusFilter === 'all' || route.status === routeStatusFilter
      const matchesOrigin = !origin || (route.origin ?? '').toLocaleLowerCase('es').includes(origin)
      return matchesStatus && matchesOrigin
    })
  }, [myRoutes, routeOriginSearch, routeStatusFilter])

  const metricRoutes = useMemo(() => {
    if (selectedMetric === 'shared') return myRoutes.filter((route) => route.visibility === 'community')
    if (selectedMetric === 'completed') return myRoutes.filter((route) => route.status === 'completed')
    if (selectedMetric === 'kilometers') return myRoutes.filter((route) => (route.distance_km ?? 0) > 0)
    return myRoutes
  }, [myRoutes, selectedMetric])

  const metricCopy = {
    routes: {
      title: 'Detalle de mis rutas',
      description: `${myRoutes.length} ruta${myRoutes.length === 1 ? '' : 's'} guardada${myRoutes.length === 1 ? '' : 's'}.`,
    },
    kilometers: {
      title: 'Detalle de kilómetros',
      description: `${totalKm.toLocaleString()} km planeados entre ${metricRoutes.length} ruta${metricRoutes.length === 1 ? '' : 's'} con distancia registrada.`,
    },
    shared: {
      title: 'Detalle de rutas compartidas',
      description: `${sharedCount} ruta${sharedCount === 1 ? '' : 's'} visible${sharedCount === 1 ? '' : 's'} para la comunidad.`,
    },
    completed: {
      title: 'Detalle de rutas realizadas',
      description: `${completedCount} ruta${completedCount === 1 ? '' : 's'} marcada${completedCount === 1 ? '' : 's'} como realizada${completedCount === 1 ? '' : 's'}.`,
    },
  } satisfies Record<RouteMetric, { title: string; description: string }>

  const motorcyclesById = useMemo(() => new globalThis.Map(motorcycles.map((motorcycle) => [motorcycle.id, motorcycle])), [motorcycles])

  const motorcycleNameFor = (route: RoutePlan) => {
    const motorcycle = route.motorcycle_id ? motorcyclesById.get(route.motorcycle_id) : null
    return motorcycle ? motorcycleLabel(motorcycle) : undefined
  }

  const loadRoutes = async () => {
    if (!supabase || !user) return
    const client = supabase
    setIsLoading(true)

    const maintenancePromise = Promise.all([
      client.rpc('sync_claimed_premium_routes'),
      client.rpc('reconcile_premium_route_access'),
    ])

    const [motorcyclesResult, myRoutesResult] = await Promise.all([
      client.from('motorcycles').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      client.from('routes').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
    ])

    if (motorcyclesResult.error) {
      toast.error('No pudimos cargar tus motos', { description: motorcyclesResult.error.message })
    } else {
      setMotorcycles((motorcyclesResult.data ?? []) as Motorcycle[])
    }

    if (myRoutesResult.error) {
      toast.error('No pudimos cargar tus rutas', { description: myRoutesResult.error.message })
    } else {
      const nextRoutes = (myRoutesResult.data ?? []) as RoutePlan[]
      setMyRoutes(nextRoutes)
      setIsLoading(false)
      void Promise.all(nextRoutes.map((route) => syncRouteNotifications(route)))

      const premiumRoutesWithoutTrack = nextRoutes.filter((route) => (
        route.route_source === 'premium' && route.premium_route_id && !route.track_geojson
      ))

      if (premiumRoutesWithoutTrack.length) {
        const premiumIds = premiumRoutesWithoutTrack
          .map((route) => route.premium_route_id)
          .filter((id): id is string => Boolean(id))
        const { data: premiumMetadata } = await client
          .from('premium_routes')
          .select('id, track_geojson, gpx_storage_path')
          .in('id', premiumIds)
        const metadataById = new globalThis.Map((premiumMetadata ?? []).map((route) => [route.id, route]))

        const hydrated = await Promise.all(premiumRoutesWithoutTrack.map(async (route) => {
          const metadata = metadataById.get(route.premium_route_id!)
          if (!metadata) return route
          let track = metadata.track_geojson as RouteTrack | null
          if (!track && metadata.gpx_storage_path) {
            const { data: gpxFile } = await client.storage
              .from('premium-route-files')
              .download(metadata.gpx_storage_path)
            if (gpxFile) {
              try {
                track = parseGpx(await gpxFile.text(), `${route.title}.gpx`)
              } catch {
                track = null
              }
            }
          }
          if (!track) return route
          const { error } = await client
            .from('routes')
            .update({ track_geojson: track })
            .eq('id', route.id)
            .eq('owner_id', user.id)
          return error ? route : { ...route, track_geojson: track }
        }))
        const hydratedById = new globalThis.Map(hydrated.map((route) => [route.id, route]))
        setMyRoutes((current) => current.map((route) => hydratedById.get(route.id) ?? route))
      }
    }

    if (myRoutesResult.error) setIsLoading(false)

    void maintenancePromise.then(([syncResult, reconcileResult]) => {
      if (syncResult.error && !syncResult.error.message.includes('Could not find the function')) {
        toast.error('No pudimos sincronizar tus rutas Premium', { description: syncResult.error.message })
      }
      if (reconcileResult.error && !reconcileResult.error.message.includes('Could not find the function')) {
        toast.error('No pudimos revisar la vigencia de tus rutas Premium', { description: reconcileResult.error.message })
      }
    })
  }

  useEffect(() => {
    void loadRoutes()
    // Route load is intentionally keyed only by authenticated user identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const openRouteDetail = (route: RoutePlan) => {
    setSelectedRoute(route)
    setShowRouteDetail(true)
  }

  const openCreateRoute = () => {
    if (!canUseRoutes) {
      toast.error('Rutas no disponible', { description: 'La licencia Business es para negocios y no permite operar como motero.' })
      return
    }
    setEditingRoute(null)
    setRouteForm({ ...emptyRouteForm, motorcycle_id: motorcycles[0]?.id ?? '' })
    setShowCreateRoute(true)
  }

  useEffect(() => {
    if (isLoading || searchParams.get('action') !== 'create') return
    openCreateRoute()
    setSearchParams((current) => {
      current.delete('action')
      return current
    }, { replace: true })
    // openCreateRoute uses the plan and motorcycles loaded above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, searchParams, setSearchParams])

  const openEditRoute = (route: RoutePlan) => {
    if (isPremiumRouteExpired(route)) {
      setRenewingRoute(route)
      return
    }
    if (!canUseRoutes) {
      toast.error('Rutas no disponible', { description: 'La licencia Business es para negocios y no permite operar como motero.' })
      return
    }
    setEditingRoute(route)
    setRouteForm({
      motorcycle_id: route.motorcycle_id ?? '',
      title: route.title,
      origin: route.origin ?? '',
      destination: route.destination ?? '',
      distance_km: route.distance_km?.toString() ?? '',
      duration_minutes: route.duration_minutes?.toString() ?? '',
      start_date: route.start_date ?? '',
      end_date: route.end_date ?? '',
      visibility: canShareRoutes ? route.visibility : 'private',
      status: route.status ?? 'planned',
      track_geojson: route.track_geojson,
    })
    setShowCreateRoute(true)
  }

  const openRenewAccess = async (route: RoutePlan) => {
    setRenewingRoute(route)
    setLifetimePrice(null)
    if (!supabase || !route.premium_route_id) return
    const { data } = await supabase
      .from('premium_routes')
      .select('lifetime_price_cop')
      .eq('id', route.premium_route_id)
      .maybeSingle()
    if (data) setLifetimePrice(Number(data.lifetime_price_cop))
  }

  const requestLifetimePurchase = async () => {
    if (!supabase || !renewingRoute?.premium_route_id) return
    setIsRequestingPurchase(true)
    const { data, error } = await supabase.rpc('request_premium_route_lifetime_purchase', {
      target_route_id: renewingRoute.premium_route_id,
    })
    setIsRequestingPurchase(false)
    if (error) {
      toast.error('No pudimos registrar la solicitud', { description: error.message })
      return
    }
    const row = Array.isArray(data) ? data[0] : data
    toast.success('Solicitud de compra registrada', {
      description: `Precio reservado: ${formatMoney(Number(row?.quoted_price_cop ?? lifetimePrice ?? 0))}. El acceso se habilitará al confirmar el pago.`,
    })
    setRenewingRoute(null)
  }

  const applyGpx = (track: RouteTrack) => {
    setRouteForm((current) => ({ ...current, title: current.title || track.properties.name || 'Ruta GPX', distance_km: trackDistanceKm(track).toFixed(1), track_geojson: track }))
  }

  const loadDemoGpx = async () => {
    if (purchasedRoutes.length === 0) {
      toast.error('No tienes rutas Premium activas', { description: 'Elige una de tus cinco rutas gratuitas del mes.' })
      return
    }
    try { const response = await fetch('/demo-guatavita.gpx'); if (!response.ok) throw new Error('No pudimos cargar el GPX demo.'); applyGpx(parseGpx(await response.text(), 'demo-guatavita.gpx')) }
    catch (error) { toast.error('GPX demo no disponible', { description: error instanceof Error ? error.message : 'Intenta nuevamente.' }) }
  }

  const handleGpxFile = async (file?: File) => {
    if (!file) return
    if (!canUploadExternalGpx) {
      toast.error('Función Premium', { description: 'Subir archivos GPX externos requiere una licencia Premium.' })
      return
    }
    if (!file.name.toLowerCase().endsWith('.gpx')) return toast.error('Selecciona un archivo .gpx')
    try { applyGpx(parseGpx(await file.text(), file.name)) }
    catch (error) { toast.error('No pudimos leer el GPX', { description: error instanceof Error ? error.message : 'Revisa el archivo.' }) }
  }

  const handleSubmitRoute = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return

    if (!canUseRoutes) {
      toast.error('Rutas no disponible', { description: 'La licencia Business es para negocios y no permite crear rutas personales.' })
      return
    }

    if (routeForm.visibility === 'community' && !canShareRoutes) {
      toast.error('Función Premium', { description: 'Con la licencia Free puedes guardar rutas privadas. Compartir con comunidad requiere Premium.' })
      return
    }

    if (!routeForm.title.trim()) {
      toast.error('Nombre requerido', { description: 'La ruta necesita un nombre.' })
      return
    }

    if (Number(routeForm.distance_km || 0) < 0 || Number(routeForm.duration_minutes || 0) < 0) {
      toast.error('Datos inválidos', { description: 'La distancia y duración no pueden ser negativas.' })
      return
    }

    if (routeForm.start_date && routeForm.end_date && routeForm.end_date < routeForm.start_date) {
      toast.error('Fechas invalidas', { description: 'La fecha final no puede ser anterior a la fecha de inicio.' })
      return
    }

    setIsSaving(true)

    const payload = {
      owner_id: user.id,
      motorcycle_id: routeForm.motorcycle_id || null,
      title: routeForm.title.trim(),
      origin: routeForm.origin.trim() || null,
      destination: routeForm.destination.trim() || null,
      distance_km: routeForm.distance_km ? Number(routeForm.distance_km) : null,
      duration_minutes: routeForm.duration_minutes ? Number(routeForm.duration_minutes) : null,
      start_date: routeForm.start_date || null,
      end_date: routeForm.end_date || null,
      visibility: routeForm.visibility,
      status: routeForm.status,
      track_geojson: routeForm.track_geojson,
    }

    const query = editingRoute
      ? supabase.from('routes').update(payload).eq('id', editingRoute.id).eq('owner_id', user.id)
      : supabase.from('routes').insert(payload)

    const { data, error } = await query
      .select('*')
      .single()

    if (error) {
      toast.error(editingRoute ? 'No pudimos actualizar la ruta' : 'No pudimos crear la ruta', { description: error.message })
    } else if (data) {
      const route = data as RoutePlan
      await syncRouteNotifications(route)
      setMyRoutes((current) => (editingRoute ? current.map((item) => (item.id === route.id ? route : item)) : [route, ...current]))
      if (selectedRoute?.id === route.id) setSelectedRoute(route)
      setRouteForm(emptyRouteForm)
      setEditingRoute(null)
      setShowCreateRoute(false)
      toast.success(editingRoute ? 'Ruta actualizada' : 'Ruta creada', {
        description: route.visibility === 'community' ? 'La ruta quedó visible para la comunidad.' : 'La ruta quedó guardada como privada.',
      })
    }

    setIsSaving(false)
  }

  const syncRouteNotifications = async (route: RoutePlan) => {
    if (!supabase || !user) return

    const plannedNotifications = routePlannedNotificationRows(route)
    const overdueNotification = routeOverdueNotificationRow(route)

    const { error: plannedDeleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('route_id', route.id)
      .eq('type', 'route_planned')

    if (plannedDeleteError) {
      toast.error('No pudimos limpiar notificaciones anteriores', { description: plannedDeleteError.message })
      return
    }

    if (plannedNotifications.length > 0) {
      const { error: insertError } = await supabase.from('notifications').insert(plannedNotifications)

      if (insertError) {
        toast.error('La ruta se guardó, pero no pudimos crear sus notificaciones', { description: insertError.message })
      }
    }

    if (!overdueNotification) {
      const { error: overdueDeleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('route_id', route.id)
        .eq('type', 'route_overdue')

      if (overdueDeleteError) {
        toast.error('No pudimos limpiar la alerta de ruta vencida', { description: overdueDeleteError.message })
      }
      return
    }

    const { data: existingOverdue, error: existingError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('route_id', route.id)
      .eq('type', 'route_overdue')
      .limit(1)

    if (existingError) {
      toast.error('No pudimos validar la alerta de ruta vencida', { description: existingError.message })
      return
    }

    if ((existingOverdue ?? []).length === 0) {
      const { error: overdueInsertError } = await supabase.from('notifications').insert(overdueNotification)
      if (overdueInsertError) {
        toast.error('La ruta se guardo, pero no pudimos crear la alerta de ruta vencida', { description: overdueInsertError.message })
      }
    }
  }

  const deleteRoute = async (route: RoutePlan) => {
    if (!supabase || !user) return
    const confirmed = window.confirm(`Eliminar la ruta "${route.title}"? Esta acción no se puede deshacer.`)
    if (!confirmed) return

    setIsSaving(true)

    const { error } = await supabase
      .from('routes')
      .delete()
      .eq('id', route.id)
      .eq('owner_id', user.id)

    if (error) {
      toast.error('No pudimos eliminar la ruta', { description: error.message })
    } else {
      setMyRoutes((current) => current.filter((item) => item.id !== route.id))
      if (selectedRoute?.id === route.id) {
        setSelectedRoute(null)
        setShowRouteDetail(false)
      }
      toast.success('Ruta eliminada')
    }

    setIsSaving(false)
  }

  const toggleRouteVisibility = async (route: RoutePlan) => {
    if (!supabase || !user) return
    const nextVisibility = route.visibility === 'community' ? 'private' : 'community'
    if (nextVisibility === 'community' && !canShareRoutes) {
      toast.error('Función Premium', { description: 'Compartir rutas con la comunidad requiere licencia Premium.' })
      return
    }
    setIsSaving(true)

    const { data, error } = await supabase
      .from('routes')
      .update({ visibility: nextVisibility })
      .eq('id', route.id)
      .eq('owner_id', user.id)
      .select('*')
      .single()

    if (error) {
      toast.error('No pudimos actualizar la ruta', { description: error.message })
    } else if (data) {
      const updatedRoute = data as RoutePlan
      setMyRoutes((current) => current.map((item) => (item.id === updatedRoute.id ? updatedRoute : item)))
      toast.success(updatedRoute.visibility === 'community' ? 'Ruta compartida' : 'Ruta privada', {
        description: updatedRoute.visibility === 'community' ? 'Ahora aparece en comunidad.' : 'Ya no aparece en comunidad.',
      })
    }

    setIsSaving(false)
  }

  const updateRouteStatus = async (route: RoutePlan, status: RoutePlan['status']) => {
    if (!supabase || !user || route.status === status) return
    setIsSaving(true)

    const { data, error } = await supabase
      .from('routes')
      .update({ status })
      .eq('id', route.id)
      .eq('owner_id', user.id)
      .select('*')
      .single()

    if (error) {
      toast.error('No pudimos actualizar el estado', { description: error.message })
    } else if (data) {
      const updatedRoute = data as RoutePlan
      await syncRouteNotifications(updatedRoute)
      setMyRoutes((current) => current.map((item) => (item.id === updatedRoute.id ? updatedRoute : item)))
      if (selectedRoute?.id === updatedRoute.id) setSelectedRoute(updatedRoute)
      toast.success('Estado actualizado', { description: `La ruta quedó como ${getRouteStatus(updatedRoute).label.toLowerCase()}.` })
    }

    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-moto-orange">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden p-4 pb-24 lg:p-6">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold">Rutas</h1>
          <p className="text-gray-400">Planea recorridos con Google Maps, importa rutas GPX y guárdalas en tu cuenta.</p>
        </div>
        <Button className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={openCreateRoute} disabled={isLoadingSubscription || !canUseRoutes}>
          <Plus className="mr-2 h-5 w-5" />
          Nueva ruta
        </Button>
      </div>

      <Card className="relative mb-5 overflow-hidden border-moto-orange/30 bg-moto-darker py-0">
        <div className="absolute inset-0 bg-[url('/feature-gps.jpg')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-moto-darker via-moto-darker/90 to-moto-darker/40" />
        <CardContent className="relative flex min-h-44 flex-col justify-center gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="max-w-2xl">
            <Badge className="mb-3 bg-moto-orange text-moto-darker">Rutas Premium</Badge>
            <h2 className="text-xl font-bold sm:text-2xl">Descubre rutas seleccionadas para tu próxima aventura</h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">Explora recorridos con información detallada y archivos GPX listos para usar.</p>
          </div>
          <Button asChild className="shrink-0 bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
            <Link to="/app/premium-routes">Ver rutas Premium</Link>
          </Button>
        </CardContent>
      </Card>

      {!canUseRoutes && (
        <Card className="mb-5 border-yellow-500/30 bg-yellow-500/10 py-0">
          <CardContent className="p-4 text-sm text-yellow-200">
            La licencia Business está pensada para negocios. Las rutas personales están disponibles para cuentas de motero Free y Premium.
          </CardContent>
        </Card>
      )}

      <Card className="mb-5 border-moto-orange/20 bg-moto-gray py-0">
        <CardContent className="p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-moto-orange" />
                <h2 className="font-semibold">Rutas Premium del mes</h2>
              </div>
              <p className="mt-1 text-sm text-gray-400">Disponibles hasta el final del mes para licencias Premium.</p>
            </div>
            <Button asChild variant="outline" className="border-white/10">
              <Link to="/app/premium-routes">Ver catálogo</Link>
            </Button>
          </div>
          {purchasedRoutes.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {purchasedRoutes.map((route) => (
                <div key={route.id} className="rounded-xl border border-white/5 bg-moto-darker p-4">
                  <Badge className="mb-2 bg-green-500/15 text-green-300">Comprada</Badge>
                  <p className="font-semibold">{route.title}</p>
                  <p className="mt-1 text-sm text-gray-400">{route.location}</p>
                  <div className="mt-3 flex gap-2 text-xs text-gray-300">
                    <span>{route.distance}</span><span>•</span><span>{route.terrain}</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="mt-4 w-full border-white/10">
                    <Link to={`/app/premium-routes?route=${encodeURIComponent(route.id)}&tab=detail`}>Ver detalle</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-sm text-gray-400">Aún no has elegido rutas Premium este mes.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3">
          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_200px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="search"
                  value={routeOriginSearch}
                  onChange={(event) => setRouteOriginSearch(event.target.value)}
                  placeholder="Buscar por origen"
                  className="w-full rounded-xl border border-white/10 bg-moto-darker py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-moto-orange"
                />
              </label>
              <select
                value={routeStatusFilter}
                onChange={(event) => setRouteStatusFilter(event.target.value as 'all' | RoutePlan['status'])}
                aria-label="Filtrar rutas por estado"
                className="rounded-xl border border-white/10 bg-moto-darker px-3 py-2.5 text-sm text-white outline-none focus:border-moto-orange"
              >
                <option value="all">Todos los estados</option>
                <option value="planned">Planeadas</option>
                <option value="in_progress">En curso</option>
                <option value="completed">Realizadas</option>
              </select>
            </CardContent>
          </Card>
          {filteredMyRoutes.length > 0 ? (
            filteredMyRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                isOwner
                onOpen={openRouteDetail}
                onEdit={openEditRoute}
                onDelete={deleteRoute}
                onToggleVisibility={canShareRoutes || route.visibility === 'community' ? toggleRouteVisibility : undefined}
                onUpdateStatus={updateRouteStatus}
                onRenewAccess={(route) => void openRenewAccess(route)}
                motorcycleName={motorcycleNameFor(route)}
              />
            ))
          ) : (
            <Card className="border-white/5 bg-moto-gray py-0">
              <CardContent className="p-8 text-center text-gray-400">
                <MapPin className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                {myRoutes.length > 0 ? 'No encontramos rutas con estos filtros.' : 'Aún no tienes rutas guardadas.'}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit border-white/5 bg-moto-gray py-0">
          <CardContent className="p-5">
            <h2 className="mb-2 font-semibold">Rutas comunitarias</h2>
            <p className="mb-4 text-sm leading-6 text-gray-400">
              {canShareRoutes
                ? 'Tu licencia permite compartir rutas con la comunidad. El descubrimiento de rutas de otros moteros será la siguiente fase.'
                : 'Con Free puedes planear rutas privadas. Compartir y descubrir rutas comunitarias queda reservado para licencias Premium.'}
            </p>
            <Button asChild variant="outline" className="w-full border-white/10">
              <Link to="/app/garage">Volver a Mi Garage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={renewingRoute !== null} onOpenChange={(open) => !open && setRenewingRoute(null)}>
        <DialogContent className="max-w-md border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>Renovar acceso Premium</DialogTitle>
            <DialogDescription className="text-gray-400">
              {renewingRoute?.title} permanece en tu historial, pero su mapa, GPX y edición están bloqueados.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 grid gap-3">
            <Card className="border-moto-orange/30 bg-moto-darker py-0">
              <CardContent className="p-4">
                <p className="font-semibold">Compra definitiva</p>
                <p className="mt-1 text-sm leading-6 text-gray-400">
                  Conserva el mapa, el GPX y todas las opciones de esta ruta sin vencimiento.
                </p>
                <p className="mt-3 text-xl font-black text-moto-orange">
                  {lifetimePrice === null ? 'Consultando precio…' : formatMoney(lifetimePrice)}
                </p>
                <Button
                  className="mt-4 w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark"
                  disabled={lifetimePrice === null || isRequestingPurchase}
                  onClick={() => void requestLifetimePurchase()}
                >
                  {isRequestingPurchase && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Solicitar compra definitiva
                </Button>
                <p className="mt-2 text-xs text-gray-500">La solicitud no genera un cobro automático. El acceso se activa cuando MotoCare confirma el pago.</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-moto-darker py-0">
              <CardContent className="p-4">
                <p className="font-semibold">Esperar a que vuelva a estar gratis</p>
                <p className="mt-1 text-sm leading-6 text-gray-400">
                  La ruta seguirá visible como historial. Podrás elegirla de nuevo cuando aparezca incluida en el beneficio mensual.
                </p>
                <Button asChild variant="outline" className="mt-4 w-full border-white/10">
                  <Link to="/app/premium-routes">Revisar catálogo Premium</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedMetric !== null} onOpenChange={(open) => !open && setSelectedMetric(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>{selectedMetric ? metricCopy[selectedMetric].title : 'Detalle de rutas'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedMetric ? metricCopy[selectedMetric].description : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            {metricRoutes.length > 0 ? (
              metricRoutes.map((route) => {
                const status = getRouteStatus(route)
                return (
                  <button
                    key={route.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/5 bg-moto-darker p-4 text-left transition-colors hover:border-moto-orange/40"
                    onClick={() => {
                      setSelectedMetric(null)
                      openRouteDetail(route)
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{route.title}</p>
                      <p className="mt-1 truncate text-sm text-gray-400">
                        {route.origin || 'Origen sin definir'}{' → '}{route.destination || 'Destino sin definir'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-moto-orange">{(route.distance_km ?? 0).toLocaleString()} km</p>
                      <p className="mt-1 text-xs text-gray-400">{status.label}</p>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-gray-400">
                No hay rutas para mostrar en este detalle.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateRoute} onOpenChange={(open) => {
        setShowCreateRoute(open)
        if (!open) {
          setEditingRoute(null)
          setRouteForm(emptyRouteForm)
        }
      }}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-md overflow-x-hidden overflow-y-auto overscroll-contain border-white/10 bg-moto-gray p-4 text-white sm:max-h-[90vh] sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingRoute ? 'Editar ruta' : 'Nueva ruta'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingRoute ? 'Actualiza los datos de tu ruta.' : 'Define origen y destino o importa un GPX para visualizar el recorrido en Google Maps.'}
            </DialogDescription>
          </DialogHeader>
          <form className="mt-4 space-y-4" onSubmit={handleSubmitRoute}>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Moto para esta ruta</span>
              <select
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={routeForm.motorcycle_id}
                onChange={(event) => setRouteForm({ ...routeForm, motorcycle_id: event.target.value })}
              >
                <option value="">Sin moto asignada</option>
                {motorcycles.map((motorcycle) => (
                  <option key={motorcycle.id} value={motorcycle.id}>
                    {motorcycleLabel(motorcycle)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Nombre</span>
              <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={routeForm.title} onChange={(event) => setRouteForm({ ...routeForm, title: event.target.value })} placeholder="Ruta a Guatavita" required />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Origen</span>
                <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={routeForm.origin} onChange={(event) => setRouteForm({ ...routeForm, origin: event.target.value })} placeholder="Bogota" />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Destino</span>
                <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={routeForm.destination} onChange={(event) => setRouteForm({ ...routeForm, destination: event.target.value })} placeholder="Guatavita" />
              </label>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-moto-darker">
              <Suspense fallback={<div className="grid h-64 place-items-center text-sm text-gray-400">Cargando mapa...</div>}>
                <GpxMap track={routeForm.track_geojson} origin={routeForm.origin} destination={routeForm.destination} />
              </Suspense>
              <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-2">
                {canUploadExternalGpx ? (
                  <label className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-white/10 px-3 text-sm font-medium hover:bg-white/5">Importar GPX propio<input type="file" accept=".gpx,application/gpx+xml" className="sr-only" onChange={(event) => void handleGpxFile(event.target.files?.[0])} /></label>
                ) : (
                  <div className="flex min-h-9 items-center justify-center rounded-md border border-moto-orange/20 bg-moto-orange/10 px-3 text-center text-xs text-moto-orange"><Lock className="mr-2 h-4 w-4" />GPX propio requiere Premium</div>
                )}
                <Button type="button" size="sm" variant="outline" className="border-white/10" disabled={purchasedRoutes.length === 0} onClick={() => void loadDemoGpx()}>Usar GPX de ruta Premium</Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Distancia km</span>
                <input type="number" min={0} className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={routeForm.distance_km} onChange={(event) => setRouteForm({ ...routeForm, distance_km: event.target.value })} placeholder="120" />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Duracion min</span>
                <input type="number" min={0} className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={routeForm.duration_minutes} onChange={(event) => setRouteForm({ ...routeForm, duration_minutes: event.target.value })} placeholder="165" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Fecha inicio</span>
                <input type="date" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={routeForm.start_date} onChange={(event) => setRouteForm({ ...routeForm, start_date: event.target.value })} />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Fecha final</span>
                <input type="date" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={routeForm.end_date} onChange={(event) => setRouteForm({ ...routeForm, end_date: event.target.value })} />
              </label>
            </div>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Visibilidad</span>
              <select className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={routeForm.visibility} onChange={(event) => setRouteForm({ ...routeForm, visibility: event.target.value as RouteForm['visibility'] })}>
                <option value="private">Privada</option>
                {canShareRoutes && <option value="community">Comunidad</option>}
              </select>
              {!canShareRoutes && <p className="mt-1 text-xs text-gray-500">Compartir con comunidad requiere licencia Premium.</p>}
            </label>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Estado</span>
              <select className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={routeForm.status} onChange={(event) => setRouteForm({ ...routeForm, status: event.target.value as RouteForm['status'] })}>
                <option value="planned">Planeada</option>
                <option value="in_progress">En curso</option>
                <option value="completed">Realizada</option>
              </select>
            </label>
            <Button type="submit" disabled={isSaving} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingRoute ? 'Actualizar ruta' : 'Guardar ruta'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showRouteDetail} onOpenChange={setShowRouteDetail}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-md overflow-x-hidden overflow-y-auto overscroll-contain border-white/10 bg-moto-gray p-4 text-white sm:max-h-[90vh] sm:p-6">
          <DialogHeader>
            <DialogTitle>{selectedRoute?.title ?? 'Detalle de ruta'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedRoute?.visibility === 'community' ? 'Ruta visible para la comunidad.' : 'Ruta privada.'}
            </DialogDescription>
          </DialogHeader>
          {selectedRoute && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={getRouteStatus(selectedRoute).className}>
                  {getRouteStatus(selectedRoute).label}
                </Badge>
                <Badge className={selectedRoute.visibility === 'community' ? 'bg-moto-orange text-moto-darker' : 'bg-white/10 text-gray-300'}>
                  {selectedRoute.visibility === 'community' ? 'Comunidad' : 'Privada'}
                </Badge>
              </div>
              <div className="rounded-xl border border-white/10 bg-moto-darker p-4">
                <p className="text-sm text-gray-400">Trayecto</p>
                <p className="mt-1 font-semibold">
                  {selectedRoute.origin || 'Origen sin definir'}{' -> '}{selectedRoute.destination || 'Destino sin definir'}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-moto-darker p-4">
                  <p className="text-sm text-gray-400">Distancia</p>
                  <p className="mt-1 font-semibold">{selectedRoute.distance_km ? `${selectedRoute.distance_km.toLocaleString()} km` : 'Sin definir'}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-moto-darker p-4">
                  <p className="text-sm text-gray-400">Duracion</p>
                  <p className="mt-1 font-semibold">{formatDuration(selectedRoute.duration_minutes)}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-moto-darker p-4">
                <p className="text-sm text-gray-400">Moto</p>
                <p className="mt-1 font-semibold">
                  {motorcycleNameFor(selectedRoute) ?? 'Sin moto asignada'}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-moto-darker p-4">
                <p className="text-sm text-gray-400">Fechas</p>
                <p className="mt-1 font-semibold">{formatRouteDates(selectedRoute)}</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-moto-darker">
                <Suspense fallback={<div className="grid h-72 place-items-center text-sm text-gray-400">Cargando mapa...</div>}>
                  <GpxMap
                    track={selectedRoute.track_geojson}
                    origin={selectedRoute.origin}
                    destination={selectedRoute.destination}
                    className="h-72"
                  />
                </Suspense>
              </div>
              <div className="rounded-xl border border-white/10 bg-moto-darker p-4">
                <p className="text-sm text-gray-400">Creada</p>
                <p className="mt-1 font-semibold">{new Date(selectedRoute.created_at).toLocaleDateString('es-CO')}</p>
              </div>
              <Button asChild className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
                <Link to={`/app/routes/${selectedRoute.id}`}>Ver detalle completo</Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
