import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, CheckCircle2, Clock, Edit3, Eye, EyeOff, Flag, Loader2, MapPin, Navigation, PlayCircle, Plus, Route, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { RoutePlan } from '@/types/database'

type RouteForm = {
  title: string
  origin: string
  destination: string
  distance_km: string
  duration_minutes: string
  start_date: string
  end_date: string
  visibility: 'private' | 'community'
  status: RoutePlan['status']
}

const emptyRouteForm: RouteForm = {
  title: '',
  origin: '',
  destination: '',
  distance_km: '',
  duration_minutes: '',
  start_date: '',
  end_date: '',
  visibility: 'private',
  status: 'planned',
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

function formatDuration(minutes: number | null) {
  if (!minutes) return 'Sin duracion'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function formatRouteDates(route: RoutePlan) {
  if (!route.start_date && !route.end_date) return 'Sin fechas'
  const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('es-CO')
  if (route.start_date && route.end_date) return `${formatDate(route.start_date)} - ${formatDate(route.end_date)}`
  if (route.start_date) return `Inicia ${formatDate(route.start_date)}`
  return `Finaliza ${formatDate(route.end_date!)}`
}

function routeSearchValue(route: RoutePlan) {
  const points = [route.origin, route.destination].filter(Boolean)
  return points.length > 0 ? points.join(' to ') : route.title
}

function routeFormSearchValue(routeForm: RouteForm) {
  const points = [routeForm.origin.trim(), routeForm.destination.trim()].filter(Boolean)
  return points.length > 0 ? points.join(' to ') : routeForm.title.trim()
}

function googleMapsUrl(route: RoutePlan) {
  const query = encodeURIComponent(routeSearchValue(route))
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

function googleMapsFormUrl(routeForm: RouteForm) {
  const query = encodeURIComponent(routeFormSearchValue(routeForm))
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

function googleMapsEmbedUrl(route: RoutePlan) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY as string | undefined
  if (!apiKey) return null

  const origin = route.origin?.trim()
  const destination = route.destination?.trim()
  const mode = origin && destination ? 'directions' : 'place'
  const query = encodeURIComponent(routeSearchValue(route))

  if (mode === 'directions') {
    return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(origin!)}&destination=${encodeURIComponent(destination!)}&mode=driving`
  }

  return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}`
}

function googleMapsFormEmbedUrl(routeForm: RouteForm) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY as string | undefined
  if (!apiKey) return null

  const origin = routeForm.origin.trim()
  const destination = routeForm.destination.trim()
  const query = encodeURIComponent(routeFormSearchValue(routeForm))

  if (origin && destination) {
    return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving`
  }

  if (origin || destination || routeForm.title.trim()) {
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}`
  }

  return null
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
      message: `La ruta "${route.title}" esta programada para el ${startDate.toLocaleDateString('es-CO')}.`,
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
    message: `La ruta "${route.title}" sigue en curso y ya paso su fecha final.`,
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
}: {
  route: RoutePlan
  isOwner: boolean
  onOpen: (route: RoutePlan) => void
  onEdit?: (route: RoutePlan) => void
  onDelete?: (route: RoutePlan) => void
  onToggleVisibility?: (route: RoutePlan) => void
  onUpdateStatus?: (route: RoutePlan, status: RoutePlan['status']) => void
}) {
  const status = getRouteStatus(route)
  const StatusIcon = status.icon

  return (
    <div className="rounded-xl border border-white/5 bg-moto-darker p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{route.title}</h3>
          <p className="mt-1 text-sm text-gray-400">
            {route.origin || 'Origen sin definir'}{' -> '}{route.destination || 'Destino sin definir'}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
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
        <Button size="sm" variant="outline" className="border-white/10" onClick={() => onOpen(route)}>
          Ver detalle
        </Button>
        {isOwner && onToggleVisibility && (
          <Button size="sm" variant="outline" className="border-white/10" onClick={() => onToggleVisibility(route)}>
            {route.visibility === 'community' ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {route.visibility === 'community' ? 'Hacer privada' : 'Compartir'}
          </Button>
        )}
        {isOwner && onEdit && (
          <Button size="sm" variant="outline" className="border-white/10" onClick={() => onEdit(route)}>
            <Edit3 className="mr-2 h-4 w-4" />
            Editar
          </Button>
        )}
        {isOwner && onDelete && (
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-300 hover:text-red-200" onClick={() => onDelete(route)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        )}
        {isOwner && onUpdateStatus && (
          <select
            className="h-9 rounded-md border border-white/10 bg-moto-gray px-3 text-sm text-white"
            value={route.status ?? 'planned'}
            onChange={(event) => onUpdateStatus(route, event.target.value as RoutePlan['status'])}
          >
            <option value="planned">Planeada</option>
            <option value="in_progress">En curso</option>
            <option value="completed">Realizada</option>
          </select>
        )}
      </div>
    </div>
  )
}

export function Map() {
  const { user } = useAuth()
  const [myRoutes, setMyRoutes] = useState<RoutePlan[]>([])
  const [routeForm, setRouteForm] = useState<RouteForm>(emptyRouteForm)
  const [editingRoute, setEditingRoute] = useState<RoutePlan | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<RoutePlan | null>(null)
  const [showCreateRoute, setShowCreateRoute] = useState(false)
  const [showRouteDetail, setShowRouteDetail] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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

  const loadRoutes = async () => {
    if (!supabase || !user) return
    setIsLoading(true)

    const myRoutesResult = await supabase.from('routes').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })

    if (myRoutesResult.error) {
      toast.error('No pudimos cargar tus rutas', { description: myRoutesResult.error.message })
    } else {
      const nextRoutes = (myRoutesResult.data ?? []) as RoutePlan[]
      setMyRoutes(nextRoutes)
      void Promise.all(nextRoutes.map((route) => syncRouteNotifications(route)))
    }

    setIsLoading(false)
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
    setEditingRoute(null)
    setRouteForm(emptyRouteForm)
    setShowCreateRoute(true)
  }

  const openEditRoute = (route: RoutePlan) => {
    setEditingRoute(route)
    setRouteForm({
      title: route.title,
      origin: route.origin ?? '',
      destination: route.destination ?? '',
      distance_km: route.distance_km?.toString() ?? '',
      duration_minutes: route.duration_minutes?.toString() ?? '',
      start_date: route.start_date ?? '',
      end_date: route.end_date ?? '',
      visibility: route.visibility,
      status: route.status ?? 'planned',
    })
    setShowCreateRoute(true)
  }

  const handleSubmitRoute = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return

    if (!routeForm.title.trim()) {
      toast.error('Nombre requerido', { description: 'La ruta necesita un nombre.' })
      return
    }

    if (Number(routeForm.distance_km || 0) < 0 || Number(routeForm.duration_minutes || 0) < 0) {
      toast.error('Datos invalidos', { description: 'La distancia y duracion no pueden ser negativas.' })
      return
    }

    if (routeForm.start_date && routeForm.end_date && routeForm.end_date < routeForm.start_date) {
      toast.error('Fechas invalidas', { description: 'La fecha final no puede ser anterior a la fecha de inicio.' })
      return
    }

    setIsSaving(true)

    const payload = {
        owner_id: user.id,
        title: routeForm.title.trim(),
        origin: routeForm.origin.trim() || null,
        destination: routeForm.destination.trim() || null,
        distance_km: routeForm.distance_km ? Number(routeForm.distance_km) : null,
        duration_minutes: routeForm.duration_minutes ? Number(routeForm.duration_minutes) : null,
        start_date: routeForm.start_date || null,
        end_date: routeForm.end_date || null,
        visibility: routeForm.visibility,
        status: routeForm.status,
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
        description: route.visibility === 'community' ? 'La ruta quedo visible para la comunidad.' : 'La ruta quedo guardada como privada.',
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
        toast.error('La ruta se guardo, pero no pudimos crear sus notificaciones', { description: insertError.message })
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
    const confirmed = window.confirm(`Eliminar la ruta "${route.title}"? Esta accion no se puede deshacer.`)
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
      toast.success('Estado actualizado', { description: `La ruta quedo como ${getRouteStatus(updatedRoute).label.toLowerCase()}.` })
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
    <div className="mx-auto max-w-6xl p-4 pb-24 lg:p-6">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold">Rutas</h1>
          <p className="text-gray-400">Guarda rutas manuales y comparte las mejores con la comunidad.</p>
        </div>
        <Button className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={openCreateRoute}>
          <Plus className="mr-2 h-5 w-5" />
          Nueva ruta
        </Button>
      </div>

      <div className="mb-5 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-moto-orange/20">
              <Route className="h-6 w-6 text-moto-orange" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Mis rutas</p>
              <p className="text-xl font-bold">{myRoutes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-green-500/20">
              <Navigation className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Km planeados</p>
              <p className="text-xl font-bold">{totalKm.toLocaleString()} km</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-yellow-500/20">
              <Eye className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Mis compartidas</p>
              <p className="text-xl font-bold">{sharedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-green-500/20">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Realizadas</p>
              <p className="text-xl font-bold">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {myRoutes.length > 0 ? (
            myRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                isOwner
                onOpen={openRouteDetail}
                onEdit={openEditRoute}
                onDelete={deleteRoute}
                onToggleVisibility={toggleRouteVisibility}
                onUpdateStatus={updateRouteStatus}
              />
            ))
          ) : (
            <Card className="border-white/5 bg-moto-gray py-0">
              <CardContent className="p-8 text-center text-gray-400">
                <MapPin className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                Aun no tienes rutas guardadas.
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit border-white/5 bg-moto-gray py-0">
          <CardContent className="p-5">
            <h2 className="mb-2 font-semibold">Descubrir rutas</h2>
            <p className="mb-4 text-sm leading-6 text-gray-400">
              Las rutas de otros moteros viven en Explorar. Asi este modulo queda dedicado a planear y administrar tus propias rutas.
            </p>
            <Button asChild variant="outline" className="w-full border-white/10">
              <Link to="/app/explore">Ir a Explorar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateRoute} onOpenChange={(open) => {
        setShowCreateRoute(open)
        if (!open) {
          setEditingRoute(null)
          setRouteForm(emptyRouteForm)
        }
      }}>
        <DialogContent className="max-w-md border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>{editingRoute ? 'Editar ruta' : 'Nueva ruta'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingRoute ? 'Actualiza los datos de tu ruta.' : 'Crea una ruta manual sin activar GPS ni mapas pagos.'}
            </DialogDescription>
          </DialogHeader>
          <form className="mt-4 space-y-4" onSubmit={handleSubmitRoute}>
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
              {googleMapsFormEmbedUrl(routeForm) ? (
                <iframe
                  key={googleMapsFormEmbedUrl(routeForm)!}
                  title="Vista previa de ruta"
                  src={googleMapsFormEmbedUrl(routeForm)!}
                  className="h-64 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="grid h-40 place-items-center p-4 text-center text-sm text-gray-400">
                  Escriba el origen y destino para ubicar los puntos en el mapa.
                </div>
              )}
              <div className="border-t border-white/10 p-3">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="w-full border-white/10"
                  disabled={!routeForm.origin.trim() && !routeForm.destination.trim() && !routeForm.title.trim()}
                >
                  <a href={googleMapsFormUrl(routeForm)} target="_blank" rel="noreferrer">
                    Ajustar en Google Maps
                  </a>
                </Button>
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
                <option value="community">Comunidad</option>
              </select>
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
        <DialogContent className="max-w-md border-white/10 bg-moto-gray text-white">
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
                <p className="text-sm text-gray-400">Fechas</p>
                <p className="mt-1 font-semibold">{formatRouteDates(selectedRoute)}</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-moto-darker">
                {googleMapsEmbedUrl(selectedRoute) ? (
                  <iframe
                    title={`Mapa de ${selectedRoute.title}`}
                    src={googleMapsEmbedUrl(selectedRoute)!}
                    className="h-72 w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="p-4">
                    <p className="text-sm text-gray-400">Mapa</p>
                    <p className="mt-1 text-sm text-gray-300">
                      Configure `VITE_GOOGLE_MAPS_EMBED_KEY` para ver el mapa embebido sin activar APIs de calculo de rutas.
                    </p>
                  </div>
                )}
                <div className="border-t border-white/10 p-3">
                  <Button asChild size="sm" variant="outline" className="w-full border-white/10">
                    <a href={googleMapsUrl(selectedRoute)} target="_blank" rel="noreferrer">
                      Abrir en Google Maps
                    </a>
                  </Button>
                </div>
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
