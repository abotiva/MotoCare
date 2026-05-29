import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bell,
  Bike,
  Compass,
  Home,
  Map as MapIcon,
  Menu,
  MessageCircle,
  Search,
  Settings,
  ShoppingBag,
  LogOut,
  User,
  Users,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { InstallPrompt } from '@/components/InstallPrompt'
import { MotoCareLogo } from '@/components/MotoCareLogo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

const navItems = [
  { path: '/app/home', icon: Home, label: 'Inicio' },
  { path: '/app/explore', icon: Compass, label: 'Explorar' },
  { path: '/app/map', icon: MapIcon, label: 'Rutas' },
  { path: '/app/marketplace', icon: ShoppingBag, label: 'Tienda' },
  { path: '/app/messages', icon: MessageCircle, label: 'Comunidad' },
  { path: '/app/clubs', icon: Users, label: 'Clubes' },
]

const sidebarItems = [
  { path: '/app/profile', icon: User, label: 'Mi perfil' },
  { path: '/app/my-bikes', icon: Bike, label: 'Mi moto' },
  { path: '/app/settings', icon: Settings, label: 'Ajustes' },
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

export function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const { user, profile, signOut } = useAuth()
  const location = useLocation()

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Motero MotoCare'
  const username = profile?.username || user?.email?.split('@')[0] || 'motocare'
  const avatarFallback = initials(profile?.full_name, user?.email)

  const pageTitle =
    navItems.find((item) => item.path === location.pathname)?.label ||
    sidebarItems.find((item) => item.path === location.pathname)?.label ||
    'Inicio'

  useEffect(() => {
    if (!supabase || !user) return
    const client = supabase

    const loadUnreadNotifications = async () => {
      const { count } = await client
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null)
        .lte('scheduled_for', new Date().toISOString())

      setUnreadNotifications(count ?? 0)
    }

    void loadUnreadNotifications()
  }, [user?.id, location.pathname])

  return (
    <div className="flex min-h-screen bg-moto-dark text-white">
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
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                  isActive ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}

          <div className="mb-3 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Personal</div>
          {sidebarItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                  isActive ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
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

      <main className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-moto-dark/95 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3 lg:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="rounded-lg p-2 hover:bg-white/5">
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <NavLink to="/app/home">
                <MotoCareLogo compact />
              </NavLink>
            </div>

            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold">{pageTitle}</h1>
            </div>

            <div className="flex items-center gap-3">
              {showSearch ? (
                <div className="hidden items-center gap-2 sm:flex">
                  <Input placeholder="Buscar..." className="w-64 border-white/10 bg-moto-darker" autoFocus />
                  <button onClick={() => setShowSearch(false)} className="rounded-lg p-2 hover:bg-white/5">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowSearch(true)} className="hidden rounded-lg p-2 hover:bg-white/5 sm:flex">
                  <Search className="h-5 w-5 text-gray-400" />
                </button>
              )}

              <NavLink to="/app/home" className="relative rounded-lg p-2 hover:bg-white/5">
                <Bell className="h-5 w-5 text-gray-400" />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-moto-orange px-1 text-[10px] font-bold text-moto-darker">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </NavLink>

              <NavLink to="/app/profile" className="lg:hidden">
                <Avatar className="h-8 w-8 bg-moto-gray">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">{avatarFallback}</AvatarFallback>
                </Avatar>
              </NavLink>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/5 bg-moto-darker lg:hidden">
          <div className="flex h-16 items-center justify-around">
            {navItems.slice(0, 5).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex h-full flex-1 flex-col items-center justify-center ${isActive ? 'text-moto-orange' : 'text-gray-400'}`
                }
              >
                <div className="relative">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="mt-1 text-[10px]">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-moto-dark lg:hidden">
            <div className="flex items-center justify-between border-b border-white/5 p-4">
              <span className="text-lg font-bold">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-1 p-4">
              {[...navItems, ...sidebarItems].map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-4 rounded-xl px-4 py-4 ${
                      isActive ? 'bg-moto-orange text-moto-darker' : 'text-gray-400 hover:bg-white/5'
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

      <InstallPrompt />
    </div>
  )
}
