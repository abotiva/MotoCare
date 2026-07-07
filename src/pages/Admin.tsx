import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Bike, ChevronDown, ChevronUp, CreditCard, Database, Loader2, Lock, Route, Search, Shield, SlidersHorizontal, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { appVersion, buildTime } from '@/lib/appVersion'
import { supabase, supabaseUrl } from '@/lib/supabase'
import type { AdminClubRow, AdminMaintenanceSuggestionRow, AdminOverview, AdminUserRow } from '@/types/database'

type AdminTab = 'usuarios' | 'clubes' | 'catalogos'
type UserPlan = AdminUserRow['plan']
type UserPlanStatus = AdminUserRow['plan_status']

const emptyOverview: AdminOverview = {
  users: 0,
  public_users: 0,
  private_users: 0,
  free_users: 0,
  pro_users: 0,
  premium_users: 0,
  business_users: 0,
  motorcycles: 0,
  routes: 0,
  community_routes: 0,
  posts: 0,
  clubs: 0,
  club_memberships: 0,
  pending_club_invitations: 0,
  maintenance_suggestions: 0,
  active_maintenance_suggestions: 0,
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

function shortId(id: string) {
  return id.slice(0, 8)
}

const planLabels: Record<UserPlan, string> = {
  free: 'Free',
  pro: 'Premium',
  premium: 'Premium',
  business: 'Business',
}

const planStatusLabels: Record<UserPlanStatus, string> = {
  active: 'Activa',
  trialing: 'Prueba',
  past_due: 'Pago pendiente',
  canceled: 'Cancelada',
}

const planBadgeClasses: Record<UserPlan, string> = {
  free: 'bg-white/10 text-gray-300',
  pro: 'bg-moto-orange text-moto-darker',
  premium: 'bg-moto-orange text-moto-darker',
  business: 'bg-violet-500/15 text-violet-200',
}

export function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('usuarios')
  const [overview, setOverview] = useState<AdminOverview>(emptyOverview)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [clubs, setClubs] = useState<AdminClubRow[]>([])
  const [suggestions, setSuggestions] = useState<AdminMaintenanceSuggestionRow[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [savingLicenseUserId, setSavingLicenseUserId] = useState<string | null>(null)
  const projectRef = useMemo(() => {
    if (!supabaseUrl) return 'Sin configurar'
    return supabaseUrl.replace('https://', '').split('.')[0]
  }, [])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter((user) =>
      [user.display_name, user.username, user.city, user.rider_type, user.plan, user.plan_status, user.id].some((value) => value?.toLowerCase().includes(term))
    )
  }, [search, users])

  const filteredClubs = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return clubs
    return clubs.filter((club) =>
      [club.name, club.city, club.owner_display_name, club.id].some((value) => value?.toLowerCase().includes(term))
    )
  }, [clubs, search])

  const filteredSuggestions = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return suggestions
    return suggestions.filter((item) =>
      [item.name, item.code, item.category, item.applies_to].some((value) => value?.toLowerCase().includes(term))
    )
  }, [search, suggestions])

  useEffect(() => {
    const loadAdminData = async () => {
      if (!supabase) return
      setIsLoading(true)

      const { data: access, error: accessError } = await supabase.rpc('is_current_user_admin')
      if (accessError || !access) {
        setHasAccess(false)
        setIsLoading(false)
        return
      }

      setHasAccess(true)
      const [overviewResult, usersResult, clubsResult, suggestionsResult] = await Promise.all([
        supabase.rpc('admin_overview'),
        supabase.rpc('admin_users'),
        supabase.rpc('admin_clubs'),
        supabase.rpc('admin_maintenance_suggestions'),
      ])

      if (overviewResult.error) {
        toast.error('No pudimos cargar resumen admin', { description: overviewResult.error.message })
      } else {
        setOverview((overviewResult.data as AdminOverview | null) ?? emptyOverview)
      }

      if (usersResult.error) {
        toast.error('No pudimos cargar usuarios', { description: usersResult.error.message })
      } else {
        setUsers((usersResult.data ?? []) as AdminUserRow[])
      }

      if (clubsResult.error) {
        toast.error('No pudimos cargar clubes', { description: clubsResult.error.message })
      } else {
        setClubs((clubsResult.data ?? []) as AdminClubRow[])
      }

      if (suggestionsResult.error) {
        toast.error('No pudimos cargar catalogos', { description: suggestionsResult.error.message })
      } else {
        setSuggestions((suggestionsResult.data ?? []) as AdminMaintenanceSuggestionRow[])
      }

      setIsLoading(false)
    }

    void loadAdminData()
  }, [])

  const updateUserLicense = async (user: AdminUserRow, plan: UserPlan, status: UserPlanStatus = user.plan_status) => {
    if (!supabase || savingLicenseUserId) return

    setSavingLicenseUserId(user.id)
    const previousUsers = users
    setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, plan, plan_status: status } : item)))

    const { error } = await supabase.rpc('admin_set_user_subscription', {
      target_user_id: user.id,
      target_plan: plan,
      target_status: status,
      target_expires_at: user.plan_expires_at,
      target_notes: null,
    })

    if (error) {
      setUsers(previousUsers)
      toast.error('No pudimos actualizar la licencia', { description: error.message })
    } else {
      toast.success('Licencia actualizada', { description: `${user.display_name || 'Usuario'} quedo en ${planLabels[plan]}.` })
      const { data: nextOverview } = await supabase.rpc('admin_overview')
      if (nextOverview) setOverview(nextOverview as AdminOverview)
    }

    setSavingLicenseUserId(null)
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-moto-orange">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center p-6 text-center">
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="p-8">
            <Lock className="mx-auto mb-4 h-12 w-12 text-moto-orange" />
            <h1 className="mb-2 text-2xl font-bold">Acceso administrativo</h1>
            <p className="text-gray-400">Este modulo solo esta disponible para usuarios agregados a `app_admins` en Supabase.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 lg:p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold">Administracion</h1>
          <p className="text-gray-400">Panel operativo con privacidad aplicada a usuarios y clubes.</p>
        </div>
        <Badge className="w-fit bg-moto-orange text-moto-darker">
          <Shield className="mr-2 h-4 w-4" />
          Admin interno
        </Badge>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2 sm:mb-5 sm:gap-4 md:grid-cols-4 xl:grid-cols-8">
        <MetricCard icon={Users} label="Usuarios" value={overview.users} detail={`${overview.private_users} privados`} />
        <MetricCard icon={CreditCard} label="Free" value={overview.free_users} detail="Usuarios base" />
        <MetricCard icon={CreditCard} label="Premium" value={overview.premium_users + overview.pro_users} detail="Incluye Pro legado" />
        <MetricCard icon={Bike} label="Motos" value={overview.motorcycles} detail="Registradas" />
        <MetricCard icon={Route} label="Rutas" value={overview.routes} detail={`${overview.community_routes} comunidad`} />
        <MetricCard icon={Users} label="Clubes" value={overview.clubs} detail={`${overview.club_memberships} membresias`} />
        <MetricCard icon={AlertTriangle} label="Invitaciones" value={overview.pending_club_invitations} detail="Pendientes" />
        <MetricCard icon={SlidersHorizontal} label="Catalogo" value={overview.active_maintenance_suggestions} detail={`${overview.maintenance_suggestions} totales`} />
      </div>

      <AppDataCard projectRef={projectRef} />

      <Card className="mb-5 border-white/5 bg-moto-gray py-0">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabButton label="Usuarios" active={activeTab === 'usuarios'} onClick={() => setActiveTab('usuarios')} />
            <TabButton label="Clubes" active={activeTab === 'clubes'} onClick={() => setActiveTab('clubes')} />
            <TabButton label="Catalogos" active={activeTab === 'catalogos'} onClick={() => setActiveTab('catalogos')} />
          </div>
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-moto-darker px-3 py-2 lg:w-80">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
              placeholder="Buscar en la vista actual"
            />
          </label>
        </CardContent>
      </Card>

      {activeTab === 'usuarios' && <UsersTable users={filteredUsers} savingLicenseUserId={savingLicenseUserId} onUpdateLicense={updateUserLicense} />}
      {activeTab === 'clubes' && <ClubsTable clubs={filteredClubs} />}
      {activeTab === 'catalogos' && <SuggestionsTable suggestions={filteredSuggestions} />}
    </div>
  )
}

