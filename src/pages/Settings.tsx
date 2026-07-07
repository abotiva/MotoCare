import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Bike,
  ChevronRight,
  KeyRound,
  LogOut,
  Mail,
  Route,
  Shield,
  User,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

type PreferenceKey = 'maintenance_alerts' | 'community_alerts' | 'route_alerts' | 'email_summary' | 'public_profile'

type Preference = {
  id: PreferenceKey
  label: string
  description: string
}

const defaultPreferences: Record<PreferenceKey, boolean> = {
  maintenance_alerts: true,
  community_alerts: true,
  route_alerts: true,
  email_summary: false,
  public_profile: true,
}

const notificationPreferences: Preference[] = [
  {
    id: 'maintenance_alerts',
    label: 'Alertas de mantenimiento',
    description: 'Recordatorios de pendientes, documentos y kilometraje.',
  },
  {
    id: 'community_alerts',
    label: 'Actividad de comunidad',
    description: 'Likes, comentarios y publicaciones relacionadas.',
  },
  {
    id: 'route_alerts',
    label: 'Rutas guardadas y compartidas',
    description: 'Cambios relevantes en rutas de comunidad.',
  },
  {
    id: 'email_summary',
    label: 'Resumen por email',
    description: 'Recibir un resumen periodico cuando se habilite esta funcion.',
  },
]

const privacyPreferences: Preference[] = [
  {
    id: 'public_profile',
    label: 'Perfil visible',
    description: 'Permitir que otros moteros vean nombre, usuario, ciudad y avatar.',
  },
]

function initials(name: string | null | undefined, email: string | undefined) {
  const source = name || email || 'MC'
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function loadPreferences() {
  try {
    const raw = window.localStorage.getItem('motocare_settings')
    if (!raw) return defaultPreferences
    return { ...defaultPreferences, ...JSON.parse(raw) } as Record<PreferenceKey, boolean>
  } catch {
    return defaultPreferences
  }
}

export function Settings() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [preferences, setPreferences] = useState<Record<PreferenceKey, boolean>>(defaultPreferences)
  const [isSendingReset, setIsSendingReset] = useState(false)

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Motero MotoHubX'
  const username = profile?.username || user?.email?.split('@')[0] || 'motohubx'

  useEffect(() => {
    setPreferences(loadPreferences())
  }, [])

  const togglePreference = (id: PreferenceKey) => {
    if (id === 'public_profile') {
      void togglePublicProfile()
      return
    }

    setPreferences((current) => {
      const next = { ...current, [id]: !current[id] }
      window.localStorage.setItem('motocare_settings', JSON.stringify(next))
      toast.success('Ajuste guardado', { description: 'Esta preferencia queda guardada en este navegador.' })
      return next
    })
  }

  const togglePublicProfile = async () => {
    if (!supabase || !user) return

    const nextValue = !(profile?.is_public ?? true)
    const { error } = await supabase
      .from('profiles')
      .update({ is_public: nextValue })
      .eq('id', user.id)

    if (error) {
      toast.error('No pudimos guardar privacidad', { description: error.message })
      return
    }

    await refreshProfile()
    toast.success('Privacidad actualizada', {
      description: nextValue ? 'Su perfil puede aparecer en busquedas.' : 'Su perfil queda privado para busquedas.',
    })
  }

  const sendPasswordReset = async () => {
    if (!supabase || !user?.email) return
    setIsSendingReset(true)

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin + '/login',
    })

    if (error) {
      toast.error('No pudimos enviar el correo', { description: error.message })
    } else {
      toast.success('Correo enviado', { description: 'Revise su bandeja para continuar el cambio de clave.' })
    }

    setIsSendingReset(false)
  }

  return (
    <div className="mx-auto w-full max-w-5xl overflow-x-hidden p-3 pb-28 sm:p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="mb-1 text-xl font-bold sm:text-2xl">Ajustes</h1>
        <p className="text-sm leading-6 text-gray-400 sm:text-base">Administra tu cuenta, privacidad y preferencias del MVP.</p>
      </div>

      <Card className="mb-6 overflow-hidden border-white/5 bg-moto-gray py-0">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar className="mx-auto h-16 w-16 shrink-0 sm:mx-0 sm:h-20 sm:w-20">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl">{initials(profile?.full_name, user?.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="max-w-full break-words text-lg font-bold sm:text-xl">{displayName}</h2>
                <Badge className="max-w-full bg-moto-orange text-moto-darker">{profile?.rider_type || 'Motero'}</Badge>
              </div>
              <p className="break-words text-sm text-gray-400 sm:text-base">@{username}</p>
              <div className="mt-2 flex flex-col items-center gap-2 text-sm text-gray-500 sm:flex-row sm:flex-wrap sm:items-start sm:justify-start">
                <span className="flex max-w-full min-w-0 items-center justify-center gap-1 sm:justify-start">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-all text-center sm:text-left">{user?.email || 'Email no disponible'}</span>
                </span>
                <span className="break-words">{profile?.city || 'Ciudad sin definir'}</span>
              </div>
            </div>
            <Button asChild className="w-full shrink-0 bg-moto-orange text-moto-darker hover:bg-moto-orange-dark sm:w-auto">
              <Link to="/app/profile">
                <User className="mr-2 h-4 w-4" />
                Editar perfil
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SettingsGroup icon={Bell} title="Notificaciones">
            {notificationPreferences.map((item) => (
              <ToggleRow key={item.id} item={item} checked={preferences[item.id]} onToggle={() => togglePreference(item.id)} />
            ))}
          </SettingsGroup>

          <SettingsGroup icon={Shield} title="Privacidad">
            {privacyPreferences.map((item) => (
              <ToggleRow
                key={item.id}
                item={item}
                checked={item.id === 'public_profile' ? (profile?.is_public ?? true) : preferences[item.id]}
                onToggle={() => togglePreference(item.id)}
              />
            ))}
            <InfoRow label="Rutas privadas" description="Las rutas privadas solo las ve usted. Las funciones comunitarias quedaran reservadas para licencias Premium." />
          </SettingsGroup>

          <SettingsGroup icon={KeyRound} title="Seguridad">
            <ActionRow
              label="Cambiar contrasena"
              description="Enviaremos un correo de recuperacion a su email registrado."
              action={
                <Button variant="outline" className="w-full border-white/10 sm:w-auto" disabled={isSendingReset} onClick={() => void sendPasswordReset()}>
                  Enviar correo
                </Button>
              }
            />
            <ActionRow
              label="Cerrar sesion"
              description="Salir de MotoHubX en este navegador."
              action={
                <Button variant="outline" className="w-full border-red-500/30 text-red-300 hover:text-red-200 sm:w-auto" onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Salir
                </Button>
              }
            />
          </SettingsGroup>
        </div>

        <div className="min-w-0 space-y-5">
          <Card className="border-white/5 bg-moto-gray py-0">
            <CardHeader className="p-4 pb-2">
              <h3 className="font-semibold">Accesos rapidos</h3>
            </CardHeader>
            <CardContent className="p-0">
              <QuickLink icon={Bike} label="Mi moto" description="Motos, documentos y mantenimientos" to="/app/my-bikes" />
              <QuickLink icon={Route} label="Rutas" description="Crear, editar y guardar rutas" to="/app/map" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SettingsGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <Card className="min-w-0 overflow-hidden border-white/5 bg-moto-gray py-0">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-moto-orange/20">
            <Icon className="h-5 w-5 text-moto-orange" />
          </div>
          <h3 className="font-semibold">{title}</h3>
        </div>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  )
}

