import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Bike,
  CalendarClock,
  Crown,
  FileText,
  Home,
  Map as MapIcon,
  Menu,
  MessageCircle,
  Settings,
  ShoppingBag,
  LogOut,
  ShieldCheck,
  User,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { AppUpdatePrompt } from '@/components/AppUpdatePrompt'
import { MotoCareLogo } from '@/components/MotoCareLogo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/database'

const navItems = [
  { path: '/app/home', icon: Home, label: 'Inicio' },
  { path: '/app/my-bikes', icon: Bike, label: 'Mi moto' },
]

const maintenanceItems = [
  { path: '/app/my-bikes#history', icon: Wrench, label: 'Realizados' },
  { path: '/app/my-bikes#reminders', icon: CalendarClock, label: 'Programados' },
]

const documentItems = [
  { path: '/app/my-bikes#documents', icon: FileText, label: 'Documentos' },
  { path: '/app/my-bikes#reports', icon: BarChart3, label: 'Reportes' },
]

const premiumItems = [
  { path: '/app/map', icon: MapIcon, label: 'Rutas' },
  { path: '/app/messages', icon: MessageCircle, label: 'Comunidad' },
  { path: '/app/clubs', icon: Users, label: 'Clubes' },
  { path: '/app/marketplace', icon: ShoppingBag, label: 'Tienda' },
]

const sidebarItems = [
  { path: '/app/profile', icon: User, label: 'Mi perfil' },
  { path: '/app/notifications', icon: Bell, label: 'Notificaciones' },
  { path: '/app/settings', icon: Settings, label: 'Ajustes' },
]

