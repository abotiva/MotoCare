import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { 
  Search, Filter, Grid3X3, List, MapPin, Heart, MessageCircle, 
  Star, TrendingUp, Bike, Wrench, Shirt, Clock3, Lock, Store, MapPinned, PackageCheck, Sparkles,
  AlertCircle, LoaderCircle, ImagePlus, Trash2, CheckCircle2, Inbox, Send, Plus, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type {
  MarketplaceCategory,
  MarketplaceCondition,
  MarketplaceListingWithSeller,
  MarketplaceMessage,
  MarketplacePublicationQuota,
} from '@/types/database'

const categories = [
  { id: 'all', name: 'Todo', icon: Grid3X3 },
  { id: 'motorcycles', name: 'Motos', icon: Bike },
  { id: 'parts', name: 'Repuestos', icon: Wrench },
  { id: 'gear', name: 'Equipamiento', icon: Shirt },
  { id: 'services', name: 'Servicios', icon: Store },
  { id: 'premium-routes', name: 'Rutas Premium', icon: MapPinned },
  { id: 'packs', name: 'Packs', icon: PackageCheck },
]

type StoreListing = {
  id: string
  title: string
  price: number
  originalPrice?: number
  condition: string
  mileage?: string
  location: string
  image: string
  seller: { name: string; rating: number; verified: boolean }
  featured: boolean
  likes: number
  category: MarketplaceCategory
  description?: string
  images?: string[]
  sellerId?: string
  status?: 'active' | 'sold'
}

type ListingForm = {
  title: string
  description: string
  price: string
  category: MarketplaceCategory
  condition: MarketplaceCondition
  mileage_km: string
  city: string
  department: string
}

const emptyListingForm: ListingForm = {
  title: '',
  description: '',
  price: '',
  category: 'motorcycles',
  condition: 'used_good',
  mileage_km: '',
  city: '',
  department: '',
}

const MARKETPLACE_PAGE_SIZE = 24

async function optimizeMarketplaceImage(file: File) {
  const bitmap = await createImageBitmap(file)
  const maxDimension = 1600
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return file
  }
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82))
  if (!blob || blob.size >= file.size) return file
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', {
    type: 'image/webp',
    lastModified: file.lastModified,
  })
}

const demoListings: StoreListing[] = [
  {
    id: 'demo-1',
    title: 'Honda CB500F 2022',
    price: 18500000,
    originalPrice: 22000000,
    condition: 'Usado',
    mileage: '15000 km',
    location: 'Bogotá, Cundinamarca',
    image: '/hero-motorcycle.jpg',
    seller: { name: 'Andrés Pérez', rating: 4.8, verified: true },
    featured: true,
    likes: 45,
    category: 'motorcycles'
  },
  {
    id: 'demo-2',
    title: 'Yamaha MT-07 2023',
    price: 42000000,
    condition: 'Nuevo',
    mileage: '0 km',
    location: 'Medellín, Antioquia',
    image: '/feature-marketplace.jpg',
    seller: { name: 'MotoStore Colombia', rating: 4.9, verified: true },
    featured: true,
    likes: 128,
    category: 'motorcycles'
  },
  {
    id: 'demo-3',
    title: 'Kit de frenos Brembo',
    price: 850000,
    originalPrice: 1200000,
    condition: 'Nuevo',
    location: 'Cali, Valle del Cauca',
    image: '/feature-maintenance.jpg',
    seller: { name: 'Repuestos MotoPro', rating: 4.7, verified: true },
    featured: false,
    likes: 23,
    category: 'parts'
  },
  {
    id: 'demo-4',
    title: 'Chamarra Alpinestars GP Plus',
    price: 1200000,
    condition: 'Usado - Como nuevo',
    location: 'Bogotá, Cundinamarca',
    image: '/community.jpg',
    seller: { name: 'Carlos R.', rating: 4.5, verified: false },
    featured: false,
    likes: 12,
    category: 'gear'
  },
  {
    id: 'demo-5',
    title: 'Kawasaki Ninja 400',
    price: 28000000,
    condition: 'Usado',
    mileage: '8000 km',
    location: 'Barranquilla, Atlántico',
    image: '/app-mockup.jpg',
    seller: { name: 'María G.', rating: 4.9, verified: true },
    featured: false,
    likes: 67,
    category: 'motorcycles'
  },
  {
    id: 'demo-6',
    title: 'Escape Akrapovič Slip-on',
    price: 2500000,
    condition: 'Nuevo',
    location: 'Pereira, Risaralda',
    image: '/feature-gps.jpg',
    seller: { name: 'Tuning Motos', rating: 4.6, verified: true },
    featured: false,
    likes: 34,
    category: 'parts'
  },
  {
    id: 'demo-7',
    title: 'Nevado del Ruiz Adventure',
    price: 24900,
    condition: 'Ruta Premium',
    mileage: '168 km',
    location: 'Manizales - Murillo - Líbano',
    image: '/feature-gps.jpg',
    seller: { name: 'MotoCare Experiences', rating: 5.0, verified: true },
    featured: true,
    likes: 91,
    category: 'premium-routes'
  },
  {
    id: 'demo-8',
    title: 'Pack Eje Cafetero',
    price: 59900,
    condition: 'Pack Premium',
    mileage: '5 rutas',
    location: 'Salento, Filandia, Cocora y Buenavista',
    image: '/community.jpg',
    seller: { name: 'MotoCare Experiences', rating: 5.0, verified: true },
    featured: false,
    likes: 76,
    category: 'packs'
  },
  {
    id: 'demo-9',
    title: 'Revisión pre-viaje Adventure',
    price: 120000,
    condition: 'Servicio',
    location: 'Bogotá, Cundinamarca',
    image: '/feature-maintenance.jpg',
    seller: { name: 'Taller Aliado MotoCare', rating: 4.8, verified: true },
    featured: false,
    likes: 18,
    category: 'services'
  },
]

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

