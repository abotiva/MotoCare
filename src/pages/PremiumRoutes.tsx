import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  ChevronLeft,
  Filter,
  Gauge,
  Lock,
  MapPin,
  Mountain,
  PackageCheck,
  Pencil,
  Plus,
  Route,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminPremiumRouteDialog, type CreatedPremiumRoute } from '@/components/AdminPremiumRouteDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'

type PremiumRoute = {
  id: string
  title: string
  subtitle: string
  location: string
  level: 3 | 4 | 5
  distance: string
  duration: string
  terrain: string
  compatibility: string
  image: string
  progress: number
  badge: string
  includes: string[]
  pois: string[]
  checklist: string[]
  gpxPath?: string
  isMonthlyFree?: boolean
  isManaged?: boolean
  managedData?: CreatedPremiumRoute
}

const premiumRoutes: PremiumRoute[] = [
  {
    id: 'nevado-ruiz-adventure',
    title: 'Nevado del Ruiz Adventure',
    subtitle: 'Alta montana, miradores volcanicos y destapado controlado.',
    location: 'Manizales - Murillo - Libano',
    level: 4,
    distance: '168 km',
    duration: '7 h',
    terrain: '60% pavimento / 40% destapado',
    compatibility: 'Alta para adventure y doble proposito. Precaucion en naked de baja altura.',
    image: '/feature-gps.jpg',
    progress: 42,
    badge: 'Ruta verificada',
    includes: ['Archivo GPX', 'Roadbook por tramos', '18 puntos de interes', 'Checklist de alta montana', 'Contactos de emergencia'],
    pois: ['Mirador del Ruiz', 'Termales del Otono', 'Gasolinera Murillo', 'Cafe de montana en Libano'],
    checklist: ['Presion de llantas', 'Aceite y refrigerante', 'Cadena limpia y lubricada', 'Impermeable y guantes termicos'],
  },
  {
    id: 'chicamocha-touring',
    title: 'Canon del Chicamocha Touring',
    subtitle: 'Ruta panoramica con curvas tecnicas y paradas gastronomicas.',
    location: 'Bucaramanga - Mesa de los Santos - Barichara',
    level: 3,
    distance: '236 km',
    duration: '8 h',
    terrain: 'Pavimento técnico y montaña',
    compatibility: 'Alta para touring, sport touring, naked y adventure.',
    image: '/hero-motorcycle.jpg',
    progress: 0,
    badge: 'Escenica',
    includes: ['Roadbook visual', '12 miradores', 'Presupuesto de peajes', 'Restaurantes recomendados'],
    pois: ['Mesa de los Santos', 'Parque Chicamocha', 'San Gil', 'Barichara'],
    checklist: ['Frenos', 'Presion de llantas', 'Hidratacion', 'Revision de luces'],
  },
  {
    id: 'alta-guajira-expedition',
    title: 'Alta Guajira Expedition',
    subtitle: 'Experiencia remota para pilotos con manejo off-road y autonomia.',
    location: 'Riohacha - Cabo de la Vela - Punta Gallinas',
    level: 5,
    distance: '392 km',
    duration: '3 dias',
    terrain: 'Arena, trocha, viento fuerte y zonas remotas',
    compatibility: 'Solo recomendada para adventure con llantas mixtas y piloto experto.',
    image: '/app-mockup.jpg',
    progress: 0,
    badge: 'Expedicion',
    includes: ['Mapa offline', 'Plan de combustible', 'Waypoints criticos', 'Lista de equipo obligatorio'],
    pois: ['Cabo de la Vela', 'Dunas de Taroa', 'Faro Punta Gallinas', 'Uribia'],
    checklist: ['Autonomia extendida', 'Hidratacion extra', 'GPS offline', 'Revision de filtro de aire'],
  },
  {
    id: 'sierra-nevada-caribbean',
    title: 'Sierra Nevada Caribe',
    subtitle: 'Ascenso desde el Caribe entre bosque tropical, café y vistas al mar.',
    location: 'Santa Marta - Minca - San Lorenzo',
    level: 4,
    distance: '124 km',
    duration: '6 h',
    terrain: 'Pavimento de montaña y destapado intermedio',
    compatibility: 'Recomendada para doble propósito, adventure y pilotos intermedios.',
    image: '/community.jpg',
    progress: 0,
    badge: 'Montaña y mar',
    includes: ['Archivo GPX', 'Mapa offline', 'Puntos de hidratación', 'Checklist de montaña'],
    pois: ['Minca', 'Cerro Kennedy', 'San Lorenzo', 'Mirador del Caribe'],
    checklist: ['Frenos', 'Kit de lluvia', 'Hidratación', 'Protección solar'],
  },
  {
    id: 'boyaca-lagunas',
    title: 'Circuito Lagunas de Boyacá',
    subtitle: 'Una jornada entre pueblos coloniales, páramo y lagunas de alta montaña.',
    location: 'Tunja - Tota - Iza - Paipa',
    level: 3,
    distance: '218 km',
    duration: '8 h',
    terrain: 'Pavimento rural y tramos fríos de montaña',
    compatibility: 'Apta para touring, naked, scooter grande y adventure.',
    image: '/feature-maintenance.jpg',
    progress: 0,
    badge: 'Ruta cultural',
    includes: ['Archivo GPX', 'Roadbook', 'Paradas gastronómicas', 'Presupuesto estimado'],
    pois: ['Laguna de Tota', 'Iza', 'Duitama', 'Paipa'],
    checklist: ['Documentos', 'Ropa térmica', 'Presión de llantas', 'Luces'],
  },
]

