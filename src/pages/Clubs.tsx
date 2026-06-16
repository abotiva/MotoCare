import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Camera, Crown, Edit3, Loader2, Plus, Save, Shield, Trash2, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ImageViewer } from '@/components/ImageViewer'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import type { Club, ClubInvitation, ClubMemberWithProfile, Profile } from '@/types/database'

type ClubForm = {
  name: string
  city: string
  description: string
}

type MembershipRow = {
  role: 'owner' | 'admin' | 'member'
  clubs: Club | null
}

type InviteSearchProfile = Pick<Profile, 'id' | 'full_name' | 'username' | 'city' | 'avatar_url'>

type ClubInvitationWithProfile = ClubInvitation & {
  profiles: {
    full_name: string | null
    username: string | null
    city: string | null
    avatar_url: string | null
  } | null
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
  const { hasPlan, isLoadingSubscription } = useSubscription()
  const [clubs, setClubs] = useState<Club[]>([])
  const [members, setMembers] = useState<ClubMemberWithProfile[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<ClubInvitationWithProfile[]>([])
  const [selectedClubId, setSelectedClubId] = useState('')
  const [createForm, setCreateForm] = useState<ClubForm>(emptyClubForm)
  const [clubForm, setClubForm] = useState<ClubForm>(emptyClubForm)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteSuggestions, setInviteSuggestions] = useState<InviteSearchProfile[]>([])
  const [isSearchingInvite, setIsSearchingInvite] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null)

  const selectedClub = useMemo(
    () => clubs.find((club) => club.id === selectedClubId) ?? clubs[0] ?? null,
    [clubs, selectedClubId]
  )

  const selectedMembership = useMemo(
    () => members.find((member) => member.user_id === user?.id && member.club_id === selectedClub?.id) ?? null,
    [members, selectedClub?.id, user?.id]
  )

  const canManageSelectedClub = selectedClub?.owner_id === user?.id || selectedMembership?.role === 'owner' || selectedMembership?.role === 'admin'
  const canCreateClub = hasPlan('pro')

  const showUpgradeForClubCreation = () => {
    toast.info('Actualice su cuenta para poder crear un club', {
      description: 'La creacion de clubes esta disponible para licencias Pro y Premium.',
    })
  }

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
      await loadPendingInvitations(nextSelected)
    } else {
      setMembers([])
      setPendingInvitations([])
    }

    setIsLoading(false)
  }

  const loadMembers = async (clubId: string) => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('club_members')
      .select('*, profiles:user_id(full_name, username, city, avatar_url, is_public)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('No pudimos cargar miembros', { description: error.message })
    } else {
      setMembers((data ?? []) as ClubMemberWithProfile[])
    }
  }

  const loadPendingInvitations = async (clubId: string) => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('club_invitations')
      .select('*, profiles:invited_user_id(full_name, username, city, avatar_url)')
      .eq('club_id', clubId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('No pudimos cargar invitaciones pendientes', { description: error.message })
    } else {
      setPendingInvitations((data ?? []) as ClubInvitationWithProfile[])
    }
  }

  useEffect(() => {
    void loadClubs()
  }, [user?.id])

  useEffect(() => {
    if (!selectedClub) {
      setClubForm(emptyClubForm)
      setInviteSuggestions([])
      setPendingInvitations([])
      return
    }

    setClubForm({
      name: selectedClub.name,
      city: selectedClub.city ?? '',
      description: selectedClub.description ?? '',
    })
    void loadMembers(selectedClub.id)
    void loadPendingInvitations(selectedClub.id)
  }, [selectedClub?.id])

  useEffect(() => {
    if (!supabase || !selectedClub || !canManageSelectedClub) {
      setInviteSuggestions([])
      return
    }
    const client = supabase

    const term = inviteUsername.trim()
    if (term.replace(/^@/, '').length < 2) {
      setInviteSuggestions([])
      return
    }

    let cancelled = false
    const timeout = window.setTimeout(async () => {
      setIsSearchingInvite(true)
      const { data, error } = await client.rpc('search_public_profiles_for_club_invite', {
        target_club_id: selectedClub.id,
        search_term: term,
      })

      if (!cancelled) {
        if (error) {
          setInviteSuggestions([])
        } else {
          setInviteSuggestions((data ?? []) as InviteSearchProfile[])
        }
        setIsSearchingInvite(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [canManageSelectedClub, inviteUsername, selectedClub?.id])

  const createClub = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return

    if (!canCreateClub) {
      showUpgradeForClubCreation()
      return
    }

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
    if (!supabase || !user || !selectedClub || !canManageSelectedClub) return

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
    if (!supabase || !user || !selectedClub || !canManageSelectedClub) return

    const username = inviteUsername.trim().replace(/^@/, '').toLowerCase()
    if (!username) return

    setIsSaving(true)

    const { data: foundProfiles, error: profileError } = await supabase
      .rpc('find_profile_for_club_invite', {
        target_club_id: selectedClub.id,
        target_username: username,
      })

    const foundProfile = Array.isArray(foundProfiles) ? foundProfiles[0] : foundProfiles

    if (profileError || !foundProfile) {
      toast.error('Usuario no encontrado', { description: 'Revise el nombre de usuario e intente de nuevo.' })
      setIsSaving(false)
      return
    }

    const profile = foundProfile as Pick<Profile, 'id' | 'full_name' | 'username' | 'city' | 'avatar_url' | 'is_public'>

    const { data: existingMember } = await supabase
      .from('club_members')
      .select('id')
      .eq('club_id', selectedClub.id)
      .eq('user_id', profile.id)
      .maybeSingle()

    if (existingMember) {
      toast.info('Ya es miembro', { description: profile.full_name || `@${profile.username}` || 'Este usuario ya pertenece al club.' })
      setInviteUsername('')
      setInviteSuggestions([])
      setIsSaving(false)
      return
    }

    const { data: pendingInvitation } = await supabase
      .from('club_invitations')
      .select('id')
      .eq('club_id', selectedClub.id)
      .eq('invited_user_id', profile.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (pendingInvitation) {
      toast.info('Invitacion pendiente', { description: `${profile.full_name || `@${profile.username}` || 'Este usuario'} ya debe aprobar esta invitacion.` })
      setInviteUsername('')
      setInviteSuggestions([])
      setIsSaving(false)
      return
    }

    const { data: invitation, error: invitationError } = await supabase
      .from('club_invitations')
      .insert({
        club_id: selectedClub.id,
        invited_user_id: profile.id,
        invited_by: user.id,
        status: 'pending',
      })
      .select('id')
      .single()

    if (invitationError || !invitation) {
      toast.error('No pudimos enviar la invitacion', { description: invitationError?.message })
      setIsSaving(false)
      return
    }

    const { error: notificationError } = await supabase.from('notifications').insert({
      user_id: profile.id,
      type: 'club_invite',
      title: 'Invitacion a club',
      message: `El club "${selectedClub.name}" quiere agregarte como miembro.`,
      club_invitation_id: invitation.id,
      scheduled_for: new Date().toISOString(),
    })

    if (notificationError) {
      toast.error('La invitacion se creo, pero no pudimos notificar', { description: notificationError.message })
    } else {
      setInviteUsername('')
      setInviteSuggestions([])
      await loadPendingInvitations(selectedClub.id)
      toast.success('Invitacion enviada', { description: `${profile.full_name || `@${profile.username}` || 'El usuario'} debe aprobarla.` })
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
    <div className="mx-auto max-w-7xl p-3 pb-24 sm:p-4 lg:p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Clubes</h1>
          <p className="text-sm leading-6 text-gray-400 sm:text-base">Crea clubes, administra miembros y prepara espacios privados para rodadas.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="order-2 space-y-4 lg:order-1">
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
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Crear club</h2>
                <Badge className={canCreateClub ? 'bg-moto-orange text-moto-darker' : 'bg-white/10 text-gray-300'}>
                  {canCreateClub ? 'Pro/Premium' : 'Requiere Pro'}
                </Badge>
              </div>
              {!canCreateClub && (
                <div className="mb-3 rounded-xl border border-moto-orange/20 bg-moto-orange/10 p-3 text-sm text-gray-200">
                  Actualice su cuenta para poder crear un club.
                </div>
              )}
              <form className="space-y-3" onSubmit={createClub}>
                <input disabled={!canCreateClub || isLoadingSubscription} className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white disabled:opacity-60" value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} placeholder="Nombre del club" />
                <input disabled={!canCreateClub || isLoadingSubscription} className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white disabled:opacity-60" value={createForm.city} onChange={(event) => setCreateForm({ ...createForm, city: event.target.value })} placeholder="Ciudad" />
                <textarea disabled={!canCreateClub || isLoadingSubscription} className="h-20 w-full resize-none rounded-lg border border-white/10 bg-moto-darker p-2 text-white disabled:opacity-60" value={createForm.description} onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })} placeholder="Descripcion corta" />
                <Button type="submit" disabled={isSaving || isLoadingSubscription} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={(event) => {
                  if (!canCreateClub) {
                    event.preventDefault()
                    showUpgradeForClubCreation()
                  }
                }}>
                  {isSaving || isLoadingSubscription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {canCreateClub ? 'Crear club' : 'Actualizar cuenta'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {selectedClub ? (
          <div className="order-1 space-y-5 lg:order-2">
            <Card className="border-white/5 bg-moto-gray py-0">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="relative mx-auto h-32 w-32 shrink-0 overflow-hidden rounded-2xl bg-moto-darker sm:mx-0">
                    {selectedClub.image_url ? (
                      <button
                        type="button"
                        className="h-full w-full text-left"
                        onClick={() => setViewerImage({ src: selectedClub.image_url!, alt: selectedClub.name })}
                      >
                        <img src={selectedClub.image_url} alt={selectedClub.name} className="h-full w-full object-cover transition hover:scale-[1.01]" />
                      </button>
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
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <h2 className="break-words text-2xl font-bold">{selectedClub.name}</h2>
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
                <CardContent className="p-4 sm:p-5">
                  <h2 className="mb-4 flex items-center gap-2 font-semibold">
                    <Edit3 className="h-4 w-4 text-moto-orange" />
                    Editar informacion
                  </h2>
                  <form className="grid gap-3 md:grid-cols-2" onSubmit={updateClub}>
                    <input className="min-w-0 rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={clubForm.name} onChange={(event) => setClubForm({ ...clubForm, name: event.target.value })} placeholder="Nombre" />
                    <input className="min-w-0 rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={clubForm.city} onChange={(event) => setClubForm({ ...clubForm, city: event.target.value })} placeholder="Ciudad" />
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
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <Users className="h-5 w-5 text-moto-orange" />
                    Miembros
                  </h2>
                  {canManageSelectedClub && (
                    <form className="relative grid gap-2 sm:flex" onSubmit={inviteMember}>
                      <div className="relative min-w-0 flex-1">
                        <input
                          className="w-full rounded-lg border border-white/10 bg-moto-darker px-3 py-2 text-sm text-white"
                          value={inviteUsername}
                          onChange={(event) => setInviteUsername(event.target.value)}
                          placeholder="@usuario"
                        />
                        {(inviteSuggestions.length > 0 || isSearchingInvite) && (
                          <div className="absolute right-0 top-11 z-30 w-full overflow-hidden rounded-xl border border-white/10 bg-moto-darker shadow-xl md:w-80">
                            {isSearchingInvite ? (
                              <div className="flex items-center gap-2 p-3 text-sm text-gray-400">
                                <Loader2 className="h-4 w-4 animate-spin text-moto-orange" />
                                Buscando...
                              </div>
                            ) : (
                              inviteSuggestions.map((suggestion) => {
                                const suggestionName = suggestion.full_name || suggestion.username || 'Motero MotoCare'
                                return (
                                  <button
                                    key={suggestion.id}
                                    type="button"
                                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-white/5"
                                    onClick={() => {
                                      setInviteUsername(suggestion.username ? `@${suggestion.username}` : suggestionName)
                                      setInviteSuggestions([])
                                    }}
                                  >
                                    <Avatar className="h-9 w-9 bg-moto-gray">
                                      <AvatarImage src={suggestion.avatar_url ?? undefined} />
                                      <AvatarFallback>{initials(suggestionName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">{suggestionName}</p>
                                      <p className="truncate text-xs text-gray-500">
                                        @{suggestion.username || 'motocare'}{suggestion.city ? ` · ${suggestion.city}` : ''}
                                      </p>
                                    </div>
                                  </button>
                                )
                              })
                            )}
                          </div>
                        )}
                      </div>
                      <Button type="submit" disabled={isSaving} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark sm:w-auto">
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
                      <div key={member.id} className="flex flex-col gap-3 rounded-xl bg-moto-darker p-3 sm:flex-row sm:items-center sm:justify-between">
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
                        <div className="flex items-center justify-end gap-2">
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

                {canManageSelectedClub && pendingInvitations.length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-semibold">Invitaciones pendientes</h3>
                      <Badge className="bg-yellow-500/15 text-yellow-300">{pendingInvitations.length}</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {pendingInvitations.map((invitation) => {
                        const invitedName = invitation.profiles?.full_name || invitation.profiles?.username || 'Motero MotoCare'
                        return (
                          <div key={invitation.id} className="flex flex-col gap-3 rounded-xl bg-moto-darker p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar className="h-10 w-10 bg-moto-gray">
                                <AvatarImage src={invitation.profiles?.avatar_url ?? undefined} />
                                <AvatarFallback>{initials(invitedName)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate font-medium">{invitedName}</p>
                                <p className="truncate text-xs text-gray-500">@{invitation.profiles?.username || 'motocare'} · pendiente de aprobacion</p>
                              </div>
                            </div>
                            <Badge className="w-fit shrink-0 bg-yellow-500/15 text-yellow-300">Pendiente</Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
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
      <ImageViewer
        src={viewerImage?.src ?? null}
        alt={viewerImage?.alt}
        open={Boolean(viewerImage)}
        onOpenChange={(open) => !open && setViewerImage(null)}
      />
    </div>
  )
}
