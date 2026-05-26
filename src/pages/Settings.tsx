import { useState } from 'react'
import { 
  User, Bell, Shield, CreditCard, Smartphone, LogOut, 
  ChevronRight, Camera, Edit3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const settingsSections = [
  {
    id: 'account',
    title: 'Cuenta',
    icon: User,
    items: [
      { id: 'profile', label: 'Información personal', description: 'Nombre, email, teléfono' },
      { id: 'password', label: 'Contraseña', description: 'Cambiar contraseña' },
      { id: 'privacy', label: 'Privacidad', description: 'Quién puede ver tu perfil' },
    ]
  },
  {
    id: 'notifications',
    title: 'Notificaciones',
    icon: Bell,
    items: [
      { id: 'push', label: 'Notificaciones push', description: 'Alertas en tu teléfono', type: 'toggle', value: true },
      { id: 'email', label: 'Notificaciones por email', description: 'Resumen semanal', type: 'toggle', value: true },
      { id: 'messages', label: 'Mensajes', description: 'Cuando recibes un mensaje', type: 'toggle', value: true },
      { id: 'routes', label: 'Rutas y eventos', description: 'Salidas grupales cercanas', type: 'toggle', value: false },
    ]
  },
  {
    id: 'preferences',
    title: 'Preferencias',
    icon: Smartphone,
    items: [
      { id: 'darkMode', label: 'Modo oscuro', description: 'Tema oscuro de la app', type: 'toggle', value: true },
      { id: 'language', label: 'Idioma', description: 'Español (Colombia)' },
      { id: 'units', label: 'Unidades', description: 'Kilómetros, Celsius' },
    ]
  },
  {
    id: 'security',
    title: 'Seguridad',
    icon: Shield,
    items: [
      { id: '2fa', label: 'Autenticación de dos factores', description: 'Añade una capa extra de seguridad', type: 'toggle', value: false },
      { id: 'biometric', label: 'Desbloqueo biométrico', description: 'Huella o Face ID', type: 'toggle', value: true },
      { id: 'sessions', label: 'Sesiones activas', description: 'Ver dónde has iniciado sesión' },
    ]
  },
  {
    id: 'billing',
    title: 'Suscripción y Pagos',
    icon: CreditCard,
    items: [
      { id: 'plan', label: 'Plan actual', description: 'MotoPro - $14.900/mes' },
      { id: 'payment', label: 'Método de pago', description: '**** 4242' },
      { id: 'history', label: 'Historial de pagos', description: 'Ver facturas anteriores' },
    ]
  },
]

export function Settings() {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    push: true,
    email: true,
    messages: true,
    routes: false,
    darkMode: true,
    '2fa': false,
    biometric: true,
  })

  const handleToggle = (id: string) => {
    setToggles(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Configuración</h1>
        <p className="text-gray-400">Personaliza tu experiencia en MotoCare</p>
      </div>

      {/* Profile Summary */}
      <Card className="bg-moto-gray border-white/5 mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=motero1" />
                <AvatarFallback className="text-2xl">JP</AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-moto-orange rounded-full flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold">Juan Pérez</h2>
              <p className="text-gray-400">@juan_rider</p>
              <p className="text-sm text-gray-500 mt-1">juan.perez@email.com</p>
            </div>
            <Button variant="outline" className="border-white/10">
              <Edit3 className="w-4 h-4 mr-2" />
              Editar Perfil
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Sections */}
      <div className="space-y-4">
        {settingsSections.map((section) => (
          <Card key={section.id} className="bg-moto-gray border-white/5 overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-moto-orange/20 flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-moto-orange" />
                </div>
                <h3 className="font-semibold">{section.title}</h3>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {section.items.map((item, index) => (
                <div key={item.id}>
                  {index > 0 && <Separator className="bg-white/5" />}
                  <button 
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                    onClick={() => item.type !== 'toggle' && setActiveSection(item.id)}
                  >
                    <div className="text-left">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-gray-400">{item.description}</p>
                    </div>
                    {item.type === 'toggle' ? (
                      <Switch 
                        checked={toggles[item.id]} 
                        onCheckedChange={() => handleToggle(item.id)}
                        className="data-[state=checked]:bg-moto-orange"
                      />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Danger Zone */}
        <Card className="bg-red-500/5 border-red-500/20 overflow-hidden">
          <CardContent className="p-4">
            <h3 className="font-semibold text-red-500 mb-4">Zona de Peligro</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start border-red-500/30 text-red-500 hover:bg-red-500/10">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
              <Button variant="outline" className="w-full justify-start border-red-500/30 text-red-500 hover:bg-red-500/10">
                Eliminar Cuenta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* App Info */}
      <div className="text-center mt-8 text-sm text-gray-500">
        <p>MotoCare v1.0.0</p>
        <p className="mt-1">© 2025 MotoCare. Todos los derechos reservados.</p>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={activeSection === 'profile'} onOpenChange={() => setActiveSection(null)}>
        <DialogContent className="bg-moto-gray border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Información Personal</DialogTitle>
            <DialogDescription className="text-gray-400">
              Actualiza tus datos de perfil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Nombre</label>
              <input type="text" defaultValue="Juan Pérez" className="w-full bg-moto-darker border border-white/10 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Nombre de usuario</label>
              <input type="text" defaultValue="@juan_rider" className="w-full bg-moto-darker border border-white/10 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <input type="email" defaultValue="juan.perez@email.com" className="w-full bg-moto-darker border border-white/10 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Teléfono</label>
              <input type="tel" defaultValue="+57 300 123 4567" className="w-full bg-moto-darker border border-white/10 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Bio</label>
              <textarea defaultValue="🏍️ Apasionado por las dos ruedas | 📍 Explorando Colombia" className="w-full bg-moto-darker border border-white/10 rounded-lg p-2 text-white h-20 resize-none" />
            </div>
            <Button className="w-full bg-moto-orange hover:bg-moto-orange-dark">
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