type MonthlyClaim = {
  route_id: string
  claimed_at: string
  expires_at: string
}

type MonthlyQuota = {
  used: number
  monthly_limit: number
  remaining: number
  period_start: string
  expires_at: string
}

function mapManagedRoute(route: CreatedPremiumRoute): PremiumRoute {
  const duration = route.duration_minutes
    ? `${Math.floor(route.duration_minutes / 60)} h ${route.duration_minutes % 60} min`
    : 'Tiempo por definir'
  return {
    id: route.id,
    title: route.title,
    subtitle: route.description,
    location: route.location || 'Ubicación por definir',
    level: route.level,
    distance: `${Number(route.distance_km).toFixed(1)} km`,
    duration,
    terrain: route.terrain || 'Terreno por confirmar',
    compatibility: route.motorcycle_compatibility,
    image: '/feature-gps.jpg',
    progress: 0,
    badge: 'Ruta verificada',
    includes: [
      'Archivo GPX',
      route.elevation_gain_m === null ? 'Perfil de elevación no disponible' : `${route.elevation_gain_m} m de ascenso acumulado`,
      'Datos técnicos verificados por MotoCare',
    ],
    pois: ['Los puntos de interés se completan en la descripción de la ruta.'],
    checklist: ['Revisar estado de la vía', 'Confirmar combustible y autonomía', 'Descargar el GPX antes de salir'],
    gpxPath: route.gpx_storage_path,
    isMonthlyFree: route.is_monthly_free,
    isManaged: true,
    managedData: route,
  }
}

function levelLabel(level: PremiumRoute['level']) {
  if (level === 3) return 'Nivel 3 - Adventure Light'
  if (level === 4) return 'Nivel 4 - Adventure'
  return 'Nivel 5 - Extrema'
}

