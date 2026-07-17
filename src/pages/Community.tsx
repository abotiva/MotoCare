import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Edit3, Flag, Heart, Image as ImageIcon, Loader2, MapPin, MessageCircle, Plus, Route as RouteIcon, Send, Trash2, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImageViewer } from '@/components/ImageViewer'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Club, ClubPostWithAuthor, PostCommentWithAuthor, PostWithAuthor, RoutePlan } from '@/types/database'

type LikeState = Record<string, { count: number; likedByMe: boolean }>
type CommunityMetric = 'posts' | 'mine' | 'routes'
type PublicProfileSummary = {
  id: string
  full_name: string | null
  username: string | null
  city: string | null
  rider_type: string | null
  avatar_url: string | null
  last_seen_at: string | null
}
type PeopleFilter = 'all' | 'online'

type ClubMembershipRow = {
  clubs: Club | null
}

function initials(name: string | null | undefined, username: string | null | undefined) {
  const source = name || username || 'MC'
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const sanitizeFileName = (name: string) => name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')

function relativeDate(value: string) {
  const created = new Date(value).getTime()
  const diffMinutes = Math.max(Math.floor((Date.now() - created) / 60_000), 0)
  if (diffMinutes < 1) return 'Ahora'
  if (diffMinutes < 60) return `${diffMinutes} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} d`
}

const routeStatusLabels: Record<RoutePlan['status'], string> = {
  planned: 'Planeada',
  in_progress: 'En curso',
  completed: 'Realizada',
}

function isOnline(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() <= 5 * 60_000
}

function formatDuration(minutes: number | null) {
  if (!minutes) return 'Sin duración'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
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
  tone: 'orange' | 'green' | 'sky'
  onClick: () => void
}) {
  const tones = {
    orange: 'bg-moto-orange/20 text-moto-orange',
    green: 'bg-green-500/20 text-green-300',
    sky: 'bg-sky-500/20 text-sky-300',
  }

  return (
    <Card className="h-full min-w-0 border-white/5 bg-moto-gray py-0 transition-colors hover:border-moto-orange/40 hover:bg-white/[0.04]">
      <CardContent className="p-0">
        <button
          type="button"
          className="flex w-full min-w-0 flex-col items-center gap-1.5 p-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moto-orange sm:flex-row sm:gap-4 sm:p-4 sm:text-left"
          onClick={onClick}
          aria-label={`Ver detalle de ${label}`}
        >
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
        </button>
      </CardContent>
    </Card>
  )
}