const mobileNavItems = [
  { path: '/app/home', icon: Home, label: 'Inicio' },
  { path: '/app/my-bikes', icon: Bike, label: 'Mi moto' },
  { path: '/app/map', icon: MapIcon, label: 'Rutas' },
  { path: '/app/messages', icon: MessageCircle, label: 'Comunidad' },
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

function notificationPreview(notification: Notification) {
  if (notification.type === 'club_invite' && notification.club_invitations?.clubs) {
    return {
      title: 'Invitación a club',
      message: `El club "${notification.club_invitations.clubs.name}" quiere agregarte como miembro.`,
    }
  }

  if (notification.type === 'route_planned' && notification.routes?.title) {
    return {
      title: 'Ruta planeada cercana',
      message: `Tienes cerca la ruta "${notification.routes.title}".`,
    }
  }

  return {
    title: notification.title,
    message: notification.message,
  }
}

export function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [notificationItems, setNotificationItems] = useState<Notification[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const userId = user?.id

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Motero MotoCare Co'
  const username = profile?.username || user?.email?.split('@')[0] || 'motocare'
  const avatarFallback = initials(profile?.full_name, user?.email)

  const pageTitle =
    (location.pathname.startsWith('/app/routes/') ? 'Detalle de ruta' : null) ||
    [...navItems, ...maintenanceItems, ...documentItems, ...premiumItems].find((item) => item.path === `${location.pathname}${location.hash}`)?.label ||
    navItems.find((item) => item.path === location.pathname)?.label ||
    premiumItems.find((item) => item.path === location.pathname)?.label ||
    sidebarItems.find((item) => item.path === location.pathname)?.label ||
    (location.pathname === '/app/admin' ? 'Administración' : null) ||
    'Inicio'

  const isItemActive = (path: string) => {
    const currentPath = `${location.pathname}${location.hash}`
    if (path.includes('#')) return currentPath === path
    if (path === '/app/my-bikes') return location.pathname === path && !location.hash
    if (path === '/app/map' && location.pathname.startsWith('/app/routes/')) return true
    if (path === '/app/messages' && location.pathname === '/app/community') return true
    return location.pathname === path
  }

  const isMaintenanceActive = maintenanceItems.some((item) => isItemActive(item.path))

  useEffect(() => {
    if (!supabase || !userId) return
    const client = supabase

    const loadUnreadNotifications = async () => {
      const { count } = await client
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null)
        .lte('scheduled_for', new Date().toISOString())

      setUnreadNotifications(count ?? 0)

      const { data } = await client
        .from('notifications')
        .select('*, routes:route_id(title, start_date, end_date, status), club_invitations:club_invitation_id(*, clubs:club_id(id, name, image_url, city))')
        .eq('user_id', userId)
        .is('read_at', null)
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(5)

      setNotificationItems((data ?? []) as Notification[])
    }

    void loadUnreadNotifications()
  }, [userId, location.pathname])

  useEffect(() => {
    setIsNotificationsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!supabase || !userId) {
      setIsAdmin(false)
      return
    }
    const client = supabase

    const loadAdminAccess = async () => {
      const { data } = await client.rpc('is_current_user_admin')
      setIsAdmin(Boolean(data))
    }

    void loadAdminAccess()
  }, [userId])

  useEffect(() => {
    if (!supabase || !userId) return
    const client = supabase

    const touchPresence = async () => {
      await client
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', userId)
    }

    void touchPresence()
    const interval = window.setInterval(() => {
      void touchPresence()
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [userId])

  return (
    <div className="flex min-h-dvh overflow-x-hidden bg-moto-dark text-white">
      <aside className="fixed hidden h-full w-64 flex-col border-r border-white/5 bg-moto-darker lg:flex">
        <div className="border-b border-white/5 p-6">
          <NavLink to="/app/home">
            <MotoCareLogo />
          </NavLink>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Principal</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={() =>
                `flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                  isItemActive(item.path) ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}

          <div className="mt-2 rounded-xl bg-white/[0.03] p-1">
            <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold ${isMaintenanceActive ? 'text-white' : 'text-gray-400'}`}>
              <Wrench className="h-5 w-5" />
              <span className="flex-1">Mantenimientos</span>
            </div>
            <div className="space-y-1 pl-5">
              {maintenanceItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={() =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                      isItemActive(item.path) ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {documentItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={() =>
                `flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                  isItemActive(item.path) ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}

          <div className="mb-3 mt-6 flex items-center justify-between gap-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <span>Premium</span>
            <Crown className="h-3.5 w-3.5 text-moto-orange" />
          </div>
          {premiumItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={() =>
                `flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                  isItemActive(item.path) ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isItemActive(item.path) ? 'bg-moto-darker/15 text-moto-darker' : 'bg-white/10 text-gray-300'}`}>
                Premium
              </span>
            </NavLink>
          ))}

          <div className="mb-3 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Personal</div>
          {sidebarItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={() =>
                `flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                  isItemActive(item.path) ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/app/admin"
              className={() =>
                `flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                  isItemActive('/app/admin') ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <ShieldCheck className="h-5 w-5" />
              <span>Administración</span>
            </NavLink>
          )}
        </nav>

        <div className="border-t border-white/5 p-4">
          <NavLink to="/app/profile" className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5">
            <Avatar className="h-10 w-10 bg-moto-gray">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-gray-500">@{username}</p>
            </div>
          </NavLink>
          <button
            className="mt-2 flex w-full items-center gap-3 rounded-xl p-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex min-h-dvh flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-moto-dark/95 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-2 px-3 py-2 lg:px-6">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <button
                type="button"
                aria-label={isMobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="shrink-0 rounded-lg p-2 hover:bg-white/5"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <NavLink to="/app/home">
                <MotoCareLogo compact />
              </NavLink>
              <h1 className="min-w-0 truncate text-sm font-semibold sm:text-base">{pageTitle}</h1>
            </div>

            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold">{pageTitle}</h1>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="relative">
                <button
                  type="button"
                  className="relative rounded-lg p-2 hover:bg-white/5"
                  aria-label="Abrir notificaciones"
                  aria-expanded={isNotificationsOpen}
                  onClick={() => setIsNotificationsOpen((current) => !current)}
                >
                  <Bell className={`h-5 w-5 ${unreadNotifications > 0 ? 'text-moto-orange' : 'text-gray-400'}`} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-moto-orange px-1 text-[10px] font-bold text-moto-darker">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-moto-darker shadow-2xl">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
                      <div>
                        <p className="font-semibold">Notificaciones</p>
                        <p className="text-xs text-gray-500">{unreadNotifications} pendientes</p>
                      </div>
                      <Link to="/app/notifications" className="text-sm font-medium text-moto-orange hover:text-moto-orange-dark">
                        Ver todas
                      </Link>
                    </div>

                    {notificationItems.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto p-2">
                        {notificationItems.map((notification) => {
                          const preview = notificationPreview(notification)
                          return (
                            <Link
                              key={notification.id}
                              to="/app/notifications"
                              className="block rounded-xl p-3 transition-colors hover:bg-white/5"
                            >
                              <p className="line-clamp-1 text-sm font-semibold">{preview.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">{preview.message}</p>
                            </Link>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-5 text-center text-sm text-gray-400">
                        No tienes notificaciones pendientes.
                      </div>
                    )}

                    <div className="border-t border-white/10 p-3">
                      <Link
                        to="/app/notifications"
                        className="block rounded-xl bg-moto-orange px-3 py-2 text-center text-sm font-semibold text-moto-darker transition-colors hover:bg-moto-orange-dark"
                      >
                        Gestionar notificaciones
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <NavLink to="/app/profile" className="lg:hidden">
                <Avatar className="h-8 w-8 bg-moto-gray">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">{avatarFallback}</AvatarFallback>
                </Avatar>
              </NavLink>
            </div>
          </div>
        </header>

        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/5 bg-moto-darker lg:hidden">
          <div className="grid h-16 grid-cols-5">
            {mobileNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={() =>
                  `flex h-full min-w-0 flex-col items-center justify-center gap-1 ${isItemActive(item.path) ? 'text-moto-orange' : 'text-gray-400'}`
                }
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="max-w-full truncate px-1 text-[10px] font-medium">{item.label}</span>
              </NavLink>
            ))}
            <button
              type="button"
              aria-label="Abrir más secciones"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(true)}
              className={`flex h-full min-w-0 flex-col items-center justify-center gap-1 ${isMobileMenuOpen ? 'text-moto-orange' : 'text-gray-400'}`}
            >
              <Menu className="h-5 w-5" />
              <span className="max-w-full truncate px-1 text-[10px] font-medium">Más</span>
            </button>
          </div>
        </nav>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-moto-dark pb-8 lg:hidden">
            <div className="flex items-center justify-between border-b border-white/5 p-4">
              <span className="text-lg font-bold">Más secciones</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-1 p-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={() =>
                    `flex items-center gap-4 rounded-xl px-4 py-4 ${
                      isItemActive(item.path) ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5'
                    }`
                  }
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-lg">{item.label}</span>
                </NavLink>
              ))}
              <div className="rounded-xl bg-white/[0.03] p-2">
                <div className={`flex items-center gap-4 px-2 py-3 ${isMaintenanceActive ? 'text-white' : 'text-gray-400'}`}>
                  <Wrench className="h-6 w-6" />
                  <span className="text-lg font-semibold">Mantenimientos</span>
                </div>
                <div className="space-y-1 pl-6">
                  {maintenanceItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={() =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 ${
                          isItemActive(item.path) ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5'
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
              {documentItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={() =>
                    `flex items-center gap-4 rounded-xl px-4 py-4 ${
                      isItemActive(item.path) ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5'
                    }`
                  }
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-lg">{item.label}</span>
                </NavLink>
              ))}
              <div className="mt-5 flex items-center justify-between gap-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <span>Premium</span>
                <Crown className="h-4 w-4 text-moto-orange" />
              </div>
              {premiumItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={() =>
                    `flex items-center gap-4 rounded-xl px-4 py-4 ${
                      isItemActive(item.path) ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5'
                    }`
                  }
                >
                  <item.icon className="h-6 w-6" />
                  <span className="min-w-0 flex-1 text-lg">{item.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isItemActive(item.path) ? 'bg-moto-darker/15 text-moto-darker' : 'bg-white/10 text-gray-300'}`}>
                    Premium
                  </span>
                </NavLink>
              ))}
              <div className="mt-5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Personal</div>
              {[...sidebarItems, ...(isAdmin ? [{ path: '/app/admin', icon: ShieldCheck, label: 'Administración' }] : [])].map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={() =>
                    `flex items-center gap-4 rounded-xl px-4 py-4 ${
                      isItemActive(item.path) ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5'
                    }`
                  }
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-lg">{item.label}</span>
                </NavLink>
              ))}
              <button
                className="flex w-full items-center gap-4 rounded-xl px-4 py-4 text-gray-400 hover:bg-white/5"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  void signOut()
                }}
              >
                <LogOut className="h-6 w-6" />
                <span className="text-lg">Salir</span>
              </button>
            </nav>
          </div>
        )}
      </main>
      <AppUpdatePrompt />
    </div>
  )
}