export function PremiumRoutes() {
  const { user } = useAuth()
  const { effectivePlan, isLoadingSubscription } = useSubscription()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<'all' | 'level-3' | 'level-4'>('all')
  const [routes, setRoutes] = useState<PremiumRoute[]>(premiumRoutes)
  const [selectedRoute, setSelectedRoute] = useState<PremiumRoute>(premiumRoutes[0])
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'detail' ? 'detail' : 'catalog')
  const [claims, setClaims] = useState<MonthlyClaim[]>([])
  const [quota, setQuota] = useState<MonthlyQuota | null>(null)
  const [isLoadingClaims, setIsLoadingClaims] = useState(true)
  const [claimingRouteId, setClaimingRouteId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<CreatedPremiumRoute | null>(null)
  const hasPremiumPlan = effectivePlan === 'premium' || effectivePlan === 'pro'

  const filteredRoutes = useMemo(() => {
    return routes.filter((routeItem) => {
      if (filter === 'all') return true
      if (filter === 'level-3') return routeItem.level === 3
      if (filter === 'level-4') return routeItem.level === 4
      return true
    })
  }, [filter, routes])

  const claimedRouteIds = claims.map((claim) => claim.route_id)
  const ownedRoutes = routes.filter((routeItem) => claimedRouteIds.includes(routeItem.id))
  const isSelectedOwned = claimedRouteIds.includes(selectedRoute.id)

  useEffect(() => {
    if (!supabase || !user?.id) {
      setClaims([])
      setQuota(null)
      setIsLoadingClaims(false)
      return
    }
    const client = supabase

    const loadMonthlyAccess = async () => {
      setIsLoadingClaims(true)
      const now = new Date().toISOString()
      const [claimsResult, quotaResult] = await Promise.all([
        client
          .from('premium_route_monthly_claims')
          .select('route_id, claimed_at, expires_at')
          .gt('expires_at', now)
          .order('claimed_at', { ascending: false }),
        client.rpc('current_premium_route_quota'),
      ])

      if (claimsResult.error || quotaResult.error) {
        toast.error('No pudimos consultar tus rutas Premium', {
          description: claimsResult.error?.message ?? quotaResult.error?.message,
        })
      } else {
        setClaims((claimsResult.data ?? []) as MonthlyClaim[])
        const quotaRow = Array.isArray(quotaResult.data) ? quotaResult.data[0] : quotaResult.data
        setQuota((quotaRow ?? null) as MonthlyQuota | null)
      }
      setIsLoadingClaims(false)
    }

    void loadMonthlyAccess()
  }, [user?.id])

  useEffect(() => {
    if (!supabase || !user?.id) return
    const client = supabase
    const loadCatalogue = async () => {
      const [adminResult, routesResult] = await Promise.all([
        client.rpc('is_current_user_admin'),
        client.from('premium_routes').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      ])
      setIsAdmin(Boolean(adminResult.data))
      if (!routesResult.error && routesResult.data) {
        const managedRoutes = (routesResult.data as CreatedPremiumRoute[]).map(mapManagedRoute)
        if (managedRoutes.length) setRoutes(managedRoutes)
      }
    }
    void loadCatalogue()
  }, [user?.id])

  useEffect(() => {
    const routeId = searchParams.get('route')
    const requestedRoute = routes.find((routeItem) => routeItem.id === routeId)
    if (requestedRoute) {
      setSelectedRoute(requestedRoute)
      setActiveTab(searchParams.get('tab') === 'detail' ? 'detail' : 'catalog')
      return
    }
    if (!routeId && !searchParams.get('tab')) {
      setActiveTab('catalog')
      setSelectedRoute(routes[0])
    }
  }, [routes, searchParams])

  const claimRoute = async (routeItem: PremiumRoute) => {
    setSelectedRoute(routeItem)
    if (claimedRouteIds.includes(routeItem.id)) {
      setActiveTab('owned')
      return
    }
    if (!hasPremiumPlan) {
      toast.error('Esta opción requiere licencia Premium')
      return
    }
    if (routeItem.isManaged && !routeItem.isMonthlyFree) {
      toast.info('Esta ruta no está incluida gratis para Premium este mes')
      return
    }
    if (!supabase) return

    setClaimingRouteId(routeItem.id)
    const { data, error } = await supabase.rpc('claim_monthly_premium_route', {
      target_route_id: routeItem.id,
    })
    setClaimingRouteId(null)

    if (error) {
      toast.error('No pudimos habilitar la ruta', { description: error.message })
      return
    }

    const row = (Array.isArray(data) ? data[0] : data) as MonthlyClaim & { remaining: number }
    setClaims((current) => [
      { route_id: row.route_id, claimed_at: row.claimed_at, expires_at: row.expires_at },
      ...current.filter((claim) => claim.route_id !== row.route_id),
    ])
    setQuota((current) => current ? { ...current, used: 5 - row.remaining, remaining: row.remaining, expires_at: row.expires_at } : current)
    toast.success('Ruta Premium habilitada', {
      description: `Te quedan ${row.remaining} rutas gratis este mes.`,
    })
  }

  const downloadGpx = async (routeItem: PremiumRoute) => {
    try {
      let blob: Blob
      if (routeItem.gpxPath && supabase) {
        const { data, error } = await supabase.storage.from('premium-route-files').download(routeItem.gpxPath)
        if (error) throw error
        blob = data
      } else {
        const response = await fetch('/demo-guatavita.gpx')
        if (!response.ok) throw new Error('No pudimos preparar el archivo GPX.')
        blob = await response.blob()
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${routeItem.id}.gpx`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Descarga GPX iniciada')
    } catch (error) {
      toast.error('No pudimos descargar la ruta', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      })
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" className="border-white/10 bg-white/5" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        {isAdmin && (
          <Button className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear ruta Premium
          </Button>
        )}
      </div>
      <section className="mb-6 overflow-hidden rounded-xl border border-moto-orange/20 bg-moto-darker">
        <div className="relative grid min-h-[360px] gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
          <div className="absolute inset-0 bg-[url('/feature-gps.jpg')] bg-cover bg-center opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-moto-darker via-moto-darker/90 to-moto-darker/50" />
          <div className="relative flex flex-col justify-end">
            <Badge className="mb-4 w-fit bg-moto-orange text-moto-darker">
              MotoCare Experiences
            </Badge>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Rutas Premium predeterminadas para viajar con tu moto lista.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">
              Tu licencia Premium incluye hasta cinco rutas verificadas por mes con GPX,
              puntos de interés y checklist. El acceso se renueva al iniciar cada mes.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => { setSelectedRoute(routes[0]); setActiveTab('detail') }}>
                <Route className="mr-2 h-4 w-4" />
                Ver {routes[0].title}
              </Button>
              <Button variant="outline" className="border-white/10 bg-white/5">
                <PackageCheck className="mr-2 h-4 w-4" />
                {quota ? `${quota.remaining} de ${quota.monthly_limit} disponibles` : '5 rutas gratis al mes'}
              </Button>
            </div>
          </div>

          <Card className="relative self-end border-moto-orange/30 bg-moto-dark/90 py-0 shadow-glow">
            <CardContent className="p-5">
              <Badge className="mb-3 bg-white/10 text-gray-200">{selectedRoute.badge}</Badge>
              <h2 className="text-xl font-bold">{selectedRoute.title}</h2>
              <p className="mt-1 text-sm text-gray-400">{selectedRoute.location}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <Metric icon={Gauge} label={levelLabel(selectedRoute.level)} />
                <Metric icon={MapPin} label={selectedRoute.distance} />
              </div>
              <p className="mt-4 text-2xl font-black text-moto-orange">Incluida con Premium</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="grid w-full grid-cols-3 border border-white/10 bg-moto-darker p-1 sm:w-fit">
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          <TabsTrigger value="detail">Detalle</TabsTrigger>
          <TabsTrigger value="owned">Mis rutas</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-moto-orange">
                <Filter className="h-4 w-4" />
                Filtros basicos
              </div>
              <h2 className="text-2xl font-bold">Catálogo de rutas Premium</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>Todas</FilterButton>
              <FilterButton active={filter === 'level-3'} onClick={() => setFilter('level-3')}>Nivel 3</FilterButton>
              <FilterButton active={filter === 'level-4'} onClick={() => setFilter('level-4')}>Nivel 4</FilterButton>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRoutes.map((routeItem) => (
              <RouteCard
                key={routeItem.id}
                routeItem={routeItem}
                owned={claimedRouteIds.includes(routeItem.id)}
                disabled={isLoadingClaims || isLoadingSubscription || claimingRouteId === routeItem.id || (routeItem.isManaged && !routeItem.isMonthlyFree) || (!claimedRouteIds.includes(routeItem.id) && (quota?.remaining === 0 || !hasPremiumPlan))}
                onDetail={() => {
                  setSelectedRoute(routeItem)
                  setActiveTab('detail')
                  setSearchParams({ route: routeItem.id, tab: 'detail' })
                }}
                onBuy={() => void claimRoute(routeItem)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detail">
          <RouteDetailPanel
            routeItem={selectedRoute}
            owned={isSelectedOwned}
            disabled={isLoadingClaims || isLoadingSubscription || claimingRouteId === selectedRoute.id || (selectedRoute.isManaged && !selectedRoute.isMonthlyFree) || (!isSelectedOwned && (quota?.remaining === 0 || !hasPremiumPlan))}
            onBuy={() => void claimRoute(selectedRoute)}
            onBack={() => {
              setActiveTab('catalog')
              setSearchParams({})
            }}
            onEdit={isAdmin && selectedRoute.managedData ? () => {
              setEditingRoute(selectedRoute.managedData ?? null)
              setIsCreateOpen(true)
            } : undefined}
          />
        </TabsContent>

        <TabsContent value="owned">
          <div className="grid gap-4">
            {ownedRoutes.map((routeItem) => (
              <Card key={routeItem.id} className="border-white/5 bg-moto-gray py-0">
                <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
                  <div className="min-w-0">
                    <Badge className="mb-3 bg-green-500/15 text-green-300">
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Disponible este mes
                    </Badge>
                    <h3 className="text-xl font-bold">{routeItem.title}</h3>
                    <p className="mt-1 text-sm text-gray-400">{routeItem.location}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      Disponible hasta {new Date(claims.find((claim) => claim.route_id === routeItem.id)?.expires_at ?? '').toLocaleDateString('es-CO')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-white/10 text-gray-300">{routeItem.distance}</Badge>
                      <Badge variant="outline" className="border-white/10 text-gray-300">{routeItem.terrain}</Badge>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-gray-400">Progreso</span>
                      <span className="font-semibold text-moto-orange">{routeItem.progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-moto-darker">
                      <div className="h-full bg-moto-orange" style={{ width: `${routeItem.progress}%` }} />
                    </div>
                    <Button
                      variant="outline"
                      className="mt-4 w-full border-white/10"
                      onClick={() => void downloadGpx(routeItem)}
                    >
                      Descargar GPX
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!isLoadingClaims && ownedRoutes.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-400">
                Aún no has elegido ninguna de tus rutas gratuitas de este mes.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {user?.id && (
        <AdminPremiumRouteDialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (!open) setEditingRoute(null)
          }}
          userId={user.id}
          initialRoute={editingRoute}
          onCreated={(createdRoute) => {
            const routeItem = mapManagedRoute(createdRoute)
            setRoutes((current) => editingRoute
              ? current.map((currentRoute) => currentRoute.id === routeItem.id ? routeItem : currentRoute)
              : [routeItem, ...current])
            setSelectedRoute(routeItem)
            setActiveTab('detail')
            setSearchParams({ route: routeItem.id, tab: 'detail' })
          }}
        />
      )}
    </div>
  )
}

function RouteCard({
  routeItem,
  owned,
  disabled,
  onDetail,
  onBuy,
}: {
  routeItem: PremiumRoute
  owned: boolean
  disabled: boolean
  onDetail: () => void
  onBuy: () => void
}) {
  return (
    <Card className="overflow-hidden border-white/5 bg-moto-gray py-0 transition hover:border-moto-orange/40">
      <div className="relative min-h-44 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(8,17,26,0.05), rgba(8,17,26,0.78)), url(${routeItem.image})` }}>
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge className="bg-moto-darker/90 text-white">Ruta</Badge>
          <Badge className="bg-moto-orange text-moto-darker">{levelLabel(routeItem.level)}</Badge>
        </div>
        {owned && (
          <Badge className="absolute right-3 top-3 bg-green-500/90 text-moto-darker">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            Disponible
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="text-lg font-bold">{routeItem.title}</h3>
        <p className="mt-1 text-sm leading-6 text-gray-400">{routeItem.subtitle}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Metric icon={MapPin} label={routeItem.location} />
          <Metric icon={Mountain} label={routeItem.terrain} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-moto-orange">Incluida con Premium</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-white/10" onClick={onDetail}>
              Detalle
            </Button>
            <Button size="sm" disabled={disabled} className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={onBuy}>
              {disabled && !owned ? <Lock className="mr-1 h-3.5 w-3.5" /> : null}
              {owned ? 'Abrir' : 'Obtener gratis'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RouteDetailPanel({ routeItem, owned, disabled, onBuy, onBack, onEdit }: { routeItem: PremiumRoute; owned: boolean; disabled: boolean; onBuy: () => void; onBack: () => void; onEdit?: () => void }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-xl border border-white/5 bg-moto-gray">
        <div className="min-h-80 bg-cover bg-center p-5" style={{ backgroundImage: `linear-gradient(rgba(8,17,26,0.1), rgba(8,17,26,0.84)), url(${routeItem.image})` }}>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-white/10 bg-moto-darker/80" onClick={onBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Catálogo
            </Button>
            {onEdit && (
              <Button className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar ruta
              </Button>
            )}
          </div>
          <div className="mt-28 max-w-3xl">
            <Badge className="mb-3 bg-moto-orange text-moto-darker">{levelLabel(routeItem.level)}</Badge>
            <h2 className="text-3xl font-black">{routeItem.title}</h2>
            <p className="mt-2 text-gray-300">{routeItem.subtitle}</p>
          </div>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <InfoBlock icon={Route} title="Distancia y duración" value={`${routeItem.distance} - ${routeItem.duration}`} />
          <InfoBlock icon={Mountain} title="Terreno" value={routeItem.terrain} />
          <InfoBlock icon={Bike} title="Compatibilidad con la moto" value={routeItem.compatibility} />
          <InfoBlock icon={Trophy} title="Experiencia MotoCare" value="Se registra en tu bitacora y actualiza recomendaciones post-ruta." />
        </div>
      </section>

      <aside className="space-y-5">
        <Card className="border-moto-orange/20 bg-moto-darker py-0">
          <CardContent className="p-5">
            <p className="text-sm text-gray-400">Beneficio mensual Premium</p>
            <p className="mt-1 text-2xl font-black text-moto-orange">{routeItem.isManaged && !routeItem.isMonthlyFree ? 'No incluida este mes' : 'Sin costo adicional'}</p>
            <Button disabled={disabled} className="mt-5 w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={onBuy}>
              {disabled && !owned ? <Lock className="mr-2 h-4 w-4" /> : null}
              {owned ? 'Abrir en Mis rutas' : routeItem.isManaged && !routeItem.isMonthlyFree ? 'No disponible gratis' : 'Obtener ruta gratis'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="p-5">
            <h3 className="font-semibold">Contenido incluido</h3>
            <div className="mt-4 space-y-3">
              {routeItem.includes.map((item) => (
                <Metric key={item} icon={PackageCheck} label={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      </aside>

      <section className="grid gap-5 lg:col-span-2 md:grid-cols-2">
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="p-5">
            <h3 className="font-semibold">Puntos de interes</h3>
            <div className="mt-4 grid gap-3">
              {routeItem.pois.map((poi) => (
                <Metric key={poi} icon={MapPin} label={poi} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="p-5">
            <h3 className="font-semibold">Checklist sugerida</h3>
            <div className="mt-4 grid gap-3">
              {routeItem.checklist.map((item) => (
                <Metric key={item} icon={CheckCircle2} label={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function Metric({ icon: Icon, label }: { icon: typeof Bike; label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-gray-300">
      <Icon className="h-4 w-4 shrink-0 text-moto-orange" />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}

function InfoBlock({ icon: Icon, title, value }: { icon: typeof Bike; title: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-moto-darker p-4">
      <div className="mb-3 flex items-center gap-2 text-moto-orange">
        <Icon className="h-5 w-5" />
        <span className="text-sm font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-sm leading-6 text-gray-300">{value}</p>
    </div>
  )
}

function FilterButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      className={active ? 'bg-moto-orange text-moto-darker hover:bg-moto-orange-dark' : 'border-white/10 bg-white/5'}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