const conditionLabels: Record<MarketplaceCondition, string> = {
  new: 'Nuevo',
  used_like_new: 'Usado - Como nuevo',
  used_good: 'Usado - Buen estado',
  used_fair: 'Usado - Estado aceptable',
  service: 'Servicio',
  digital: 'Producto digital',
}

function toStoreListing(listing: MarketplaceListingWithSeller): StoreListing {
  const sellerName = listing.profiles?.full_name || listing.profiles?.username || 'Usuario MotoCare'
  const images = [...(listing.marketplace_listing_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => item.image_url)
  const image = images[0]

  return {
    id: listing.id,
    title: listing.title,
    price: Number(listing.price),
    originalPrice: listing.original_price === null ? undefined : Number(listing.original_price),
    condition: conditionLabels[listing.condition],
    mileage: listing.mileage_km === null ? undefined : `${listing.mileage_km.toLocaleString('es-CO')} km`,
    location: [listing.city, listing.department].filter(Boolean).join(', ') || 'Colombia',
    image: image || '/feature-marketplace.jpg',
    seller: {
      name: sellerName,
      rating: 5,
      verified: listing.seller_type === 'business',
    },
    featured: listing.is_featured,
    likes: 0,
    category: listing.category,
    description: listing.description,
    images,
    sellerId: listing.seller_id,
    status: listing.status === 'sold' ? 'sold' : 'active',
  }
}

export function Marketplace() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { effectivePlan, isLoadingSubscription } = useSubscription()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [listings, setListings] = useState<StoreListing[]>(isSupabaseConfigured ? [] : demoListings)
  const [quota, setQuota] = useState<MarketplacePublicationQuota | null>(null)
  const [isLoadingListings, setIsLoadingListings] = useState(isSupabaseConfigured)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreateListing, setShowCreateListing] = useState(false)
  const [isSellActionExpanded, setIsSellActionExpanded] = useState(false)
  const [listingForm, setListingForm] = useState<ListingForm>(emptyListingForm)
  const [isSavingListing, setIsSavingListing] = useState(false)
  const [listingImages, setListingImages] = useState<File[]>([])
  const [listingImagePreviews, setListingImagePreviews] = useState<string[]>([])
  const [imageInputKey, setImageInputKey] = useState(0)
  const [selectedListing, setSelectedListing] = useState<StoreListing | null>(null)
  const [marketplacePage, setMarketplacePage] = useState(0)
  const [hasMoreListings, setHasMoreListings] = useState(false)
  const [contactMessage, setContactMessage] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isMarkingSold, setIsMarkingSold] = useState(false)
  const [showInbox, setShowInbox] = useState(false)
  const [marketplaceMessages, setMarketplaceMessages] = useState<MarketplaceMessage[]>([])
  const [isLoadingInbox, setIsLoadingInbox] = useState(false)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    setMarketplacePage(0)
    if (isSupabaseConfigured) setListings([])
  }, [user?.id])

  useEffect(() => {
    if (!supabase) {
      setListings(demoListings)
      setIsLoadingListings(false)
      return
    }

    const client = supabase
    let isMounted = true

    const loadMarketplace = async () => {
      setIsLoadingListings(true)
      setLoadError(null)
      const listingsRequest = client
        .from('marketplace_listings')
        .select(`
          *,
          profiles:seller_id(full_name, username, city, avatar_url),
          marketplace_listing_images(*)
        `)
        .eq('status', 'active')
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
        .range(
          marketplacePage * MARKETPLACE_PAGE_SIZE,
          marketplacePage * MARKETPLACE_PAGE_SIZE + MARKETPLACE_PAGE_SIZE - 1
        )

      const [listingsResult, quotaResult] = await Promise.all([
        listingsRequest,
        user && marketplacePage === 0
          ? client.rpc('marketplace_publication_quota')
          : Promise.resolve({ data: null, error: null }),
      ])
      if (!isMounted) return

      if (listingsResult.error) {
        setLoadError(listingsResult.error.message)
        if (marketplacePage === 0) setListings([])
      } else {
        const nextListings = ((listingsResult.data ?? []) as MarketplaceListingWithSeller[]).map(toStoreListing)
        setListings((current) => marketplacePage === 0 ? nextListings : [...current, ...nextListings])
        setHasMoreListings(nextListings.length === MARKETPLACE_PAGE_SIZE)
      }

      if (marketplacePage === 0 && !quotaResult.error && quotaResult.data) {
        const row = Array.isArray(quotaResult.data) ? quotaResult.data[0] : quotaResult.data
        setQuota((row as MarketplacePublicationQuota | undefined) ?? null)
      } else {
        setQuota(null)
      }
      setIsLoadingListings(false)
    }

    void loadMarketplace()
    return () => {
      isMounted = false
    }
  }, [marketplacePage, user])

  useEffect(() => {
    const objectUrls = listingImages.map((file) => URL.createObjectURL(file))
    setListingImagePreviews(objectUrls)
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [listingImages])

  useEffect(() => {
    if (searchParams.get('inbox') !== '1' || !user || !supabase) return
    setShowInbox(true)
    void loadMarketplaceInbox()
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('inbox')
    setSearchParams(nextParams, { replace: true })
    // The inbox deep link should be consumed once after authentication is available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams, user?.id])

  const handleSelectListingImages = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? [])
    if (selectedFiles.length === 0) return
    if (listingImages.length + selectedFiles.length > 5) {
      toast.error('Máximo 5 imágenes', { description: 'Elimina una imagen antes de agregar otra.' })
      setImageInputKey((current) => current + 1)
      return
    }
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (selectedFiles.some((file) => !allowedTypes.has(file.type))) {
      toast.error('Formato no permitido', { description: 'Usa imágenes JPEG, PNG o WebP.' })
      setImageInputKey((current) => current + 1)
      return
    }
    if (selectedFiles.some((file) => file.size > 10 * 1024 * 1024)) {
      toast.error('Imagen muy pesada', { description: 'Cada imagen puede pesar máximo 10 MB.' })
      setImageInputKey((current) => current + 1)
      return
    }
    const optimizedFiles = await Promise.all(selectedFiles.map(async (file) => {
      try {
        return await optimizeMarketplaceImage(file)
      } catch {
        return file
      }
    }))
    setListingImages((current) => [...current, ...optimizedFiles])
    setImageInputKey((current) => current + 1)
  }

  const canCreateListing = Boolean(
    supabase
    && user
    && !isLoadingSubscription
    && effectivePlan !== 'free'
    && (effectivePlan === 'business' || quota?.remaining_publications !== 0)
  )

  const saveListing = async (status: 'draft' | 'pending_review') => {
    if (!supabase || !user || !canCreateListing) return

    const price = Number(listingForm.price)
    const mileage = listingForm.mileage_km.trim() ? Number(listingForm.mileage_km) : null
    if (listingForm.title.trim().length < 5) {
      toast.error('Título muy corto', { description: 'Escribe al menos 5 caracteres.' })
      return
    }
    if (listingForm.description.trim().length < 20) {
      toast.error('Descripción muy corta', { description: 'Escribe al menos 20 caracteres.' })
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Precio inválido', { description: 'Ingresa un precio válido en pesos colombianos.' })
      return
    }
    if (mileage !== null && (!Number.isInteger(mileage) || mileage < 0)) {
      toast.error('Kilometraje inválido')
      return
    }

    setIsSavingListing(true)
    const { data: insertedListing, error } = await supabase
      .from('marketplace_listings')
      .insert({
        seller_id: user.id,
        seller_type: effectivePlan === 'business' ? 'business' : 'personal',
        title: listingForm.title.trim(),
        description: listingForm.description.trim(),
        price,
        category: listingForm.category,
        condition: listingForm.condition,
        mileage_km: mileage,
        city: listingForm.city.trim() || null,
        department: listingForm.department.trim() || null,
        status: 'draft',
      })
      .select('id')
      .single()

    if (error) {
      toast.error('No pudimos crear la publicación', { description: error.message })
      setIsSavingListing(false)
      return
    }

    const listingId = insertedListing.id as string
    const uploadedPaths: string[] = []
    const imageRows: Array<{
      listing_id: string
      owner_id: string
      image_url: string
      storage_path: string
      sort_order: number
    }> = []

    for (const [index, image] of listingImages.entries()) {
      const extension = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg'
      const path = `${user.id}/${listingId}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from('marketplace-images')
        .upload(path, image, { upsert: false, contentType: image.type })

      if (uploadError) {
        if (uploadedPaths.length > 0) {
          await supabase.storage.from('marketplace-images').remove(uploadedPaths)
        }
        await supabase.from('marketplace_listings').delete().eq('id', listingId)
        toast.error('No pudimos subir las imágenes', { description: uploadError.message })
        setIsSavingListing(false)
        return
      }

      uploadedPaths.push(path)
      const { data: publicUrlData } = supabase.storage.from('marketplace-images').getPublicUrl(path)
      imageRows.push({
        listing_id: listingId,
        owner_id: user.id,
        image_url: publicUrlData.publicUrl,
        storage_path: path,
        sort_order: index,
      })
    }

    if (imageRows.length > 0) {
      const { error: imagesError } = await supabase.from('marketplace_listing_images').insert(imageRows)
      if (imagesError) {
        await supabase.storage.from('marketplace-images').remove(uploadedPaths)
        await supabase.from('marketplace_listings').delete().eq('id', listingId)
        toast.error('No pudimos registrar las imágenes', { description: imagesError.message })
        setIsSavingListing(false)
        return
      }
    }

    if (status === 'pending_review') {
      const { error: submitError } = await supabase
        .from('marketplace_listings')
        .update({ status: 'pending_review' })
        .eq('id', listingId)

      if (submitError) {
        if (uploadedPaths.length > 0) {
          await supabase.storage.from('marketplace-images').remove(uploadedPaths)
        }
        await supabase.from('marketplace_listings').delete().eq('id', listingId)
        toast.error('No pudimos enviar la publicación', { description: submitError.message })
        setIsSavingListing(false)
        return
      }
    }

    if (status === 'pending_review') {
      const { data } = await supabase.rpc('marketplace_publication_quota')
      const row = Array.isArray(data) ? data[0] : data
      if (row) setQuota(row as MarketplacePublicationQuota)
    }
    setListingForm(emptyListingForm)
    setListingImages([])
    setImageInputKey((current) => current + 1)
    setShowCreateListing(false)
    setIsSavingListing(false)
    toast.success(status === 'draft' ? 'Borrador guardado' : 'Publicación enviada a revisión', {
      description: status === 'draft'
        ? 'El borrador no consume tu cupo mensual.'
        : 'MotoCare revisará la publicación antes de mostrarla.',
    })
  }

  const handleSubmitListing = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void saveListing('pending_review')
  }

  const sendMarketplaceMessage = async (
    listing: StoreListing,
    recipientId: string,
    body: string,
    onSuccess?: () => void
  ) => {
    if (!supabase || !user || !body.trim()) return
    setIsSendingMessage(true)
    const { error } = await supabase.from('marketplace_messages').insert({
      listing_id: listing.id,
      sender_id: user.id,
      recipient_id: recipientId,
      body: body.trim(),
    })
    setIsSendingMessage(false)
    if (error) {
      toast.error('No pudimos enviar el mensaje', { description: error.message })
      return
    }
    toast.success('Mensaje enviado al vendedor')
    onSuccess?.()
  }

  const markListingAsSold = async (listing: StoreListing) => {
    if (!supabase || !user || listing.sellerId !== user.id) return
    if (!window.confirm(`¿Confirmas que "${listing.title}" ya fue vendido?`)) return
    setIsMarkingSold(true)
    const { error } = await supabase.rpc('mark_marketplace_listing_sold', {
      target_listing_id: listing.id,
    })
    setIsMarkingSold(false)
    if (error) {
      toast.error('No pudimos marcar el artículo como vendido', { description: error.message })
      return
    }
    setListings((current) => current.filter((item) => item.id !== listing.id))
    setSelectedListing(null)
    toast.success('Artículo marcado como vendido', {
      description: 'La publicación dejó de estar visible para nuevos compradores.',
    })
  }

  const loadMarketplaceInbox = async () => {
    if (!supabase || !user) return
    setIsLoadingInbox(true)
    const { data, error } = await supabase
      .from('marketplace_messages')
      .select(`
        *,
        marketplace_listings:listing_id(id, title, seller_id, status),
        sender:sender_id(full_name, username),
        recipient:recipient_id(full_name, username)
      `)
      .order('created_at', { ascending: false })
      .limit(100)
    setIsLoadingInbox(false)
    if (error) {
      toast.error('No pudimos cargar los mensajes de la tienda', { description: error.message })
      return
    }
    setMarketplaceMessages((data ?? []) as unknown as MarketplaceMessage[])
    const unreadIds = (data ?? [])
      .filter((message) => message.recipient_id === user.id && !message.read_at)
      .map((message) => message.id)
    if (unreadIds.length > 0) {
      await supabase.from('marketplace_messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
    }
  }

  const inboxThreads = useMemo(() => {
    const threads = new Map<string, MarketplaceMessage[]>()
    marketplaceMessages.forEach((message) => {
      const otherId = message.sender_id === user?.id ? message.recipient_id : message.sender_id
      const key = `${message.listing_id}:${otherId}`
      const current = threads.get(key) ?? []
      current.push(message)
      threads.set(key, current)
    })
    return [...threads.entries()].map(([key, messages]) => ({
      key,
      messages: [...messages].reverse(),
      listing: messages[0].marketplace_listings,
      otherId: messages[0].sender_id === user?.id ? messages[0].recipient_id : messages[0].sender_id,
      other: messages[0].sender_id === user?.id ? messages[0].recipient : messages[0].sender,
    }))
  }, [marketplaceMessages, user?.id])

  const filteredListings = useMemo(() => {
    const searchTerm = searchQuery.trim().toLowerCase()
    return listings.filter((listing) => {
      const matchesCategory = selectedCategory === 'all' || listing.category === selectedCategory
      const matchesSearch = !searchTerm || [
        listing.title,
        listing.location,
        listing.condition,
        listing.seller.name,
      ].some((value) => value.toLowerCase().includes(searchTerm))
      return matchesCategory && matchesSearch
    })
  }, [listings, searchQuery, selectedCategory])

  const featuredListings = useMemo(
    () => filteredListings.filter((listing) => listing.featured),
    [filteredListings]
  )

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 lg:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold mb-2">Marketplace</h1>
          <p className="text-gray-400">Compra motos, repuestos, equipamiento, servicios y rutas premium. Publicar exige una licencia activa.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user && supabase ? (
            <Button
              type="button"
              variant="outline"
              className="border-white/10"
              onClick={() => {
                setShowInbox(true)
                void loadMarketplaceInbox()
              }}
            >
              <Inbox className="mr-2 h-4 w-4" />
              Mensajes de la tienda
            </Button>
          ) : null}
          {!isSupabaseConfigured ? (
            <Badge className="w-fit bg-moto-orange text-moto-darker">
              <Clock3 className="mr-2 h-4 w-4" />
              Datos de demostración
            </Badge>
          ) : null}
        </div>
      </div>

      {user && !isLoadingSubscription && effectivePlan !== 'free' ? (
        <Card className="mb-6 border-moto-orange/30 bg-moto-orange/10 py-0">
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Licencia {effectivePlan === 'business' ? 'Business' : 'Premium'}</p>
              <p className="text-sm text-gray-300">
                {effectivePlan === 'business'
                  ? 'Publicaciones nuevas mensuales ilimitadas.'
                  : quota
                    ? `${quota.used_publications} de 5 publicaciones usadas este mes · ${quota.remaining_publications} disponibles.`
                    : 'Hasta 5 publicaciones nuevas por mes.'}
              </p>
            </div>
            {effectivePlan !== 'business' && quota?.remaining_publications === 0 ? (
              <Badge className="w-fit bg-violet-500 text-white">Actualiza a Business para continuar</Badge>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {loadError ? (
        <Card className="mb-6 border-red-500/30 bg-red-500/10 py-0">
          <CardContent className="flex gap-3 p-4 text-red-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">No pudimos cargar la tienda</p>
              <p className="text-sm text-red-200/80">{loadError}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6 overflow-hidden border-white/5 bg-moto-gray py-0">
        <CardContent className="relative p-5">
          <div className="absolute inset-0 bg-[url('/feature-marketplace.jpg')] bg-cover bg-center opacity-20" />
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
            <div>
              <Badge className="mb-3 bg-white/10 text-gray-200">Tienda para todos</Badge>
              <h2 className="text-2xl font-bold">Comprar es abierto para toda la comunidad</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
                Cualquier usuario podrá explorar publicaciones y contactar vendedores. Para publicar como persona natural se requiere licencia Premium; si la cuenta representa un negocio, taller, marca o aliado, debe tener licencia Business.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-moto-darker/90 p-4">
              <div className="mb-3 flex items-center gap-2 text-moto-orange">
                <Store className="h-5 w-5" />
                <span className="font-semibold">Regla para vender</span>
              </div>
              <div className="space-y-2 text-sm leading-6 text-gray-400">
                <p>Ver y comprar: disponible para todos los usuarios.</p>
                <p>Vender como usuario: requiere Premium.</p>
                <p>Vender como negocio: requiere Business.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 border-white/5 bg-moto-gray/70">
        <CardContent className="grid gap-4 p-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-moto-darker/60 p-4">
            <p className="text-sm font-semibold text-white">Explorar y comprar</p>
            <p className="mt-1 text-sm leading-6 text-gray-400">Disponible para toda la comunidad MotoCare Co.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-moto-darker/60 p-4">
            <p className="text-sm font-semibold text-white">Publicar como motero</p>
            <p className="mt-1 text-sm leading-6 text-gray-400">Requiere licencia Premium activa.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-moto-darker/60 p-4">
            <p className="text-sm font-semibold text-white">Publicar como negocio</p>
            <p className="mt-1 text-sm leading-6 text-gray-400">Requiere licencia Business activa.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 overflow-hidden border-moto-orange/30 bg-moto-gray">
        <CardContent className="relative p-0">
          <div className="absolute inset-0 bg-[url('/feature-gps.jpg')] bg-cover bg-center opacity-20" />
          <div className="relative grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
            <div>
              <Badge className="mb-3 bg-moto-orange text-moto-darker">
                <Sparkles className="mr-2 h-4 w-4" />
                MotoCare Experiences
              </Badge>
              <h2 className="text-2xl font-bold">Rutas premium dentro de la tienda</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
                Además de comprar motos y accesorios, ahora puedes adquirir rutas verificadas, archivos GPX, puntos de interés, checklist de preparación y packs listos para rodar por Colombia.
              </p>
            </div>
            <Button asChild className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
              <Link to="/app/premium-routes">Explorar rutas</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Buscar motos, rutas, repuestos, servicios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-moto-gray border-white/5"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" className="w-full border-white/10 sm:w-auto" disabled>
            <MapPin className="w-4 h-4 mr-2" />
            Ubicación
          </Button>
          <Button variant="outline" className="w-full border-white/10 sm:w-auto" disabled>
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <div className="col-span-2 flex overflow-hidden rounded-lg border border-white/10 sm:col-span-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex flex-1 justify-center p-2 sm:flex-none ${viewMode === 'grid' ? 'bg-moto-orange text-white' : 'text-gray-400'}`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex flex-1 justify-center p-2 sm:flex-none ${viewMode === 'list' ? 'bg-moto-orange text-white' : 'text-gray-400'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-moto-orange text-white'
                : 'bg-moto-gray text-gray-400 hover:bg-white/5'
            }`}
          >
            <cat.icon className="w-5 h-5" />
            <span className="font-medium">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Featured Section */}
      {isLoadingListings ? (
        <div className="grid min-h-48 place-items-center">
          <div className="text-center text-gray-400">
            <LoaderCircle className="mx-auto mb-3 h-8 w-8 animate-spin text-moto-orange" />
            Cargando publicaciones...
          </div>
        </div>
      ) : null}

      {!isLoadingListings && !loadError && filteredListings.length === 0 ? (
        <Card className="mb-8 border-dashed border-white/10 bg-moto-gray/50 py-0">
          <CardContent className="p-8 text-center">
            <Store className="mx-auto mb-3 h-10 w-10 text-gray-500" />
            <h2 className="font-semibold">No hay publicaciones para mostrar</h2>
            <p className="mt-1 text-sm text-gray-400">
              {searchQuery || selectedCategory !== 'all'
                ? 'Prueba otra búsqueda o categoría.'
                : 'Las publicaciones aprobadas aparecerán aquí.'}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold">
            <TrendingUp className="w-5 h-5 text-moto-orange" />
            Destacados
          </h2>
          <Button variant="ghost" size="sm" disabled>Ver todos</Button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {featuredListings.map((listing) => (
            <Card key={listing.id} className="bg-moto-gray border-white/5 overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={listing.image} 
                  alt={listing.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-3 left-3 bg-moto-orange">Destacado</Badge>
                <button className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center" disabled>
                  <Heart className="w-4 h-4" />
                </button>
              </div>
              <CardContent className="p-4">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg">{listing.title}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {listing.location}
                    </p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-xl font-bold text-moto-orange">{formatPrice(listing.price)}</p>
                    {listing.originalPrice && (
                      <p className="text-sm text-gray-500 line-through">{formatPrice(listing.originalPrice)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                  <Badge variant="secondary">{listing.condition}</Badge>
                  {listing.mileage && <span>{listing.mileage}</span>}
                </div>
                <div className="flex flex-col gap-3 border-t border-white/5 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-moto-gray flex items-center justify-center">
                      <span className="text-sm font-medium">{listing.seller.name[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{listing.seller.name}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        {listing.seller.rating}
                        {listing.seller.verified && <Badge variant="secondary" className="text-[10px] ml-1">Verificado</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10"
                      onClick={() => setSelectedListing(listing)}
                      aria-label={`Contactar a ${listing.seller.name}`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark"
                      onClick={() => setSelectedListing(listing)}
                    >
                      Ver detalle
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* All Listings */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Publicaciones recientes</h2>
        <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
          {filteredListings.filter(l => !l.featured).map((listing) => (
            <Card 
              key={listing.id} 
              className={`bg-moto-gray border-white/5 overflow-hidden ${
                viewMode === 'list' ? 'sm:flex' : ''
              }`}
            >
              <div className={`relative overflow-hidden ${viewMode === 'list' ? 'h-48 sm:w-48 sm:flex-shrink-0' : 'h-48'}`}>
                <img 
                  src={listing.image} 
                  alt={listing.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                <button className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center" disabled>
                  <Heart className="w-4 h-4" />
                </button>
              </div>
              <CardContent className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{listing.title}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {listing.location}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-bold text-moto-orange">{formatPrice(listing.price)}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                  <Badge variant="secondary" className="text-xs">{listing.condition}</Badge>
                  {listing.mileage && <span className="text-xs">{listing.mileage}</span>}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm">{listing.seller.name}</span>
                    {listing.seller.verified && (
                      <Badge variant="secondary" className="text-[10px]">Verificado</Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-moto-orange"
                    onClick={() => setSelectedListing(listing)}
                  >
                    Ver detalle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {hasMoreListings ? (
          <div className="mt-6 text-center">
            <Button
              type="button"
              variant="outline"
              className="border-white/10"
              disabled={isLoadingListings}
              onClick={() => setMarketplacePage((current) => current + 1)}
            >
              {isLoadingListings ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cargar más publicaciones
            </Button>
          </div>
        ) : null}
      </div>

      {/* Sell Button */}
      <div className="fixed bottom-20 right-4 z-40 flex items-center justify-end gap-2 lg:bottom-8 lg:right-8">
        {isSellActionExpanded ? (
          <Button
            size="sm"
            disabled={!canCreateListing}
            onClick={() => {
              setIsSellActionExpanded(false)
              setShowCreateListing(true)
            }}
            className="rounded-full bg-moto-orange px-4 text-moto-darker shadow-lg shadow-black/30 hover:bg-moto-orange-dark lg:hidden"
          >
            <Lock className="mr-2 h-4 w-4" />
            {effectivePlan === 'business'
              ? 'Publicar como negocio'
              : effectivePlan === 'premium' || effectivePlan === 'pro'
                ? 'Crear publicación'
                : 'Requiere Premium'}
          </Button>
        ) : null}
        <Button
          type="button"
          size="icon"
          aria-label={isSellActionExpanded ? 'Cerrar acciones de publicación' : 'Mostrar acciones de publicación'}
          aria-expanded={isSellActionExpanded}
          onClick={() => setIsSellActionExpanded((current) => !current)}
          className="h-12 w-12 rounded-full bg-moto-orange text-moto-darker shadow-lg shadow-moto-orange/30 hover:bg-moto-orange-dark lg:hidden"
        >
          {isSellActionExpanded ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </Button>
        <Button
          size="lg"
          disabled={!canCreateListing}
          onClick={() => setShowCreateListing(true)}
          title={
            effectivePlan === 'free'
              ? 'Necesitas licencia Premium o Business'
              : quota?.remaining_publications === 0
                ? 'Ya usaste tus 5 publicaciones del mes'
                : undefined
          }
          className="hidden rounded-full bg-moto-orange px-6 text-moto-darker shadow-lg shadow-moto-orange/30 hover:bg-moto-orange-dark lg:inline-flex"
        >
          <Lock className="mr-2 h-5 w-5" />
          {effectivePlan === 'business'
            ? 'Publicar como negocio'
            : effectivePlan === 'premium' || effectivePlan === 'pro'
              ? 'Crear publicación'
              : 'Vender con Premium'}
        </Button>
      </div>

      <Dialog open={Boolean(selectedListing)} onOpenChange={(open) => !open && setSelectedListing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-moto-gray text-white sm:max-w-3xl">
          {selectedListing ? (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8 text-xl">{selectedListing.title}</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Publicado por {selectedListing.seller.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {(selectedListing.images?.length ? selectedListing.images : [selectedListing.image]).map((image, index) => (
                    <img
                      key={`${image}-${index}`}
                      src={image}
                      alt={index === 0 ? selectedListing.title : `Imagen ${index + 1} de ${selectedListing.title}`}
                      className={index === 0
                        ? 'col-span-2 aspect-video h-full w-full rounded-xl object-cover sm:col-span-5'
                        : 'aspect-square h-full w-full rounded-lg object-cover'}
                    />
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{selectedListing.condition}</Badge>
                      <Badge className="bg-white/10 text-gray-300">{selectedListing.category}</Badge>
                      {selectedListing.seller.verified ? (
                        <Badge className="bg-green-500/15 text-green-300">Vendedor verificado</Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                      <MapPin className="h-4 w-4 text-moto-orange" />
                      {selectedListing.location}
                    </p>
                    {selectedListing.mileage ? (
                      <p className="mt-1 text-sm text-gray-400">Kilometraje: {selectedListing.mileage}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-2xl font-bold text-moto-orange">{formatPrice(selectedListing.price)}</p>
                    {selectedListing.originalPrice ? (
                      <p className="text-sm text-gray-500 line-through">{formatPrice(selectedListing.originalPrice)}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-moto-darker p-4">
                  <h3 className="font-semibold">Descripción</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                    {selectedListing.description || 'El vendedor no agregó una descripción adicional para esta publicación de demostración.'}
                  </p>
                </div>

                <div className="flex gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <p>
                    MotoCare Co. funciona únicamente como medio de comunicación entre compradores y vendedores.
                    No participa en la negociación, el pago, la entrega ni la garantía, y no es responsable por la
                    venta o por los artículos publicados. Verifica el producto y la identidad de la contraparte antes
                    de realizar cualquier pago.
                  </p>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{selectedListing.seller.name}</p>
                    <div className="mt-1 flex items-center gap-1 text-sm text-gray-400">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      {selectedListing.seller.rating}
                    </div>
                  </div>
                  {selectedListing.category === 'premium-routes' || selectedListing.category === 'packs' ? (
                    <Button asChild className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
                      <Link to="/app/premium-routes" onClick={() => setSelectedListing(null)}>Explorar ruta</Link>
                    </Button>
                  ) : selectedListing.sellerId === user?.id ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-green-500/40 text-green-300 hover:bg-green-500/10 hover:text-green-200"
                      disabled={isMarkingSold}
                      onClick={() => void markListingAsSold(selectedListing)}
                    >
                      {isMarkingSold
                        ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Marcar como vendido
                    </Button>
                  ) : null}
                </div>

                {selectedListing.category !== 'premium-routes'
                  && selectedListing.category !== 'packs'
                  && selectedListing.sellerId !== user?.id ? (
                    <div className="rounded-xl border border-moto-orange/30 bg-moto-orange/10 p-4">
                      <h3 className="flex items-center gap-2 font-semibold">
                        <MessageCircle className="h-5 w-5 text-moto-orange" />
                        Contactar al vendedor
                      </h3>
                      <p className="mt-1 text-sm text-gray-300">
                        El mensaje será privado y quedará asociado a esta publicación.
                      </p>
                      <Textarea
                        value={contactMessage}
                        maxLength={1000}
                        className="mt-3 min-h-24 border-white/10 bg-moto-darker"
                        placeholder="Hola, estoy interesado en este artículo..."
                        onChange={(event) => setContactMessage(event.target.value)}
                      />
                      <Button
                        type="button"
                        className="mt-3 w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark sm:w-auto"
                        disabled={!user || !selectedListing.sellerId || !contactMessage.trim() || isSendingMessage}
                        onClick={() => {
                          if (!selectedListing.sellerId) return
                          void sendMarketplaceMessage(
                            selectedListing,
                            selectedListing.sellerId,
                            contactMessage,
                            () => setContactMessage('')
                          )
                        }}
                      >
                        {isSendingMessage
                          ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                          : <Send className="mr-2 h-4 w-4" />}
                        {user ? 'Enviar mensaje' : 'Inicia sesión para contactar'}
                      </Button>
                    </div>
                  ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showInbox} onOpenChange={setShowInbox}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-moto-gray text-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Mensajes de la tienda</DialogTitle>
            <DialogDescription className="text-gray-400">
              Conversaciones privadas asociadas a tus compras y publicaciones.
            </DialogDescription>
          </DialogHeader>
          {isLoadingInbox ? (
            <div className="grid min-h-40 place-items-center text-gray-400">
              <LoaderCircle className="h-7 w-7 animate-spin text-moto-orange" />
            </div>
          ) : inboxThreads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-gray-400">
              Todavía no tienes mensajes de la tienda.
            </div>
          ) : (
            <div className="space-y-4">
              {inboxThreads.map((thread) => {
                const otherName = thread.other?.full_name || thread.other?.username || 'Usuario MotoCare'
                const draft = replyDrafts[thread.key] ?? ''
                return (
                  <section key={thread.key} className="rounded-xl border border-white/10 bg-moto-darker p-4">
                    <div className="mb-3">
                      <p className="font-semibold">{thread.listing?.title || 'Publicación'}</p>
                      <p className="text-sm text-gray-400">Conversación con {otherName}</p>
                      {thread.listing?.status === 'sold' ? (
                        <Badge className="mt-2 bg-green-500/15 text-green-300">Vendido</Badge>
                      ) : null}
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {thread.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                            message.sender_id === user?.id
                              ? 'ml-auto bg-moto-orange text-moto-darker'
                              : 'bg-white/10 text-gray-200'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>
                          <p className={`mt-1 text-[11px] ${message.sender_id === user?.id ? 'text-black/60' : 'text-gray-500'}`}>
                            {new Date(message.created_at).toLocaleString('es-CO')}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Input
                        value={draft}
                        maxLength={1000}
                        className="border-white/10 bg-moto-gray"
                        placeholder="Escribe una respuesta..."
                        onChange={(event) => setReplyDrafts((current) => ({
                          ...current,
                          [thread.key]: event.target.value,
                        }))}
                      />
                      <Button
                        type="button"
                        size="icon"
                        className="shrink-0 bg-moto-orange text-moto-darker hover:bg-moto-orange-dark"
                        disabled={!draft.trim() || isSendingMessage || !thread.listing}
                        onClick={() => {
                          if (!thread.listing) return
                          const listing: StoreListing = {
                            id: thread.listing.id,
                            title: thread.listing.title,
                            price: 0,
                            condition: '',
                            location: '',
                            image: '',
                            seller: { name: '', rating: 0, verified: false },
                            featured: false,
                            likes: 0,
                            category: 'parts',
                            sellerId: thread.listing.seller_id,
                            status: thread.listing.status === 'sold' ? 'sold' : 'active',
                          }
                          void sendMarketplaceMessage(listing, thread.otherId, draft, () => {
                            setReplyDrafts((current) => ({ ...current, [thread.key]: '' }))
                            void loadMarketplaceInbox()
                          })
                        }}
                        aria-label={`Responder a ${otherName}`}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateListing} onOpenChange={setShowCreateListing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-moto-gray text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear publicación</DialogTitle>
            <DialogDescription className="text-gray-400">
              Guardar como borrador no consume cupo. El cupo se utiliza cuando la envías a revisión.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmitListing}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm text-gray-300">Título</span>
                <Input
                  value={listingForm.title}
                  maxLength={120}
                  required
                  onChange={(event) => setListingForm((current) => ({ ...current, title: event.target.value }))}
                  className="border-white/10 bg-moto-darker"
                  placeholder="Ej. Honda CB500F 2022"
                />
              </label>

              <label>
                <span className="mb-1 block text-sm text-gray-300">Categoría</span>
                <select
                  value={listingForm.category}
                  onChange={(event) => setListingForm((current) => ({
                    ...current,
                    category: event.target.value as MarketplaceCategory,
                  }))}
                  className="h-9 w-full rounded-md border border-white/10 bg-moto-darker px-3 text-sm text-white"
                >
                  {categories.filter((category) => category.id !== 'all').map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-sm text-gray-300">Estado</span>
                <select
                  value={listingForm.condition}
                  onChange={(event) => setListingForm((current) => ({
                    ...current,
                    condition: event.target.value as MarketplaceCondition,
                  }))}
                  className="h-9 w-full rounded-md border border-white/10 bg-moto-darker px-3 text-sm text-white"
                >
                  {Object.entries(conditionLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-sm text-gray-300">Precio COP</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={listingForm.price}
                  onChange={(event) => setListingForm((current) => ({ ...current, price: event.target.value }))}
                  className="border-white/10 bg-moto-darker"
                  placeholder="18500000"
                />
              </label>

              <label>
                <span className="mb-1 block text-sm text-gray-300">Kilometraje (opcional)</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={listingForm.mileage_km}
                  onChange={(event) => setListingForm((current) => ({ ...current, mileage_km: event.target.value }))}
                  className="border-white/10 bg-moto-darker"
                />
              </label>

              <label>
                <span className="mb-1 block text-sm text-gray-300">Ciudad</span>
                <Input
                  value={listingForm.city}
                  onChange={(event) => setListingForm((current) => ({ ...current, city: event.target.value }))}
                  className="border-white/10 bg-moto-darker"
                  placeholder="Bogotá"
                />
              </label>

              <label>
                <span className="mb-1 block text-sm text-gray-300">Departamento</span>
                <Input
                  value={listingForm.department}
                  onChange={(event) => setListingForm((current) => ({ ...current, department: event.target.value }))}
                  className="border-white/10 bg-moto-darker"
                  placeholder="Cundinamarca"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm text-gray-300">Descripción</span>
                <Textarea
                  value={listingForm.description}
                  maxLength={5000}
                  required
                  onChange={(event) => setListingForm((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-32 border-white/10 bg-moto-darker"
                  placeholder="Describe el producto, su estado y la información importante para el comprador."
                />
              </label>

              <div className="sm:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-300">Imágenes del producto</p>
                    <p className="text-xs text-gray-500">Hasta 5 imágenes JPEG, PNG o WebP · máximo 10 MB cada una.</p>
                  </div>
                  <Badge variant="secondary">{listingImages.length}/5</Badge>
                </div>

                <label
                  className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-moto-darker p-4 text-center transition hover:border-moto-orange/60 ${
                    listingImages.length >= 5 ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  <ImagePlus className="mb-2 h-7 w-7 text-moto-orange" />
                  <span className="text-sm font-medium">Seleccionar imágenes</span>
                  <span className="mt-1 text-xs text-gray-500">Puedes seleccionar varias al mismo tiempo.</span>
                  <input
                    key={imageInputKey}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={listingImages.length >= 5}
                    className="sr-only"
                    onChange={(event) => void handleSelectListingImages(event.target.files)}
                  />
                </label>

                {listingImagePreviews.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {listingImagePreviews.map((preview, index) => (
                      <div key={preview} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10">
                        <img
                          src={preview}
                          alt={`Vista previa ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {index === 0 ? (
                          <Badge className="absolute bottom-1 left-1 bg-moto-orange text-[10px] text-moto-darker">
                            Principal
                          </Badge>
                        ) : null}
                        <button
                          type="button"
                          aria-label={`Eliminar imagen ${index + 1}`}
                          onClick={() => setListingImages((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                          className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white transition hover:bg-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSavingListing}
                onClick={() => void saveListing('draft')}
                className="border-white/10"
              >
                Guardar borrador
              </Button>
              <Button
                type="submit"
                disabled={isSavingListing}
                className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark"
              >
                {isSavingListing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Enviar a revisión
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
