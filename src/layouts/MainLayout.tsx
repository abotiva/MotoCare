import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Bike,
  CalendarClock,
  CircleDollarSign,
  Compass,
  Crown,
  FileText,
  Gauge,
  Home,
  LogOut,
  Map as MapIcon,
  MessageCircle,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingBag,
  User,
  Users,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AppUpdatePrompt } from '@/components/AppUpdatePrompt'
import { MotoCareLogo } from '@/components/MotoCareLogo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/database'

type NavigationItem = {
  path: string
  label: string
  icon: LucideIcon
}

const motorcycleItems: NavigationItem[] = [
  { path: '/app/home', label: 'Mi Garage', icon: Home },
  { path: '/app/bikes/history', label: 'Historial', icon: Wrench },
  { path: '/app/bikes/schedule', label: 'Agenda', icon: CalendarClock },
  { path: '/app/bikes/documents', label: 'Documentos', icon: FileText },
  { path: '/app/bikes/expenses', label: 'Gastos', icon: CircleDollarSign },
]

const exploreItems: NavigationItem[] = [
  { path: '/app/map', label: 'Rutas', icon: MapIcon },
  { path: '/app/clubs', label: 'Clubes', icon: Users },
  { path: '/app/messages', label: 'Comunidad', icon: MessageCircle },
  { path: '/app/marketplace', label: 'Marketplace', icon: ShoppingBag },
]

const accountItems: NavigationItem[] = [
  { path: '/app/profile', label: 'Perfil', icon: User },
  { path: '/app/notifications', label: 'Notificaciones', icon: Bell },
  { path: '/app/plan', label: 'Plan', icon: Crown },
  { path: '/app/settings', label: 'Configuración', icon: Settings },
]

const quickActions = [
  { label: 'Registrar mantenimiento', path: '/app/bikes?action=service', icon: Wrench },
  { label: 'Actualizar kilometraje', path: '/app/bikes?action=mileage', icon: Gauge },
  { label: 'Agregar gasto', path: '/app/bikes/expenses', icon: CircleDollarSign },
  { label: 'Cargar documento', path: '/app/bikes/documents', icon: FileText },
  { label: 'Crear recordatorio', path: '/app/bikes?action=reminder', icon: CalendarClock },
] satisfies Array<NavigationItem>

