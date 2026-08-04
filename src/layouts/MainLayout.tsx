import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Bike,
  CalendarClock,
  CircleDollarSign,
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
import type { Motorcycle, Notification } from '@/types/database'

type NavigationItem = {
  path: string
  label: string
  icon: LucideIcon
}

const motorcycleItems: NavigationItem[] = [
  { path: '/app/garage', label: 'Resumen', icon: Bike },
  { path: '/app/garage/history', label: 'Historial', icon: Wrench },
  { path: '/app/garage/schedule', label: 'Agenda', icon: CalendarClock },
  { path: '/app/garage/documents', label: 'Documentos', icon: FileText },
  { path: '/app/garage/expenses', label: 'Gastos', icon: CircleDollarSign },
]

const routeItems: NavigationItem[] = [
  { path: '/app/routes', label: 'Rutas', icon: MapIcon },
  { path: '/app/explore', label: 'Descubrir rutas', icon: MapIcon },
  { path: '/app/map', label: 'Mis rutas', icon: MapIcon },
  { path: '/app/premium-routes', label: 'Rutas Premium', icon: Crown },
]

const communityItems: NavigationItem[] = [
  { path: '/app/community', label: 'Comunidad', icon: MessageCircle },
  { path: '/app/clubs', label: 'Clubes', icon: Users },
]

const marketplaceItems: NavigationItem[] = [
  { path: '/app/marketplace', label: 'Servicios', icon: ShoppingBag },
]

const accountItems: NavigationItem[] = [
  { path: '/app/profile', label: 'Perfil', icon: User },
  { path: '/app/notifications', label: 'Notificaciones', icon: Bell },
  { path: '/app/plan', label: 'Plan', icon: Crown },
  { path: '/app/settings', label: 'Configuración', icon: Settings },
]

const garageQuickActions = [
  { label: 'Registrar mantenimiento', path: '/app/garage?action=service', icon: Wrench },
  { label: 'Actualizar kilometraje', path: '/app/garage?action=mileage', icon: Gauge },
  { label: 'Agregar gasto', path: '/app/garage/expenses', icon: CircleDollarSign },
  { label: 'Cargar documento', path: '/app/garage/documents', icon: FileText },
  { label: 'Crear recordatorio', path: '/app/garage?action=reminder', icon: CalendarClock },
] satisfies Array<NavigationItem>

const activityQuickActions = [
  { label: 'Crear publicación', path: '/app/messages?action=post', icon: MessageCircle },
  { label: 'Crear ruta', path: '/app/map?action=create', icon: MapIcon },
] satisfies Array<NavigationItem>

