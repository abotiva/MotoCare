import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bell, Bike, Calendar, CheckCircle2, FileText, Loader2, Plus, Settings, UserPlus, Wrench, X } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ImageViewer } from '@/components/ImageViewer'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { MaintenanceRecord, Motorcycle, Notification, Reminder } from '@/types/database'

type HomeStats = {
  motorcycles: number
  pendingReminders: number
  maintenanceRecords: number
  documents: number
}

const emptyStats: HomeStats = {
  motorcycles: 0,
  pendingReminders: 0,
  maintenanceRecords: 0,
  documents: 0,
}

function initials(name: string | null | undefined, email: string | undefined) {
  const source = name || email || 'MC'
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function daysUntil(date: string | null) {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-CO')
}

function daysUntilDate(value: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${value}T00:00:00`)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function notificationDisplay(notification: Notification) {
  if (notification.type === 'route_planned' && notification.routes?.start_date) {
    const days = daysUntilDate(notification.routes.start_date)
    const title = 'Ruta planeada cercana'
    const when =
      days === 0
        ? 'hoy'
        : days === 1
          ? 'manana'
          : days > 1
            ? `en ${days} dias`
            : `hace ${Math.abs(days)} dias`
    const message = `Tu ruta "${notification.routes.title}" esta programada para ${when}.`
    const dateLabel = `Fecha de ruta: ${formatDate(notification.routes.start_date)}`
    return { title, message, dateLabel }
  }

  if (notification.type === 'route_overdue' && notification.routes?.end_date) {
    const dateLabel = `Fecha final: ${formatDate(notification.routes.end_date)}`
    return { title: notification.title, message: notification.message, dateLabel }
  }

  if (notification.type === 'club_invite' && notification.club_invitations?.clubs) {
    return {
      title: 'Invitacion a club',
      message: `El club "${notification.club_invitations.clubs.name}" quiere agregarte como miembro.`,
      dateLabel: notification.club_invitations.clubs.city || 'Club MotoCare',
    }
  }

  return {
    title: notification.title,
    message: notification.message,
    dateLabel: `Visible desde: ${new Date(notification.scheduled_for).toLocaleDateString('es-CO')}`,
  }
}

export function Home() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<HomeStats>(emptyStats)
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const primaryMotorcycle = useMemo(() => {
    return motorcycles.find((motorcycle) => motorcycle.id === profile?.primary_motorcycle_id) ?? motorcycles[0] ?? null
  }, [motorcycles, profile?.primary_motorcycle_id])

  const urgentReminders = useMemo(() => {
    return reminders
      .filter((reminder) => {
        const days = daysUntil(reminder.due_date)
        const dueByDate = days !== null && days <= 15
        const dueByKm = primaryMotorcycle && reminder.due_mileage !== null && reminder.due_mileage <= primaryMotorcycle.mileage + 300
        return dueByDate || dueByKm
      })
      .slice(0, 3)
  }, [primaryMotorcycle, reminders])

  const recentMaintenanceRecords = useMemo(() => maintenanceRecords.slice(0, 3), [maintenanceRecords])

  const profileCompletion = useMemo(() => {
    const checks = [
      Boolean(profile?.full_name),
      Boolean(profile?.username),
      Boolean(profile?.city),
      Boolean(profile?.rider_type),
      Boolean(profile?.avatar_url),
      Boolean(primaryMotorcycle),
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [primaryMotorcycle, profile])

  const loadDashboard = async () => {
    if (!supabase || !user) return
    setIsLoading(true)
    const todayIso = new Date().toISOString()

    const [motorcyclesResult, remindersResult, maintenanceResult, documentsResult, notificationsResult] = await Promise.all([
      supabase.from('motorcycles').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('reminders').select('*').eq('owner_id', user.id).eq('status', 'pending').order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('maintenance_records').select('*', { count: 'exact' }).eq('owner_id', user.id).order('service_date', { ascending: false }).limit(5),
      supabase.from('motorcycle_documents').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
      supabase
        .from('notifications')
        .select('*, routes:route_id(title, start_date, end_date, status), club_invitations:club_invitation_id(*, clubs:club_id(id, name, image_url, city))')
        .eq('user_id', user.id)
        .is('read_at', null)
        .lte('scheduled_for', todayIso)
        .order('scheduled_for', { ascending: true })
        .limit(5),
    ])

    if (motorcyclesResult.error) {
      toast.error('No pudimos cargar tus motos', { description: motorcyclesResult.error.message })
    } else {
      const nextMotorcycles = (motorcyclesResult.data ?? []) as Motorcycle[]
      setMotorcycles(nextMotorcycles)
      setStats((current) => ({ ...current, motorcycles: nextMotorcycles.length }))
    }

    if (remindersResult.error) {
      toast.error('No pudimos cargar pendientes', { description: remindersResult.error.message })
    } else {
      const nextReminders = (remindersResult.data ?? []) as Reminder[]
      setReminders(nextReminders)
      setStats((current) => ({ ...current, pendingReminders: nextReminders.length }))
    }

    if (maintenanceResult.error) {
      toast.error('No pudimos cargar mantenimientos', { description: maintenanceResult.error.message })
    } else {
      setMaintenanceRecords((maintenanceResult.data ?? []) as MaintenanceRecord[])
      setStats((current) => ({ ...current, maintenanceRecords: maintenanceResult.count ?? 0 }))
    }

    if (documentsResult.error) {
      toast.error('No pudimos cargar documentos', { description: documentsResult.error.message })
    } else {
      setStats((current) => ({ ...current, documents: documentsResult.count ?? 0 }))
    }

    if (notificationsResult.error) {
      toast.error('No pudimos cargar notificaciones', { description: notificationsResult.error.message })
    } else {
      setNotifications((notificationsResult.data ?? []) as Notification[])
    }

    setIsLoading(false)
  }

  useEffect(() => {
    void loadDashboard()
    // Dashboard load is intentionally keyed only by authenticated user id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const markNotificationAsRead = async (notification: Notification) => {
    if (!supabase || !user) return

    const readAt = new Date().toISOString()
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('id', notification.id)
      .eq('user_id', user.id)

    if (error) {
      toast.error('No pudimos marcar la notificacion', { description: error.message })
    } else {
      setNotifications((current) => current.filter((item) => item.id !== notification.id))
      toast.success('Notificacion marcada como leida')
    }
  }

  const respondToClubInvite = async (notification: Notification, accepted: boolean) => {
    if (!supabase || !user || !notification.club_invitation_id || !notification.club_invitations) return

    const status = accepted ? 'accepted' : 'declined'
    const respondedAt = new Date().toISOString()
    const { error: invitationError } = await supabase
      .from('club_invitations')
      .update({ status, responded_at: respondedAt })
      .eq('id', notification.club_invitation_id)
      .eq('invited_user_id', user.id)

    if (invitationError) {
      toast.error('No pudimos responder la invitacion', { description: invitationError.message })
      return
    }

    if (accepted) {
      const { error: memberError } = await supabase.from('club_members').insert({
        club_id: notification.club_invitations.club_id,
        user_id: user.id,
        role: 'member',
      })

      if (memberError) {
        toast.error('La invitacion fue aprobada, pero no pudimos agregarte al club', { description: memberError.message })
        return
      }
    }

    await markNotificationAsRead(notification)
    toast.success(accepted ? 'Invitacion aprobada' : 'Invitacion rechazada', {
      description: accepted ? 'Ya apareces como miembro del club.' : 'El club no fue agregado a tu perfil.',
    })
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-moto-orange">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 lg:p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 bg-moto-gray">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback>{initials(profile?.full_name, user?.email)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Hola, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'motero'}</h1>
            <p className="text-gray-400">Este es el estado actual de tu MotoCare.</p>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap">
          <Button asChild className="min-w-0 bg-moto-orange px-3 text-moto-darker hover:bg-moto-orange-dark sm:px-4">
            <Link to="/app/my-bikes#history">
              <Plus className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="sm:hidden">Servicio</span>
              <span className="hidden sm:inline">Registrar servicio</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="min-w-0 border-white/10 px-3 sm:px-4">
            <Link to="/app/my-bikes#reminders">
              <Calendar className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="sm:hidden">Pendiente</span>
              <span className="hidden sm:inline">Programar pendiente</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2 sm:mb-5 sm:gap-4">
        <MetricCard icon={Bike} label="Motos" value={stats.motorcycles} tone="orange" to="/app/my-bikes" />
        <MetricCard icon={Calendar} label="Programados" mobileLabel="Agenda" value={stats.pendingReminders} tone="yellow" to="/app/my-bikes#reminders" />
        <MetricCard icon={Wrench} label="Servicios" value={stats.maintenanceRecords} tone="sky" to="/app/my-bikes#history" />
        <MetricCard icon={FileText} label="Documentos" value={stats.documents} tone="green" to="/app/my-bikes#documents" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Moto principal</h2>
                <Button asChild size="sm" variant="outline" className="border-white/10">
                  <Link to="/app/my-bikes">Ver mi moto</Link>
                </Button>
              </div>

              {primaryMotorcycle ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {primaryMotorcycle.image_url ? (
                    <button
                      type="button"
                      className="h-32 w-full overflow-hidden rounded-xl text-left sm:w-48"
                      onClick={() => setViewerImage({ src: primaryMotorcycle.image_url!, alt: primaryMotorcycle.model })}
                    >
                      <img src={primaryMotorcycle.image_url} alt={primaryMotorcycle.model} className="h-full w-full object-cover transition hover:scale-[1.01]" />
                    </button>
                  ) : (
                    <div className="grid h-32 w-full place-items-center rounded-xl bg-moto-darker sm:w-48">
                      <Bike className="h-12 w-12 text-gray-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-bold">{primaryMotorcycle.brand} {primaryMotorcycle.model}</h3>
                    <p className="text-sm text-gray-400">{primaryMotorcycle.plate || 'Sin placa'} - {primaryMotorcycle.year || 'Sin ano'}</p>
                    <p className="mt-3 text-2xl font-bold text-moto-orange">{primaryMotorcycle.mileage.toLocaleString()} km</p>
                  </div>
                </div>
              ) : (
                <EmptyState icon={Bike} text="Aun no tienes una moto registrada." actionLabel="Agregar moto" to="/app/my-bikes" />
              )}
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Pendientes importantes</h2>
                <Button asChild size="sm" variant="outline" className="border-white/10">
                  <Link to="/app/my-bikes">Ver todos</Link>
                </Button>
              </div>

              {urgentReminders.length > 0 ? (
                <div className="space-y-3">
                  {urgentReminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between gap-3 rounded-xl bg-moto-darker p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{reminder.title}</p>
                        <p className="text-sm text-gray-400">
                          {reminder.due_mileage ? `${reminder.due_mileage.toLocaleString()} km` : 'Sin kilometraje'} - {reminder.due_date || 'Sin fecha'}
                        </p>
                      </div>
                      <Badge className="bg-yellow-500/15 text-yellow-300">Pendiente</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-moto-darker p-5 text-center text-gray-400">
                  <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-400" />
                  No hay pendientes urgentes.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Notificaciones</h2>
                <Button asChild size="sm" variant="outline" className="border-white/10">
                  <Link to="/app/notifications">Ver todas</Link>
                </Button>
              </div>

              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="rounded-xl bg-moto-darker p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {(() => {
                            const display = notificationDisplay(notification)
                            return (
                              <>
                                <p className="font-medium">{display.title}</p>
                                <p className="mt-1 text-sm text-gray-400">{display.message}</p>
                                <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {display.dateLabel}
                                </p>
                              </>
                            )
                          })()}
                        </div>
                        {notification.type === 'club_invite' ? (
                          <div className="flex shrink-0 flex-col gap-2">
                            <Button size="sm" className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => void respondToClubInvite(notification, true)}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Aprobar
                            </Button>
                            <Button size="sm" variant="outline" className="border-white/10" onClick={() => void respondToClubInvite(notification, false)}>
                              <X className="mr-2 h-4 w-4" />
                              Rechazar
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="border-white/10" onClick={() => void markNotificationAsRead(notification)}>
                            Leida
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-moto-darker p-5 text-center text-gray-400">
                  <Bell className="mx-auto mb-2 h-10 w-10 text-gray-600" />
                  No hay notificaciones pendientes.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          {profileCompletion < 100 && (
            <Card className="border-white/5 bg-moto-gray py-0">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold">Perfil</h2>
                  <Badge className={profileCompletion >= 80 ? 'bg-green-500/15 text-green-300' : 'bg-yellow-500/15 text-yellow-300'}>
                    {profileCompletion}%
                  </Badge>
                </div>
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-moto-darker">
                  <div className="h-full bg-moto-orange" style={{ width: `${profileCompletion}%` }} />
                </div>
                <p className="mb-4 text-sm text-gray-400">Completa tu perfil y deja tu hoja de vida lista para respaldar el historial de tu moto.</p>
                <Button asChild variant="outline" className="w-full border-white/10">
                  <Link to="/app/profile">
                    <Settings className="mr-2 h-4 w-4" />
                    Completar perfil
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="p-5">
              <h2 className="mb-4 font-semibold">Ultimos mantenimientos</h2>
              {recentMaintenanceRecords.length > 0 ? (
                <div className="space-y-3">
                  {recentMaintenanceRecords.map((record) => (
                    <Link key={record.id} to="/app/my-bikes#history" className="block rounded-xl bg-moto-darker p-3 transition hover:bg-moto-darker/80 hover:ring-1 hover:ring-moto-orange/40">
                      <p className="truncate font-medium">{record.service_type}</p>
                      <p className="text-sm text-gray-400">{record.mileage.toLocaleString()} km{record.cost ? ` - ${record.cost.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}` : ''}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(record.service_date)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Wrench} text="Aun no tienes mantenimientos registrados." actionLabel="Registrar servicio" to="/app/my-bikes#history" />
              )}
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="p-5">
              <h2 className="mb-3 font-semibold">Siguiente paso recomendado</h2>
              {stats.pendingReminders > 0 ? (
                <p className="text-sm text-gray-400">Revise sus pendientes y cierre el proximo mantenimiento para mantener la hoja de vida al dia.</p>
              ) : stats.maintenanceRecords === 0 ? (
                <p className="text-sm text-gray-400">Registre el primer servicio realizado para empezar el historial verificable de su moto.</p>
              ) : (
                <p className="text-sm text-gray-400">Suba documentos clave como SOAT o revision tecnica para completar el expediente.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ImageViewer
        src={viewerImage?.src ?? null}
        alt={viewerImage?.alt}
        open={Boolean(viewerImage)}
        onOpenChange={(open) => !open && setViewerImage(null)}
      />
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  mobileLabel,
  value,
  tone,
  to,
}: {
  icon: typeof Bike
  label: string
  mobileLabel?: string
  value: number
  tone: 'orange' | 'yellow' | 'sky' | 'green'
  to: string
}) {
  const tones = {
    orange: 'bg-moto-orange/20 text-moto-orange',
    yellow: 'bg-yellow-500/20 text-yellow-300',
    sky: 'bg-sky-500/20 text-sky-300',
    green: 'bg-green-500/20 text-green-300',
  }

  return (
    <Link to={to} className="block min-w-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-moto-orange focus:ring-offset-2 focus:ring-offset-moto-dark">
      <Card className="h-full min-w-0 border-white/5 bg-moto-gray py-0 transition-colors hover:border-moto-orange/40 hover:bg-white/5">
        <CardContent className="flex min-w-0 flex-col items-center gap-1.5 p-2 text-center sm:flex-row sm:gap-4 sm:p-4 sm:text-left">
          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl ${tones[tone]}`}>
            <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="max-w-full truncate text-[11px] leading-tight text-gray-400 sm:text-sm">
              <span className="sm:hidden">{mobileLabel ?? label}</span>
              <span className="hidden sm:inline">{label}</span>
            </p>
            <p className="text-base font-bold leading-tight sm:text-xl">{value}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function EmptyState({ icon: Icon, text, actionLabel, to }: { icon: typeof AlertTriangle; text: string; actionLabel: string; to: string }) {
  return (
    <div className="rounded-xl bg-moto-darker p-5 text-center text-gray-400">
      <Icon className="mx-auto mb-3 h-10 w-10 text-gray-600" />
      <p className="mb-4 text-sm">{text}</p>
      <Button asChild size="sm" className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
        <Link to={to}>{actionLabel}</Link>
      </Button>
    </div>
  )
}
