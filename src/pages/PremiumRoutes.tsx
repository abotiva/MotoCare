import { useEffect, useMemo, useState } from 'react'
import {
  Bike,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Filter,
  Gauge,
  MapPin,
  Mountain,
  PackageCheck,
  Route,
  ShieldCheck,
  ShoppingCart,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { readOwnedRouteIds, writeOwnedRouteIds } from '@/lib/premiumRoutePurchases'

type PremiumRoute = {
  id: string
  type: 'route' | 'pack'
  title: string
  subtitle: string
  location: string
  price: number
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
}

const premiumRoutes: PremiumRoute[] = [
  {
    id: 'nevado-ruiz-adventure',
    type: 'route',
    title: 'Nevado del Ruiz Adventure',
    subtitle: 'Alta montana, miradores volcanicos y destapado controlado.',
    location: 'Manizales - Murillo - Libano',
    price: 24900,
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
    id: 'pack-eje-cafetero',
    type: 'pack',
    title: 'Pack Eje Cafetero',
    subtitle: 'Cinco experiencias para fin de semana entre cafe, curvas y miradores.',
    location: 'Salento, Filandia, Cocora y Buenavista',
    price: 59900,
    level: 3,
    distance: '420 km',
    duration: '2 dias',
    terrain: 'Curvas, pavimento rural y destapado liviano',
    compatibility: 'Ideal para touring, naked, scooter grande y adventure light.',
    image: '/community.jpg',
    progress: 68,
    badge: 'Pack popular',
    includes: ['5 rutas premium', 'Presupuesto estimado', 'Hoteles y restaurantes', 'Insignia Ruta del Cafe', 'Mapa offline'],
    pois: ['Valle del Cocora', 'Filandia', 'Buenavista', 'Mirador Alto de la Cruz'],
    checklist: ['Luces y documentos', 'Llantas para lluvia', 'Kit de pinchazos', 'Reserva para peajes'],
  },
  {
    id: 'chicamocha-touring',
    type: 'route',
    title: 'Canon del Chicamocha Touring',
    subtitle: 'Ruta panoramica con curvas tecnicas y paradas gastronomicas.',
    location: 'Bucaramanga - Mesa de los Santos - Barichara',
    price: 29900,
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
    type: 'route',
    title: 'Alta Guajira Expedition',
    subtitle: 'Experiencia remota para pilotos con manejo off-road y autonomia.',
    location: 'Riohacha - Cabo de la Vela - Punta Gallinas',
    price: 79900,
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
]

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function levelLabel(level: PremiumRoute['level']) {
  if (level === 3) return 'Nivel 3 - Adventure Light'
  if (level === 4) return 'Nivel 4 - Adventure'
  return 'Nivel 5 - Extrema'
}

export function PremiumRoutes() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<'all' | 'route' | 'pack' | 'level-3' | 'level-4'>('all')
  const [selectedRoute, setSelectedRoute] = useState<PremiumRoute>(premiumRoutes[0])
  const [ownedRouteIds, setOwnedRouteIds] = useState(() => readOwnedRouteIds(user?.id))
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const filteredRoutes = useMemo(() => {
    return premiumRoutes.filter((routeItem) => {
      if (filter === 'all') return true
      if (filter === 'route' || filter === 'pack') return routeItem.type === filter
      if (filter === 'level-3') return routeItem.level === 3
      if (filter === 'level-4') return routeItem.level === 4
      return true
    })
  }, [filter])

  const ownedRoutes = premiumRoutes.filter((routeItem) => ownedRouteIds.includes(routeItem.id))
  const isSelectedOwned = ownedRouteIds.includes(selectedRoute.id)

  useEffect(() => {
    setOwnedRouteIds(readOwnedRouteIds(user?.id))
  }, [user?.id])

  const openCheckout = (routeItem: PremiumRoute) => {
    setSelectedRoute(routeItem)
    if (ownedRouteIds.includes(routeItem.id)) {
      toast.info('Ya tienes esta experiencia en Mis rutas')
      return
    }
    setIsCheckoutOpen(true)
  }

  const confirmPurchase = () => {
    setOwnedRouteIds((current) => {
      const next = Array.from(new Set([...current, selectedRoute.id]))
      writeOwnedRouteIds(next, user?.id)
      return next
    })
    setIsCheckoutOpen(false)
    toast.success('Ruta agregada a Mis rutas', {
      description: `${selectedRoute.title} quedo disponible para preparar tu viaje.`,
    })
  }

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 lg:p-6">
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
              Tu moto. Tu historia. Tu ruta. Compra experiencias verificadas con GPX,
              puntos de interes, checklist y preparacion conectada a la hoja de vida de tu moto.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => setSelectedRoute(premiumRoutes[0])}>
                <Route className="mr-2 h-4 w-4" />
                Ver Nevado del Ruiz
              </Button>
              <Button variant="outline" className="border-white/10 bg-white/5">
                <PackageCheck className="mr-2 h-4 w-4" />
                {ownedRoutes.length} rutas compradas
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
              <p className="mt-4 text-2xl font-black text-moto-orange">{formatPrice(selectedRoute.price)}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Tabs defaultValue="catalog" className="space-y-5">
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
              <h2 className="text-2xl font-bold">Catálogo de rutas y packs</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>Todas</FilterButton>
              <FilterButton active={filter === 'route'} onClick={() => setFilter('route')}>Rutas</FilterButton>
              <FilterButton active={filter === 'pack'} onClick={() => setFilter('pack')}>Packs</FilterButton>
              <FilterButton active={filter === 'level-3'} onClick={() => setFilter('level-3')}>Nivel 3</FilterButton>
              <FilterButton active={filter === 'level-4'} onClick={() => setFilter('level-4')}>Nivel 4</FilterButton>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRoutes.map((routeItem) => (
              <RouteCard
                key={routeItem.id}
                routeItem={routeItem}
                owned={ownedRouteIds.includes(routeItem.id)}
                onDetail={() => setSelectedRoute(routeItem)}
                onBuy={() => openCheckout(routeItem)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detail">
          <RouteDetailPanel
            routeItem={selectedRoute}
            owned={isSelectedOwned}
            onBuy={() => openCheckout(selectedRoute)}
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
                      Comprada
                    </Badge>
                    <h3 className="text-xl font-bold">{routeItem.title}</h3>
                    <p className="mt-1 text-sm text-gray-400">{routeItem.location}</p>
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
                      onClick={() => setSelectedRoute(routeItem)}
                    >
                      Continuar preparacion
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="border-white/10 bg-moto-darker text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Comprar experiencia premium</DialogTitle>
            <DialogDescription className="text-gray-400">
              Flujo simulado para validar la presentacion comercial dentro de MotoCare.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-moto-orange/20 bg-moto-orange/10 p-4">
            <p className="font-semibold text-white">{selectedRoute.title}</p>
            <p className="mt-1 text-sm text-gray-300">{selectedRoute.subtitle}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-400">Total</span>
              <span className="text-2xl font-black text-moto-orange">{formatPrice(selectedRoute.price)}</span>
            </div>
          </div>
          <div className="grid gap-2 text-sm text-gray-300">
            <Metric icon={CreditCard} label="Metodo: tarjeta terminada en 4821" />
            <Metric icon={ShieldCheck} label="Incluye acceso a GPX, puntos de interes y checklist" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setIsCheckoutOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={confirmPurchase}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Confirmar compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RouteCard({
  routeItem,
  owned,
  onDetail,
  onBuy,
}: {
  routeItem: PremiumRoute
  owned: boolean
  onDetail: () => void
  onBuy: () => void
}) {
  return (
    <Card className="overflow-hidden border-white/5 bg-moto-gray py-0 transition hover:border-moto-orange/40">
      <div className="relative min-h-44 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(8,17,26,0.05), rgba(8,17,26,0.78)), url(${routeItem.image})` }}>
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge className="bg-moto-darker/90 text-white">{routeItem.type === 'pack' ? 'Pack' : 'Ruta'}</Badge>
          <Badge className="bg-moto-orange text-moto-darker">{levelLabel(routeItem.level)}</Badge>
        </div>
        {owned && (
          <Badge className="absolute right-3 top-3 bg-green-500/90 text-moto-darker">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            Comprada
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
          <span className="text-xl font-black text-moto-orange">{formatPrice(routeItem.price)}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-white/10" onClick={onDetail}>
              Detalle
            </Button>
            <Button size="sm" className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={onBuy}>
              {owned ? 'Abrir' : 'Comprar'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RouteDetailPanel({ routeItem, owned, onBuy }: { routeItem: PremiumRoute; owned: boolean; onBuy: () => void }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-xl border border-white/5 bg-moto-gray">
        <div className="min-h-80 bg-cover bg-center p-5" style={{ backgroundImage: `linear-gradient(rgba(8,17,26,0.1), rgba(8,17,26,0.84)), url(${routeItem.image})` }}>
          <Button variant="outline" className="border-white/10 bg-moto-darker/80">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Catálogo
          </Button>
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
            <p className="text-sm text-gray-400">Precio</p>
            <p className="mt-1 text-3xl font-black text-moto-orange">{formatPrice(routeItem.price)}</p>
            <Button className="mt-5 w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={onBuy}>
              {owned ? 'Abrir en Mis rutas' : 'Comprar experiencia'}
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