function ToggleRow({ item, checked, onToggle }: { item: Preference; checked: boolean; onToggle: () => void }) {
  return (
    <div>
      <Separator className="bg-white/5" />
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium">{item.label}</p>
          <p className="mt-1 break-words text-sm leading-5 text-gray-400">{item.description}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onToggle} className="shrink-0 data-[state=checked]:bg-moto-orange" />
      </div>
    </div>
  )
}

function InfoRow({ label, description }: { label: string; description: string }) {
  return (
    <div>
      <Separator className="bg-white/5" />
      <div className="p-4">
        <p className="break-words font-medium">{label}</p>
        <p className="mt-1 break-words text-sm leading-5 text-gray-400">{description}</p>
      </div>
    </div>
  )
}

function ActionRow({ label, description, action }: { label: string; description: string; action: ReactNode }) {
  return (
    <div>
      <Separator className="bg-white/5" />
      <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="break-words font-medium">{label}</p>
          <p className="mt-1 break-words text-sm leading-5 text-gray-400">{description}</p>
        </div>
        <div className="w-full sm:w-auto">{action}</div>
      </div>
    </div>
  )
}

function QuickLink({ icon: Icon, label, description, to }: { icon: LucideIcon; label: string; description: string; to: string }) {
  return (
    <Link to={to} className="block min-w-0">
      <Separator className="bg-white/5" />
      <div className="flex min-w-0 items-center justify-between gap-3 p-4 transition-colors hover:bg-white/5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-moto-darker">
            <Icon className="h-5 w-5 text-moto-orange" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{label}</p>
            <p className="break-words text-sm leading-5 text-gray-400">{description}</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />
      </div>
    </Link>
  )
}
