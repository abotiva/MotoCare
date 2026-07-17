import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Camera, Edit3, ExternalLink, Loader2, Mail, MapPin, Route, Save, Shield, Star, Store, UserRound, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImageViewer } from '@/components/ImageViewer'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import type { Club, Motorcycle, Profile as ProfileType, RoutePlan } from '@/types/database'

type ProfileForm = {
  full_name: string
  username: string
  city: string
  rider_type: string
  bio: string
  social_url: string
  primary_motorcycle_id: string
  is_public: boolean
}

type ProfileStats = {
  motorcycles: number
  routes: number
  posts: number
}

type ClubMembershipRow = {
  clubs: Club | null
}

const emptyStats: ProfileStats = {
  motorcycles: 0,
  routes: 0,
  posts: 0,
}

const sanitizeFileName = (name: string) => name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')

function initials(name: string | null | undefined, email: string | undefined) {
  const source = name || email || 'MotoCare Co'
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function formatJoinDate(date: string | null | undefined) {
  if (!date) return 'Fecha no disponible'
  return new Date(date).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
}

function normalizeUrl(url: string | null | undefined) {
  if (!url) return null
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

const routeStatusMeta: Record<RoutePlan['status'], { label: string; className: string }> = {
  planned: {
    label: 'Planeada',
    className: 'bg-sky-500/15 text-sky-300',
  },
  in_progress: {
    label: 'En curso',
    className: 'bg-moto-orange text-moto-darker',
  },
  completed: {
    label: 'Realizada',
    className: 'bg-green-500/15 text-green-300',
  },
}

function routeStatus(route: RoutePlan) {
  return routeStatusMeta[route.status ?? 'planned']
}

function formatRouteDates(route: RoutePlan) {
  if (!route.start_date && !route.end_date) return 'Sin fechas'
  const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('es-CO')
  if (route.start_date && route.end_date) return `${formatDate(route.start_date)} - ${formatDate(route.end_date)}`
  if (route.start_date) return `Inicia ${formatDate(route.start_date)}`
  return `Finaliza ${formatDate(route.end_date!)}`
}

function CompactMetricCard({
  icon: Icon,
  label,
  mobileLabel,
  value,
  tone,
  onClick,
}: {
  icon: LucideIcon
  label: string
  mobileLabel?: string
  value: string | number
  tone: 'orange' | 'yellow' | 'green'
  onClick?: () => void
}) {
  const tones = {
    orange: 'bg-moto-orange/20 text-moto-orange',
    yellow: 'bg-yellow-500/20 text-yellow-300',
    green: 'bg-green-500/20 text-green-300',
  }

  const content = (
    <>
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl ${tones[tone]}`}>
        <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
      </div>
      <div className="min-w-0">
        <p className="max-w-full truncate text-[11px] leading-tight text-gray-400 sm:text-sm">
          <span className="sm:hidden">{mobileLabel ?? label}</span>
          <span className="hidden sm:inline">{label}</span>
        </p>
        <p className="truncate text-base font-bold leading-tight sm:text-xl">{value}</p>
      </div>
    </>
  )

  return (
    <Card className="h-full min-w-0 border-white/5 bg-moto-gray py-0">
      <CardContent className="p-0">
        {onClick ? (
          <button type="button" className="flex w-full min-w-0 flex-col items-center gap-1.5 p-2 text-center sm:flex-row sm:gap-4 sm:p-4 sm:text-left" onClick={onClick}>
            {content}
          </button>
        ) : (
          <div className="flex min-w-0 flex-col items-center gap-1.5 p-2 text-center sm:flex-row sm:gap-4 sm:p-4 sm:text-left">{content}</div>
        )}
      </CardContent>
    </Card>
  )
}

export function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const { effectivePlan } = useSubscription()
  const navigate = useNavigate()
  const [form, setForm] = useState<ProfileForm>({
    full_name: '',
    username: '',
    city: '',
    rider_type: '',
    bio: '',
    social_url: '',
    primary_motorcycle_id: '',
    is_public: true,
  })
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([])
  const [routes, setRoutes] = useState<RoutePlan[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [stats, setStats] = useState<ProfileStats>(emptyStats)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showAvatarPreview, setShowAvatarPreview] = useState(false)
  const [showRoutesPreview, setShowRoutesPreview] = useState(false)
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const visibleName = profile?.full_name || user?.email?.split('@')[0] || 'Motero MotoCare Co'
  const username = profile?.username || user?.email?.split('@')[0] || 'motocare'
  const avatarFallback = initials(profile?.full_name, user?.email)
  const socialUrl = normalizeUrl(profile?.social_url)
  const isPremiumProfile = effectivePlan === 'pro' || effectivePlan === 'premium'
  const isBusinessProfile = effectivePlan === 'business'

  const primaryBike = useMemo(
    () => motorcycles.find((motorcycle) => motorcycle.id === profile?.primary_motorcycle_id) ?? motorcycles[0] ?? null,
    [motorcycles, profile?.primary_motorcycle_id]
  )

  useEffect(() => {
    setForm({
      full_name: profile?.full_name ?? '',
      username: profile?.username ?? '',
      city: profile?.city ?? '',
      rider_type: profile?.rider_type ?? '',
      bio: profile?.bio ?? '',
      social_url: profile?.social_url ?? '',
      primary_motorcycle_id: profile?.primary_motorcycle_id ?? '',
      is_public: profile?.is_public ?? true,
    })
  }, [profile])

  useEffect(() => {
    if (!supabase || !user) return
    const client = supabase

    const loadProfileData = async () => {
      setIsLoading(true)

      const [motorcyclesResult, routesResult, postsResult, clubsResult] = await Promise.all([
        client.from('motorcycles').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
        client.from('routes').select('*', { count: 'exact' }).eq('owner_id', user.id).order('created_at', { ascending: false }).limit(5),
        client.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
        client.from('club_members').select('clubs:club_id(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      if (motorcyclesResult.error) {
        toast.error('No pudimos cargar tus motos', { description: motorcyclesResult.error.message })
      } else {
        const nextMotorcycles = (motorcyclesResult.data ?? []) as Motorcycle[]
        setMotorcycles(nextMotorcycles)
        setStats((current) => ({ ...current, motorcycles: nextMotorcycles.length }))
      }

      if (routesResult.error) {
        toast.error('No pudimos cargar tus rutas', { description: routesResult.error.message })
      } else {
        setRoutes((routesResult.data ?? []) as RoutePlan[])
        setStats((current) => ({ ...current, routes: routesResult.count ?? 0 }))
      }

      setStats((current) => ({ ...current, posts: postsResult.count ?? 0 }))

      if (clubsResult.error) {
        toast.error('No pudimos cargar tus clubes', { description: clubsResult.error.message })
      } else {
        setClubs(((clubsResult.data ?? []) as unknown as ClubMembershipRow[]).map((row) => row.clubs).filter(Boolean) as Club[])
      }

      setIsLoading(false)
    }

    void loadProfileData()
  }, [user])

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return

    const cleanUsername = form.username.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_')
    if (!form.full_name.trim()) {
      toast.error('Nombre requerido', { description: 'Agregue su nombre para mostrar en el perfil.' })
      return
    }

    setIsSaving(true)

    const payload: Partial<ProfileType> = {
      full_name: form.full_name.trim(),
      username: cleanUsername || null,
      city: form.city.trim() || null,
      rider_type: form.rider_type.trim() || null,
      bio: form.bio.trim() || null,
      social_url: form.social_url.trim() || null,
      primary_motorcycle_id: form.primary_motorcycle_id || null,
      is_public: form.is_public,
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)

    if (error) {
      toast.error('No pudimos guardar el perfil', { description: error.message })
    } else {
      await refreshProfile()
      setShowEditProfile(false)
      toast.success('Perfil actualizado', { description: 'Su información quedo guardada.' })
    }

    setIsSaving(false)
  }

  const uploadAvatar = async (file: File) => {
    if (!supabase || !user) return

    if (!file.type.startsWith('image/')) {
      toast.error('Archivo no válido', { description: 'Seleccione una imagen.' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagen muy pesada', { description: 'Use una imagen de máximo 5 MB.' })
      return
    }

    setIsUploadingAvatar(true)
    const path = `${user.id}/profile/avatar-${Date.now()}-${sanitizeFileName(file.name)}`
    const { error: uploadError } = await supabase.storage.from('motocare-public').upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('No pudimos subir la foto', { description: uploadError.message })
      setIsUploadingAvatar(false)
      return
    }

    const { data: publicUrlData } = supabase.storage.from('motocare-public').getPublicUrl(path)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrlData.publicUrl })
      .eq('id', user.id)

    if (updateError) {
      toast.error('La foto subio, pero no pudimos actualizar el perfil', { description: updateError.message })
    } else {
      await refreshProfile()
      toast.success('Foto de perfil actualizada')
    }

    setIsUploadingAvatar(false)
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-moto-orange">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 lg:p-6">
      <Card className="mb-4 border-white/5 bg-moto-gray py-0 sm:mb-5">
        <CardContent className="p-3 sm:p-5">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="relative h-20 w-20 shrink-0 sm:h-28 sm:w-28">
              <button
                type="button"
                className="block rounded-full"
                onClick={() => setShowAvatarPreview(true)}
                aria-label="Ver foto de perfil"
              >
                <Avatar className="h-20 w-20 border-4 border-moto-darker bg-moto-darker sm:h-28 sm:w-28">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-2xl sm:text-3xl">{avatarFallback}</AvatarFallback>
                </Avatar>
              </button>
                {isPremiumProfile && (
                  <span
                    className="absolute right-0 top-0 z-20 grid h-8 w-8 place-items-center rounded-full border-2 border-moto-darker bg-amber-400 text-amber-950 shadow-lg sm:h-10 sm:w-10"
                    title="Licencia Premium"
                    aria-label="Licencia Premium"
                  >
                    <Star className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
                  </span>
                )}
                {isBusinessProfile && (
                  <span
                    className="absolute right-0 top-0 z-20 grid h-8 w-8 place-items-center rounded-full border-2 border-moto-darker bg-violet-500 text-white shadow-lg sm:h-10 sm:w-10"
                    title="Licencia Business"
                    aria-label="Licencia Business"
                  >
                    <Store className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                )}
                <label className="absolute bottom-0 right-0 z-20 grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-white/20 bg-moto-orange text-moto-darker shadow-lg sm:bottom-1 sm:right-1 sm:h-10 sm:w-10">
                  {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingAvatar}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void uploadAvatar(file)
                      event.target.value = ''
                    }}
                  />
                </label>
            </div>

            <div className="min-w-0 flex-1 text-left">
              <div className="mb-1 flex flex-wrap items-center gap-2 sm:mb-2 sm:gap-3">
                <h1 className="w-full truncate text-xl font-bold leading-tight sm:w-auto sm:text-3xl">{visibleName}</h1>
                <Badge className="bg-moto-orange text-moto-darker">{profile?.rider_type || 'Motero'}</Badge>
                <Badge className={profile?.is_public === false ? 'bg-white/10 text-gray-300' : 'bg-green-500/15 text-green-300'}>
                  {profile?.is_public === false ? 'Privado' : 'Público'}
                </Badge>
              </div>
              <p className="mb-2 truncate text-sm text-gray-400 sm:mb-3 sm:text-base">@{username}</p>
              {profile?.bio && <p className="mb-2 line-clamp-2 max-w-2xl text-sm text-gray-300 sm:mb-3">{profile.bio}</p>}
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-gray-400 sm:gap-x-4 sm:gap-y-2 sm:text-sm">
                <span className="flex min-w-0 items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {profile?.city || 'Ciudad sin definir'}
                </span>
                <span className="flex min-w-0 items-center gap-1">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{user?.email}</span>
                </span>
                <span className="flex min-w-0 items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Se unió en {formatJoinDate(profile?.created_at)}
                </span>
                {socialUrl && (
                  <a href={socialUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-moto-orange hover:text-moto-orange-light">
                    <ExternalLink className="h-4 w-4" />
                    Enlace social
                  </a>
                )}
              </div>
            </div>

            <div className="hidden w-full flex-col gap-2 sm:flex sm:w-44 sm:shrink-0">
              <Button
                className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark"
                onClick={() => setShowEditProfile(true)}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Editar perfil
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-5 border-white/5 bg-moto-gray py-0">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 text-moto-orange" />
              Clubes
            </h2>
            <Button asChild size="sm" variant="outline" className="border-white/10">
              <Link to="/app/clubs">Gestionar clubes</Link>
            </Button>
          </div>
          {clubs.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {clubs.map((club) => (
                <div key={club.id} className="flex items-center gap-3 rounded-xl bg-moto-darker p-3">
                  <Avatar className="h-11 w-11 bg-moto-gray">
                    <AvatarImage src={club.image_url ?? undefined} />
                    <AvatarFallback>{initials(club.name, club.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{club.name}</p>
                    <p className="truncate text-xs text-gray-500">{club.city || 'Ciudad sin definir'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-moto-darker p-4 text-sm text-gray-400">
              Aun no perteneces a ningun club.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-4 gap-2 sm:mb-5 sm:gap-4">
        <CompactMetricCard icon={UserRound} label="Tipo de motero" mobileLabel="Tipo" value={profile?.rider_type || 'Sin definir'} tone="orange" onClick={() => setShowEditProfile(true)} />
        <CompactMetricCard icon={Route} label="Rutas creadas" mobileLabel="Rutas" value={stats.routes} tone="green" onClick={() => setShowRoutesPreview(true)} />
        <CompactMetricCard icon={Route} label="Km en rutas" mobileLabel="Km" value={`${routes.reduce((total, route) => total + (route.distance_km ?? 0), 0).toLocaleString()} km`} tone="green" onClick={() => setShowRoutesPreview(true)} />
        <CompactMetricCard icon={UserRound} label="Publicaciones" mobileLabel="Posts" value={stats.posts} tone="yellow" onClick={() => navigate('/app/messages')} />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Resumen</h2>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-gray-400">Nombre</span>
                <span className="min-w-0 break-words text-right">{visibleName}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-gray-400">Usuario</span>
                <span className="min-w-0 break-words text-right">@{username}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-gray-400">Ciudad</span>
                <span className="text-right">{profile?.city || 'Sin definir'}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-gray-400">Bio</span>
                <span className="min-w-0 max-w-full break-words text-right sm:max-w-xs">{profile?.bio || 'Sin definir'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Enlace</span>
                {socialUrl ? (
                  <a href={socialUrl} target="_blank" rel="noreferrer" className="text-right text-moto-orange hover:text-moto-orange-light">
                    Abrir
                  </a>
                ) : (
                  <span className="text-right">Sin definir</span>
                )}
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Motos registradas</span>
                <span className="text-right">{stats.motorcycles}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Privacidad</span>
                <span className="text-right">{profile?.is_public === false ? 'Perfil privado' : 'Perfil público'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Moto principal</h2>
            {primaryBike ? (
              <div className="flex gap-4">
                <button
                  type="button"
                  className="h-24 w-32 shrink-0 overflow-hidden rounded-xl text-left"
                  onClick={() =>
                    setViewerImage({
                      src: primaryBike.image_url ?? '/hero-motorcycle.jpg',
                      alt: `${primaryBike.brand} ${primaryBike.model}`,
                    })
                  }
                >
                  <img src={primaryBike.image_url ?? '/hero-motorcycle.jpg'} alt={primaryBike.model} className="h-full w-full object-cover transition hover:scale-[1.01]" />
                </button>
                <div>
                  <p className="font-semibold">
                    {primaryBike.brand} {primaryBike.model}
                  </p>
                  <p className="text-sm text-gray-400">{primaryBike.plate || 'Sin placa'}</p>
                  <p className="mt-2 text-sm text-moto-orange">{primaryBike.mileage.toLocaleString()} km</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-moto-darker p-5 text-center text-gray-400">
                Aun no hay motos registradas.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-moto-gray py-0">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Rutas recientes</h2>
              <Button size="sm" variant="outline" className="border-white/10" onClick={() => setShowRoutesPreview(true)}>
                Ver todas
              </Button>
            </div>
            {routes.length > 0 ? (
              <div className="space-y-2">
                {routes.slice(0, 3).map((route) => (
                  <Link key={route.id} to={`/app/routes/${route.id}`} className="block rounded-xl border border-white/5 bg-moto-darker p-3 transition hover:border-moto-orange/50 hover:bg-moto-darker/80">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{route.title}</p>
                        <p className="text-sm text-gray-400">
                          {route.origin || 'Origen'} â†’ {route.destination || 'Destino'}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatRouteDates(route)}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Badge className={routeStatus(route).className}>{routeStatus(route).label}</Badge>
                        <Badge className={route.visibility === 'community' ? 'bg-moto-orange text-moto-darker' : 'bg-white/10 text-gray-300'}>
                          {route.visibility === 'community' ? 'Comunidad' : 'Privada'}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-moto-darker p-5 text-center text-gray-400">
                Aun no hay rutas creadas.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-md border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription className="text-gray-400">Actualiza tu información visible en MotoCare Co.</DialogDescription>
          </DialogHeader>
          <form className="mt-4 space-y-4" onSubmit={handleSaveProfile}>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Nombre</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                required
              />
            </label>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Usuario</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                placeholder="motero_colombia"
              />
            </label>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Ciudad</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
                placeholder="Bogota"
              />
            </label>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Bio corta</span>
              <textarea
                className="h-20 w-full resize-none rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                maxLength={180}
                placeholder="Amo las rutas de montaña y los viajes de fin de semana."
              />
              <span className="mt-1 block text-xs text-gray-500">{form.bio.length}/180</span>
            </label>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Enlace social</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={form.social_url}
                onChange={(event) => setForm({ ...form, social_url: event.target.value })}
                placeholder="instagram.com/usuario"
              />
            </label>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Tipo de motero</span>
              <select
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={form.rider_type}
                onChange={(event) => setForm({ ...form, rider_type: event.target.value })}
              >
                <option value="">Seleccionar</option>
                <option value="Urbano">Urbano</option>
                <option value="Touring">Touring</option>
                <option value="Adventure">Adventure</option>
                <option value="Sport">Sport</option>
                <option value="Custom">Custom</option>
                <option value="Trabajo">Trabajo</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Moto principal</span>
              <select
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={form.primary_motorcycle_id}
                onChange={(event) => setForm({ ...form, primary_motorcycle_id: event.target.value })}
              >
                <option value="">Usar la más reciente</option>
                {motorcycles.map((motorcycle) => (
                  <option key={motorcycle.id} value={motorcycle.id}>
                    {motorcycle.brand} {motorcycle.model}
                    {motorcycle.plate ? ` - ${motorcycle.plate}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-moto-darker p-3">
              <span>
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4 text-moto-orange" />
                  Perfil público
                </span>
                <span className="mt-1 block text-xs text-gray-400">
                  Si lo apaga, no aparece en búsquedas y las invitaciones a clubes quedan pendientes de aprobación.
                </span>
              </span>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-moto-orange"
                checked={form.is_public}
                onChange={(event) => setForm({ ...form, is_public: event.target.checked })}
              />
            </label>
            <Button type="submit" disabled={isSaving} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar perfil
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAvatarPreview} onOpenChange={setShowAvatarPreview}>
        <DialogContent className="max-w-lg border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>Foto de perfil</DialogTitle>
            <DialogDescription className="text-gray-400">{visibleName}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-moto-darker">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={visibleName} className="max-h-[70vh] w-full object-contain" />
            ) : (
              <div className="grid aspect-square place-items-center text-7xl font-bold text-moto-orange">{avatarFallback}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRoutesPreview} onOpenChange={setShowRoutesPreview}>
        <DialogContent className="max-w-lg border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>Mis rutas</DialogTitle>
            <DialogDescription className="text-gray-400">Ultimas rutas creadas desde tu perfil.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {routes.length > 0 ? (
              routes.map((route) => (
                <Link key={route.id} to={`/app/routes/${route.id}`} className="block rounded-xl border border-white/5 bg-moto-darker p-3 transition hover:border-moto-orange/50 hover:bg-moto-darker/80" onClick={() => setShowRoutesPreview(false)}>
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{route.title}</p>
                      <p className="text-sm text-gray-400">
                        {route.origin || 'Origen'} â†’ {route.destination || 'Destino'}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatRouteDates(route)}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge className={routeStatus(route).className}>{routeStatus(route).label}</Badge>
                      <Badge className={route.visibility === 'community' ? 'bg-moto-orange text-moto-darker' : 'bg-white/10 text-gray-300'}>
                        {route.visibility === 'community' ? 'Comunidad' : 'Privada'}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {route.distance_km ? `${route.distance_km.toLocaleString()} km` : 'Sin distancia'} ·{' '}
                    {route.duration_minutes ? `${route.duration_minutes} min` : 'Sin duración'} · {formatRouteDates(route)}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-white/5 bg-moto-darker p-5 text-center text-gray-400">
                Aun no hay rutas creadas.
              </div>
            )}
            <Button asChild className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
              <Link to="/app/map">Ir al modulo de rutas</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImageViewer
        src={viewerImage?.src ?? null}
        alt={viewerImage?.alt}
        open={Boolean(viewerImage)}
        onOpenChange={(open) => !open && setViewerImage(null)}
      />
    </div>
  )
}
