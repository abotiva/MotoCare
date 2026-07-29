import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, BookmarkCheck, Calendar, Clock, Loader2, MapPin, Route as RouteIcon, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { RouteWithOwner } from '@/types/database'

function initials(name: string | null | undefined, username: string | null | undefined) {
  const source = name || username || 'MC'
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function formatDuration(minutes: number | null) {
  if (!minutes) return 'Sin duración'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function formatRouteDates(route: { start_date: string | null; end_date: string | null }) {
  if (!route.start_date && !route.end_date) return 'Sin fechas'
  const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('es-CO')
  if (route.start_date && route.end_date) return `${formatDate(route.start_date)} - ${formatDate(route.end_date)}`
  if (route.start_date) return `Inicia ${formatDate(route.start_date)}`
  return `Finaliza ${formatDate(route.end_date!)}`
}

const routeStatusLabels: Record<RouteWithOwner['status'], string> = {
  planned: 'Planeada',
  in_progress: 'En curso',
  completed: 'Realizada',
}

export function Explore() {
  const { user } = useAuth()
  const userId = user?.id
  const [searchQuery, setSearchQuery] = useState('')
  const [routes, setRoutes] = useState<RouteWithOwner[]>([])
  const [savedRouteIds, setSavedRouteIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingRouteId, setSavingRouteId] = useState<string | null>(null)

  const filteredRoutes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return routes

    return routes.filter((route) => {
      const owner = route.profiles
      return [route.title, route.origin, route.destination, owner?.full_name, owner?.username, owner?.city]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [routes, searchQuery])

  const loadExplore = useCallback(async () => {
    if (!supabase) return
    setIsLoading(true)

    let routesQuery = supabase
        .from('routes')
        .select('*, profiles:owner_id(full_name, username, city, avatar_url)')
        .eq('visibility', 'community')
        .order('created_at', { ascending: false })
        .limit(50)
    if (userId) routesQuery = routesQuery.neq('owner_id', userId)

    const [routesResult, savedRoutesResult] = await Promise.all([
      routesQuery,
      userId
        ? supabase.from('saved_routes').select('route_id').eq('user_id', userId)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (routesResult.error) {
      toast.error('No pudimos cargar rutas para explorar', { description: routesResult.error.message })
    } else {
      setRoutes((routesResult.data ?? []) as RouteWithOwner[])
    }

    if (savedRoutesResult.error) {
      toast.error('No pudimos cargar tus rutas guardadas', { description: savedRoutesResult.error.message })
    } else {
      setSavedRouteIds((savedRoutesResult.data ?? []).map((item) => item.route_id))
    }

    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    void loadExplore()
  }, [loadExplore])

  const toggleSavedRoute = async (route: RouteWithOwner) => {
    if (!supabase || !user || savingRouteId) return

    const isSaved = savedRouteIds.includes(route.id)
    setSavingRouteId(route.id)
    setSavedRouteIds((current) => (isSaved ? current.filter((id) => id !== route.id) : [...current, route.id]))

    const { error } = isSaved
      ? await supabase.from('saved_routes').delete().eq('route_id', route.id).eq('user_id', user.id)
      : await supabase.from('saved_routes').insert({ route_id: route.id, user_id: user.id })

    if (error) {
      setSavedRouteIds((current) => (isSaved ? [...current, route.id] : current.filter((id) => id !== route.id)))
      toast.error('No pudimos actualizar guardados', { description: error.message })
    } else {
      toast.success(isSaved ? 'Ruta quitada de guardados' : 'Ruta guardada')
    }

    setSavingRouteId(null)
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-moto-orange">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 lg:p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">Descubrir rutas</h1>
        <p className="text-gray-400">Encuentra recorridos compartidos por la comunidad MotoCare.</p>
      </div>

      <Card className="relative mb-6 overflow-hidden border-moto-orange/30 bg-moto-darker py-0">
        <div className="absolute inset-0 bg-[url('/feature-gps.jpg')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-moto-darker via-moto-darker/90 to-moto-darker/40" />
        <CardContent className="relative flex min-h-44 flex-col justify-center gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="max-w-2xl">
            <Badge className="mb-3 bg-moto-orange text-moto-darker">Rutas Premium</Badge>
            <h2 className="text-xl font-bold sm:text-2xl">Recorridos seleccionados y GPX listos para usar</h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">Complementa las rutas públicas de la comunidad con experiencias Premium.</p>
          </div>
          <Button asChild className="shrink-0 bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
            <Link to="/app/premium-routes">Ver rutas Premium</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Buscar por ruta, ciudad, origen, destino o motero..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="border-white/5 bg-moto-gray pl-10"
          />
        </div>
      </div>

      <section className="space-y-4" aria-label="Rutas públicas de otros miembros">
          {filteredRoutes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredRoutes.map((route) => {
                const owner = route.profiles
                const ownerName = owner?.full_name || owner?.username || 'Motero MotoCare Co'

                return (
                  <Card key={route.id} className="overflow-hidden border-white/5 bg-moto-gray py-0">
                    <CardContent className="p-4">
                      <Link to={`/app/routes/${route.id}`} className="mb-4 block rounded-xl p-1 transition hover:bg-white/5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold">{route.title}</h3>
                            <p className="mt-1 flex items-center gap-1 text-sm text-gray-400">
                              <MapPin className="h-4 w-4" />
                              {route.origin || 'Origen sin definir'} - {route.destination || 'Destino sin definir'}
                            </p>
                          </div>
                          <Badge className="bg-sky-500/15 text-sky-300">{routeStatusLabels[route.status ?? 'planned']}</Badge>
                        </div>
                      </Link>

                      <div className="mb-4 flex items-center gap-3 rounded-xl bg-moto-darker p-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={owner?.avatar_url ?? undefined} />
                          <AvatarFallback>{initials(ownerName, owner?.username)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{ownerName}</p>
                          <p className="text-xs text-gray-500">{owner?.city || 'Ciudad sin definir'}</p>
                        </div>
                      </div>

                      <div className="mb-4 flex flex-wrap gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <RouteIcon className="h-4 w-4 text-moto-orange" />
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

                      <Button
                        disabled={savingRouteId === route.id}
                        className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark"
                        onClick={() => void toggleSavedRoute(route)}
                      >
                        {savedRouteIds.includes(route.id) ? <BookmarkCheck className="mr-2 h-4 w-4" /> : <Bookmark className="mr-2 h-4 w-4" />}
                        {savedRouteIds.includes(route.id) ? 'Guardada' : 'Guardar para despues'}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-white/5 bg-moto-gray py-0">
              <CardContent className="p-8 text-center text-gray-400">
                <RouteIcon className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                No hay rutas que coincidan con la busqueda.
              </CardContent>
            </Card>
          )}
      </section>

        {/*
          {savedRoutes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {savedRoutes.map((route) => {
                const owner = route.profiles
                const ownerName = owner?.full_name || owner?.username || 'Motero MotoCare Co'

                return (
                  <Card key={route.id} className="overflow-hidden border-white/5 bg-moto-gray py-0">
                    <CardContent className="p-4">
                      <Link to={`/app/routes/${route.id}`} className="mb-4 block rounded-xl p-1 transition hover:bg-white/5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold">{route.title}</h3>
                            <p className="mt-1 flex items-center gap-1 text-sm text-gray-400">
                              <MapPin className="h-4 w-4" />
                              {route.origin || 'Origen sin definir'} - {route.destination || 'Destino sin definir'}
                            </p>
                          </div>
                          <Badge className="bg-sky-500/15 text-sky-300">{routeStatusLabels[route.status ?? 'planned']}</Badge>
                        </div>
                      </Link>

                      <div className="mb-4 flex items-center gap-3 rounded-xl bg-moto-darker p-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={owner?.avatar_url ?? undefined} />
                          <AvatarFallback>{initials(ownerName, owner?.username)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{ownerName}</p>
                          <p className="text-xs text-gray-500">{owner?.city || 'Ciudad sin definir'}</p>
                        </div>
                      </div>

                      <div className="mb-4 flex flex-wrap gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <RouteIcon className="h-4 w-4 text-moto-orange" />
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

                      <Button
                        variant="outline"
                        disabled={savingRouteId === route.id}
                        className="w-full border-white/10"
                        onClick={() => void toggleSavedRoute(route)}
                      >
                        <BookmarkCheck className="mr-2 h-4 w-4" />
                        Quitar de guardadas
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-white/5 bg-moto-gray py-0">
              <CardContent className="p-8 text-center text-gray-400">
                <Bookmark className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                <p className="font-semibold text-white">Tu próxima aventura está por comenzar</p>
                <p className="mt-2">Guarda rutas creadas por la comunidad para encontrarlas aquí.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => {
              const author = post.profiles
              const authorName = author?.full_name || author?.username || 'Motero MotoCare Co'

              return (
                <Card key={post.id} className="border-white/5 bg-moto-gray py-0">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={author?.avatar_url ?? undefined} />
                        <AvatarFallback>{initials(authorName, author?.username)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{authorName}</p>
                        <p className="text-xs text-gray-500">@{author?.username || 'motocare'} - {relativeDate(post.created_at)}</p>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-100">{post.content}</p>
                    {post.routes && (
                      <div className="mt-4 rounded-xl border border-white/10 bg-moto-darker p-4">
                        <p className="font-semibold">{post.routes.title}</p>
                        <p className="mt-1 text-sm text-gray-400">
                          {post.routes.origin || 'Origen sin definir'} - {post.routes.destination || 'Destino sin definir'}
                        </p>
                        <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatRouteDates(post.routes)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card className="border-white/5 bg-moto-gray py-0">
              <CardContent className="p-8 text-center text-gray-400">
                <MessageCircle className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                No hay publicaciones que coincidan con la busqueda.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity">
          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Resumen de comunidad</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-moto-darker p-4">
                  <Users className="mb-3 h-6 w-6 text-moto-orange" />
                  <p className="text-sm text-gray-400">Publicaciones visibles</p>
                  <p className="mt-1 text-2xl font-bold">{posts.length}</p>
                </div>
                <div className="rounded-xl bg-moto-darker p-4">
                  <RouteIcon className="mb-3 h-6 w-6 text-moto-orange" />
                  <p className="text-sm text-gray-400">Rutas con comunidad</p>
                  <p className="mt-1 text-2xl font-bold">{routes.length}</p>
                </div>
                <div className="rounded-xl bg-moto-darker p-4">
                  <Star className="mb-3 h-6 w-6 text-moto-orange" />
                  <p className="text-sm text-gray-400">Rutas realizadas</p>
                  <p className="mt-1 text-2xl font-bold">{completedRoutes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        */}
    </div>
  )
}
