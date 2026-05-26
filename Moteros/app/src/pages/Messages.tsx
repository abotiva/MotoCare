import { useState } from 'react'
import { 
  Search, MoreVertical, Phone, Video, Send, Image as ImageIcon, 
  MapPin, Smile, Paperclip, Check, CheckCheck, Circle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

const conversations = [
  {
    id: 1,
    user: { name: 'Carlos Rodríguez', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos', status: 'online' },
    lastMessage: '¿Te animas a la salida del domingo?',
    time: '2 min',
    unread: 2,
    typing: false
  },
  {
    id: 2,
    user: { name: 'María González', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria', status: 'offline' },
    lastMessage: 'Gracias por la info de la ruta!',
    time: '1h',
    unread: 0,
    typing: false
  },
  {
    id: 3,
    user: { name: 'Andrés Pérez', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=andres', status: 'online' },
    lastMessage: 'Te envío las fotos de la moto',
    time: '3h',
    unread: 0,
    typing: true
  },
  {
    id: 4,
    user: { name: 'Club Moteros Bogotá', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=club', status: 'online' },
    lastMessage: 'Juan: Confirmo asistencia para el domingo',
    time: '5h',
    unread: 5,
    typing: false
  },
  {
    id: 5,
    user: { name: 'Diana López', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=diana', status: 'offline' },
    lastMessage: '¿A qué hora quedamos?',
    time: '1d',
    unread: 0,
    typing: false
  },
]

const messages = [
  { id: 1, sender: 'me', text: 'Hola Carlos! ¿Cómo vas?', time: '10:30 AM', read: true },
  { id: 2, sender: 'them', text: 'Todo bien! ¿Y tú? Listo para rodar?', time: '10:32 AM', read: true },
  { id: 3, sender: 'me', text: 'Sí! Estoy pensando en la ruta de la Sabana para este domingo', time: '10:33 AM', read: true },
  { id: 4, sender: 'them', text: '¡Suena perfecto! ¿A qué hora salimos?', time: '10:35 AM', read: true },
  { id: 5, sender: 'me', text: 'Podemos quedar a las 7 AM en el Parque de la 93', time: '10:36 AM', read: true },
  { id: 6, sender: 'them', text: '¿Te animas a la salida del domingo?', time: '10:45 AM', read: false },
]

export function Messages() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversations List */}
      <div className="w-full lg:w-80 bg-moto-gray border-r border-white/5 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <h2 className="text-xl font-bold mb-4">Mensajes</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-moto-darker border-white/5 text-sm"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 ${
                selectedConversation?.id === conv.id ? 'bg-white/5' : ''
              }`}
            >
              <div className="relative">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={conv.user.avatar} />
                  <AvatarFallback>{conv.user.name[0]}</AvatarFallback>
                </Avatar>
                {conv.user.status === 'online' && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-moto-gray" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">{conv.user.name}</p>
                  <span className="text-xs text-gray-500">{conv.time}</span>
                </div>
                <p className={`text-sm truncate ${conv.unread > 0 ? 'text-white font-medium' : 'text-gray-400'}`}>
                  {conv.typing ? (
                    <span className="text-moto-orange flex items-center gap-1">
                      Escribiendo
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 bg-moto-orange rounded-full animate-bounce" />
                        <span className="w-1 h-1 bg-moto-orange rounded-full animate-bounce delay-75" />
                        <span className="w-1 h-1 bg-moto-orange rounded-full animate-bounce delay-150" />
                      </span>
                    </span>
                  ) : (
                    conv.lastMessage
                  )}
                </p>
              </div>
              {conv.unread > 0 && (
                <Badge className="bg-moto-orange text-white">{conv.unread}</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="hidden lg:flex flex-1 flex-col bg-moto-dark">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedConversation.user.avatar} />
                    <AvatarFallback>{selectedConversation.user.name[0]}</AvatarFallback>
                  </Avatar>
                  {selectedConversation.user.status === 'online' && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-moto-dark" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{selectedConversation.user.name}</p>
                  <p className="text-xs text-gray-500">
                    {selectedConversation.user.status === 'online' ? 'En línea' : 'Desconectado'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <Video className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                      msg.sender === 'me'
                        ? 'bg-moto-orange text-white rounded-br-md'
                        : 'bg-moto-gray text-white rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <div className={`flex items-center gap-1 mt-1 ${msg.sender === 'me' ? 'justify-end' : ''}`}>
                      <span className="text-[10px] opacity-70">{msg.time}</span>
                      {msg.sender === 'me' && (
                        msg.read ? (
                          <CheckCheck className="w-3 h-3" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <MapPin className="w-5 h-5" />
                </Button>
                <Input
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-moto-gray border-white/5"
                />
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <Smile className="w-5 h-5" />
                </Button>
                <Button className="bg-moto-orange hover:bg-moto-orange-dark">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-moto-gray rounded-full flex items-center justify-center mx-auto mb-4">
                <Circle className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Tus mensajes</h3>
              <p className="text-gray-400">Selecciona una conversación para empezar a chatear</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