function AppDataCard({ projectRef }: { projectRef: string }) {
  return (
    <Card className="mb-5 border-white/5 bg-moto-gray py-0">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-moto-orange/20">
            <Database className="h-5 w-5 text-moto-orange" />
          </div>
          <div>
            <h3 className="font-semibold">Datos de la app</h3>
            <p className="text-sm text-gray-400">Estado tecnico del MVP</p>
          </div>
        </div>
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <div className="min-w-0">
            <p className="text-gray-400">Proyecto Supabase</p>
            <p className="break-all font-medium">{projectRef}</p>
          </div>
          <div>
            <p className="text-gray-400">Version</p>
            <p className="font-medium">{appVersion}</p>
          </div>
          <div>
            <p className="text-gray-400">Build</p>
            <p className="font-medium">{new Date(buildTime).toLocaleString('es-CO')}</p>
          </div>
          <div>
            <p className="text-gray-400">Preferencias</p>
            <p className="font-medium">Este navegador</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: number; detail: string }) {
  return (
    <Card className="h-full min-w-0 border-white/5 bg-moto-gray py-0">
      <CardContent className="flex min-w-0 flex-col items-center gap-1.5 p-2 text-center sm:flex-row sm:gap-4 sm:p-4 sm:text-left xl:flex-col xl:items-center xl:gap-2 xl:text-center">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-moto-orange/20 sm:h-11 sm:w-11 sm:rounded-xl">
          <Icon className="h-4 w-4 text-moto-orange sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="max-w-full truncate text-[10px] leading-tight text-gray-400 sm:text-sm">{label}</p>
          <p className="truncate text-base font-bold leading-tight sm:text-xl">{value.toLocaleString()}</p>
          <p className="hidden truncate text-xs text-gray-500 sm:block">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      className={active ? 'bg-moto-orange text-moto-darker hover:bg-moto-orange-dark' : 'border-white/10'}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}

function UsersTable({
  users,
  savingLicenseUserId,
  onUpdateLicense,
}: {
  users: AdminUserRow[]
  savingLicenseUserId: string | null
  onUpdateLicense: (user: AdminUserRow, plan: UserPlan, status?: UserPlanStatus) => void
}) {
  const [openUserId, setOpenUserId] = useState<string | null>(null)

  return (
    <AdminTable title="Usuarios" description="Listado basico para revisar rapido. Abra el detalle para licencia, metricas y datos operativos.">
      {users.length > 0 ? (
        users.map((user) => {
          const isOpen = openUserId === user.id

          return (
            <div key={user.id} className="border-t border-white/5">
              <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_140px_120px_120px] md:items-center">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{user.display_name || 'Motero MotoHubX'}</p>
                    <Badge className={user.is_public ? 'bg-green-500/15 text-green-300' : 'bg-white/10 text-gray-300'}>
                      {user.is_public ? 'Publico' : 'Privado'}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-gray-400">@{user.username || `usuario-${shortId(user.id)}`}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:block">
                  <p className="text-xs text-gray-500">Licencia</p>
                  <Badge className={planBadgeClasses[user.plan]}>{planLabels[user.plan]}</Badge>
                </div>

                <AdminValue label="Estado" value={planStatusLabels[user.plan_status]} />

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/10 md:w-auto"
                  onClick={() => setOpenUserId((current) => (current === user.id ? null : user.id))}
                >
                  {isOpen ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                  {isOpen ? 'Ocultar' : 'Ver detalle'}
                </Button>
              </div>

              {isOpen && (
                <div className="border-t border-white/5 bg-moto-darker/50 p-4">
                  <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-gray-300">Licencia</h3>
                      <LicenseEditor
                        user={user}
                        isSaving={savingLicenseUserId === user.id}
                        onUpdateLicense={onUpdateLicense}
                      />
                    </div>

                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-gray-300">Datos operativos</h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <AdminValue label="Ciudad" value={user.city || 'No visible'} />
                        <AdminValue label="Tipo de motero" value={user.rider_type || 'No visible'} />
                        <AdminValue label="Fecha de alta" value={formatDate(user.created_at)} />
                        <AdminValue label="Motos" value={user.motorcycles_count.toLocaleString()} />
                        <AdminValue label="Rutas" value={user.routes_count.toLocaleString()} />
                        <AdminValue label="Publicaciones" value={user.posts_count.toLocaleString()} />
                        <AdminValue label="Clubes" value={user.clubs_count.toLocaleString()} />
                        <AdminValue label="ID interno" value={shortId(user.id)} muted />
                        <AdminValue label="Vencimiento" value={user.plan_expires_at ? formatDate(user.plan_expires_at) : 'Sin vencimiento'} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })
      ) : (
        <div className="border-t border-white/5 p-6 text-center text-sm text-gray-400">
          No hay usuarios para mostrar con el filtro actual.
        </div>
      )}
    </AdminTable>
  )
}

function LicenseEditor({
  user,
  isSaving,
  onUpdateLicense,
}: {
  user: AdminUserRow
  isSaving: boolean
  onUpdateLicense: (user: AdminUserRow, plan: UserPlan, status?: UserPlanStatus) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
      <label className="min-w-0">
        <span className="mb-1 block text-xs text-gray-500">Licencia</span>
        <select
          disabled={isSaving}
          value={user.plan === 'pro' ? 'premium' : user.plan}
          onChange={(event) => onUpdateLicense(user, event.target.value as UserPlan)}
          className="w-full rounded-lg border border-white/10 bg-moto-darker px-3 py-2 text-sm text-white outline-none disabled:opacity-60"
        >
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
      </label>
      <label className="min-w-0">
        <span className="mb-1 block text-xs text-gray-500">Estado</span>
        <select
          disabled={isSaving}
          value={user.plan_status}
          onChange={(event) => onUpdateLicense(user, user.plan, event.target.value as UserPlanStatus)}
          className="w-full rounded-lg border border-white/10 bg-moto-darker px-3 py-2 text-sm text-white outline-none disabled:opacity-60"
        >
          <option value="active">Activa</option>
          <option value="trialing">Prueba</option>
          <option value="past_due">Pago pendiente</option>
          <option value="canceled">Cancelada</option>
        </select>
      </label>
      <p className="text-xs text-gray-500 sm:col-span-2 xl:col-span-1">
        {isSaving ? 'Guardando...' : `Estado: ${planStatusLabels[user.plan_status]}`}
      </p>
    </div>
  )
}

function ClubsTable({ clubs }: { clubs: AdminClubRow[] }) {
  return (
    <AdminTable title="Clubes" description="Se muestran datos del club y metricas; el fundador se enmascara si su perfil es privado.">
      {clubs.map((club) => (
        <div key={club.id} className="grid gap-3 border-t border-white/5 p-4 md:grid-cols-[minmax(0,1.5fr)_140px_120px_120px_120px] md:items-center">
          <div className="min-w-0">
            <p className="truncate font-medium">{club.name}</p>
            <p className="truncate text-sm text-gray-400">{club.city || 'Ciudad sin definir'}</p>
            <p className="mt-1 text-xs text-gray-500">Creado: {formatDate(club.created_at)}</p>
          </div>
          <AdminValue label="Fundador" value={club.owner_display_name || 'Sin dato'} muted={!club.owner_is_public} />
          <AdminValue label="Miembros" value={club.members_count.toLocaleString()} />
          <AdminValue label="Posts" value={club.posts_count.toLocaleString()} />
          <AdminValue label="Invitaciones" value={club.pending_invitations_count.toLocaleString()} />
        </div>
      ))}
    </AdminTable>
  )
}

function SuggestionsTable({ suggestions }: { suggestions: AdminMaintenanceSuggestionRow[] }) {
  return (
    <AdminTable title="Catalogo de mantenimientos" description="Vista operativa del catalogo que alimenta recordatorios y servicios.">
      {suggestions.map((item) => (
        <div key={item.id} className="grid gap-3 border-t border-white/5 p-4 md:grid-cols-[minmax(0,1.5fr)_130px_120px_120px_120px] md:items-center">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{item.name}</p>
              <Badge className={item.is_active ? 'bg-green-500/15 text-green-300' : 'bg-white/10 text-gray-300'}>
                {item.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <p className="truncate text-sm text-gray-400">{item.code}</p>
          </div>
          <AdminValue label="Categoria" value={item.category} />
          <AdminValue label="Km" value={item.recommended_interval_km ? item.recommended_interval_km.toLocaleString() : 'N/A'} />
          <AdminValue label="Dias" value={item.recommended_interval_days ? item.recommended_interval_days.toLocaleString() : 'N/A'} />
          <AdminValue label="Orden" value={item.sort_order.toString()} />
        </div>
      ))}
    </AdminTable>
  )
}

function AdminTable({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden border-white/5 bg-moto-gray py-0">
      <CardContent className="p-0">
        <div className="flex items-start gap-3 p-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-moto-orange/20">
            <Database className="h-5 w-5 text-moto-orange" />
          </div>
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

function AdminValue({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`truncate text-sm font-medium ${muted ? 'text-gray-500' : 'text-gray-200'}`}>{value}</p>
    </div>
  )
}
