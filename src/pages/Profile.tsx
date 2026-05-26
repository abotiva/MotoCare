import { 
  MapPin, Link as LinkIcon, Calendar, Users, 
  Edit3, Settings, Share2, Grid3X3, Bookmark, Heart, MessageCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'

const userStats = {
  posts: 156,
  followers: 2340,
  following: 567,
  routes: 43,
  bikes: 2
}

const userPosts = [
  { id: 1, image: '/hero-motorcycle.jpg', likes: 234, comments: 45 },
  { id: 2, image: '/community.jpg', likes: 189, comments: 32 },
  { id: 3, image: '/feature-gps.jpg', likes: 456, comments: 78 },
  { id: 4, image: '/feature-maintenance.jpg', likes: 123, comments: 21 },
  { id: 5, image: '/app-mockup.jpg', likes: 567, comments: 89 },
  { id: 6, image: '/feature-marketplace.jpg', likes: 234, comments: 56 },
]

const savedRoutes = [
  { id: 1, name: 'Ruta de la Sabana', distance: '85 km', image: '/hero-motorcycle.jpg' },
  { id: 2, name: 'Alto de Letras', distance: '120 km', image: '/community.jpg' },
  { id: 3, name: 'Vía al Llano', distance: '200 km', image: '/feature-gps.jpg' },
]

export function Profile() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="p-4 lg:p-6 border-b border-white/5">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
          {/* Avatar */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative">
              <Avatar className="w-24 h-24 lg:w-36 lg:h-36 border-4 border-moto-orange">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=motero1" />
                <AvatarFallback className="text-3xl">JP</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full border-4 border-moto-dark flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center lg:text-left">
            <div className="flex flex-col lg:flex-row items-center gap-4 mb-4">
              <h1 className="text-2xl font-bold">Juan Pérez</h1>
              <Badge className="bg-moto-orange">MotoPro</Badge>
              <div className="flex gap-2 lg:ml-auto">
                <Button variant="outline" size="sm" className="border-white/10">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editar perfil
                </Button>
                <Button variant="outline" size="sm" className="border-white/10">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="border-white/10">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <p className="text-gray-400 mb-1">@juan_rider</p>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-sm text-gray-400 mb-4">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Bogotá, Colombia
              </span>
              <span className="flex items-center gap-1">
                <LinkIcon className="w-4 h-4" />
                instagram.com/juan_rider
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Se unió en marzo 2024
              </span>
            </div>

            <p className="text-sm mb-4">
              🏍️ Apasionado por las dos ruedas | 📍 Explorando Colombia | 
              🛣️ Siempre en busca de nuevas rutas | Honda CB500F
            </p>

            {/* Stats */}
            <div className="flex justify-center lg:justify-start gap-8">
              <div className="text-center">
                <p className="text-xl font-bold">{userStats.posts}</p>
                <p className="text-sm text-gray-400">Publicaciones</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{userStats.followers}</p>
                <p className="text-sm text-gray-400">Seguidores</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{userStats.following}</p>
                <p className="text-sm text-gray-400">Siguiendo</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{userStats.routes}</p>
                <p className="text-sm text-gray-400">Rutas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b border-white/5 rounded-none h-auto p-0">
          <TabsTrigger 
            value="posts" 
            className="flex-1 lg:flex-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-moto-orange rounded-none py-4"
          >
            <Grid3X3 className="w-4 h-4 mr-2" />
            Publicaciones
          </TabsTrigger>
          <TabsTrigger 
            value="saved"
            className="flex-1 lg:flex-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-moto-orange rounded-none py-4"
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Guardados
          </TabsTrigger>
          <TabsTrigger 
            value="routes"
            className="flex-1 lg:flex-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-moto-orange rounded-none py-4"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Rutas
          </TabsTrigger>
          <TabsTrigger 
            value="tagged"
            className="flex-1 lg:flex-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-moto-orange rounded-none py-4"
          >
            <Users className="w-4 h-4 mr-2" />
            Etiquetado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0">
          <div className="grid grid-cols-3 gap-1">
            {userPosts.map((post) => (
              <div key={post.id} className="relative aspect-square group cursor-pointer overflow-hidden">
                <img 
                  src={post.image} 
                  alt="Post" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                  <span className="flex items-center gap-1 text-white font-medium">
                    <Heart className="w-5 h-5" />
                    {post.likes}
                  </span>
                  <span className="flex items-center gap-1 text-white font-medium">
                    <MessageCircle className="w-5 h-5" />
                    {post.comments}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-0 p-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedRoutes.map((route) => (
              <Card key={route.id} className="bg-moto-gray border-white/5 overflow-hidden">
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={route.image} 
                    alt={route.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{route.name}</h3>
                  <p className="text-sm text-gray-400">{route.distance}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="routes" className="mt-0 p-4">
          <Card className="bg-moto-gray border-white/5 p-8 text-center">
            <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tus rutas</h3>
            <p className="text-gray-400">Aquí verás todas las rutas que has creado o guardado</p>
          </Card>
        </TabsContent>

        <TabsContent value="tagged" className="mt-0 p-4">
          <Card className="bg-moto-gray border-white/5 p-8 text-center">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Fotos etiquetadas</h3>
            <p className="text-gray-400">Cuando alguien te etiquete en una foto, aparecerá aquí</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
