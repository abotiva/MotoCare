import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Camera, ChevronDown, Crown, Edit3, Flag, Loader2, MapPinned, MessageCircle, Plus, Save, Send, Shield, Trash2, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImageViewer } from '@/components/ImageViewer'
import { ClubSelector } from '@/features/clubs/components/ClubSelector'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import type { Club, ClubInvitation, ClubMemberWithProfile, ClubPostWithAuthor, Profile, RoutePlan } from '@/types/database'

type ClubForm = {
  name: string
  city: string
  description: string
  acceptsJoinRequests: boolean
}

type MembershipRow = {
  role: 'owner' | 'admin' | 'member'
  clubs: Club | null
}

type InviteSearchProfile = Pick<Profile, 'id' | 'full_name' | 'username' | 'city' | 'avatar_url' | 'is_premium'>

type ClubInvitationWithProfile = ClubInvitation & {
  profiles: {
    full_name: string | null
    username: string | null
    city: string | null
    avatar_url: string | null
    is_premium: boolean
  } | null
}

type ClubJoinRequestWithProfile = {
  id: string
  club_id: string
  requester_id: string
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  created_at: string
  profiles: Pick<Profile, 'full_name' | 'username' | 'city' | 'avatar_url' | 'is_premium'> | null
}

const emptyClubForm: ClubForm = {
  name: '',
  city: '',
  description: '',
  acceptsJoinRequests: false,
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
  const { user, profile, refreshProfile } = useAuth()
  const userId = user?.id
  const { effectivePlan, isLoadingSubscription } = useSubscription()
  const [clubs, setClubs] = useState<Club[]>([])
  const [discoveredClubs, setDiscoveredClubs] = useState<Club[]>([])
  const [members, setMembers] = useState<ClubMemberWithProfile[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<ClubInvitationWithProfile[]>([])
  const [pendingJoinRequests, setPendingJoinRequests] = useState<ClubJoinRequestWithProfile[]>([])
  const [clubPosts, setClubPosts] = useState<ClubPostWithAuthor[]>([])
  const [userRoutes, setUserRoutes] = useState<RoutePlan[]>([])
  const [selectedClubId, setSelectedClubId] = useState('')
  const [hasManualSelection, setHasManualSelection] = useState(false)
  const [createForm, setCreateForm] = useState<ClubForm>(emptyClubForm)
  const [postContent, setPostContent] = useState('')
  const [postRouteId, setPostRouteId] = useState('')
  const [showDiscoveredClubs, setShowDiscoveredClubs] = useState(false)
  const [requestedClubIds, setRequestedClubIds] = useState<Set<string>>(new Set())
  const [clubForm, setClubForm] = useState<ClubForm>(emptyClubForm)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteSuggestions, setInviteSuggestions] = useState<InviteSearchProfile[]>([])
  const [isSearchingInvite, setIsSearchingInvite] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishingPost, setIsPublishingPost] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showCreateClub, setShowCreateClub] = useState(false)
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null)

  const selectedClub = useMemo(
    () =>
      clubs.find((club) => club.id === selectedClubId) ??
      clubs.find((club) => club.id === profile?.primary_club_id) ??
      clubs[0] ??
      null,
    [clubs, profile?.primary_club_id, selectedClubId]
  )

  const selectedMembership = useMemo(
    () => members.find((member) => member.user_id === user?.id && member.club_id === selectedClub?.id) ?? null,
    [members, selectedClub?.id, user?.id]
  )

  const canManageSelectedClub = selectedClub?.owner_id === user?.id || selectedMembership?.role === 'owner' || selectedMembership?.role === 'admin'
  const ownedClubsCount = useMemo(() => clubs.filter((club) => club.owner_id === user?.id).length, [clubs, user?.id])
  const canCreateClub = effectivePlan === 'premium' && ownedClubsCount < 3

  const showUpgradeForClubCreation = () => {
    if (effectivePlan === 'business') {
      toast.info('Clubes para moteros', { description: 'La licencia Business es para negocios y no permite crear clubes.' })
      return
    }
    if (effectivePlan === 'premium' && ownedClubsCount >= 3) {
      toast.info('Limite de clubes alcanzado', { description: 'La licencia Premium permite crear hasta 3 clubes.' })
      return
    }
    toast.info('Actualice su cuenta para poder crear un club', {
      description: 'Free solo puede unirse por invitación y pertenecer a un club.',
    })
  }

  const loadMembers = useCallback(async (clubId: string) => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('club_members')
      .select('*, profiles:user_id(full_name, username, city, avatar_url, is_public, is_premium)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('No pudimos cargar miembros', { description: error.message })
    } else {
      setMembers((data ?? []) as ClubMemberWithProfile[])
    }
  }, [])

  const loadPendingInvitations = useCallback(async (clubId: string) => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('club_invitations')
      .select('*, profiles:invited_user_id(full_name, username, city, avatar_url, is_premium)')
      .eq('club_id', clubId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('No pudimos cargar invitaciones pendientes', { description: error.message })
    } else {
      setPendingInvitations((data ?? []) as ClubInvitationWithProfile[])
    }
  }, [])

  const loadClubPosts = useCallback(async (clubId: string) => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('club_posts')
      .select('*, profiles:author_id(full_name, username, avatar_url, is_premium), clubs:club_id(name, image_url), routes:route_id(*), club_post_attendees(user_id, created_at, profiles:user_id(full_name, username, avatar_url, is_premium))')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      toast.error('No pudimos cargar los mensajes del club', { description: error.message })
    } else {
      setClubPosts((data ?? []) as unknown as ClubPostWithAuthor[])
    }
  }, [])

  const loadJoinRequests = useCallback(async (clubId: string) => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('club_join_requests')
      .select('*, profiles:requester_id(full_name, username, city, avatar_url, is_premium)')
      .eq('club_id', clubId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (!error) setPendingJoinRequests((data ?? []) as unknown as ClubJoinRequestWithProfile[])
  }, [])

  useEffect(() => {
    if (!supabase || !userId) {
      setUserRoutes([])
      return
    }

    void supabase
      .from('routes')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setUserRoutes((data ?? []) as RoutePlan[]))
  }, [userId])

  const loadClubs = useCallback(async () => {
    if (!supabase || !userId) return
    setIsLoading(true)

    const { data, error } = await supabase
      .from('club_members')
      .select('role, clubs:club_id(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('No pudimos cargar tus clubes', { description: error.message })
      setIsLoading(false)
      return
    }

    const nextClubs = ((data ?? []) as unknown as MembershipRow[]).map((row) => row.clubs).filter(Boolean) as Club[]
    setClubs(nextClubs)
    const nextSelected = selectedClubId && nextClubs.some((club) => club.id === selectedClubId) ? selectedClubId : nextClubs[0]?.id ?? ''
    const primaryClub = nextClubs.find((club) => club.id === profile?.primary_club_id)
    const currentClub = nextClubs.find((club) => club.id === selectedClubId)
    const preferredSelected = (hasManualSelection ? currentClub?.id : primaryClub?.id) ?? nextSelected
    setSelectedClubId(preferredSelected)

    if (preferredSelected) {
      await loadMembers(preferredSelected)
      await loadPendingInvitations(preferredSelected)
    } else {
      setMembers([])
      setPendingInvitations([])
    }

    setIsLoading(false)
  }, [hasManualSelection, loadMembers, loadPendingInvitations, profile?.primary_club_id, selectedClubId, userId])

  useEffect(() => {
    void loadClubs()
  }, [loadClubs])

  useEffect(() => {
    if (!supabase) return
    void supabase
      .from('clubs')
      .select('*')
      .eq('moderation_status', 'active')
      .eq('accepts_join_requests', true)
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => setDiscoveredClubs((data ?? []) as Club[]))
  }, [])

  useEffect(() => {
    if (!supabase || !userId) return
    void supabase
      .from('club_join_requests')
      .select('club_id')
      .eq('requester_id', userId)
      .eq('status', 'pending')
      .then(({ data }) => setRequestedClubIds(new Set((data ?? []).map((request) => request.club_id as string))))
  }, [userId])

  useEffect(() => {
    if (hasManualSelection || clubs.length === 0) return
    const primaryClub = clubs.find((club) => club.id === profile?.primary_club_id)
    if (primaryClub && selectedClubId !== primaryClub.id) {
      setSelectedClubId(primaryClub.id)
    }
  }, [clubs, hasManualSelection, profile?.primary_club_id, selectedClubId])

  useEffect(() => {
    if (!selectedClub) {
      setClubForm(emptyClubForm)
      setInviteSuggestions([])
      setPendingInvitations([])
      setPendingJoinRequests([])
      setClubPosts([])
      return
    }

    setClubForm({
      name: selectedClub.name,
      city: selectedClub.city ?? '',
      description: selectedClub.description ?? '',
      acceptsJoinRequests: selectedClub.accepts_join_requests,
    })
    void loadMembers(selectedClub.id)
    void loadPendingInvitations(selectedClub.id)
    void loadClubPosts(selectedClub.id)
    void loadJoinRequests(selectedClub.id)
  }, [loadClubPosts, loadJoinRequests, loadMembers, loadPendingInvitations, selectedClub])

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
  }, [canManageSelectedClub, inviteUsername, selectedClub])

  const createClub = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !userId) return

    if (!canCreateClub) {
      showUpgradeForClubCreation()
      return
    }

    if (effectivePlan !== 'premium') {
      showUpgradeForClubCreation()
      return
    }

    if (ownedClubsCount >= 3) {
      showUpgradeForClubCreation()
      return
    }

    if (!createForm.name.trim()) {
      toast.error('Nombre requerido', { description: 'El club necesita un nombre.' })
      return
    }

    setIsSaving(true)

    const { data: club, error } = await supabase.rpc('create_club', {
      club_name: createForm.name.trim(),
      club_city: createForm.city.trim() || null,
      club_description: createForm.description.trim() || null,
    })

    if (error || !club) {
      toast.error('No pudimos crear el club', { description: error?.message })
      setIsSaving(false)
      return
    }

    let createdClub = club as Club
    if (createForm.acceptsJoinRequests) {
      const { data: configuredClub } = await supabase
        .from('clubs')
        .update({ accepts_join_requests: true })
        .eq('id', createdClub.id)
        .select('*')
        .single()
      if (configuredClub) createdClub = configuredClub as Club
    }
    setClubs((current) => [createdClub, ...current])
    setHasManualSelection(true)
    setSelectedClubId(createdClub.id)
    if (!profile?.primary_club_id) {
      await setPrimaryClub(createdClub)
    }
    setCreateForm(emptyClubForm)
    setShowCreateClub(false)
    toast.success('Club creado', { description: 'Ya puedes invitar miembros.' })

    setIsSaving(false)
  }

  const publishClubPost = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user || !selectedClub) return

    const content = postContent.trim()
    if (!content && !postRouteId) {
      toast.info('Escribe un mensaje o selecciona una ruta')
      return
    }

    setIsPublishingPost(true)
    const { error } = await supabase.from('club_posts').insert({
      club_id: selectedClub.id,
      author_id: user.id,
      content: content || 'Compartió una ruta con el club.',
      route_id: postRouteId || null,
    })

    if (error) {
      toast.error('No pudimos publicar en el club', { description: error.message })
    } else {
      setPostContent('')
      setPostRouteId('')
      await loadClubPosts(selectedClub.id)
      toast.success('Mensaje publicado para el club')
    }
    setIsPublishingPost(false)
  }

  const deleteClubPost = async (post: ClubPostWithAuthor) => {
    if (!supabase || !selectedClub || !user) return
    const canDelete = post.author_id === user.id || canManageSelectedClub
    if (!canDelete) return

    const { error } = await supabase.from('club_posts').delete().eq('id', post.id).eq('club_id', selectedClub.id)
    if (error) {
      toast.error('No pudimos eliminar el mensaje', { description: error.message })
    } else {
      setClubPosts((current) => current.filter((item) => item.id !== post.id))
    }
  }

  const requestClubMembership = async (club: Club) => {
    if (!supabase) return
    const { error } = await supabase.rpc('request_club_membership', { target_club_id: club.id })
    if (error) {
      toast.error('No pudimos enviar la solicitud', { description: error.message })
    } else {
      setRequestedClubIds((current) => new Set(current).add(club.id))
      toast.success('Solicitud enviada', { description: `Los administradores de ${club.name} podrán revisarla.` })
    }
  }

  const reviewJoinRequest = async (request: ClubJoinRequestWithProfile, decision: 'accepted' | 'declined') => {
    if (!supabase || !selectedClub) return
    const { error } = await supabase.rpc('review_club_join_request', {
      target_request_id: request.id,
      decision,
    })
    if (error) {
      toast.error('No pudimos revisar la solicitud', { description: error.message })
    } else {
      await Promise.all([loadJoinRequests(selectedClub.id), loadMembers(selectedClub.id)])
      toast.success(decision === 'accepted' ? 'Miembro admitido' : 'Solicitud rechazada')
    }
  }

  const toggleRideAttendance = async (post: ClubPostWithAuthor) => {
    if (!supabase || !user || !selectedClub) return
    const isAttending = post.club_post_attendees.some((attendee) => attendee.user_id === user.id)
    const query = isAttending
      ? supabase.from('club_post_attendees').delete().eq('post_id', post.id).eq('user_id', user.id)
      : supabase.from('club_post_attendees').insert({ post_id: post.id, user_id: user.id })
    const { error } = await query

    if (error) {
      toast.error('No pudimos actualizar tu asistencia', { description: error.message })
    } else {
      await loadClubPosts(selectedClub.id)
    }
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
        accepts_join_requests: clubForm.acceptsJoinRequests,
      })
      .eq('id', selectedClub.id)
      .select('*')
      .single()

    if (error) {
      toast.error('No pudimos actualizar el club', { description: error.message })
    } else if (data) {
      const updatedClub = data as Club
      setClubs((current) => current.map((club) => (club.id === updatedClub.id ? updatedClub : club)))
      setDiscoveredClubs((current) => updatedClub.accepts_join_requests
        ? [updatedClub, ...current.filter((club) => club.id !== updatedClub.id)]
        : current.filter((club) => club.id !== updatedClub.id))
      toast.success('Club actualizado')
    }

    setIsSaving(false)
  }

  const uploadClubImage = async (file: File) => {
    if (!supabase || !user || !selectedClub || !canManageSelectedClub) return

    if (!file.type.startsWith('image/')) {
      toast.error('Archivo no válido', { description: 'Seleccione una imagen.' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagen muy pesada', { description: 'Use una imagen de máximo 5 MB.' })
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

    const profile = foundProfile as Pick<Profile, 'id' | 'full_name' | 'username' | 'city' | 'avatar_url' | 'is_public' | 'is_premium'>

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
      toast.info('Invitación pendiente', { description: `${profile.full_name || `@${profile.username}` || 'Este usuario'} ya debe aprobar esta invitación.` })
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
      toast.error('No pudimos enviar la invitación', { description: invitationError?.message })
      setIsSaving(false)
      return
    }

    const { error: notificationError } = await supabase.from('notifications').insert({
      user_id: profile.id,
      type: 'club_invite',
      title: 'Invitación a club',
      message: `El club "${selectedClub.name}" quiere agregarte como miembro.`,
      club_invitation_id: invitation.id,
      scheduled_for: new Date().toISOString(),
    })

    if (notificationError) {
      toast.error('La invitación se creó, pero no pudimos notificar', { description: notificationError.message })
    } else {
      setInviteUsername('')
      setInviteSuggestions([])
      await loadPendingInvitations(selectedClub.id)
      toast.success('Invitación enviada', { description: `${profile.full_name || `@${profile.username}` || 'El usuario'} debe aprobarla.` })
    }

    setIsSaving(false)
  }

  const setPrimaryClub = async (club: Club) => {
    if (!supabase || !user) return

    const { error } = await supabase
      .from('profiles')
      .update({ primary_club_id: club.id })
      .eq('id', user.id)

    if (error) {
      toast.error('No pudimos definir el club predeterminado', { description: error.message })
    } else {
      await refreshProfile()
      setSelectedClubId(club.id)
      toast.success('Club predeterminado actualizado')
    }
  }

  const deleteClub = async (club: Club) => {
    if (!supabase || !user || club.owner_id !== user.id) return

    const confirmed = window.confirm(`¿Eliminar el club "${club.name}"? Esta acción no se puede deshacer.`)
    if (!confirmed) return

    const { error } = await supabase
      .from('clubs')
      .delete()
      .eq('id', club.id)
      .eq('owner_id', user.id)

    if (error) {
      toast.error('No pudimos eliminar el club', { description: error.message })
      return
    }

    const remainingClubs = clubs.filter((item) => item.id !== club.id)
    setClubs(remainingClubs)
    const nextSelected = remainingClubs.find((item) => item.id === profile?.primary_club_id)?.id ?? remainingClubs[0]?.id ?? ''
    setSelectedClubId(nextSelected)
    setMembers([])
    setPendingInvitations([])

    if (profile?.primary_club_id === club.id) {
      await supabase.from('profiles').update({ primary_club_id: null }).eq('id', user.id)
      await refreshProfile()
    }

    toast.success('Club eliminado')
  }

  const reportClub = async (club: Club) => {
    if (!supabase || !user) return

    const reason = window.prompt('Motivo del reporte: 1 violencia, 2 acoso, 3 spam, 4 promocion sin Business, 5 otro', '3')
    const reasonMap = {
      '1': 'violence',
      '2': 'harassment',
      '3': 'spam',
      '4': 'promotion_without_business',
      '5': 'other',
    } as const
    const normalizedReason = reasonMap[reason?.trim() as keyof typeof reasonMap]
    if (!normalizedReason) {
      toast.error('Motivo no válido', { description: 'Seleccione un número del 1 al 5.' })
      return
    }

    const details = window.prompt('Detalle breve para moderación:', '') ?? ''
    const { error } = await supabase.rpc('submit_moderation_report', {
      target_type: 'club',
      target_id: club.id,
      reason_category: normalizedReason,
      details,
    })

    if (error) {
      toast.error('No pudimos enviar el reporte', { description: error.message })
    } else {
      toast.success('Reporte enviado', { description: 'El equipo de MotoCare revisara este club.' })
    }
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
          <p className="text-sm leading-6 text-gray-400 sm:text-base">Descubre comunidades, administra tus clubes y organiza próximas rodadas.</p>
        </div>
        <Button
          type="button"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-full bg-moto-orange text-moto-darker shadow-lg shadow-moto-orange/20 hover:bg-moto-orange-dark"
          aria-label="Crear un club nuevo"
          title="Crear un club nuevo"
          onClick={() => {
            if (canCreateClub) setShowCreateClub(true)
            else showUpgradeForClubCreation()
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <section className="mb-6" aria-labelledby="discover-clubs-title">
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-white/5 bg-moto-gray p-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="discover-clubs-title" className="text-lg font-bold">Descubre clubes</h2>
              {discoveredClubs.length > 0 && <Badge className="bg-moto-orange/15 text-moto-orange">{discoveredClubs.length}</Badge>}
            </div>
            <p className="text-sm text-gray-400">Clubes que actualmente aceptan solicitudes de ingreso.</p>
          </div>
          <Button type="button" variant="outline" className="shrink-0 border-white/10" aria-expanded={showDiscoveredClubs} aria-controls="discover-clubs-list" onClick={() => setShowDiscoveredClubs((current) => !current)}>
            {showDiscoveredClubs ? 'Ocultar clubes' : 'Ver clubes'}
            <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showDiscoveredClubs ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        {showDiscoveredClubs && (discoveredClubs.length ? (
          <div id="discover-clubs-list" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {discoveredClubs.map((club) => (
              <article key={club.id} className="rounded-2xl border border-white/5 bg-moto-gray p-4">
                <div className="flex items-center gap-3"><Avatar className="h-11 w-11"><AvatarImage src={club.image_url ?? undefined} /><AvatarFallback>{initials(club.name)}</AvatarFallback></Avatar><div className="min-w-0"><h3 className="truncate font-semibold">{club.name}</h3><p className="truncate text-sm text-gray-500">{club.city || 'Ciudad sin definir'}</p></div></div>
                <p className="mt-3 line-clamp-2 text-sm text-gray-400">{club.description || 'Comunidad motera en MotoCare.'}</p>
                <Button
                  type="button"
                  size="sm"
                  disabled={requestedClubIds.has(club.id) || clubs.some((item) => item.id === club.id)}
                  className="mt-4 w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark"
                  onClick={() => void requestClubMembership(club)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {clubs.some((item) => item.id === club.id) ? 'Ya eres miembro' : requestedClubIds.has(club.id) ? 'Solicitud enviada' : 'Solicitar ingreso'}
                </Button>
              </article>
            ))}
          </div>
        ) : <div id="discover-clubs-list" className="mt-3 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-400">No hay clubes aceptando solicitudes en este momento.</div>)}
      </section>

      {clubs.length > 0 ? (
        <ClubSelector
          clubs={clubs}
          selectedId={selectedClub?.id ?? null}
          primaryId={profile?.primary_club_id}
          onSelect={(club) => {
            setHasManualSelection(true)
            setSelectedClubId(club.id)
          }}
          onSetPrimary={(club) => void setPrimaryClub(club)}
        />
      ) : (
        <div className="mb-6 rounded-xl border border-white/5 bg-moto-gray p-4 text-sm text-gray-400">
          <p className="font-semibold text-white">Encuentra tu comunidad</p>
          <p className="mt-1">Descubre clubes, conoce otros moteros y participa en próximas salidas.</p>
        </div>
      )}

      {selectedClub ? (
          <div className="space-y-5">
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
                      {selectedClub.id === profile?.primary_club_id && <Badge className="bg-green-500/15 text-green-300">Predeterminado</Badge>}
                    </div>
                    <p className="text-gray-400">{selectedClub.city || 'Ciudad sin definir'}</p>
                    <p className="mt-3 text-sm leading-6 text-gray-300">{selectedClub.description || 'Club sin descripción todavía.'}</p>
                    {(canManageSelectedClub || selectedClub.id !== profile?.primary_club_id) && (
                      <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                        {selectedClub.id !== profile?.primary_club_id && (
                          <Button size="sm" variant="outline" className="border-white/10" onClick={() => void setPrimaryClub(selectedClub)}>
                            <Crown className="mr-2 h-4 w-4" />
                            Definir como principal
                          </Button>
                        )}
                        {selectedClub.owner_id === user?.id && (
                          <Button size="sm" variant="outline" className="border-red-500/30 text-red-300 hover:text-red-200" onClick={() => void deleteClub(selectedClub)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar club
                          </Button>
                        )}
                      </div>
                    )}
                    {selectedClub.owner_id !== user?.id && (
                      <div className="mt-4 flex justify-center sm:justify-start">
                        <Button size="sm" variant="outline" className="border-yellow-500/30 text-yellow-300 hover:text-yellow-200" onClick={() => void reportClub(selectedClub)}>
                          <Flag className="mr-2 h-4 w-4" />
                          Reportar club
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-moto-gray py-0">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <MessageCircle className="h-5 w-5 text-moto-orange" />
                    Muro exclusivo del club
                  </h2>
                  <p className="mt-1 text-sm text-gray-400">Solo los miembros pueden ver y publicar este contenido.</p>
                </div>

                <form className="rounded-2xl border border-white/5 bg-moto-darker p-3 sm:p-4" onSubmit={publishClubPost}>
                  <textarea
                    className="h-24 w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
                    value={postContent}
                    onChange={(event) => setPostContent(event.target.value)}
                    placeholder="Escribe un mensaje para los miembros..."
                  />
                  <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center">
                    <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-400">
                      <MapPinned className="h-4 w-4 shrink-0 text-moto-orange" />
                      <select
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-moto-gray px-3 py-2 text-white"
                        value={postRouteId}
                        onChange={(event) => setPostRouteId(event.target.value)}
                      >
                        <option value="">Sin ruta adjunta</option>
                        {userRoutes.map((route) => (
                          <option key={route.id} value={route.id}>{route.title}</option>
                        ))}
                      </select>
                    </label>
                    <Button type="submit" disabled={isPublishingPost} className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
                      {isPublishingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Publicar
                    </Button>
                  </div>
                </form>

                <div className="mt-4 space-y-3">
                  {clubPosts.length > 0 ? clubPosts.map((post) => {
                    const authorName = post.profiles?.full_name || post.profiles?.username || 'Motero MotoCare'
                    return (
                      <article key={post.id} className="rounded-2xl border border-white/5 bg-moto-darker p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar premium={post.profiles?.is_premium} className="h-10 w-10 bg-moto-gray">
                              <AvatarImage src={post.profiles?.avatar_url ?? undefined} />
                              <AvatarFallback>{initials(authorName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{authorName}</p>
                              <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>
                          </div>
                          {(post.author_id === user?.id || canManageSelectedClub) && (
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-red-300" aria-label="Eliminar mensaje" onClick={() => void deleteClubPost(post)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-200">{post.content}</p>
                        {post.routes && (
                          <div className="mt-4 rounded-xl border border-moto-orange/20 bg-moto-orange/10 p-3">
                            <Link to={`/app/routes/${post.routes.id}`} className="flex items-center gap-3">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-moto-orange text-moto-darker">
                                <MapPinned className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-white">{post.routes.title}</p>
                                <p className="truncate text-xs text-gray-400">{post.routes.origin || 'Origen por definir'} → {post.routes.destination || 'Destino por definir'}</p>
                              </div>
                            </Link>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-moto-orange/15 pt-3">
                              <div className="flex min-w-0 items-center">
                                {post.club_post_attendees.slice(0, 5).map((attendee) => {
                                  const attendeeName = attendee.profiles?.full_name || attendee.profiles?.username || 'Motero'
                                  return <Avatar key={attendee.user_id} premium={attendee.profiles?.is_premium} title={attendeeName} className="-ml-1 h-7 w-7 border-2 border-moto-darker first:ml-0"><AvatarImage src={attendee.profiles?.avatar_url ?? undefined} /><AvatarFallback className="text-[9px]">{initials(attendeeName)}</AvatarFallback></Avatar>
                                })}
                                <span className="ml-2 text-xs text-gray-300">{post.club_post_attendees.length} {post.club_post_attendees.length === 1 ? 'miembro va' : 'miembros van'}</span>
                              </div>
                              <Button type="button" size="sm" variant={post.club_post_attendees.some((attendee) => attendee.user_id === user?.id) ? 'default' : 'outline'} className={post.club_post_attendees.some((attendee) => attendee.user_id === user?.id) ? 'bg-moto-orange text-moto-darker' : 'border-moto-orange/30'} onClick={() => void toggleRideAttendance(post)}>
                                {post.club_post_attendees.some((attendee) => attendee.user_id === user?.id) ? '✓ Voy' : 'Me apunto'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </article>
                    )
                  }) : (
                    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-400">
                      Sé el primero en compartir un mensaje o una ruta con el club.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {canManageSelectedClub && (
              <Card className="border-white/5 bg-moto-gray py-0">
                <CardContent className="p-4 sm:p-5">
                  <h2 className="mb-4 flex items-center gap-2 font-semibold">
                    <Edit3 className="h-4 w-4 text-moto-orange" />
                    Editar información
                  </h2>
                  <form className="grid gap-3 md:grid-cols-2" onSubmit={updateClub}>
                    <input className="min-w-0 rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={clubForm.name} onChange={(event) => setClubForm({ ...clubForm, name: event.target.value })} placeholder="Nombre" />
                    <input className="min-w-0 rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={clubForm.city} onChange={(event) => setClubForm({ ...clubForm, city: event.target.value })} placeholder="Ciudad" />
                    <textarea className="h-20 resize-none rounded-lg border border-white/10 bg-moto-darker p-2 text-white md:col-span-2" value={clubForm.description} onChange={(event) => setClubForm({ ...clubForm, description: event.target.value })} placeholder="Descripcion" />
                    <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-moto-darker p-3 text-sm text-gray-200 md:col-span-2">
                      <input type="checkbox" checked={clubForm.acceptsJoinRequests} onChange={(event) => setClubForm({ ...clubForm, acceptsJoinRequests: event.target.checked })} className="h-4 w-4 accent-moto-orange" />
                      Aceptar solicitudes de ingreso
                    </label>
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
                                const suggestionName = suggestion.full_name || suggestion.username || 'Motero MotoCare Co'
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
                                    <Avatar premium={suggestion.is_premium} className="h-9 w-9 bg-moto-gray">
                                      <AvatarImage src={suggestion.avatar_url ?? undefined} />
                                      <AvatarFallback>{initials(suggestionName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">{suggestionName}</p>
                                      <p className="truncate text-xs text-gray-500">
                                        @{suggestion.username || 'motocare'}{suggestion.city ? ` - ${suggestion.city}` : ''}
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
                    const memberName = member.profiles?.full_name || member.profiles?.username || 'Motero MotoCare Co'
                    return (
                      <div key={member.id} className="flex flex-col gap-3 rounded-xl bg-moto-darker p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar premium={member.profiles?.is_premium} className="h-10 w-10 bg-moto-gray">
                            <AvatarImage src={member.profiles?.avatar_url ?? undefined} />
                            <AvatarFallback>{initials(memberName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{memberName}</p>
                            <p className="truncate text-xs text-gray-500">@{member.profiles?.username || 'motocare'} - {roleLabel(member.role)}</p>
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

                {canManageSelectedClub && pendingJoinRequests.length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-semibold">Solicitudes de ingreso</h3>
                      <Badge className="bg-moto-orange/15 text-moto-orange">{pendingJoinRequests.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {pendingJoinRequests.map((request) => {
                        const requesterName = request.profiles?.full_name || request.profiles?.username || 'Motero MotoCare'
                        return (
                          <div key={request.id} className="flex flex-col gap-3 rounded-xl bg-moto-darker p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar premium={request.profiles?.is_premium} className="h-10 w-10 bg-moto-gray"><AvatarImage src={request.profiles?.avatar_url ?? undefined} /><AvatarFallback>{initials(requesterName)}</AvatarFallback></Avatar>
                              <div className="min-w-0"><p className="truncate font-medium">{requesterName}</p><p className="truncate text-xs text-gray-500">{request.profiles?.city || 'Ciudad sin definir'}</p></div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-moto-orange text-moto-darker" onClick={() => void reviewJoinRequest(request, 'accepted')}>Aceptar</Button>
                              <Button size="sm" variant="outline" className="border-white/10" onClick={() => void reviewJoinRequest(request, 'declined')}>Rechazar</Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {canManageSelectedClub && pendingInvitations.length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-semibold">Invitaciones pendientes</h3>
                      <Badge className="bg-yellow-500/15 text-yellow-300">{pendingInvitations.length}</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {pendingInvitations.map((invitation) => {
                        const invitedName = invitation.profiles?.full_name || invitation.profiles?.username || 'Motero MotoCare Co'
                        return (
                          <div key={invitation.id} className="flex flex-col gap-3 rounded-xl bg-moto-darker p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar premium={invitation.profiles?.is_premium} className="h-10 w-10 bg-moto-gray">
                                <AvatarImage src={invitation.profiles?.avatar_url ?? undefined} />
                                <AvatarFallback>{initials(invitedName)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate font-medium">{invitedName}</p>
                                <p className="truncate text-xs text-gray-500">@{invitation.profiles?.username || 'motocare'} - pendiente de aprobación</p>
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
      <Dialog open={showCreateClub} onOpenChange={(open) => {
        setShowCreateClub(open)
        if (!open && !isSaving) setCreateForm(emptyClubForm)
      }}>
        <DialogContent className="max-w-md border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-moto-orange/15 text-moto-orange">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Nuevo club</DialogTitle>
                <Badge className="mt-2 bg-moto-orange/15 text-moto-orange">{ownedClubsCount}/3 creados</Badge>
              </div>
            </div>
            <DialogDescription className="text-left text-gray-400">
              Dale una identidad a tu comunidad. Podrás agregar una imagen e invitar miembros después de crearla.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={createClub}>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Nombre del club</span>
              <input autoFocus className="w-full rounded-xl border border-white/10 bg-moto-darker px-3 py-2.5 text-white outline-none focus:border-moto-orange" value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} placeholder="Ej. Moteros de Bogotá" />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Ciudad</span>
              <input className="w-full rounded-xl border border-white/10 bg-moto-darker px-3 py-2.5 text-white outline-none focus:border-moto-orange" value={createForm.city} onChange={(event) => setCreateForm({ ...createForm, city: event.target.value })} placeholder="Ciudad principal" />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Descripción</span>
              <textarea className="h-24 w-full resize-none rounded-xl border border-white/10 bg-moto-darker px-3 py-2.5 text-white outline-none focus:border-moto-orange" value={createForm.description} onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })} placeholder="¿Qué identifica a este club?" />
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-moto-darker p-3 text-sm">
              <input type="checkbox" checked={createForm.acceptsJoinRequests} onChange={(event) => setCreateForm({ ...createForm, acceptsJoinRequests: event.target.checked })} className="mt-0.5 h-4 w-4 accent-moto-orange" />
              <span><strong className="block text-white">Aceptar solicitudes de ingreso</strong><span className="text-gray-400">Los administradores decidirán quién entra al club.</span></span>
            </label>
            <Button type="submit" disabled={isSaving || isLoadingSubscription} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Crear club
            </Button>
          </form>
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
