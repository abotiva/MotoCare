import { useState } from 'react'
import { 
  Search, Filter, Grid3X3, List, MapPin, Heart, MessageCircle, 
  Share2, Star, TrendingUp, Bike, Wrench, Shirt
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
    <div className="max-w-7xl mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Marketplace</h1>
        <p className="text-gray-400">Compra y vende motos, repuestos y equipamiento</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Buscar motos, repuestos, equipamiento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-moto-gray border-white/5"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-white/10">
            <MapPin className="w-4 h-4 mr-2" />
            Ubicación
          </Button>
          <Button variant="outline" className="border-white/10">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <div className="flex border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-moto-orange text-white' : 'text-gray-400'}`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-moto-orange text-white' : 'text-gray-400'}`}
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-moto-orange" />
            Destacados
          </h2>
          <Button variant="ghost" size="sm">Ver todos</Button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {listings.filter(l => l.featured).map((listing) => (
            <Card key={listing.id} className="bg-moto-gray border-white/5 overflow-hidden group cursor-pointer">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={listing.image} 
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <Badge className="absolute top-3 left-3 bg-moto-orange">Destacado</Badge>
                <button className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-moto-orange transition-colors">
                  <Heart className="w-4 h-4" />
                </button>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{listing.title}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {listing.location}
                    </p>
                  </div>
                  <div className="text-right">
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
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-moto-gray flex items-center justify-center">
                      <span className="text-sm font-medium">{listing.seller.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm">{listing.seller.name}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        {listing.seller.rating}
                        {listing.seller.verified && <Badge variant="secondary" className="text-[10px] ml-1">Verificado</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-white/10">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button size="sm" className="bg-moto-orange hover:bg-moto-orange-dark">
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
        <div className={viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {filteredListings.filter(l => !l.featured).map((listing) => (
            <Card 
              key={listing.id} 
              className={`bg-moto-gray border-white/5 overflow-hidden group cursor-pointer ${
                viewMode === 'list' ? 'flex' : ''
              }`}
            >
              <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'h-48'}`}>
                <img 
                  src={listing.image} 
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <button className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-moto-orange transition-colors">
                  <Heart className="w-4 h-4" />
                </button>
              </div>
              <CardContent className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{listing.title}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {listing.location}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-moto-orange">{formatPrice(listing.price)}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                  <Badge variant="secondary" className="text-xs">{listing.condition}</Badge>
                  {listing.mileage && <span className="text-xs">{listing.mileage}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{listing.seller.name}</span>
                    {listing.seller.verified && (
                      <Badge variant="secondary" className="text-[10px]">Verificado</Badge>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="text-moto-orange">
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
          className="bg-moto-orange hover:bg-moto-orange-dark shadow-lg shadow-moto-orange/30 rounded-full px-6"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Vender
        </Button>
      </div>
    </div>
  )
}
