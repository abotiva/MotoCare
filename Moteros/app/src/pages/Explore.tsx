import { useEffect, useMemo, useState } from 'react'
import { Bookmark, BookmarkCheck, Calendar, Clock, Loader2, MapPin, MessageCircle, Route as RouteIcon, Search, Star, TrendingUp, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { PostWithAuthor, RouteWithOwner } from '@/types/database'

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
  if (!minutes) return 'Sin duracion'
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

function relativeDate(value: string) {
  const created = new Date(value).getTime()
  const diffMinutes = Math.max(Math.floor((Date.now() - created) / 60_000), 0)
  if (diffMinutes < 1) return 'Ahora'
  if (diffMinutes < 60) return `${diffMinutes} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} h`
  return `${Math.floor(diffHours / 24)} d`
}

const routeStatusLabels: Record<RouteWithOwner['status'], string> = {
  planned: 'Planeada',
  in_progress: 'En curso',
  completed: 'Realizada',
}

export function Explore() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [routes, setRoutes] = useState<RouteWithOwner[]>([])
  const [posts, setPosts] = useState<PostWithAuthor[]>([])
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

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return posts

    return posts.filter((post) => {
      const author = post.profiles
      const route = post.routes
      return [post.content, author?.full_name, author?.username, author?.city, route?.title, route?.origin, route?.destination]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [posts, searchQuery])

  const completedRoutes = useMemo(() => routes.filter((route) => route.status === 'completed').length, [routes])
  const totalKm = useMemo(() => routes.reduce((total, route) => total + (route.distance_km ?? 0), 0), [routes])
  const savedRoutes = useMemo(() => routes.filter((route) => savedRouteIds.includes(route.id)), [routes, savedRouteIds])

  const loadExplore = async () => {
    if (!supabase) return
    setIsLoading(true)

    const [routesResult, postsResult, savedRoutesResult] = await Promise.all([
      supabase
        .from('routes')
        .select('*, profiles:owner_id(full_name, username, city, avatar_url)')
        .eq('visibility', 'community')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('posts')
        .select('*, profiles:author_id(full_name, username, city, avatar_url), routes:route_id(id, owner_id, title, origin, destination, distance_km, duration_minutes, start_date, end_date, visibility, status, created_at)')
        .order('created_at', { ascending: false })
        .limit(30),
      user
        ? supabase.from('saved_routes').select('route_id').eq('user_id', user.id)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (routesResult.error) {
      toast.error('No pudimos cargar rutas para explorar', { description: routesResult.error.message })
    } else {
      setRoutes((routesResult.data ?? []) as RouteWithOwner[])
    }

    if (postsResult.error) {
      toast.error('No pudimos cargar publicaciones', { description: postsResult.error.message })
    } else {
      setPosts((postsResult.data ?? []) as PostWithAuthor[])
    }

    if (savedRoutesResult.error) {
      toast.error('No pudimos cargar tus rutas guardadas', { description: savedRoutesResult.error.message })
    } else {
      setSavedRouteIds((savedRoutesResult.data ?? []).map((item) => item.route_id))
    }

    setIsLoading(false)
  }

  useEffect(() => {
    void loadExplore()
  }, [user?.id])

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
        <h1 className="mb-2 text-2xl font-bold">Explorar</h1>
        <p className="text-gray-400">Descubre rutas y actividad compartida por la comunidad MotoCare.</p>
      </div>

      <div className="mb-5 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-moto-orange/20">
              <RouteIcon className="h-6 w-6 text-moto-orange" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Rutas publicas</p>
              <p className="text-xl font-bold">{routes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-500/20">
              <TrendingUp className="h-6 w-6 text-sky-300" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Km compartidos</p>
              <p className="text-xl font-bold">{totalKm.toLocaleString()} km</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-green-500/20">
              <BookmarkCheck className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Guardadas</p>
              <p className="text-xl font-bold">{savedRouteIds.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

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

      <Tabs defaultValue="routes" className="w-full">
        <TabsList className="mb-6 w-full border-white/5 bg-moto-gray">
          <TabsTrigger value="routes" className="flex-1 data-[state=active]:bg-moto-orange data-[state=active]:text-moto-darker">
            Rutas
          </TabsTrigger>
          <TabsTrigger value="posts" className="flex-1 data-[state=active]:bg-moto-orange data-[state=active]:text-moto-darker">
            Publicaciones
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex-1 data-[state=active]:bg-moto-orange data-[state=active]:text-moto-darker">
            Guardadas
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 data-[state=active]:bg-moto-orange data-[state=active]:text-moto-darker">
            Actividad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-4">
          {filteredRoutes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredRoutes.map((route) => {
                const owner = route.profiles
                const ownerName = owner?.full_name || owner?.username || 'Motero MotoCare'

                return (
                  <Card key={route.id} className="overflow-hidden border-white/5 bg-moto-gray py-0">
                    <CardContent className="p-4">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-semibold">{route.title}</h3>
                          <p className="mt-1 flex items-center gap-1 text-sm text-gray-400">
                            <MapPin className="h-4 w-4" />
                            {route.origin || 'Origen sin definir'} - {route.destination || 'Destino sin definir'}
                          </p>
                        </div>
                        <Badge className="bg-sky-500/15 text-sky-300">{routeStatusLabels[route.status ?? 'planned']}</Badge>
                      </div>

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
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          {savedRoutes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {savedRoutes.map((route) => {
                const owner = route.profiles
                const ownerName = owner?.full_name || owner?.username || 'Motero MotoCare'

                return (
                  <Card key={route.id} className="overflow-hidden border-white/5 bg-moto-gray py-0">
                    <CardContent className="p-4">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-semibold">{route.title}</h3>
                          <p className="mt-1 flex items-center gap-1 text-sm text-gray-400">
                            <MapPin className="h-4 w-4" />
                            {route.origin || 'Origen sin definir'} - {route.destination || 'Destino sin definir'}
                          </p>
                        </div>
                        <Badge className="bg-sky-500/15 text-sky-300">{routeStatusLabels[route.status ?? 'planned']}</Badge>
                      </div>

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
                Aun no tienes rutas guardadas.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => {
              const author = post.profiles
              const authorName = author?.full_name || author?.username || 'Motero MotoCare'

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
                        <p className="text-xs text-gray-500">@{author?.username || 'motocare'} · {relativeDate(post.created_at)}</p>
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
      </Tabs>
    </div>
  )
}