export function Community() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState<PostWithAuthor[]>([])
  const [myRoutes, setMyRoutes] = useState<RoutePlan[]>([])
  const [myClubs, setMyClubs] = useState<Club[]>([])
  const [publicProfiles, setPublicProfiles] = useState<PublicProfileSummary[]>([])
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>('all')
  const [selectedClubId, setSelectedClubId] = useState('')
  const [clubPosts, setClubPosts] = useState<ClubPostWithAuthor[]>([])
  const [clubPostContent, setClubPostContent] = useState('')
  const [selectedClubRouteId, setSelectedClubRouteId] = useState('')
  const [likesByPost, setLikesByPost] = useState<LikeState>({})
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostCommentWithAuthor[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [newPost, setNewPost] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [postImages, setPostImages] = useState<File[]>([])
  const [postImagePreviews, setPostImagePreviews] = useState<string[]>([])
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editRouteId, setEditRouteId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingClubPost, setIsSavingClubPost] = useState(false)
  const [likingPostId, setLikingPostId] = useState<string | null>(null)
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null)
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null)
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<CommunityMetric | null>(null)

  const myPostsCount = useMemo(() => posts.filter((post) => post.author_id === user?.id).length, [posts, user?.id])
  const routePostsCount = useMemo(() => posts.filter((post) => post.route_id).length, [posts])
  const metricPosts = useMemo(() => {
    if (selectedMetric === 'mine') return posts.filter((post) => post.author_id === user?.id)
    if (selectedMetric === 'routes') return posts.filter((post) => post.route_id)
    return posts
  }, [posts, selectedMetric, user?.id])
  const metricCopy = {
    posts: {
      title: 'Detalle de publicaciones',
      description: `${posts.length} publicación${posts.length === 1 ? '' : 'es'} en la comunidad pública.`,
    },
    mine: {
      title: 'Detalle de mis publicaciones',
      description: `${myPostsCount} publicación${myPostsCount === 1 ? '' : 'es'} creada${myPostsCount === 1 ? '' : 's'} por ti.`,
    },
    routes: {
      title: 'Detalle de rutas publicadas',
      description: `${routePostsCount} publicación${routePostsCount === 1 ? '' : 'es'} con una ruta adjunta.`,
    },
  } satisfies Record<CommunityMetric, { title: string; description: string }>
  const selectedClub = useMemo(() => myClubs.find((club) => club.id === selectedClubId) ?? myClubs[0] ?? null, [myClubs, selectedClubId])
  const onlineProfilesCount = useMemo(() => publicProfiles.filter((item) => isOnline(item.last_seen_at)).length, [publicProfiles])
  const visibleProfiles = useMemo(
    () => publicProfiles.filter((item) => peopleFilter === 'all' || isOnline(item.last_seen_at)),
    [peopleFilter, publicProfiles]
  )

  const loadFeed = async () => {
    if (!supabase) return
    setIsLoading(true)

    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles:author_id(full_name, username, city, avatar_url), routes:route_id(id, owner_id, title, origin, destination, distance_km, duration_minutes, start_date, end_date, visibility, status, created_at), post_images(id, post_id, owner_id, image_url, sort_order, created_at)')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      toast.error('No pudimos cargar la comunidad', { description: error.message })
    } else {
      const nextPosts = (data ?? []) as PostWithAuthor[]
      setPosts(nextPosts)
      await loadPostInteractions(nextPosts.map((post) => post.id))
    }

    setIsLoading(false)
  }

  const loadPostInteractions = async (postIds: string[]) => {
    if (!supabase || postIds.length === 0) {
      setLikesByPost({})
      setCommentsByPost({})
      return
    }

    const [likesResult, commentsResult] = await Promise.all([
      supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds),
      supabase
        .from('post_comments')
        .select('*, profiles:author_id(full_name, username, avatar_url)')
        .in('post_id', postIds)
        .order('created_at', { ascending: true }),
    ])

    if (likesResult.error) {
      toast.error('No pudimos cargar los likes', { description: likesResult.error.message })
    } else {
      const nextLikes: LikeState = {}
      postIds.forEach((postId) => {
        nextLikes[postId] = { count: 0, likedByMe: false }
      })
      ;(likesResult.data ?? []).forEach((like) => {
        const current = nextLikes[like.post_id] ?? { count: 0, likedByMe: false }
        nextLikes[like.post_id] = {
          count: current.count + 1,
          likedByMe: current.likedByMe || like.user_id === user?.id,
        }
      })
      setLikesByPost(nextLikes)
    }

    if (commentsResult.error) {
      toast.error('No pudimos cargar los comentarios', { description: commentsResult.error.message })
    } else {
      const nextComments: Record<string, PostCommentWithAuthor[]> = {}
      postIds.forEach((postId) => {
        nextComments[postId] = []
      })
      ;((commentsResult.data ?? []) as PostCommentWithAuthor[]).forEach((comment) => {
        nextComments[comment.post_id] = [...(nextComments[comment.post_id] ?? []), comment]
      })
      setCommentsByPost(nextComments)
    }
  }

  const loadMyRoutes = async () => {
    if (!supabase || !user) return

    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('No pudimos cargar tus rutas', { description: error.message })
    } else {
      setMyRoutes((data ?? []) as RoutePlan[])
    }
  }

  const loadMyClubs = async () => {
    if (!supabase || !user) return

    const { data, error } = await supabase
      .from('club_members')
      .select('clubs:club_id(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('No pudimos cargar tus clubes', { description: error.message })
      return
    }

    const clubs = ((data ?? []) as unknown as ClubMembershipRow[]).map((row) => row.clubs).filter(Boolean) as Club[]
    setMyClubs(clubs)
    const nextSelected = selectedClubId && clubs.some((club) => club.id === selectedClubId) ? selectedClubId : clubs[0]?.id ?? ''
    setSelectedClubId(nextSelected)
    if (nextSelected) void loadClubPosts(nextSelected)
  }

  const loadPublicProfiles = async () => {
    if (!supabase) return

    const { data, error } = await supabase.rpc('community_public_profiles')

    if (error) {
      toast.error('No pudimos cargar usuarios públicos', { description: error.message })
    } else {
      setPublicProfiles((data ?? []) as PublicProfileSummary[])
    }
  }

  const loadClubPosts = async (clubId: string) => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('club_posts')
      .select('*, profiles:author_id(full_name, username, avatar_url), clubs:club_id(name, image_url), routes:route_id(id, owner_id, title, origin, destination, distance_km, duration_minutes, start_date, end_date, visibility, status, created_at)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(40)

    if (error) {
      toast.error('No pudimos cargar mensajes del club', { description: error.message })
    } else {
      setClubPosts((data ?? []) as ClubPostWithAuthor[])
    }
  }

  useEffect(() => {
    void loadFeed()
    void loadPublicProfiles()
    // Public community feed is intentionally refreshed when the authenticated user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    void loadMyRoutes()
    // User routes are intentionally refreshed when the authenticated user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    void loadMyClubs()
    // User clubs are intentionally refreshed when the authenticated user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (selectedClubId) void loadClubPosts(selectedClubId)
    setSelectedClubRouteId('')
  }, [selectedClubId])

  useEffect(() => {
    if (postImages.length === 0) {
      setPostImagePreviews([])
      return
    }

    const objectUrls = postImages.map((file) => URL.createObjectURL(file))
    setPostImagePreviews(objectUrls)

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [postImages])

  const handleSelectImages = (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? [])
    if (selectedFiles.length === 0) return

    if (selectedFiles.some((file) => !file.type.startsWith('image/'))) {
      toast.error('Archivo no válido', { description: 'Seleccione una imagen.' })
      return
    }

    if (selectedFiles.some((file) => file.size > 5 * 1024 * 1024)) {
      toast.error('Imagen muy pesada', { description: 'Use una imagen de máximo 5 MB.' })
      return
    }

    setPostImages((current) => [...current, ...selectedFiles].slice(0, 6))
  }

  const handleCreatePost = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return

    const selectedRoute = myRoutes.find((route) => route.id === selectedRouteId)
    const content = newPost.trim() || (selectedRoute ? `Compartiendo mi ruta: ${selectedRoute.title}` : '')
    if (!content && !selectedRoute && postImages.length === 0) {
      toast.error('Publicación vacia', { description: 'Escriba algo o adjunte una imagen para compartir con la comunidad.' })
      return
    }

    setIsSaving(true)

    if (selectedRoute && selectedRoute.visibility !== 'community') {
      const { error: visibilityError } = await supabase
        .from('routes')
        .update({ visibility: 'community' })
        .eq('id', selectedRoute.id)
        .eq('owner_id', user.id)

      if (visibilityError) {
        toast.error('No pudimos compartir la ruta', { description: visibilityError.message })
        setIsSaving(false)
        return
      }

      setMyRoutes((current) => current.map((route) => (route.id === selectedRoute.id ? { ...route, visibility: 'community' } : route)))
    }

    const imageUrls: string[] = []

    for (const [index, image] of postImages.entries()) {
      const path = `${user.id}/posts/${Date.now()}-${index}-${sanitizeFileName(image.name)}`
      const { error: uploadError } = await supabase.storage.from('motocare-public').upload(path, image, { upsert: false })

      if (uploadError) {
        toast.error('No pudimos subir la imagen', { description: uploadError.message })
        setIsSaving(false)
        return
      }

      const { data: publicUrlData } = supabase.storage.from('motocare-public').getPublicUrl(path)
      imageUrls.push(publicUrlData.publicUrl)
    }

    const { data: insertedPost, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        content: content || 'Compartio imágenes',
        image_url: imageUrls[0] ?? null,
        route_id: selectedRoute?.id ?? null,
      })
      .select('id')
      .single()

    if (error) {
      toast.error('No pudimos publicar', { description: error.message })
    } else if (insertedPost) {
      if (imageUrls.length > 0) {
        const { error: imagesError } = await supabase.from('post_images').insert(
          imageUrls.map((imageUrl, index) => ({
            post_id: insertedPost.id,
            owner_id: user.id,
            image_url: imageUrl,
            sort_order: index,
          }))
        )

        if (imagesError) {
          toast.error('La publicación se creó, pero no pudimos asociar todas las imágenes', { description: imagesError.message })
        }
      }

      const { data: fullPost, error: fetchError } = await supabase
        .from('posts')
        .select('*, profiles:author_id(full_name, username, city, avatar_url), routes:route_id(id, owner_id, title, origin, destination, distance_km, duration_minutes, start_date, end_date, visibility, status, created_at), post_images(id, post_id, owner_id, image_url, sort_order, created_at)')
        .eq('id', insertedPost.id)
        .single()

      if (fetchError || !fullPost) {
        toast.error('Publicación creada, pero no pudimos refrescarla', { description: fetchError?.message })
        await loadFeed()
        setIsSaving(false)
        return
      }

      const createdPost = fullPost as PostWithAuthor
      setPosts((current) => [createdPost, ...current])
      setLikesByPost((current) => ({ ...current, [createdPost.id]: { count: 0, likedByMe: false } }))
      setCommentsByPost((current) => ({ ...current, [createdPost.id]: [] }))
      setNewPost('')
      setSelectedRouteId('')
      setPostImages([])
      toast.success('Publicado en comunidad')
    }

    setIsSaving(false)
  }

  const startEditingPost = (post: PostWithAuthor) => {
    setEditingPostId(post.id)
    setEditContent(post.content)
    setEditRouteId(post.route_id ?? '')
  }

  const cancelEditingPost = () => {
    setEditingPostId(null)
    setEditContent('')
    setEditRouteId('')
  }

  const updatePost = async (post: PostWithAuthor) => {
    if (!supabase || !user) return

    const content = editContent.trim()
    if (!content) {
      toast.error('Publicación vacia', { description: 'La publicación debe tener texto.' })
      return
    }

    setIsSaving(true)

    const { data, error } = await supabase
      .from('posts')
      .update({
        content,
        route_id: editRouteId || null,
      })
      .eq('id', post.id)
      .eq('author_id', user.id)
      .select('*, profiles:author_id(full_name, username, city, avatar_url), routes:route_id(id, owner_id, title, origin, destination, distance_km, duration_minutes, start_date, end_date, visibility, status, created_at), post_images(id, post_id, owner_id, image_url, sort_order, created_at)')
      .single()

    if (error) {
      toast.error('No pudimos editar la publicación', { description: error.message })
    } else if (data) {
      const updatedPost = data as PostWithAuthor
      setPosts((current) => current.map((item) => (item.id === updatedPost.id ? updatedPost : item)))
      cancelEditingPost()
      toast.success('Publicación actualizada')
    }

    setIsSaving(false)
  }

  const deletePost = async (post: PostWithAuthor) => {
    if (!supabase || !user) return
    const confirmed = window.confirm('Eliminar esta publicación? Esta acción no se puede deshacer.')
    if (!confirmed) return

    setDeletingPostId(post.id)

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id)
      .eq('author_id', user.id)

    if (error) {
      toast.error('No pudimos eliminar la publicación', { description: error.message })
    } else {
      setPosts((current) => current.filter((item) => item.id !== post.id))
      setLikesByPost((current) => {
        const next = { ...current }
        delete next[post.id]
        return next
      })
      setCommentsByPost((current) => {
        const next = { ...current }
        delete next[post.id]
        return next
      })
      toast.success('Publicación eliminada')
    }

    setDeletingPostId(null)
  }

  const reportContent = async (targetType: 'post' | 'club_post' | 'user', targetId: string) => {
    if (!supabase || !user) return

    const reason = window.prompt('Motivo del reporte: 1 violencia, 2 acoso, 3 spam, 4 promocion sin Business, 5 otro', '2')
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
      target_type: targetType,
      target_id: targetId,
      reason_category: normalizedReason,
      details,
    })

    if (error) {
      toast.error('No pudimos enviar el reporte', { description: error.message })
    } else {
      toast.success('Reporte enviado', { description: 'El equipo de MotoCare revisara la conducta reportada.' })
    }
  }

  const toggleLike = async (post: PostWithAuthor) => {
    if (!supabase || !user || likingPostId) return

    const current = likesByPost[post.id] ?? { count: 0, likedByMe: false }
    setLikingPostId(post.id)
    setLikesByPost((state) => ({
      ...state,
      [post.id]: {
        count: Math.max((state[post.id]?.count ?? 0) + (current.likedByMe ? -1 : 1), 0),
        likedByMe: !current.likedByMe,
      },
    }))

    const { error } = current.likedByMe
      ? await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      : await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id })

    if (error) {
      setLikesByPost((state) => ({
        ...state,
        [post.id]: current,
      }))
      toast.error('No pudimos actualizar el like', { description: error.message })
    }

    setLikingPostId(null)
  }

  const handleCreateComment = async (event: FormEvent, post: PostWithAuthor) => {
    event.preventDefault()
    if (!supabase || !user) return

    const content = (commentDrafts[post.id] ?? '').trim()
    if (!content) {
      toast.error('Comentario vacío', { description: 'Escribe un comentario antes de enviarlo.' })
      return
    }

    setCommentingPostId(post.id)

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: post.id,
        author_id: user.id,
        content,
      })
      .select('*, profiles:author_id(full_name, username, avatar_url)')
      .single()

    if (error) {
      toast.error('No pudimos comentar', { description: error.message })
    } else if (data) {
      const comment = data as PostCommentWithAuthor
      setCommentsByPost((current) => ({
        ...current,
        [post.id]: [...(current[post.id] ?? []), comment],
      }))
      setCommentDrafts((current) => ({ ...current, [post.id]: '' }))
      setExpandedComments((current) => ({ ...current, [post.id]: true }))
      toast.success('Comentario publicado')
    }

    setCommentingPostId(null)
  }

  const handleCreateClubPost = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user || !selectedClub) return

    const selectedClubRoute = myRoutes.find((route) => route.id === selectedClubRouteId)
    const content = clubPostContent.trim()
    if (!content && !selectedClubRoute) {
      toast.error('Mensaje vacío', { description: 'Escribe un mensaje o adjunta una ruta para el club.' })
      return
    }

    setIsSavingClubPost(true)

    const { data, error } = await supabase
      .from('club_posts')
      .insert({
        club_id: selectedClub.id,
        author_id: user.id,
        content: content || `Compartiendo ruta con el club: ${selectedClubRoute?.title}`,
        route_id: selectedClubRoute?.id ?? null,
      })
      .select('*, profiles:author_id(full_name, username, avatar_url), clubs:club_id(name, image_url), routes:route_id(id, owner_id, title, origin, destination, distance_km, duration_minutes, start_date, end_date, visibility, status, created_at)')
      .single()

    if (error) {
      toast.error('No pudimos publicar en el club', { description: error.message })
    } else if (data) {
      setClubPosts((current) => [data as ClubPostWithAuthor, ...current])
      setClubPostContent('')
      setSelectedClubRouteId('')
      toast.success('Mensaje publicado en el club')
    }

    setIsSavingClubPost(false)
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-moto-orange">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-3 pb-24 sm:p-4 lg:p-6">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Comunidad</h1>
          <p className="text-sm leading-6 text-gray-400 sm:text-base">Comparte rutas, mantenimientos, planes y aprendizajes con otros moteros.</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:mb-5 sm:gap-4">
        <CompactMetricCard icon={Users} label="Publicaciones" mobileLabel="Posts" value={posts.length} tone="orange" onClick={() => setSelectedMetric('posts')} />
        <CompactMetricCard icon={Send} label="Mías" mobileLabel="Mías" value={myPostsCount} tone="green" onClick={() => setSelectedMetric('mine')} />
        <CompactMetricCard icon={RouteIcon} label="Rutas publicadas" mobileLabel="Rutas" value={routePostsCount} tone="sky" onClick={() => setSelectedMetric('routes')} />
      </div>

      <Dialog open={selectedMetric !== null} onOpenChange={(open) => !open && setSelectedMetric(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>{selectedMetric ? metricCopy[selectedMetric].title : 'Detalle de comunidad'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedMetric ? metricCopy[selectedMetric].description : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            {metricPosts.length > 0 ? (
              metricPosts.map((post) => {
                const authorName = post.profiles?.full_name || post.profiles?.username || 'Motero MotoCare Co'
                return (
                  <button
                    key={post.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/5 bg-moto-darker p-4 text-left transition-colors hover:border-moto-orange/40"
                    onClick={() => {
                      setSelectedMetric(null)
                      window.setTimeout(() => document.getElementById(`post-${post.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{authorName}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-400">{post.content || 'Publicación con contenido adjunto'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-gray-400">{relativeDate(post.created_at)}</p>
                      {post.routes && <p className="mt-1 max-w-32 truncate text-xs font-medium text-moto-orange">{post.routes.title}</p>}
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-gray-400">
                No hay publicaciones para mostrar en este detalle.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="public" className="w-full min-w-0">
        <TabsList className="mb-5 grid h-auto w-full grid-cols-2 gap-1 border-white/5 bg-moto-gray p-1">
          <TabsTrigger value="public" className="min-w-0 whitespace-normal px-2 py-2 text-xs leading-tight data-[state=active]:bg-moto-orange data-[state=active]:text-moto-darker sm:text-sm">
            Comunidad pública
          </TabsTrigger>
          <TabsTrigger value="clubs" className="min-w-0 whitespace-normal px-2 py-2 text-xs leading-tight data-[state=active]:bg-moto-orange data-[state=active]:text-moto-darker sm:text-sm">
            Club privado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="public">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="p-3 sm:p-4">
              <form className="flex gap-3 sm:gap-4" onSubmit={handleCreatePost}>
                <Avatar className="hidden h-11 w-11 sm:flex">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{initials(profile?.full_name, profile?.username)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <textarea
                    className="h-24 w-full resize-none rounded-xl border border-white/10 bg-moto-darker p-3 text-sm text-white placeholder:text-gray-500"
                    value={newPost}
                    onChange={(event) => setNewPost(event.target.value)}
                    maxLength={500}
                    placeholder="Comparte una ruta, un tip de mantenimiento o una salida..."
                  />
                  <select
                    className="mt-3 w-full rounded-xl border border-white/10 bg-moto-darker p-3 text-sm text-white"
                    value={selectedRouteId}
                    onChange={(event) => setSelectedRouteId(event.target.value)}
                  >
                    <option value="">Publicar sin adjuntar ruta</option>
                    {myRoutes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.title} - {route.origin || 'Origen'} - {route.destination || 'Destino'} - {routeStatusLabels[route.status ?? 'planned']}
                      </option>
                    ))}
                  </select>
                  {selectedRouteId && (
                    <p className="mt-2 text-xs text-gray-500">
                      Al publicar una ruta privada, quedará visible para la comunidad.
                    </p>
                  )}
                  {postImagePreviews.length > 0 && (
                    <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                      {postImagePreviews.map((preview, index) => (
                        <div key={preview} className="relative overflow-hidden rounded-xl border border-white/10">
                          <img src={preview} alt={`Vista previa ${index + 1}`} className="h-32 w-full object-cover" />
                          <button
                            type="button"
                            className="absolute right-2 top-2 rounded-full bg-moto-darker/90 p-1.5 text-white hover:bg-moto-darker"
                            onClick={() => setPostImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-gray-500">{newPost.length}/500</span>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white">
                        <ImageIcon className="h-4 w-4" />
                        Imágenes
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            handleSelectImages(event.target.files)
                            event.currentTarget.value = ''
                          }}
                        />
                      </label>
                    </div>
                    <Button type="submit" disabled={isSaving} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark sm:w-auto">
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Publicar
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {posts.length > 0 ? (
            posts.map((post) => {
              const author = post.profiles
              const authorName = author?.full_name || author?.username || 'Motero MotoCare Co'
              const authorUsername = author?.username || 'motocare'
              const likeState = likesByPost[post.id] ?? { count: 0, likedByMe: false }
              const comments = commentsByPost[post.id] ?? []
              const commentsExpanded = expandedComments[post.id] ?? false
              const isOwnPost = post.author_id === user?.id
              const postImages = post.post_images?.length
                ? [...post.post_images].sort((a, b) => a.sort_order - b.sort_order).map((image) => image.image_url)
                : post.image_url
                  ? [post.image_url]
                  : []
              return (
                <Card id={`post-${post.id}`} key={post.id} className="scroll-mt-24 overflow-hidden border-white/5 bg-moto-gray py-0">
                  <CardHeader className="p-4 pb-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={author?.avatar_url ?? undefined} />
                          <AvatarFallback>{initials(authorName, authorUsername)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{authorName}</p>
                          <p className="text-xs text-gray-500">
                            @{authorUsername} - {relativeDate(post.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {author?.city && (
                        <Badge className="max-w-full bg-white/10 text-gray-300">
                          <MapPin className="mr-1 h-3 w-3" />
                          <span className="truncate">{author.city}</span>
                        </Badge>
                      )}
                      {isOwnPost && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-white/10" onClick={() => startEditingPost(post)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" disabled={deletingPostId === post.id} className="border-red-500/30 text-red-300 hover:text-red-200" onClick={() => void deletePost(post)}>
                            {deletingPostId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}
                      {!isOwnPost && (
                        <Button size="sm" variant="outline" className="border-yellow-500/30 text-yellow-300 hover:text-yellow-200" onClick={() => void reportContent('post', post.id)}>
                          <Flag className="mr-1 h-4 w-4" />
                          Reportar
                        </Button>
                      )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {editingPostId === post.id ? (
                      <div className="space-y-3">
                        <textarea
                          className="h-24 w-full resize-none rounded-xl border border-white/10 bg-moto-darker p-3 text-sm text-white"
                          value={editContent}
                          onChange={(event) => setEditContent(event.target.value)}
                          maxLength={500}
                        />
                        <select
                          className="w-full rounded-xl border border-white/10 bg-moto-darker p-3 text-sm text-white"
                          value={editRouteId}
                          onChange={(event) => setEditRouteId(event.target.value)}
                        >
                          <option value="">Sin ruta adjunta</option>
                          {myRoutes.map((route) => (
                            <option key={route.id} value={route.id}>
                              {route.title}
                            </option>
                          ))}
                        </select>
                        <div className="grid gap-2 sm:flex sm:justify-end">
                          <Button type="button" variant="outline" className="border-white/10" onClick={cancelEditingPost}>
                            Cancelar
                          </Button>
                          <Button type="button" disabled={isSaving} className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => void updatePost(post)}>
                            Guardar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-100">{post.content}</p>
                    )}
                    {postImages.length > 0 && (
                      <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: postImages.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                        {postImages.map((imageUrl, index) => (
                          <button
                            key={`${post.id}-${imageUrl}`}
                            type="button"
                            className="overflow-hidden rounded-xl text-left"
                            onClick={() => setViewerImage({ src: imageUrl, alt: `Publicación ${index + 1}` })}
                          >
                            <img src={imageUrl} alt={`Publicación ${index + 1}`} className="max-h-96 w-full object-cover transition hover:scale-[1.01]" />
                          </button>
                        ))}
                      </div>
                    )}
                    {post.routes && (
                      <Link to={`/app/routes/${post.routes.id}`} className="mt-4 block rounded-xl border border-white/10 bg-moto-darker p-3 transition hover:border-moto-orange/50 hover:bg-moto-darker/80 sm:p-4">
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 font-semibold">
                              <RouteIcon className="h-4 w-4 text-moto-orange" />
                              {post.routes.title}
                            </p>
                            <p className="mt-1 text-sm text-gray-400">
                              {post.routes.origin || 'Origen sin definir'} - {post.routes.destination || 'Destino sin definir'}
                            </p>
                          </div>
                          <Badge className="w-fit bg-sky-500/15 text-sky-300">
                            {routeStatusLabels[post.routes.status ?? 'planned']}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                          <span>{post.routes.distance_km ? `${post.routes.distance_km.toLocaleString()} km` : 'Sin distancia'}</span>
                          <span>{formatDuration(post.routes.duration_minutes)}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatRouteDates(post.routes)}
                          </span>
                        </div>
                      </Link>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/5 pt-3 text-sm text-gray-400">
                      <button
                        type="button"
                        disabled={likingPostId === post.id}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 transition-colors hover:bg-white/5 hover:text-red-400 disabled:opacity-60"
                        onClick={() => void toggleLike(post)}
                      >
                        <Heart className={`h-5 w-5 ${likeState.likedByMe ? 'fill-current' : ''}`} />
                        {likeState.count > 0 ? likeState.count : 'Me gusta'}
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 transition-colors hover:bg-white/5 hover:text-moto-orange"
                        onClick={() => setExpandedComments((current) => ({ ...current, [post.id]: !commentsExpanded }))}
                      >
                        <MessageCircle className="h-5 w-5" />
                        {comments.length > 0 ? comments.length : 'Comentar'}
                      </button>
                    </div>
                    {commentsExpanded && (
                      <div className="mt-4 space-y-3">
                        {comments.length > 0 ? (
                          comments.map((comment) => {
                            const commentAuthor = comment.profiles
                            const commentName = commentAuthor?.full_name || commentAuthor?.username || 'Motero MotoCare Co'
                            return (
                              <div key={comment.id} className="flex gap-3 rounded-xl bg-moto-darker p-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={commentAuthor?.avatar_url ?? undefined} />
                                  <AvatarFallback>{initials(commentName, commentAuthor?.username)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="font-semibold text-white">{commentName}</span>
                                    <span className="text-gray-500">{relativeDate(comment.created_at)}</span>
                                  </div>
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{comment.content}</p>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <p className="rounded-xl bg-moto-darker p-3 text-sm text-gray-500">Aun no hay comentarios.</p>
                        )}
                        <form className="flex gap-2 sm:gap-3" onSubmit={(event) => void handleCreateComment(event, post)}>
                          <Avatar className="hidden h-9 w-9 sm:flex">
                            <AvatarImage src={profile?.avatar_url ?? undefined} />
                            <AvatarFallback>{initials(profile?.full_name, profile?.username)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-1 gap-2">
                            <input
                              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-moto-darker px-3 py-2 text-sm text-white placeholder:text-gray-500"
                              value={commentDrafts[post.id] ?? ''}
                              onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                              maxLength={300}
                              placeholder="Escriba un comentario..."
                            />
                            <Button type="submit" size="sm" disabled={commentingPostId === post.id} className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
                              {commentingPostId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card className="border-white/5 bg-moto-gray py-0">
              <CardContent className="p-8 text-center text-gray-400">
                <Users className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                Aun no hay publicaciónes. Sea el primero en compartir algo.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Moteros públicos</h2>
                  <p className="text-sm text-gray-400">{onlineProfilesCount} conectados</p>
                </div>
                <Badge className="bg-white/10 text-gray-300">{publicProfiles.length}</Badge>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${peopleFilter === 'all' ? 'bg-moto-orange text-moto-darker' : 'bg-moto-darker text-gray-300 hover:bg-white/5'}`}
                  onClick={() => setPeopleFilter('all')}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${peopleFilter === 'online' ? 'bg-moto-orange text-moto-darker' : 'bg-moto-darker text-gray-300 hover:bg-white/5'}`}
                  onClick={() => setPeopleFilter('online')}
                >
                  Conectados
                </button>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1 lg:max-h-[420px]">
                {visibleProfiles.length > 0 ? (
                  visibleProfiles.map((publicProfile) => {
                    const online = isOnline(publicProfile.last_seen_at)
                    const name = publicProfile.full_name || publicProfile.username || 'Motero MotoCare Co'
                    return (
                      <div key={publicProfile.id} className="flex items-center gap-3 rounded-xl bg-moto-darker p-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={publicProfile.avatar_url ?? undefined} />
                            <AvatarFallback>{initials(publicProfile.full_name, publicProfile.username)}</AvatarFallback>
                          </Avatar>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-moto-darker ${online ? 'bg-green-400' : 'bg-gray-600'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{name}</p>
                          <p className="truncate text-xs text-gray-500">
                            @{publicProfile.username || 'motocare'}{publicProfile.city ? ` - ${publicProfile.city}` : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-xl bg-moto-darker p-4 text-sm text-gray-500">
                    No hay usuarios para este filtro.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="p-5">
              <h2 className="mb-3 font-semibold">Ideas para publicar</h2>
              <div className="space-y-2 text-sm text-gray-400">
                <p>Una ruta recomendada del fin de semana.</p>
                <p>Un mantenimiento que acaba de hacer.</p>
                <p>Una alerta de carretera o clima.</p>
                <p>Una invitación a rodar.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-moto-gray py-0">
            <CardContent className="p-5">
              <h2 className="mb-3 font-semibold">Reglas simples</h2>
              <div className="space-y-2 text-sm text-gray-400">
                <p>Respeto entre moteros.</p>
                <p>No spam ni ventas repetidas.</p>
                <p>Comparte información útil para la comunidad.</p>
              </div>
            </CardContent>
          </Card>
        </div>
          </div>
        </TabsContent>

        <TabsContent value="clubs">
          {myClubs.length > 0 && selectedClub ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <Card className="border-white/5 bg-moto-gray py-0">
                  <CardContent className="p-4">
                    <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-12 w-12 bg-moto-darker">
                          <AvatarImage src={selectedClub.image_url ?? undefined} />
                          <AvatarFallback>{initials(selectedClub.name, selectedClub.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-semibold">{selectedClub.name}</h2>
                          <p className="text-sm text-gray-400">Mensajes privados del club</p>
                        </div>
                      </div>
                      <select
                        className="w-full rounded-xl border border-white/10 bg-moto-darker p-3 text-sm text-white md:w-auto"
                        value={selectedClubId}
                        onChange={(event) => setSelectedClubId(event.target.value)}
                      >
                        {myClubs.map((club) => (
                          <option key={club.id} value={club.id}>
                            {club.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <form className="flex gap-3 sm:gap-4" onSubmit={handleCreateClubPost}>
                      <Avatar className="hidden h-11 w-11 sm:flex">
                        <AvatarImage src={profile?.avatar_url ?? undefined} />
                        <AvatarFallback>{initials(profile?.full_name, profile?.username)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <textarea
                          className="h-24 w-full resize-none rounded-xl border border-white/10 bg-moto-darker p-3 text-sm text-white placeholder:text-gray-500"
                          value={clubPostContent}
                          onChange={(event) => setClubPostContent(event.target.value)}
                          maxLength={500}
                          placeholder="Mensaje privado para los miembros del club..."
                        />
                        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                          <select
                            className="w-full rounded-xl border border-white/10 bg-moto-darker p-3 text-sm text-white"
                            value={selectedClubRouteId}
                            onChange={(event) => setSelectedClubRouteId(event.target.value)}
                          >
                            <option value="">Compartir sin adjuntar ruta</option>
                            {myRoutes.map((route) => (
                              <option key={route.id} value={route.id}>
                                {route.title} - {route.origin || 'Origen'} - {route.destination || 'Destino'} - {routeStatusLabels[route.status ?? 'planned']}
                              </option>
                            ))}
                          </select>
                          <Button asChild variant="outline" className="w-full border-white/10 md:w-auto">
                            <Link to="/app/map">
                              <Plus className="mr-2 h-4 w-4" />
                              Crear ruta
                            </Link>
                          </Button>
                        </div>
                        {selectedClubRouteId && (
                          <div className="mt-3 rounded-xl border border-moto-orange/20 bg-moto-orange/10 p-3 text-xs text-moto-orange">
                            Esta ruta se compartira solo en el club seleccionado.
                          </div>
                        )}
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-xs text-gray-500">{clubPostContent.length}/500</span>
                          <Button type="submit" disabled={isSavingClubPost} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark sm:w-auto">
                            {isSavingClubPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Publicar en club
                          </Button>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {clubPosts.length > 0 ? (
                  clubPosts.map((post) => {
                    const author = post.profiles
                    const authorName = author?.full_name || author?.username || 'Motero MotoCare Co'
                    return (
                      <Card key={post.id} className="border-white/5 bg-moto-gray py-0">
                        <CardContent className="p-4">
                          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={author?.avatar_url ?? undefined} />
                                <AvatarFallback>{initials(authorName, author?.username)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate font-medium">{authorName}</p>
                                <p className="text-xs text-gray-500">@{author?.username || 'motocare'} - {relativeDate(post.created_at)}</p>
                              </div>
                            </div>
                            {post.author_id !== user?.id && (
                              <Button size="sm" variant="outline" className="border-yellow-500/30 text-yellow-300 hover:text-yellow-200" onClick={() => void reportContent('club_post', post.id)}>
                                <Flag className="mr-1 h-4 w-4" />
                                Reportar
                              </Button>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-6 text-gray-100">{post.content}</p>
                          {post.routes && (
                            <Link to={`/app/routes/${post.routes.id}`} className="mt-4 block rounded-xl border border-white/10 bg-moto-darker p-3 transition hover:border-moto-orange/50 hover:bg-moto-darker/80 sm:p-4">
                              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="flex items-center gap-2 truncate font-semibold">
                                    <RouteIcon className="h-4 w-4 text-moto-orange" />
                                    {post.routes.title}
                                  </p>
                                  <p className="mt-1 truncate text-sm text-gray-400">
                                    {post.routes.origin || 'Origen sin definir'} - {post.routes.destination || 'Destino sin definir'}
                                  </p>
                                </div>
                                <Badge className="w-fit shrink-0 bg-white/10 text-gray-300">
                                  {routeStatusLabels[post.routes.status ?? 'planned']}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                <span>{post.routes.distance_km ? `${post.routes.distance_km.toLocaleString()} km` : 'Sin distancia'}</span>
                                <span>{formatDuration(post.routes.duration_minutes)}</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {formatRouteDates(post.routes)}
                                </span>
                              </div>
                            </Link>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })
                ) : (
                  <Card className="border-white/5 bg-moto-gray py-0">
                    <CardContent className="p-8 text-center text-gray-400">
                      <MessageCircle className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                      Aun no hay mensajes privados en este club.
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-4">
                <Card className="border-white/5 bg-moto-gray py-0">
                  <CardContent className="p-5">
                    <h2 className="mb-3 font-semibold">Clubes disponibles</h2>
                    <div className="space-y-2">
                      {myClubs.map((club) => (
                        <button
                          key={club.id}
                          type="button"
                          className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${club.id === selectedClub.id ? 'bg-moto-orange text-moto-darker' : 'bg-moto-darker text-gray-300 hover:bg-white/5'}`}
                          onClick={() => setSelectedClubId(club.id)}
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={club.image_url ?? undefined} />
                            <AvatarFallback>{initials(club.name, club.name)}</AvatarFallback>
                          </Avatar>
                          <span className="truncate text-sm font-medium">{club.name}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/5 bg-moto-gray py-0">
                  <CardContent className="p-5">
                    <h2 className="mb-3 font-semibold">Privacidad</h2>
                    <p className="text-sm leading-6 text-gray-400">
                      Estos mensajes solo se cargan para miembros del club seleccionado.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="border-white/5 bg-moto-gray py-0">
              <CardContent className="p-8 text-center text-gray-400">
                <Users className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                Cree o unase a un club para usar mensajes privados.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      <ImageViewer
        src={viewerImage?.src ?? null}
        alt={viewerImage?.alt}
        open={Boolean(viewerImage)}
        onOpenChange={(open) => !open && setViewerImage(null)}
      />
    </div>
  )
}