function initials(name: string | null | undefined, email: string | undefined) {
  return (name || email || 'MC')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function navigationTitle(pathname: string, motorcycleSectionLabel: string) {
  if (pathname.startsWith('/app/garage') || pathname.startsWith('/app/bikes')) {
    const section = pathname.split('/').at(-1)
    return {
      overview: 'Resumen',
      history: 'Historial',
      schedule: 'Agenda',
      documents: 'Documentos',
      expenses: 'Gastos',
    }[section ?? ''] ?? motorcycleSectionLabel
  }
  if (pathname.startsWith('/app/routes/')) return 'Detalle de ruta'
  return [...motorcycleItems, ...routeItems, ...communityItems, ...marketplaceItems, ...accountItems].find((item) => item.path === pathname)?.label
    ?? (pathname === '/app/admin' ? 'Administración' : 'MotoCare')
}

export function MainLayout() {
  const { user, profile, signOut } = useAuth()
  const { effectivePlan } = useSubscription()
  const location = useLocation()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [notificationItems, setNotificationItems] = useState<Notification[]>([])
  const [quickActionBike, setQuickActionBike] = useState<Motorcycle | null>(null)

  const userId = user?.id
  const avatarFallback = initials(profile?.full_name, user?.email)
  const isBusiness = effectivePlan === 'business'
  const isPaidPlan = effectivePlan === 'premium'
  const motorcycleSectionLabel = effectivePlan === 'premium' ? 'Mi Garage' : 'Mi Moto'
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.pathname])

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
    const refreshTimer = window.setInterval(() => void loadNotifications(), 30000)
    return () => {
      window.clearInterval(refreshTimer)
      void client.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    if (!supabase || !userId) {
      setQuickActionBike(null)
      return
    }
    void supabase
      .from('motorcycles')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const motorcycles = (data ?? []) as Motorcycle[]
        setQuickActionBike(
          motorcycles.find((motorcycle) => motorcycle.id === profile?.primary_motorcycle_id)
            ?? motorcycles[0]
            ?? null
        )
      })
  }, [profile?.primary_motorcycle_id, userId])

  useEffect(() => {
    if (!supabase || !userId) {
      setIsAdmin(false)
      return
    }
    void supabase.rpc('is_current_user_admin').then(({ data }) => setIsAdmin(Boolean(data)))
  }, [userId])

  useEffect(() => {
    setIsQuickActionsOpen(false)
  }, [location.pathname])

  const isItemActive = (path: string) => {
    if (path === '/app/home') return location.pathname === path
    if (path.startsWith('/app/garage')) {
      const section = path.split('/').at(-1)
      if (path === '/app/garage') {
        return ['/app/garage', '/app/bikes', '/app/my-bikes'].includes(location.pathname)
          || location.pathname.endsWith('/overview')
      }
      return location.pathname.endsWith(`/${section}`)
    }
    if (path === '/app/map') return location.pathname === path || location.pathname.startsWith('/app/routes/')
    if (path === '/app/routes') return location.pathname === path
    if (path === '/app/community') return location.pathname === path || location.pathname === '/app/messages'
    if (path === '/app/clubs') return location.pathname === path || location.pathname.startsWith('/app/clubs/')
    if (path === '/app/explore') return location.pathname === path
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
      {item.path === '/app/notifications' && unreadNotifications > 0 ? <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-moto-orange px-1 text-[10px] font-bold text-moto-darker">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span> : null}
    </NavLink>
  )

  return (
    <div className="flex min-h-dvh overflow-x-hidden bg-moto-dark text-white">
      <aside className="fixed hidden h-dvh w-64 flex-col border-r border-white/5 bg-moto-darker lg:flex">
        <NavLink to="/app/home" className="border-b border-white/5 p-6" aria-label="Ir al resumen de MotoCare">
          <MotoCareLogo />
        </NavLink>
        <nav className="flex-1 space-y-6 overflow-y-auto p-4" aria-label="Navegación principal">
          <div>{sidebarLink({ path: '/app/home', label: 'Inicio', icon: Home })}</div>
          {!isBusiness && <section aria-labelledby="nav-motorcycle">
            <h2 id="nav-motorcycle" className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{motorcycleSectionLabel}</h2>
            <div className="space-y-1">{motorcycleItems.map(sidebarLink)}</div>
          </section>}
          {!isBusiness && <section aria-labelledby="nav-routes">
            <div className="mb-2 flex items-center justify-between px-3">
              <h2 id="nav-routes" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Rutas</h2>
              {!isPaidPlan && <Crown className="h-3.5 w-3.5 text-moto-orange" aria-label="Algunas experiencias ofrecen contenido Premium" />}
            </div>
            <div className="space-y-1">{routeItems.map(sidebarLink)}</div>
          </section>}
          {!isBusiness && <section aria-labelledby="nav-community">
            <h2 id="nav-community" className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Comunidad</h2>
            <div className="space-y-1">{communityItems.map(sidebarLink)}</div>
          </section>}
          <section aria-labelledby="nav-marketplace">
            <h2 id="nav-marketplace" className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Servicios</h2>
            <div className="space-y-1">{marketplaceItems.map(sidebarLink)}</div>
          </section>
          <section aria-labelledby="nav-account">
            <h2 id="nav-account" className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Cuenta</h2>
            <div className="space-y-1">{accountItems.filter((item) => !(isBusiness && item.path === '/app/plan')).map(sidebarLink)}</div>
          </section>
          {isAdmin && sidebarLink({ path: '/app/admin', label: 'Administración', icon: ShieldCheck })}
        </nav>
        <div className="border-t border-white/5 p-4">
          <Link to="/app/profile" className="flex min-h-11 items-center gap-3 rounded-xl p-2 hover:bg-white/5">
            <Avatar premium={profile?.is_premium} className="h-9 w-9 bg-moto-gray">
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
              <h1 className="truncate text-base font-semibold lg:text-xl">{navigationTitle(location.pathname, motorcycleSectionLabel)}</h1>
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
                    <Avatar premium={profile?.is_premium} className="h-8 w-8 bg-moto-gray">
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
          <div className={`grid h-[4.5rem] ${isBusiness ? 'grid-cols-4' : 'grid-cols-6'}`}>
            <NavLink to="/app/home" className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium ${location.pathname === '/app/home' ? 'text-moto-orange' : 'text-gray-400'}`}>
              <Home className="h-5 w-5" /><span className="max-w-full truncate">Inicio</span>
            </NavLink>
            {!isBusiness && <NavLink to="/app/garage" className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium ${location.pathname.includes('/garage') || location.pathname.includes('/bikes') || location.pathname === '/app/my-bikes' ? 'text-moto-orange' : 'text-gray-400'}`}>
              <Bike className="h-5 w-5" /><span className="max-w-full truncate">{motorcycleSectionLabel}</span>
            </NavLink>}
            {!isBusiness && <NavLink to="/app/routes" className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium ${location.pathname === '/app/routes' || location.pathname === '/app/explore' || location.pathname === '/app/map' || location.pathname === '/app/premium-routes' || location.pathname.startsWith('/app/routes/') ? 'text-moto-orange' : 'text-gray-400'}`}>
              <MapIcon className="h-5 w-5" /><span className="max-w-full truncate">Rutas</span>
            </NavLink>}
            {!isBusiness && <NavLink to="/app/community" className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium ${location.pathname === '/app/community' || location.pathname === '/app/messages' ? 'text-moto-orange' : 'text-gray-400'}`}>
              <MessageCircle className="h-5 w-5" /><span className="max-w-full truncate">Comunidad</span>
            </NavLink>}
            <NavLink to="/app/marketplace" className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium ${location.pathname.startsWith('/app/marketplace') ? 'text-moto-orange' : 'text-gray-400'}`}><ShoppingBag className="h-5 w-5" /><span className="max-w-full truncate">Servicios</span></NavLink>
            {isBusiness && <NavLink to="/app/profile" className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium ${location.pathname === '/app/profile' ? 'text-moto-orange' : 'text-gray-400'}`}><User className="h-5 w-5" /><span>Perfil</span></NavLink>}
            {isBusiness && <NavLink to="/app/notifications" className={`relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium ${location.pathname === '/app/notifications' ? 'text-moto-orange' : 'text-gray-400'}`}><span className="relative"><Bell className="h-5 w-5" />{unreadNotifications > 0 ? <span className="absolute -right-3 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-moto-orange px-1 text-[9px] font-bold text-moto-darker">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span> : null}</span><span>Alertas</span></NavLink>}
            {!isBusiness && <button type="button" onClick={() => setIsQuickActionsOpen(true)} aria-label="Abrir acciones para registrar" aria-expanded={isQuickActionsOpen} className="relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-bold text-moto-orange">
              <span className="-mt-7 grid h-14 w-14 place-items-center rounded-full border-4 border-moto-darker bg-moto-orange text-moto-darker shadow-lg shadow-moto-orange/20"><Plus className="h-7 w-7" /></span>
              <span className="max-w-full truncate">Registrar</span>
            </button>}
          </div>
        </nav>
      </main>

      <Sheet open={isQuickActionsOpen} onOpenChange={setIsQuickActionsOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-white/10 bg-moto-darker text-white">
          <SheetHeader className="text-left">
            <SheetTitle className="text-white">Registrar</SheetTitle>
            <SheetDescription>
              {quickActionBike
                ? `Registrar para ${quickActionBike.brand} ${quickActionBike.model}, tu moto en foco.`
                : `Agrega una moto a ${motorcycleSectionLabel} para comenzar.`}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5 grid gap-2">
            <p className="px-1 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Mi moto</p>
            {garageQuickActions.map((action) => (
              <button key={action.path} type="button" onClick={() => {
                setIsQuickActionsOpen(false)
                const path = quickActionBike
                  ? action.path.replace('/app/garage', `/app/garage/${quickActionBike.id}`)
                  : '/app/garage'
                navigate(path)
              }} className="flex min-h-12 items-center gap-3 rounded-xl bg-white/5 px-4 text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moto-orange">
                <action.icon className="h-5 w-5 text-moto-orange" /><span>{action.label}</span>
              </button>
            ))}
            <p className="px-1 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Actividad</p>
            {activityQuickActions.map((action) => (
              <button key={action.path} type="button" onClick={() => { setIsQuickActionsOpen(false); navigate(action.path) }} className="flex min-h-12 items-center gap-3 rounded-xl bg-white/5 px-4 text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moto-orange">
                <action.icon className="h-5 w-5 text-moto-orange" /><span>{action.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <AppUpdatePrompt />
    </div>
  )
}
