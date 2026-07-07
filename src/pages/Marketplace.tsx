import { useState } from 'react'
import { 
  Search, Filter, Grid3X3, List, MapPin, Heart, MessageCircle, 
  Star, TrendingUp, Bike, Wrench, Shirt, Clock3, Lock, Store
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const categories = [
  { id: 'all', name: 'Todo', icon: Grid3X3 },
  { id: 'motorcycles', name: 'Motos', icon: Bike },
  { id: 'parts', name: 'Repuestos', icon: Wrench },
  { id: 'gear', name: 'Equipamiento', icon: Shirt },
]

const listings = [
  {
    id: 1,
    title: 'Honda CB500F 2022',
    price: 18500000,
    originalPrice: 22000000,
    condition: 'Usado',
    mileage: '15000 km',
    location: 'Bogotá, Cundinamarca',
    image: '/hero-motorcycle.jpg',
    seller: { name: 'Andrés Pérez', rating: 4.8, verified: true },
    featured: true,
    likes: 45,
    category: 'motorcycles'
  },
  {
    id: 2,
    title: 'Yamaha MT-07 2023',
    price: 42000000,
    condition: 'Nuevo',
    mileage: '0 km',
    location: 'Medellín, Antioquia',
    image: '/feature-marketplace.jpg',
    seller: { name: 'MotoStore Colombia', rating: 4.9, verified: true },
    featured: true,
    likes: 128,
    category: 'motorcycles'
  },
  {
    id: 3,
    title: 'Kit de frenos Brembo',
    price: 850000,
    originalPrice: 1200000,
    condition: 'Nuevo',
    location: 'Cali, Valle del Cauca',
    image: '/feature-maintenance.jpg',
    seller: { name: 'Repuestos MotoPro', rating: 4.7, verified: true },
    featured: false,
    likes: 23,
    category: 'parts'
  },
  {
    id: 4,
    title: 'Chamarra Alpinestars GP Plus',
    price: 1200000,
    condition: 'Usado - Como nuevo',
    location: 'Bogotá, Cundinamarca',
    image: '/community.jpg',
    seller: { name: 'Carlos R.', rating: 4.5, verified: false },
    featured: false,
    likes: 12,
    category: 'gear'
  },
  {
    id: 5,
    title: 'Kawasaki Ninja 400',
    price: 28000000,
    condition: 'Usado',
    mileage: '8000 km',
    location: 'Barranquilla, Atlántico',
    image: '/app-mockup.jpg',
    seller: { name: 'María G.', rating: 4.9, verified: true },
    featured: false,
    likes: 67,
    category: 'motorcycles'
  },
  {
    id: 6,
    title: 'Escape Akrapovič Slip-on',
    price: 2500000,
    condition: 'Nuevo',
    location: 'Pereira, Risaralda',
    image: '/feature-gps.jpg',
    seller: { name: 'Tuning Motos', rating: 4.6, verified: true },
    featured: false,
    likes: 34,
    category: 'parts'
  },
]

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function Marketplace() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredListings = listings.filter(
    listing => selectedCategory === 'all' || listing.category === selectedCategory
  )

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 lg:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold mb-2">Marketplace</h1>
          <p className="text-gray-400">Compra motos, repuestos y equipamiento. Publicar exige una licencia activa.</p>
        </div>
        <Badge className="w-fit bg-moto-orange text-moto-darker">
          <Clock3 className="mr-2 h-4 w-4" />
          Proximamente
        </Badge>
      </div>

      <Card className="mb-6 overflow-hidden border-white/5 bg-moto-gray py-0">
        <CardContent className="relative p-5">
          <div className="absolute inset-0 bg-[url('/feature-marketplace.jpg')] bg-cover bg-center opacity-20" />
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
            <div>
              <Badge className="mb-3 bg-white/10 text-gray-200">Tienda para todos</Badge>
              <h2 className="text-2xl font-bold">Comprar es abierto para toda la comunidad</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
                Cualquier usuario podra explorar publicaciones y contactar vendedores. Para publicar como persona natural se requiere licencia Premium; si la cuenta representa un negocio, taller, marca o aliado, debe tener licencia Business.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-moto-darker/90 p-4">
              <div className="mb-3 flex items-center gap-2 text-moto-orange">
                <Store className="h-5 w-5" />
                <span className="font-semibold">Regla para vender</span>
              </div>
              <div className="space-y-2 text-sm leading-6 text-gray-400">
                <p>Ver y comprar: disponible para todos los usuarios.</p>
                <p>Vender como usuario: requiere Premium.</p>
                <p>Vender como negocio: requiere Business.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 border-white/5 bg-moto-gray/70">
        <CardContent className="grid gap-4 p-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-moto-darker/60 p-4">
            <p className="text-sm font-semibold text-white">Explorar y comprar</p>
            <p className="mt-1 text-sm leading-6 text-gray-400">Disponible para toda la comunidad MotoHubX.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-moto-darker/60 p-4">
            <p className="text-sm font-semibold text-white">Publicar como motero</p>
            <p className="mt-1 text-sm leading-6 text-gray-400">Requiere licencia Premium activa.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-moto-darker/60 p-4">
            <p className="text-sm font-semibold text-white">Publicar como negocio</p>
            <p className="mt-1 text-sm leading-6 text-gray-400">Requiere licencia Business activa.</p>
          </div>
        </CardContent>
      </Card>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Buscar motos, repuestos, equipamiento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled
            className="pl-10 bg-moto-gray border-white/5 opacity-70"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" className="w-full border-white/10 sm:w-auto" disabled>
            <MapPin className="w-4 h-4 mr-2" />
            Ubicación
          </Button>
          <Button variant="outline" className="w-full border-white/10 sm:w-auto" disabled>
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <div className="col-span-2 flex overflow-hidden rounded-lg border border-white/10 sm:col-span-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex flex-1 justify-center p-2 sm:flex-none ${viewMode === 'grid' ? 'bg-moto-orange text-white' : 'text-gray-400'}`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex flex-1 justify-center p-2 sm:flex-none ${viewMode === 'list' ? 'bg-moto-orange text-white' : 'text-gray-400'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            disabled
            className={`flex items-center gap-2 px-5 py-3 rounded-xl whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-moto-orange text-white'
                : 'bg-moto-gray text-gray-400 hover:bg-white/5'
            }`}
          >
            <cat.icon className="w-5 h-5" />
            <span className="font-medium">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Featured Section */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold">
            <TrendingUp className="w-5 h-5 text-moto-orange" />
            Destacados
          </h2>
          <Button variant="ghost" size="sm" disabled>Ver todos</Button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {listings.filter(l => l.featured).map((listing) => (
            <Card key={listing.id} className="bg-moto-gray border-white/5 overflow-hidden opacity-75">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={listing.image} 
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-3 left-3 bg-moto-orange">Destacado</Badge>
                <button className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center" disabled>
                  <Heart className="w-4 h-4" />
                </button>
              </div>
              <CardContent className="p-4">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg">{listing.title}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {listing.location}
                    </p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-xl font-bold text-moto-orange">{formatPrice(listing.price)}</p>
                    {listing.originalPrice && (
                      <p className="text-sm text-gray-500 line-through">{formatPrice(listing.originalPrice)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                  <Badge variant="secondary">{listing.condition}</Badge>
                  {listing.mileage && <span>{listing.mileage}</span>}
                </div>
                <div className="flex flex-col gap-3 border-t border-white/5 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-moto-gray flex items-center justify-center">
                      <span className="text-sm font-medium">{listing.seller.name[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{listing.seller.name}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        {listing.seller.rating}
                        {listing.seller.verified && <Badge variant="secondary" className="text-[10px] ml-1">Verificado</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button size="sm" variant="outline" className="border-white/10" disabled>
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button size="sm" className="bg-moto-orange hover:bg-moto-orange-dark" disabled>
                      Ver más
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* All Listings */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Publicaciones recientes</h2>
        <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
          {filteredListings.filter(l => !l.featured).map((listing) => (
            <Card 
              key={listing.id} 
              className={`bg-moto-gray border-white/5 overflow-hidden opacity-75 ${
                viewMode === 'list' ? 'sm:flex' : ''
              }`}
            >
              <div className={`relative overflow-hidden ${viewMode === 'list' ? 'h-48 sm:w-48 sm:flex-shrink-0' : 'h-48'}`}>
                <img 
                  src={listing.image} 
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                <button className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center" disabled>
                  <Heart className="w-4 h-4" />
                </button>
              </div>
              <CardContent className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{listing.title}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {listing.location}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-bold text-moto-orange">{formatPrice(listing.price)}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                  <Badge variant="secondary" className="text-xs">{listing.condition}</Badge>
                  {listing.mileage && <span className="text-xs">{listing.mileage}</span>}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm">{listing.seller.name}</span>
                    {listing.seller.verified && (
                      <Badge variant="secondary" className="text-[10px]">Verificado</Badge>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="text-moto-orange" disabled>
                    Contactar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sell Button */}
      <div className="fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-40">
        <Button 
          size="lg" 
          disabled
          className="bg-moto-orange hover:bg-moto-orange-dark shadow-lg shadow-moto-orange/30 rounded-full px-6"
        >
          <Lock className="w-5 h-5 mr-2" />
          Vender con Premium
        </Button>
      </div>
    </div>
  )
}