function initials(name: string | null | undefined, email: string | undefined) {
  return (name || email || 'MC')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function navigationTitle(pathname: string) {
  if (pathname.startsWith('/app/bikes/')) {
    const section = pathname.split('/').at(-1)
    return {
      overview: 'Mi moto',
      history: 'Historial',
      schedule: 'Agenda',
      documents: 'Documentos',
      expenses: 'Gastos',
    }[section ?? ''] ?? 'Mi moto'
  }
  if (pathname.startsWith('/app/routes/')) return 'Detalle de ruta'
  return [...motorcycleItems, ...exploreItems, ...accountItems].find((item) => item.path === pathname)?.label
    ?? (pathname === '/app/admin' ? 'Administración' : 'MotoCare')
}

export function MainLayout() {
  const { user, profile, signOut } = useAuth()
  const { effectivePlan } = useSubscription()
  const location = useLocation()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)
  const [isExploreOpen, setIsExploreOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [notificationItems, setNotificationItems] = useState<Notification[]>([])

  const userId = user?.id
  const avatarFallback = initials(profile?.full_name, user?.email)
  const isPaidPlan = effectivePlan === 'pro' || effectivePlan === 'premium' || effectivePlan === 'business'

  useEffect(() => {
    if (!supabase || !userId) return
    const client = supabase
    const loadNotifications = async () => {
      const [countResult, notificationsResult] = await Promise.all([
        client.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null).lte('scheduled_for', new Date().toISOString()),
        client.from('notifications').select('*').eq('user_id', userId).is('read_at', null).lte('scheduled_for', new Date().toISOString()).order('scheduled_for').limit(5),
      ])
      setUnreadNotifications(countResult.count ?? 0)
      setNotificationItems((notificationsResult.data ?? []) as Notification[])
    }
    void loadNotifications()
    const channel = client
      .channel(`notification-header-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => void loadNotifications())
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    if (!supabase || !userId) {
      setIsAdmin(false)
      return
    }
    void supabase.rpc('is_current_user_admin').then(({ data }) => setIsAdmin(Boolean(data)))
  }, [userId])

  useEffect(() => {
    setIsQuickActionsOpen(false)
    setIsExploreOpen(false)
  }, [location.pathname])

  const isItemActive = (path: string) => {
    if (path === '/app/home') return location.pathname === path
    if (path.startsWith('/app/bikes/')) {
      const section = path.split('/').at(-1)
      return location.pathname.endsWith(`/${section}`)
        || (path.endsWith('/history') && (location.pathname === '/app/bikes' || location.pathname === '/app/my-bikes'))
    }
    if (path === '/app/map') return location.pathname === path || location.pathname.startsWith('/app/routes/')
    return location.pathname === path
  }

  const sidebarLink = (item: NavigationItem) => (
    <NavLink
      key={item.path}
      to={item.path}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
        isItemActive(item.path) ? 'bg-moto-orange font-semibold text-moto-darker' : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  )

  return (
    <div className="flex min-h-dvh overflow-x-hidden bg-moto-dark text-white">
      <aside className="fixed hidden h-dvh w-64 flex-col border-r border-white/5 bg-moto-darker lg:flex">
        <NavLink to="/app/home" className="border-b border-white/5 p-6" aria-label="Ir al resumen de MotoCare">
          <MotoCareLogo />
        </NavLink>
        <nav className="flex-1 space-y-6 overflow-y-auto p-4" aria-label="Navegación principal">
          <section aria-labelledby="nav-motorcycle">
            <h2 id="nav-motorcycle" className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Mi moto</h2>
            <div className="space-y-1">{motorcycleItems.map(sidebarLink)}</div>
          </section>
          <section aria-labelledby="nav-explore">
            <div className="mb-2 flex items-center justify-between px-3">
              <h2 id="nav-explore" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Explorar</h2>
              {!isPaidPlan && <Crown className="h-3.5 w-3.5 text-moto-orange" aria-label="Algunas experiencias ofrecen contenido Premium" />}
            </div>
            <div className="space-y-1">{exploreItems.map(sidebarLink)}</div>
          </section>
          <section aria-labelledby="nav-account">
            <h2 id="nav-account" className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Cuenta</h2>
            <div className="space-y-1">{accountItems.map(sidebarLink)}</div>
          </section>
          {isAdmin && sidebarLink({ path: '/app/admin', label: 'Administración', icon: ShieldCheck })}
        </nav>
        <div className="border-t border-white/5 p-4">
          <Link to="/app/profile" className="flex min-h-11 items-center gap-3 rounded-xl p-2 hover:bg-white/5">
            <Avatar className="h-9 w-9 bg-moto-gray">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 truncate text-sm font-semibold">{profile?.full_name || user?.email || 'Motero MotoCare'}</span>
          </Link>
          <button type="button" onClick={() => void signOut()} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl p-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
            <LogOut className="h-4 w-4" aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex min-h-dvh flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-moto-dark/95 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <NavLink to="/app/home" className="lg:hidden" aria-label="Ir al inicio"><MotoCareLogo compact /></NavLink>
              <h1 className="truncate text-base font-semibold lg:text-xl">{navigationTitle(location.pathname)}</h1>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="relative grid h-11 w-11 place-items-center rounded-xl hover:bg-white/5" aria-label={`Notificaciones: ${unreadNotifications} sin leer`}>
                    <Bell className={unreadNotifications ? 'h-5 w-5 text-moto-orange' : 'h-5 w-5 text-gray-400'} />
                    {unreadNotifications > 0 && <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-moto-orange px-1 text-[10px] font-bold text-moto-darker">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] border-white/10 bg-moto-darker text-white">
                  <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {notificationItems.length ? notificationItems.map((notification) => (
                    <DropdownMenuItem key={notification.id} asChild>
                      <Link to="/app/notifications" className="flex-col items-start py-3">
                        <span className="font-medium">{notification.title}</span>
                        <span className="line-clamp-2 text-xs text-gray-400">{notification.message}</span>
                      </Link>
                    </DropdownMenuItem>
                  )) : <p className="p-3 text-sm text-gray-400">No tienes notificaciones pendientes.</p>}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild><Link to="/app/notifications">Ver todas</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/5" aria-label="Abrir opciones de cuenta">
                    <Avatar className="h-8 w-8 bg-moto-gray">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">{avatarFallback}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-white/10 bg-moto-darker text-white">
                  <DropdownMenuLabel>{profile?.full_name || user?.email || 'Mi cuenta'}</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {accountItems.map((item) => <DropdownMenuItem key={item.path} asChild><Link to={item.path}><item.icon className="mr-2 h-4 w-4" />{item.label}</Link></DropdownMenuItem>)}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onSelect={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Cerrar sesión</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="min-w-0 flex-1 overflow-x-hidden pb-20 lg:pb-0"><Outlet /></div>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-moto-darker/98 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navegación móvil">
          <div className="grid h-[4.5rem] grid-cols-5">
            <NavLink to="/app/home" className={`flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-medium ${isItemActive('/app/home') ? 'text-moto-orange' : 'text-gray-400'}`}><Home className="h-5 w-5" />Inicio</NavLink>
            <NavLink to="/app/bikes" className={`flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-medium ${location.pathname.includes('/bikes') || location.pathname === '/app/my-bikes' ? 'text-moto-orange' : 'text-gray-400'}`}><Bike className="h-5 w-5" />Mi moto</NavLink>
            <button type="button" onClick={() => setIsQuickActionsOpen(true)} aria-label="Abrir acciones para registrar" aria-expanded={isQuickActionsOpen} className="relative flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-bold text-moto-orange">
              <span className="-mt-7 grid h-14 w-14 place-items-center rounded-full border-4 border-moto-darker bg-moto-orange text-moto-darker shadow-lg shadow-moto-orange/20"><Plus className="h-7 w-7" /></span>
              <span>Registrar</span>
            </button>
            <NavLink to="/app/bikes/schedule" className={`flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-medium ${location.pathname.endsWith('/schedule') ? 'text-moto-orange' : 'text-gray-400'}`}><CalendarClock className="h-5 w-5" />Agenda</NavLink>
            <button type="button" onClick={() => setIsExploreOpen(true)} aria-label="Abrir Explorar" aria-expanded={isExploreOpen} className={`flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-medium ${exploreItems.some((item) => isItemActive(item.path)) ? 'text-moto-orange' : 'text-gray-400'}`}><Compass className="h-5 w-5" />Explorar</button>
          </div>
        </nav>
      </main>

      <Sheet open={isQuickActionsOpen} onOpenChange={setIsQuickActionsOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-white/10 bg-moto-darker text-white">
          <SheetHeader className="text-left">
            <SheetTitle className="text-white">Registrar</SheetTitle>
            <SheetDescription>Actualiza la hoja de vida de tu moto.</SheetDescription>
          </SheetHeader>
          <div className="mt-5 grid gap-2">
            {quickActions.map((action) => (
              <button key={action.path} type="button" onClick={() => { setIsQuickActionsOpen(false); navigate(action.path) }} className="flex min-h-12 items-center gap-3 rounded-xl bg-white/5 px-4 text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moto-orange">
                <action.icon className="h-5 w-5 text-moto-orange" /><span>{action.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isExploreOpen} onOpenChange={setIsExploreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-white/10 bg-moto-darker text-white">
          <SheetHeader className="text-left">
            <SheetTitle className="text-white">Explorar MotoCare</SheetTitle>
            <SheetDescription>Rutas, clubes y experiencias de la comunidad.</SheetDescription>
          </SheetHeader>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {exploreItems.map((item) => (
              <button key={item.path} type="button" onClick={() => { setIsExploreOpen(false); navigate(item.path) }} className="flex min-h-24 flex-col items-start justify-between rounded-2xl bg-white/5 p-4 text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moto-orange">
                <item.icon className="h-6 w-6 text-moto-orange" /><span className="font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <AppUpdatePrompt />
    </div>
  )
}
