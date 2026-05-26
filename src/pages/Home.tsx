import { useState } from 'react'
import { 
  Heart, MessageCircle, Share2, Bookmark, MapPin, 
  MoreHorizontal, Image as ImageIcon, Send, TrendingUp, Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Datos de ejemplo para el feed
const posts = [
  {
    id: 1,
    user: { name: 'Carlos Rodríguez', username: '@carlos_rider', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos' },
    content: 'Increíble ruta por la vía al Llano hoy! 🏍️💨 El clima perfecto y las vistas espectaculares. ¿Quién se anima para la próxima? #MotoCare #RutaColombia',
    image: '/hero-motorcycle.jpg',
    location: 'Villavicencio, Meta',
    likes: 234,
    comments: 45,
    shares: 12,
    time: '2h',
    liked: false,
    saved: false
  },
  {
    id: 2,
    user: { name: 'María González', username: '@maria_moto', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria' },
    content: 'Finalmente terminé el mantenimiento de mi Ninja 400. Nueva cadena, aceite y pastillas de freno. Lista para las próximas aventuras! 🔧✨',
    image: '/feature-maintenance.jpg',
    location: 'Bogotá, Cundinamarca',
    likes: 189,
    comments: 32,
    shares: 8,
    time: '4h',
    liked: true,
    saved: true
  },
  {
    id: 3,
    user: { name: 'Andrés Pérez', username: '@andres_motero', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=andres' },
    content: 'Vendo Honda CB500F 2022, 15.000km, perfecto estado. Todos los mantenimientos al día. Info por DM! 💰🏍️ #VentaMoto #Honda',
    image: '/feature-marketplace.jpg',
    location: 'Medellín, Antioquia',
    likes: 456,
    comments: 78,
    shares: 156,
    time: '5h',
    liked: false,
    saved: false
  },
  {
    id: 4,
    user: { name: 'Club Moteros Bogotá', username: '@club_bogota', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=club' },
    content: 'Salida grupal este domingo a Guatavita. Punto de encuentro: Parque de la 93 a las 7:00 AM. Todos invitados! 🏍️👥 #SalidaGrupal #DomingoDeMotos',
    image: '/community.jpg',
    location: 'Bogotá, Cundinamarca',
    likes: 567,
    comments: 123,
    shares: 89,
    time: '8h',
    liked: true,
    saved: false
  }
]

const stories = [
  { id: 1, user: 'Tu historia', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=motero1', isUser: true },
  { id: 2, user: 'Carlos R.', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos', hasStory: true },
  { id: 3, user: 'María G.', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria', hasStory: true },
  { id: 4, user: 'Andrés P.', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=andres', hasStory: true },
  { id: 5, user: 'Club B.', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=club', hasStory: true },
  { id: 6, user: 'Laura M.', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=laura', hasStory: true },
  { id: 7, user: 'Pedro S.', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pedro', hasStory: true },
]

const suggestedUsers = [
  { name: 'Diana López', username: '@diana_rider', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=diana', mutualFriends: 5 },
  { name: 'Ricardo Torres', username: '@ricardo_moto', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ricardo', mutualFriends: 3 },
  { name: 'Ana Martínez', username: '@ana_biker', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ana', mutualFriends: 8 },
]

const trendingTopics = [
  { tag: '#RutaColombia', posts: '2.4k' },
  { tag: '#MotoVlog', posts: '1.8k' },
  { tag: '#MantenimientoMoto', posts: '956' },
  { tag: '#VentaMoto', posts: '743' },
]

export function Home() {
  const [newPost, setNewPost] = useState('')
  const [postList, setPostList] = useState(posts)

  const handleLike = (postId: number) => {
    setPostList(posts => posts.map(post => 
      post.id === postId 
        ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
        : post
    ))
  }

  const handleSave = (postId: number) => {
    setPostList(posts => posts.map(post => 
      post.id === postId ? { ...post, saved: !post.saved } : post
    ))
  }

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stories */}
          <Card className="bg-moto-gray border-white/5">
            <CardContent className="p-4">
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {stories.map((story) => (
                  <button key={story.id} className="flex-shrink-0 flex flex-col items-center gap-2">
                    <div className={`w-16 h-16 rounded-full p-0.5 ${story.hasStory ? 'bg-gradient-to-tr from-moto-orange to-yellow-400' : 'bg-gray-600'}`}>
                      <div className="w-full h-full rounded-full bg-moto-dark p-0.5">
                        <img 
                          src={story.image} 
                          alt={story.user}
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 truncate w-16 text-center">{story.user}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Create Post */}
          <Card className="bg-moto-gray border-white/5">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=motero1" />
                  <AvatarFallback>JP</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Input
                    placeholder="¿Qué estás pensando, Juan?"
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="bg-moto-darker border-white/10 mb-3"
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-moto-orange">
                        <ImageIcon className="w-5 h-5 mr-1" />
                        Foto
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-moto-orange">
                        <MapPin className="w-5 h-5 mr-1" />
                        Ubicación
                      </Button>
                    </div>
                    <Button size="sm" className="bg-moto-orange hover:bg-moto-orange-dark">
                      <Send className="w-4 h-4 mr-1" />
                      Publicar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feed Tabs */}
          <Tabs defaultValue="for-you" className="w-full">
            <TabsList className="bg-moto-gray border-white/5 w-full">
              <TabsTrigger value="for-you" className="flex-1 data-[state=active]:bg-moto-orange">Para ti</TabsTrigger>
              <TabsTrigger value="following" className="flex-1 data-[state=active]:bg-moto-orange">Siguiendo</TabsTrigger>
              <TabsTrigger value="nearby" className="flex-1 data-[state=active]:bg-moto-orange">Cerca</TabsTrigger>
            </TabsList>
            
            <TabsContent value="for-you" className="mt-4 space-y-4">
              {postList.map((post) => (
                <Card key={post.id} className="bg-moto-gray border-white/5 overflow-hidden">
                  <CardHeader className="p-4 pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={post.user.avatar} />
                          <AvatarFallback>{post.user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{post.user.name}</p>
                          <p className="text-xs text-gray-500">{post.user.username} · {post.time}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-gray-400">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-4">
                    <p className="text-sm mb-3">{post.content}</p>
                    {post.location && (
                      <p className="text-xs text-moto-orange flex items-center gap-1 mb-3">
                        <MapPin className="w-3 h-3" />
                        {post.location}
                      </p>
                    )}
                    {post.image && (
                      <div className="rounded-xl overflow-hidden mb-4">
                        <img src={post.image} alt="Post" className="w-full h-64 object-cover" />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex gap-6">
                        <button 
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-2 text-sm ${post.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                        >
                          <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
                          {post.likes}
                        </button>
                        <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-moto-orange">
                          <MessageCircle className="w-5 h-5" />
                          {post.comments}
                        </button>
                        <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-moto-orange">
                          <Share2 className="w-5 h-5" />
                          {post.shares}
                        </button>
                      </div>
                      <button 
                        onClick={() => handleSave(post.id)}
                        className={`${post.saved ? 'text-moto-orange' : 'text-gray-400 hover:text-moto-orange'}`}
                      >
                        <Bookmark className={`w-5 h-5 ${post.saved ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="following" className="mt-4">
              <Card className="bg-moto-gray border-white/5 p-8 text-center">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sigue a más moteros</h3>
                <p className="text-gray-400 text-sm">Cuando sigas a otros usuarios, verás sus publicaciones aquí.</p>
              </Card>
            </TabsContent>
            
            <TabsContent value="nearby" className="mt-4">
              <Card className="bg-moto-gray border-white/5 p-8 text-center">
                <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Actividad cercana</h3>
                <p className="text-gray-400 text-sm">Verás publicaciones de moteros cerca de tu ubicación.</p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block space-y-6">
          {/* Trending Topics */}
          <Card className="bg-moto-gray border-white/5">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-moto-orange" />
                <h3 className="font-semibold">Tendencias</h3>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {trendingTopics.map((topic, index) => (
                  <button key={index} className="w-full text-left hover:bg-white/5 p-2 rounded-lg transition-colors">
                    <p className="text-sm font-medium text-moto-orange">{topic.tag}</p>
                    <p className="text-xs text-gray-500">{topic.posts} publicaciones</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Suggested Users */}
          <Card className="bg-moto-gray border-white/5">
            <CardHeader className="p-4 pb-2">
              <h3 className="font-semibold">Sugerencias para ti</h3>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-4">
                {suggestedUsers.map((user, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.username}</p>
                      <p className="text-xs text-gray-600">{user.mutualFriends} amigos en común</p>
                    </div>
                    <Button size="sm" variant="outline" className="border-moto-orange text-moto-orange hover:bg-moto-orange hover:text-white">
                      Seguir
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Footer Links */}
          <div className="text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
            <button className="hover:text-gray-400">Términos</button>
            <button className="hover:text-gray-400">Privacidad</button>
            <button className="hover:text-gray-400">Cookies</button>
            <button className="hover:text-gray-400">Accesibilidad</button>
            <button className="hover:text-gray-400">Publicidad</button>
            <span>© 2025 MotoCare</span>
          </div>
        </div>
      </div>
    </div>
  )
}
