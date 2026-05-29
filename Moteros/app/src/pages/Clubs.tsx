import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Camera, Crown, Edit3, Loader2, Plus, Save, Shield, Trash2, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Club, ClubMemberWithProfile, Profile } from '@/types/database'

type ClubForm = {
  name: string
  city: string
  description: string
}

type MembershipRow = {
  role: 'owner' | 'admin' | 'member'
  clubs: Club | null
}

const emptyClubForm: ClubForm = {
  name: '',
  city: '',
  description: '',
}

const sanitizeFileName = (name: string) => name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')

function initials(name: string | null | undefined) {
  const source = name || 'MC'
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function roleLabel(role: ClubMemberWithProfile['role']) {
  if (role === 'owner') return 'Fundador'
  if (role === 'admin') return 'Admin'
  return 'Miembro'
}

export function Clubs() {
  const { user } = useAuth()
  const [clubs, setClubs] = useState<Club[]>([])
  const [members, setMembers] = useState<ClubMemberWithProfile[]>([])
  const [selectedClubId, setSelectedClubId] = useState('')
  const [createForm, setCreateForm] = useState<ClubForm>(emptyClubForm)
  const [clubForm, setClubForm] = useState<ClubForm>(emptyClubForm)
  const [inviteUsername, setInviteUsername] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const selectedClub = useMemo(
    () => clubs.find((club) => club.id === selectedClubId) ?? clubs[0] ?? null,
    [clubs, selectedClubId]
  )

  const selectedMembership = useMemo(
    () => members.find((member) => member.user_id === user?.id && member.club_id === selectedClub?.id) ?? null,
    [members, selectedClub?.id, user?.id]
  )

  const canManageSelectedClub = selectedClub?.owner_id === user?.id || selectedMembership?.role === 'owner' || selectedMembership?.role === 'admin'

  const loadClubs = async () => {
    if (!supabase || !user) return
    setIsLoading(true)

    const { data, error } = await supabase
      .from('club_members')
      .select('role, clubs:club_id(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('No pudimos cargar tus clubes', { description: error.message })
      setIsLoading(false)
      return
    }

    const nextClubs = ((data ?? []) as unknown as MembershipRow[]).map((row) => row.clubs).filter(Boolean) as Club[]
    setClubs(nextClubs)
    const nextSelected = selectedClubId && nextClubs.some((club) => club.id === selectedClubId) ? selectedClubId : nextClubs[0]?.id ?? ''
    setSelectedClubId(nextSelected)

    if (nextSelected) {
      await loadMembers(nextSelected)
    } else {
      setMembers([])
    }

    setIsLoading(false)
  }

  const loadMembers = async (clubId: string) => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('club_members')
      .select('*, profiles:user_id(full_name, username, city, avatar_url)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('No pudimos cargar miembros', { description: error.message })
    } else {
      setMembers((data ?? []) as ClubMemberWithProfile[])
    }
  }

  useEffect(() => {
    void loadClubs()
  }, [user?.id])

  useEffect(() => {
    if (!selectedClub) {
      setClubForm(emptyClubForm)
      return
    }

    setClubForm({
      name: selectedClub.name,
      city: selectedClub.city ?? '',
      description: selectedClub.description ?? '',
    })
    void loadMembers(selectedClub.id)
  }, [selectedClub?.id])

  const createClub = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return

    if (!createForm.name.trim()) {
      toast.error('Nombre requerido', { description: 'El club necesita un nombre.' })
      return
    }

    setIsSaving(true)

    const { data: club, error } = await supabase
      .from('clubs')
      .insert({
        owner_id: user.id,
        name: createForm.name.trim(),
        city: createForm.city.trim() || null,
        description: createForm.description.trim() || null,
      })
      .select('*')
      .single()

    if (error || !club) {
      toast.error('No pudimos crear el club', { description: error?.message })
      setIsSaving(false)
      return
    }

    const createdClub = club as Club
    const { error: memberError } = await supabase.from('club_members').insert({
      club_id: createdClub.id,
      user_id: user.id,
      role: 'owner',
    })

    if (memberError) {
      toast.error('El club se creo, pero no pudimos agregarte como miembro', { description: memberError.message })
    } else {
      setClubs((current) => [createdClub, ...current])
      setSelectedClubId(createdClub.id)
      setCreateForm(emptyClubForm)
      toast.success('Club creado', { description: 'Ya puedes invitar miembros.' })
    }

    setIsSaving(false)
  }

  const updateClub = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !selectedClub || !canManageSelectedClub) return

    if (!clubForm.name.trim()) {
      toast.error('Nombre requerido', { description: 'El club necesita un nombre.' })
      return
    }

    setIsSaving(true)

    const { data, error } = await supabase
      .from('clubs')
      .update({
        name: clubForm.name.trim(),
        city: clubForm.city.trim() || null,
        description: clubForm.description.trim() || null,
      })
      .eq('id', selectedClub.id)
      .select('*')
      .single()

    if (error) {
      toast.error('No pudimos actualizar el club', { description: error.message })
    } else if (data) {
      const updatedClub = data as Club
      setClubs((current) => current.map((club) => (club.id === updatedClub.id ? updatedClub : club)))
      toast.success('Club actualizado')
    }

    setIsSaving(false)
  }

  const uploadClubImage = async (file: File) => {
    if (!supabase || !user || !selectedClub || !canManageSelectedClub) return

    if (!file.type.startsWith('image/')) {
      toast.error('Archivo no valido', { description: 'Seleccione una imagen.' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagen muy pesada', { description: 'Use una imagen de maximo 5 MB.' })
      return
    }

    setIsUploading(true)
    const path = `${user.id}/clubs/${selectedClub.id}-${Date.now()}-${sanitizeFileName(file.name)}`
    const { error: uploadError } = await supabase.storage.from('motocare-public').upload(path, file, { upsert: false })

    if (uploadError) {
      toast.error('No pudimos subir la imagen', { description: uploadError.message })
      setIsUploading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage.from('motocare-public').getPublicUrl(path)
    const { data, error } = await supabase
      .from('clubs')
      .update({ image_url: publicUrlData.publicUrl })
      .eq('id', selectedClub.id)
      .select('*')
      .single()

    if (error) {
      toast.error('La imagen subio, pero no pudimos actualizar el club', { description: error.message })
    } else if (data) {
      const updatedClub = data as Club
      setClubs((current) => current.map((club) => (club.id === updatedClub.id ? updatedClub : club)))
      toast.success('Imagen del club actualizada')
    }

    setIsUploading(false)
  }

  const inviteMember = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !selectedClub || !canManageSelectedClub) return

    const username = inviteUsername.trim().replace(/^@/, '').toLowerCase()
    if (!username) return

    setIsSaving(true)

    const { data: foundProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, username, city, avatar_url')
      .eq('username', username)
      .single()

    if (profileError || !foundProfile) {
      toast.error('Usuario no encontrado', { description: 'Revise el nombre de usuario e intente de nuevo.' })
      setIsSaving(false)
      return
    }

    const profile = foundProfile as Pick<Profile, 'id' | 'full_name' | 'username' | 'city' | 'avatar_url'>
    const { error } = await supabase.from('club_members').insert({
      club_id: selectedClub.id,
      user_id: profile.id,
      role: 'member',
    })

    if (error) {
      toast.error('No pudimos agregar el miembro', { description: error.message })
    } else {
      setInviteUsername('')
      await loadMembers(selectedClub.id)
      toast.success('Miembro agregado', { description: profile.full_name || `@${profile.username}` || 'Nuevo miembro' })
    }

    setIsSaving(false)
  }

  const removeMember = async (member: ClubMemberWithProfile) => {
    if (!supabase || !selectedClub || !canManageSelectedClub || member.role === 'owner') return

    const confirmed = window.confirm('Sacar este miembro del club?')
    if (!confirmed) return

    const { error } = await supabase
      .from('club_members')
      .delete()
      .eq('id', member.id)
      .eq('club_id', selectedClub.id)

    if (error) {
      toast.error('No pudimos sacar el miembro', { description: error.message })
    } else {
      setMembers((current) => current.filter((item) => item.id !== member.id))
      toast.success('Miembro retirado')
    }
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
        <div>
          <h1 className="text-2xl font-bold">Clubes</h1>
          <p className="text-gray-400">Crea clubes, administra miembros y prepara espacios privados para rodadas.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="p-4">
              <h2 className="mb-3 font-semibold">Mis clubes</h2>
              {clubs.length > 0 ? (
                <div className="space-y-2">
                  {clubs.map((club) => (
                    <button
                      key={club.id}
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${selectedClub?.id === club.id ? 'bg-moto-orange text-moto-darker' : 'bg-moto-darker hover:bg-white/5'}`}
                      onClick={() => setSelectedClubId(club.id)}
                    >
                      <Avatar className="h-10 w-10 bg-moto-gray">
                        <AvatarImage src={club.image_url ?? undefined} />
                        <AvatarFallback>{initials(club.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{club.name}</p>
                        <p className={`truncate text-xs ${selectedClub?.id === club.id ? 'text-moto-darker/70' : 'text-gray-500'}`}>{club.city || 'Ciudad sin definir'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-moto-darker p-4 text-sm text-gray-400">Aun no perteneces a ningun club.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="p-4">
              <h2 className="mb-3 font-semibold">Crear club</h2>
              <form className="space-y-3" onSubmit={createClub}>
                <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} placeholder="Nombre del club" />
                <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={createForm.city} onChange={(event) => setCreateForm({ ...createForm, city: event.target.value })} placeholder="Ciudad" />
                <textarea className="h-20 w-full resize-none rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={createForm.description} onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })} placeholder="Descripcion corta" />
                <Button type="submit" disabled={isSaving} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Crear club
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {selectedClub ? (
          <div className="space-y-5">
            <Card className="border-white/5 bg-moto-gray py-0">
              <CardContent className="p-5">
                <div className="flex flex-col gap-5 md:flex-row md:items-start">
                  <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl bg-moto-darker">
                    {selectedClub.image_url ? (
                      <img src={selectedClub.image_url} alt={selectedClub.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-3xl font-bold text-moto-orange">{initials(selectedClub.name)}</div>
                    )}
                    {canManageSelectedClub && (
                      <label className="absolute bottom-2 right-2 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-moto-orange text-moto-darker">
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) void uploadClubImage(file)
                            event.target.value = ''
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold">{selectedClub.name}</h2>
                      {selectedClub.owner_id === user?.id && <Badge className="bg-moto-orange text-moto-darker">Fundador</Badge>}
                    </div>
                    <p className="text-gray-400">{selectedClub.city || 'Ciudad sin definir'}</p>
                    <p className="mt-3 text-sm leading-6 text-gray-300">{selectedClub.description || 'Club sin descripcion todavia.'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {canManageSelectedClub && (
              <Card className="border-white/5 bg-moto-gray py-0">
                <CardContent className="p-5">
                  <h2 className="mb-4 flex items-center gap-2 font-semibold">
                    <Edit3 className="h-4 w-4 text-moto-orange" />
                    Editar informacion
                  </h2>
                  <form className="grid gap-3 md:grid-cols-2" onSubmit={updateClub}>
                    <input className="rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={clubForm.name} onChange={(event) => setClubForm({ ...clubForm, name: event.target.value })} placeholder="Nombre" />
                    <input className="rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={clubForm.city} onChange={(event) => setClubForm({ ...clubForm, city: event.target.value })} placeholder="Ciudad" />
                    <textarea className="h-20 resize-none rounded-lg border border-white/10 bg-moto-darker p-2 text-white md:col-span-2" value={clubForm.description} onChange={(event) => setClubForm({ ...clubForm, description: event.target.value })} placeholder="Descripcion" />
                    <Button type="submit" disabled={isSaving} className="md:col-span-2 bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Guardar cambios
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="border-white/5 bg-moto-gray py-0">
              <CardContent className="p-5">
                <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <Users className="h-5 w-5 text-moto-orange" />
                    Miembros
                  </h2>
                  {canManageSelectedClub && (
                    <form className="flex gap-2" onSubmit={inviteMember}>
                      <input className="min-w-0 rounded-lg border border-white/10 bg-moto-darker px-3 py-2 text-sm text-white" value={inviteUsername} onChange={(event) => setInviteUsername(event.target.value)} placeholder="@usuario" />
                      <Button type="submit" disabled={isSaving} className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invitar
                      </Button>
                    </form>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {members.map((member) => {
                    const memberName = member.profiles?.full_name || member.profiles?.username || 'Motero MotoCare'
                    return (
                      <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-moto-darker p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-10 w-10 bg-moto-gray">
                            <AvatarImage src={member.profiles?.avatar_url ?? undefined} />
                            <AvatarFallback>{initials(memberName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{memberName}</p>
                            <p className="truncate text-xs text-gray-500">@{member.profiles?.username || 'motocare'} · {roleLabel(member.role)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.role === 'owner' ? <Crown className="h-4 w-4 text-moto-orange" /> : <Shield className="h-4 w-4 text-gray-500" />}
                          {canManageSelectedClub && member.role !== 'owner' && (
                            <Button size="sm" variant="outline" className="border-red-500/30 text-red-300 hover:text-red-200" onClick={() => void removeMember(member)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="grid min-h-[360px] place-items-center p-8 text-center text-gray-400">
              <div>
                <Users className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                Crea tu primer club para empezar a invitar miembros.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
