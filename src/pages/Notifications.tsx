import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Calendar, Check, CheckCheck, Crown, Loader2, Route, Shield, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { planLabels, useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/database'

type NotificationFilter = 'all' | 'unread' | 'routes' | 'clubs'

const filters: Array<{ id: NotificationFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'Pendientes' },
  { id: 'routes', label: 'Rutas' },
  { id: 'clubs', label: 'Clubes' },
]

function typeLabel(type: Notification['type']) {
  if (type === 'club_invite') return 'Club'
  if (type === 'route_overdue') return 'Ruta vencida'
  return 'Ruta'
}

function typeIcon(type: Notification['type']) {
  if (type === 'club_invite') return Users
  if (type === 'route_overdue') return Shield
  return Route
}

function notificationText(notification: Notification) {
  if (notification.type === 'club_invite' && notification.club_invitations?.clubs) {
    return {
      title: 'Invitacion a club',
      message: `El club "${notification.club_invitations.clubs.name}" quiere agregarte como miembro.`,
      detail: notification.club_invitations.clubs.city || 'Club MotoCare',
    }
  }

  return {
    title: notification.title,
    message: notification.message,
    detail: new Date(notification.scheduled_for).toLocaleString('es-CO'),
  }
}

export function Notifications() {
  const { user } = useAuth()
  const userId = user?.id
  const { effectivePlan, isLoadingSubscription, hasPlan } = useSubscription()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<NotificationFilter>('unread')
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read_at).length, [notifications])
  const routeCount = useMemo(() => notifications.filter((item) => item.type === 'route_planned' || item.type === 'route_overdue').length, [notifications])
  const clubCount = useMemo(() => notifications.filter((item) => item.type === 'club_invite').length, [notifications])
  const canUseAdvancedNotifications = hasPlan('premium')

  const visibleNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((item) => !item.read_at)
    if (filter === 'routes') return notifications.filter((item) => item.type === 'route_planned' || item.type === 'route_overdue')
    if (filter === 'clubs') return notifications.filter((item) => item.type === 'club_invite')
    return notifications
  }, [filter, notifications])

  const loadNotifications = useCallback(async () => {
    if (!supabase || !userId) return
    setIsLoading(true)

    const { data, error } = await supabase
      .from('notifications')
      .select('*, routes:route_id(id, title, start_date, end_date, status), club_invitations:club_invitation_id(*, clubs:club_id(id, name, image_url, city))')
      .eq('user_id', userId)
      .lte('scheduled_for', new Date().toISOString())
      .order('read_at', { ascending: true, nullsFirst: true })
      .order('scheduled_for', { ascending: false })
      .limit(80)

    if (error) {
      toast.error('No pudimos cargar notificaciones', { description: error.message })
    } else {
      setNotifications((data ?? []) as Notification[])
    }

    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const markAsRead = async (notification: Notification) => {
    if (!supabase || notification.read_at) return
    setBusyId(notification.id)
    const readAt = new Date().toISOString()
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('id', notification.id)

    if (error) {
      toast.error('No pudimos marcarla como leida', { description: error.message })
    } else {
      setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, read_at: readAt } : item)))
    }
    setBusyId(null)
  }

  const markAllAsRead = async () => {
    if (!supabase || !user || unreadCount === 0) return
    setIsMarkingAll(true)
    const readAt = new Date().toISOString()
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('user_id', userId)
      .is('read_at', null)
      .lte('scheduled_for', new Date().toISOString())

    if (error) {
      toast.error('No pudimos marcar todas', { description: error.message })
    } else {
      setNotifications((current) => current.map((item) => (item.read_at ? item : { ...item, read_at: readAt })))
      toast.success('Notificaciones actualizadas')
    }
    setIsMarkingAll(false)
  }

  const respondToClubInvite = async (notification: Notification, accepted: boolean) => {
    if (!supabase || !user || !notification.club_invitation_id || !notification.club_invitations) return
    setBusyId(notification.id)

    const { error: invitationError } = await supabase
      .from('club_invitations')
      .update({ status: accepted ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
      .eq('id', notification.club_invitation_id)
      .eq('invited_user_id', user.id)

    if (invitationError) {
      toast.error('No pudimos responder la invitacion', { description: invitationError.message })
      setBusyId(null)
      return
    }

    if (accepted) {
      const { error: memberError } = await supabase.from('club_members').insert({
        club_id: notification.club_invitations.club_id,
        user_id: user.id,
        role: 'member',
      })

      if (memberError && memberError.code !== '23505') {
        toast.error('No pudimos agregarte al club', { description: memberError.message })
        setBusyId(null)
        return
      }
    }

    await markAsRead(notification)
    toast.success(accepted ? 'Invitacion aceptada' : 'Invitacion rechazada')
    setBusyId(null)
  }

  return (
    <div className="mx-auto max-w-5xl p-3 pb-24 sm:p-4 lg:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Notificaciones</h1>
          <p className="mt-1 text-sm leading-6 text-gray-400 sm:text-base">
            Gestiona alertas de rutas, clubes y avisos importantes de MotoCare.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge className="bg-white/10 text-gray-300">
              Licencia {isLoadingSubscription ? '...' : planLabels[effectivePlan]}
            </Badge>
            <Badge className={canUseAdvancedNotifications ? 'bg-moto-orange text-moto-darker' : 'bg-white/10 text-gray-300'}>
              {canUseAdvancedNotifications ? 'Alertas avanzadas activas' : 'Centro basico activo'}
            </Badge>
          </div>
        </div>
        <Button variant="outline" className="w-full border-white/10 sm:w-auto" disabled={isMarkingAll || unreadCount === 0} onClick={() => void markAllAsRead()}>
          {isMarkingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
          Marcar todas
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <MetricCard icon={Bell} label="Pendientes" value={unreadCount} />
        <MetricCard icon={Route} label="Rutas" value={routeCount} />
        <MetricCard icon={Users} label="Clubes" value={clubCount} />
      </div>

      <Card className="mb-5 border-white/5 bg-moto-gray py-0">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-moto-orange/20">
              <Crown className="h-5 w-5 text-moto-orange" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">Alcance segun licencia</p>
              <p className="text-sm leading-6 text-gray-400">
                Free recibe alertas internas de mantenimiento. Premium habilita informes, clubes y alertas avanzadas; Business queda reservado para tiendas.
              </p>
            </div>
          </div>
          {!canUseAdvancedNotifications && (
            <Button asChild variant="outline" className="w-full shrink-0 border-white/10 sm:w-auto">
              <Link to="/app/settings">Ver cuenta</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:flex">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              filter === item.id ? 'bg-moto-orange text-moto-darker' : 'bg-moto-gray text-gray-300 hover:bg-white/5'
            }`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid min-h-72 place-items-center text-moto-orange">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : visibleNotifications.length > 0 ? (
        <div className="space-y-3">
          {visibleNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              busy={busyId === notification.id}
              onMarkAsRead={markAsRead}
              onRespondToClubInvite={respondToClubInvite}
            />
          ))}
        </div>
      ) : (
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="p-8 text-center text-gray-400">
            <Bell className="mx-auto mb-3 h-12 w-12 text-gray-600" />
            No hay notificaciones para este filtro.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <Card className="border-white/5 bg-moto-gray py-0">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-moto-orange/20">
            <Icon className="h-5 w-5 text-moto-orange" />
          </div>
          <div>
            <p className="text-xs text-gray-400 sm:text-sm">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NotificationCard({
  notification,
  busy,
  onMarkAsRead,
  onRespondToClubInvite,
}: {
  notification: Notification
  busy: boolean
  onMarkAsRead: (notification: Notification) => Promise<void>
  onRespondToClubInvite: (notification: Notification, accepted: boolean) => Promise<void>
}) {
  const Icon = typeIcon(notification.type)
  const text = notificationText(notification)
  const unread = !notification.read_at

  return (
    <Card className={`border-white/5 bg-moto-gray py-0 ${unread ? 'ring-1 ring-moto-orange/30' : 'opacity-80'}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-moto-orange/20">
              <Icon className="h-5 w-5 text-moto-orange" />
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className={unread ? 'bg-moto-orange text-moto-darker' : 'bg-white/10 text-gray-300'}>
                  {typeLabel(notification.type)}
                </Badge>
                {unread && <span className="text-xs font-medium text-moto-orange">Pendiente</span>}
              </div>
              <h2 className="break-words font-semibold">{text.title}</h2>
              <p className="mt-1 break-words text-sm leading-6 text-gray-300">{text.message}</p>
              <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3.5 w-3.5" />
                {text.detail}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:min-w-36">
            {notification.type === 'club_invite' && unread ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                <Button size="sm" disabled={busy} className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => void onRespondToClubInvite(notification, true)}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                  Aceptar
                </Button>
                <Button size="sm" variant="outline" disabled={busy} className="border-white/10" onClick={() => void onRespondToClubInvite(notification, false)}>
                  <X className="mr-1 h-4 w-4" />
                  Rechazar
                </Button>
              </div>
            ) : null}

            {notification.route_id && notification.routes?.id && (
              <Button asChild size="sm" variant="outline" className="border-white/10">
                <Link to={`/app/routes/${notification.route_id}`}>Ver ruta</Link>
              </Button>
            )}

            {notification.type === 'club_invite' && notification.club_invitations?.clubs?.id && (
              <Button asChild size="sm" variant="outline" className="border-white/10">
                <Link to="/app/clubs">Ver clubes</Link>
              </Button>
            )}

            {unread && notification.type !== 'club_invite' && (
              <Button size="sm" variant="outline" disabled={busy} className="border-white/10" onClick={() => void onMarkAsRead(notification)}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Leida
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
