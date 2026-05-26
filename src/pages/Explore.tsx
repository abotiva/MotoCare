import { useState } from 'react'
import { 
  MapPin, Star, Route, Clock, TrendingUp, Filter, 
  Search, Heart, Share2, Navigation
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const routes = [
  {
    id: 1,
    name: 'Ruta de la Sabana',
    description: 'Hermoso recorrido por la sabana de Bogotá con vistas panorámicas.',
    distance: '85 km',
    duration: '2h 30m',
    difficulty: 'Fácil',
    rating: 4.8,
    reviews: 234,
    image: '/hero-motorcycle.jpg',
    location: 'Bogotá - Zipaquirá',
    tags: ['Escénica', 'Asfalto', 'Montaña'],
    likes: 567
  },
  {
    id: 2,
    name: 'Alto de Letras',
    description: 'El ascenso más largo de Colombia, desafío para moteros experimentados.',
    distance: '120 km',
    duration: '4h',
    difficulty: 'Difícil',
    rating: 4.9,
    reviews: 189,
    image: '/community.jpg',
    location: 'Manizales - Mariquita',
    tags: ['Montaña', 'Desafío', 'Curvas'],
    likes: 892
  },
  {
    id: 3,
    name: 'Vía al Llano',
    description: 'Ruta recta perfecta para disfrutar la velocidad y paisajes llaneros.',
    distance: '200 km',
    duration: '3h',
    difficulty: 'Media',
    rating: 4.6,
    reviews: 445,
    image: '/feature-gps.jpg',
    location: 'Bogotá - Villavicencio',
    tags: ['Recta', 'Velocidad', 'Llano'],
    likes: 723
  },
  {
    id: 4,
    name: 'Ruta del Café',
    description: 'Recorrido por el eje cafetero con paradas en fincas cafeteras.',
    distance: '150 km',
    duration: '4h 30m',
    difficulty: 'Media',
    rating: 4.7,
    reviews: 312,
    image: '/feature-maintenance.jpg',
    location: 'Armenia - Pereira',
    tags: ['Cultural', 'Gastronomía', 'Naturaleza'],
    likes: 456
  }
]

const events = [
  {
    id: 1,
    title: 'Salida Grupal Dominical',
    date: 'Domingo, 9 Feb',
    time: '7:00 AM',
    location: 'Parque de la 93, Bogotá',
    participants: 45,
    maxParticipants: 60,
    image: '/community.jpg',
    organizer: 'Club Moteros Bogotá'
  },
  {
    id: 2,
    title: 'Ruta Nocturna Full Moon',
    date: 'Sábado, 15 Feb',
    time: '8:00 PM',
    location: 'Calle 26, Bogotá',
    participants: 28,
    maxParticipants: 40,
    image: '/hero-motorcycle.jpg',
    organizer: 'Night Riders Colombia'
  },
  {
    id: 3,
    title: 'Encuentro Nacional de Motos',
    date: '15-17 Marzo',
    time: 'Todo el día',
    location: 'Medellín, Antioquia',
    participants: 1200,
    maxParticipants: 2000,
    image: '/feature-marketplace.jpg',
    organizer: 'MotoCare Oficial'
  }
]

const categories = [
  { name: 'Todas', count: 1243 },
  { name: 'Montaña', count: 456 },
  { name: 'Carretera', count: 389 },
  { name: 'Ciudad', count: 234 },
  { name: 'Tierra', count: 164 },
]

export function Explore() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Explorar Rutas</h1>
        <p className="text-gray-400">Descubre rutas épicas compartidas por la comunidad</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Buscar rutas, lugares..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-moto-gray border-white/5"
          />
        </div>
        <Button variant="outline" className="border-white/10">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              selectedCategory === cat.name
                ? 'bg-moto-orange text-white'
                : 'bg-moto-gray text-gray-400 hover:bg-white/5'
            }`}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      <Tabs defaultValue="routes" className="w-full">
        <TabsList className="bg-moto-gray border-white/5 w-full mb-6">
          <TabsTrigger value="routes" className="flex-1 data-[state=active]:bg-moto-orange">Rutas</TabsTrigger>
          <TabsTrigger value="events" className="flex-1 data-[state=active]:bg-moto-orange">Eventos</TabsTrigger>
          <TabsTrigger value="popular" className="flex-1 data-[state=active]:bg-moto-orange">Populares</TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {routes.map((route) => (
              <Card key={route.id} className="bg-moto-gray border-white/5 overflow-hidden group">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={route.image} 
                    alt={route.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Badge className={`${
                      route.difficulty === 'Fácil' ? 'bg-green-500' :
                      route.difficulty === 'Media' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}>
                      {route.difficulty}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 left-3 flex gap-1">
                    {route.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="bg-black/50 text-white">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{route.name}</h3>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {route.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">{route.rating}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{route.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Route className="w-4 h-4" />
                        {route.distance}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {route.duration}
                      </span>
                    </div>
                    <span>{route.reviews} reseñas</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-moto-orange hover:bg-moto-orange-dark">
                      <Navigation className="w-4 h-4 mr-2" />
                      Iniciar Ruta
                    </Button>
                    <Button variant="outline" size="icon" className="border-white/10">
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="border-white/10">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Card key={event.id} className="bg-moto-gray border-white/5 overflow-hidden">
                <div className="h-40 overflow-hidden">
                  <img 
                    src={event.image} 
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">{event.title}</h3>
                  <div className="space-y-2 text-sm text-gray-400 mb-4">
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {event.date} · {event.time}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </p>
                    <p className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      {event.participants}/{event.maxParticipants} participantes
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Organiza: {event.organizer}</p>
                  <Button className="w-full bg-moto-orange hover:bg-moto-orange-dark">
                    Unirme al Evento
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="popular" className="space-y-4">
          <Card className="bg-moto-gray border-white/5 p-8 text-center">
            <TrendingUp className="w-16 h-16 text-moto-orange mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Rutas más populares esta semana</h3>
            <p className="text-gray-400">Próximamente: ranking de rutas más recorridas</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
