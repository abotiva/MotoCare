import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import {
  BarChart3,
  Bike,
  CalendarClock,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Gauge,
  ImageUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Wrench,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImageViewer } from '@/components/ImageViewer'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import type { MaintenanceRecord, MaintenanceSuggestion, Motorcycle, MotorcycleDocument, Reminder } from '@/types/database'

type StarterReminder = {
  owner_id: string
  motorcycle_id: string
  title: string
  due_date: string
}

type BikeForm = {
  brand: string
  model: string
  year: string
  plate: string
  color: string
  mileage: string
  soat_expires_on: string
  technical_review_expires_on: string
}

type ServiceForm = {
  suggestion_id: string
  service_type: string
  service_date: string
  mileage: string
  cost: string
  next_due_mileage: string
  next_due_date: string
  notes: string
}

type ReminderForm = {
  suggestion_id: string
  title: string
  due_mileage: string
  due_date: string
}

type MileageForm = {
  mileage: string
}

type CompletionForm = {
  action: string
  mileage: string
  service_date: string
  next_interval_km: string
  next_due_date: string
  notes: string
}

const emptyBikeForm: BikeForm = {
  brand: '',
  model: '',
  year: '',
  plate: '',
  color: '',
  mileage: '',
  soat_expires_on: '',
  technical_review_expires_on: '',
}

const emptyServiceForm: ServiceForm = {
  suggestion_id: '',
  service_type: 'Cambio de aceite',
  service_date: new Date().toISOString().slice(0, 10),
  mileage: '',
  cost: '',
  next_due_mileage: '',
  next_due_date: '',
  notes: '',
}

const emptyReminderForm: ReminderForm = {
  suggestion_id: '',
  title: 'Cambio de aceite',
  due_mileage: '',
  due_date: '',
}

const emptyMileageForm: MileageForm = {
  mileage: '',
}

const todayString = () => new Date().toISOString().slice(0, 10)

const dateAfterDays = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const emptyCompletionForm = (): CompletionForm => ({
  action: '',
  mileage: '',
  service_date: todayString(),
  next_interval_km: '3000',
  next_due_date: '',
  notes: '',
})

function daysUntil(date: string | null) {
  if (!date) return null
  const today = new Date()
  const target = new Date(`${date}T00:00:00`)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function statusForDate(date: string | null) {
  const days = daysUntil(date)
  if (days === null) return { label: 'Sin fecha', tone: 'text-gray-400' }
  if (days < 0) return { label: `Vencido hace ${Math.abs(days)} días`, tone: 'text-red-400' }
  if (days <= 30) return { label: `Vence en ${days} días`, tone: 'text-yellow-400' }
  return { label: `Vigente hasta ${date}`, tone: 'text-green-500' }
}

function formatMoney(value: number) {
  return value.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}

function dateDistanceInDays(from: string, to: string) {
  const fromTime = new Date(`${from}T00:00:00`).getTime()
  const toTime = new Date(`${to}T00:00:00`).getTime()
  return Math.max(0, Math.round(Math.abs(toTime - fromTime) / 86_400_000))
}

function defaultIntervalForReminder(title: string) {
  const normalizedTitle = title.toLowerCase()
  if (normalizedTitle.includes('aceite')) return 3000
  if (normalizedTitle.includes('freno')) return 8000
  if (normalizedTitle.includes('arrastre') || normalizedTitle.includes('cadena')) return 10000
  if (normalizedTitle.includes('llanta')) return 12000
  if (normalizedTitle.includes('revision')) return 5000
  return 3000
}

type BikeTab = 'reminders' | 'history' | 'reports' | 'documents'

function tabFromHash(hash: string): BikeTab {
  const value = hash.replace('#', '')
  if (value === 'reminders' || value === 'history' || value === 'reports' || value === 'documents') return value
  return 'history'
}

function ReportCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <Card className="border-white/5 bg-moto-darker py-0">
      <CardContent className="p-4">
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-moto-orange/20">
          <Icon className="h-5 w-5 text-moto-orange" />
        </div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="mt-1 text-xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-gray-500">{detail}</p>
      </CardContent>
    </Card>
  )
}

function ReportLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-moto-gray px-3 py-2">
      <p className="min-w-0 truncate text-sm text-gray-400">{label}</p>
      <p className="shrink-0 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

export function MyBikes() {
  const { user, profile } = useAuth()
  const { hasPlan, effectivePlan, isLoadingSubscription } = useSubscription()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<BikeTab>(() => tabFromHash(location.hash))
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([])
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [documents, setDocuments] = useState<MotorcycleDocument[]>([])
  const [maintenanceSuggestions, setMaintenanceSuggestions] = useState<MaintenanceSuggestion[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAddBike, setShowAddBike] = useState(false)
  const [showAddService, setShowAddService] = useState(false)
  const [showAddReminder, setShowAddReminder] = useState(false)
  const [showEditReminder, setShowEditReminder] = useState(false)
  const [showCompleteReminder, setShowCompleteReminder] = useState(false)
  const [showUpdateMileage, setShowUpdateMileage] = useState(false)
  const [showRecordDetail, setShowRecordDetail] = useState(false)
  const [editingBike, setEditingBike] = useState<Motorcycle | null>(null)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [completingReminder, setCompletingReminder] = useState<Reminder | null>(null)
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<MaintenanceRecord | null>(null)
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null)
  const [bikeForm, setBikeForm] = useState<BikeForm>(emptyBikeForm)
  const [bikePhotoFile, setBikePhotoFile] = useState<File | null>(null)
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm)
  const [reminderForm, setReminderForm] = useState<ReminderForm>(emptyReminderForm)
  const [editReminderForm, setEditReminderForm] = useState<ReminderForm>(emptyReminderForm)
  const [mileageForm, setMileageForm] = useState<MileageForm>(emptyMileageForm)
  const [completionForm, setCompletionForm] = useState<CompletionForm>(emptyCompletionForm)

  const notifyError = (title: string, message: string) => {
    setError(message)
    toast.error(title, { description: message })
  }

  const isNegativeNumber = (value: string) => value.trim() !== '' && Number(value) < 0
  const canViewMaintenanceReports = hasPlan('premium')
  const isBusinessAccount = effectivePlan === 'business'

  useEffect(() => {
    setActiveTab(tabFromHash(location.hash))
    if (location.hash) {
      window.requestAnimationFrame(() => {
        document.getElementById('bike-sections')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      })
    }
  }, [location.hash])

  const orderedMotorcycles = useMemo(() => {
    return [...motorcycles].sort((a, b) => {
      if (a.id === profile?.primary_motorcycle_id) return -1
      if (b.id === profile?.primary_motorcycle_id) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [motorcycles, profile?.primary_motorcycle_id])

  const selectedBike = useMemo(
    () => motorcycles.find((motorcycle) => motorcycle.id === selectedId) ?? orderedMotorcycles[0] ?? null,
    [motorcycles, orderedMotorcycles, selectedId]
  )

  const selectedRecords = useMemo(
    () => records.filter((record) => record.motorcycle_id === selectedBike?.id),
    [records, selectedBike?.id]
  )

  const selectedReminders = useMemo(
    () => reminders.filter((reminder) => reminder.motorcycle_id === selectedBike?.id && reminder.status === 'pending'),
    [reminders, selectedBike?.id]
  )

  const mileagePreview = Number(mileageForm.mileage || selectedBike?.mileage || 0)

  const dueWithMileagePreview = useMemo(
    () => selectedReminders.filter((reminder) => reminder.due_mileage !== null && reminder.due_mileage <= mileagePreview),
    [mileagePreview, selectedReminders]
  )

  const selectedDocuments = useMemo(
    () => documents.filter((document) => document.motorcycle_id === selectedBike?.id),
    [documents, selectedBike?.id]
  )

  const selectedServiceSuggestion = useMemo(
    () => maintenanceSuggestions.find((suggestion) => suggestion.id === serviceForm.suggestion_id) ?? null,
    [maintenanceSuggestions, serviceForm.suggestion_id]
  )

  const selectedSuggestion = useMemo(
    () => maintenanceSuggestions.find((suggestion) => suggestion.id === reminderForm.suggestion_id) ?? null,
    [maintenanceSuggestions, reminderForm.suggestion_id]
  )

  const selectedEditSuggestion = useMemo(
    () => maintenanceSuggestions.find((suggestion) => suggestion.id === editReminderForm.suggestion_id) ?? null,
    [maintenanceSuggestions, editReminderForm.suggestion_id]
  )

  const maintenanceReport = useMemo(() => {
    const ordered = [...selectedRecords].sort((a, b) => new Date(a.service_date).getTime() - new Date(b.service_date).getTime())
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const recordsWithCost = ordered.filter((record) => record.cost !== null)
    const totalSpent = recordsWithCost.reduce((total, record) => total + Number(record.cost ?? 0), 0)
    const yearSpent = recordsWithCost.reduce((total, record) => {
      const date = new Date(`${record.service_date}T00:00:00`)
      return date.getFullYear() === currentYear ? total + Number(record.cost ?? 0) : total
    }, 0)
    const monthSpent = recordsWithCost.reduce((total, record) => {
      const date = new Date(`${record.service_date}T00:00:00`)
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth ? total + Number(record.cost ?? 0) : total
    }, 0)
    const averageCost = recordsWithCost.length > 0 ? totalSpent / recordsWithCost.length : 0
    const lastRecord = ordered.at(-1) ?? null
    const daysSinceLast = lastRecord ? dateDistanceInDays(lastRecord.service_date, todayString()) : null
    const gaps = ordered.slice(1).map((record, index) => ({
      days: dateDistanceInDays(ordered[index].service_date, record.service_date),
      km: Math.max(0, record.mileage - ordered[index].mileage),
    }))
    const averageDaysBetweenServices = gaps.length > 0 ? Math.round(gaps.reduce((total, gap) => total + gap.days, 0) / gaps.length) : null
    const averageKmBetweenServices = gaps.length > 0 ? Math.round(gaps.reduce((total, gap) => total + gap.km, 0) / gaps.length) : null
    const costByType = recordsWithCost.reduce<Record<string, number>>((totals, record) => {
      totals[record.service_type] = (totals[record.service_type] ?? 0) + Number(record.cost ?? 0)
      return totals
    }, {})
    const topExpenseTypes = Object.entries(costByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)

    return {
      totalServices: ordered.length,
      totalSpent,
      yearSpent,
      monthSpent,
      averageCost,
      lastRecord,
      daysSinceLast,
      averageDaysBetweenServices,
      averageKmBetweenServices,
      topExpenseTypes,
    }
  }, [selectedRecords])

  const healthScore = useMemo(() => {
    if (!selectedBike) return 0
    const soatDays = daysUntil(selectedBike.soat_expires_on)
    const reviewDays = daysUntil(selectedBike.technical_review_expires_on)
    let score = 100
    if (soatDays !== null && soatDays < 30) score -= soatDays < 0 ? 30 : 12
    if (reviewDays !== null && reviewDays < 30) score -= reviewDays < 0 ? 30 : 12
    if (selectedReminders.length > 0) score -= Math.min(selectedReminders.length * 6, 24)
    return Math.max(score, 35)
  }, [selectedBike, selectedReminders.length])

  useEffect(() => {
    if (!supabase || !user) return
    const client = supabase

    const loadGarage = async () => {
      setIsLoading(true)
      setError(null)

      const [motorcyclesResult, recordsResult, remindersResult, documentsResult, suggestionsResult] = await Promise.all([
        client.from('motorcycles').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
        client.from('maintenance_records').select('*').eq('owner_id', user.id).order('service_date', { ascending: false }),
        client.from('reminders').select('*').eq('owner_id', user.id).order('due_date', { ascending: true, nullsFirst: false }),
        client.from('motorcycle_documents').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
        client
          .from('maintenance_suggestions')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
      ])

      if (motorcyclesResult.error || recordsResult.error || remindersResult.error || documentsResult.error) {
        setError(
          motorcyclesResult.error?.message ||
            recordsResult.error?.message ||
            remindersResult.error?.message ||
            documentsResult.error?.message ||
            'No pudimos cargar tu garaje.'
        )
      } else {
        const nextMotorcycles = (motorcyclesResult.data ?? []) as Motorcycle[]
        setMotorcycles(nextMotorcycles)
        setRecords((recordsResult.data ?? []) as MaintenanceRecord[])
        setReminders((remindersResult.data ?? []) as Reminder[])
        setDocuments((documentsResult.data ?? []) as MotorcycleDocument[])
        setMaintenanceSuggestions((suggestionsResult.data ?? []) as MaintenanceSuggestion[])
        setSelectedId((current) => {
          const primaryMotorcycle = nextMotorcycles.find(
            (motorcycle) => motorcycle.id === profile?.primary_motorcycle_id
          )
          if (primaryMotorcycle) return primaryMotorcycle.id
          if (current && nextMotorcycles.some((motorcycle) => motorcycle.id === current)) return current
          return nextMotorcycles[0]?.id ?? null
        })
      }

      setIsLoading(false)
    }

    loadGarage()
  }, [user, profile?.primary_motorcycle_id])

  const handleCreateBike = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return
    if (isBusinessAccount) {
      notifyError('Garaje no disponible', 'La licencia Business es para negocios y no permite registrar motos.')
      return
    }
    if (isNegativeNumber(bikeForm.mileage)) {
      notifyError('Kilometraje inválido', 'El kilometraje inicial no puede ser negativo.')
      return
    }
    setIsSaving(true)
    setError(null)

    const payload = {
      owner_id: user.id,
      brand: bikeForm.brand.trim(),
      model: bikeForm.model.trim(),
      year: bikeForm.year ? Number(bikeForm.year) : null,
      plate: bikeForm.plate.trim() || null,
      color: bikeForm.color.trim() || null,
      mileage: bikeForm.mileage ? Number(bikeForm.mileage) : 0,
      soat_expires_on: bikeForm.soat_expires_on || null,
      technical_review_expires_on: bikeForm.technical_review_expires_on || null,
      image_url: '/hero-motorcycle.jpg',
    }

    const { data, error: insertError } = await supabase.from('motorcycles').insert(payload).select('*').single()

    if (insertError) {
      notifyError('No pudimos agregar la moto', insertError.message)
    } else if (data) {
      let motorcycle = data as Motorcycle
      if (bikePhotoFile) {
        const imageUrl = await uploadMotorcyclePhotoFile(motorcycle.id, bikePhotoFile)
        if (imageUrl) {
          const { data: updatedMotorcycle, error: photoUpdateError } = await supabase
            .from('motorcycles')
            .update({ image_url: imageUrl })
            .eq('id', motorcycle.id)
            .eq('owner_id', user.id)
            .select('*')
            .single()

          if (photoUpdateError) {
            notifyError('La moto se creó, pero no pudimos asociar la foto', photoUpdateError.message)
          } else if (updatedMotorcycle) {
            motorcycle = updatedMotorcycle as Motorcycle
          }
        }
      }
      setMotorcycles((current) => [motorcycle, ...current])
      setSelectedId(motorcycle.id)
      setBikeForm(emptyBikeForm)
      setBikePhotoFile(null)
      setShowAddBike(false)

      const starterReminders: StarterReminder[] = [
        motorcycle.soat_expires_on
          ? { owner_id: user.id, motorcycle_id: motorcycle.id, title: 'Renovar SOAT', due_date: motorcycle.soat_expires_on }
          : null,
        motorcycle.technical_review_expires_on
          ? {
              owner_id: user.id,
              motorcycle_id: motorcycle.id,
              title: 'Renovar tecnomecánica',
              due_date: motorcycle.technical_review_expires_on,
            }
          : null,
      ].filter((reminder): reminder is StarterReminder => Boolean(reminder))

      if (starterReminders.length > 0) {
        const { data: reminderData } = await supabase.from('reminders').insert(starterReminders).select('*')
        setReminders((current) => [...((reminderData as Reminder[] | null) ?? []), ...current])
      }
      toast.success('Moto agregada', {
        description: starterReminders.length > 0 ? 'También se crearon recordatorios de documentos.' : 'La hoja de vida quedó lista.',
      })
    }

    setIsSaving(false)
  }

  const openCreateBike = () => {
    if (isBusinessAccount) {
      notifyError('Garaje no disponible', 'La licencia Business es para negocios y no permite registrar motos.')
      return
    }
    setEditingBike(null)
    setBikeForm(emptyBikeForm)
    setBikePhotoFile(null)
    setShowAddBike(true)
  }

  const openEditBike = (motorcycle: Motorcycle) => {
    setEditingBike(motorcycle)
    setBikeForm({
      brand: motorcycle.brand,
      model: motorcycle.model,
      year: motorcycle.year?.toString() ?? '',
      plate: motorcycle.plate ?? '',
      color: motorcycle.color ?? '',
      mileage: motorcycle.mileage.toString(),
      soat_expires_on: motorcycle.soat_expires_on ?? '',
      technical_review_expires_on: motorcycle.technical_review_expires_on ?? '',
    })
    setBikePhotoFile(null)
    setShowAddBike(true)
  }

  const upsertDocumentReminder = async (motorcycle: Motorcycle, title: string, dueDate: string | null) => {
    if (!supabase || !user || !dueDate) return

    const existing = reminders.find(
      (reminder) => reminder.motorcycle_id === motorcycle.id && reminder.title === title && reminder.status === 'pending'
    )

    if (existing) {
      const { data } = await supabase.from('reminders').update({ due_date: dueDate }).eq('id', existing.id).select('*').single()
      if (data) {
        setReminders((current) => current.map((reminder) => (reminder.id === existing.id ? (data as Reminder) : reminder)))
      }
      return
    }

    const { data } = await supabase
      .from('reminders')
      .insert({ owner_id: user.id, motorcycle_id: motorcycle.id, title, due_date: dueDate })
      .select('*')
      .single()

    if (data) {
      setReminders((current) => [data as Reminder, ...current])
    }
  }

  const handleUpdateBike = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user || !editingBike) return
    if (isNegativeNumber(bikeForm.mileage)) {
      notifyError('Kilometraje inválido', 'El kilometraje de la moto no puede ser negativo.')
      return
    }
    setIsSaving(true)
    setError(null)

    let imageUrl: string | null = null
    if (bikePhotoFile) {
      imageUrl = await uploadMotorcyclePhotoFile(editingBike.id, bikePhotoFile)
      if (!imageUrl) {
        setIsSaving(false)
        return
      }
    }

    const payload = {
      brand: bikeForm.brand.trim(),
      model: bikeForm.model.trim(),
      year: bikeForm.year ? Number(bikeForm.year) : null,
      plate: bikeForm.plate.trim() || null,
      color: bikeForm.color.trim() || null,
      mileage: bikeForm.mileage ? Number(bikeForm.mileage) : 0,
      soat_expires_on: bikeForm.soat_expires_on || null,
      technical_review_expires_on: bikeForm.technical_review_expires_on || null,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    }

    const { data, error: updateError } = await supabase
      .from('motorcycles')
      .update(payload)
      .eq('id', editingBike.id)
      .eq('owner_id', user.id)
      .select('*')
      .single()

    if (updateError) {
      notifyError('No pudimos guardar la moto', updateError.message)
    } else if (data) {
      const motorcycle = data as Motorcycle
      setMotorcycles((current) => current.map((bike) => (bike.id === motorcycle.id ? motorcycle : bike)))
      await upsertDocumentReminder(motorcycle, 'Renovar SOAT', motorcycle.soat_expires_on)
      await upsertDocumentReminder(motorcycle, 'Renovar tecnomecánica', motorcycle.technical_review_expires_on)
      setEditingBike(null)
      setBikeForm(emptyBikeForm)
      setBikePhotoFile(null)
      setShowAddBike(false)
      toast.success('Moto actualizada', { description: 'Los cambios quedaron guardados.' })
    }

    setIsSaving(false)
  }

  const openCreateService = () => {
    if (!selectedBike) return
    const firstSuggestion = maintenanceSuggestions[0]
    setServiceForm({
      ...emptyServiceForm,
      suggestion_id: firstSuggestion?.id ?? '',
      service_type: firstSuggestion?.name ?? emptyServiceForm.service_type,
      mileage: selectedBike.mileage.toString(),
      next_due_mileage: firstSuggestion?.recommended_interval_km
        ? (selectedBike.mileage + firstSuggestion.recommended_interval_km).toString()
        : '',
      next_due_date: firstSuggestion?.recommended_interval_days ? dateAfterDays(firstSuggestion.recommended_interval_days) : '',
    })
    setShowAddService(true)
  }

  const applyServiceSuggestion = (suggestionId: string) => {
    const suggestion = maintenanceSuggestions.find((item) => item.id === suggestionId)
    if (!suggestion) {
      setServiceForm({ ...serviceForm, suggestion_id: suggestionId })
      return
    }

    setServiceForm({
      ...serviceForm,
      suggestion_id: suggestion.id,
      service_type: suggestion.name,
      next_due_mileage: suggestion.recommended_interval_km
        ? (Number(serviceForm.mileage || selectedBike?.mileage || 0) + suggestion.recommended_interval_km).toString()
        : serviceForm.next_due_mileage,
      next_due_date: suggestion.recommended_interval_days ? dateAfterDays(suggestion.recommended_interval_days) : serviceForm.next_due_date,
    })
  }

  const openRecordDetail = (record: MaintenanceRecord) => {
    setSelectedRecordDetail(record)
    setShowRecordDetail(true)
  }

  const handleCreateService = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user || !selectedBike) return
    if (isNegativeNumber(serviceForm.mileage) || isNegativeNumber(serviceForm.cost) || isNegativeNumber(serviceForm.next_due_mileage)) {
      notifyError('Datos inválidos', 'El kilometraje, costo y próximo kilometraje no pueden ser negativos.')
      return
    }

    const mileage = serviceForm.mileage ? Number(serviceForm.mileage) : selectedBike.mileage
    if (serviceForm.next_due_mileage && Number(serviceForm.next_due_mileage) < mileage) {
      notifyError('Próximo servicio inválido', 'El próximo kilometraje no puede ser menor al kilometraje del servicio.')
      return
    }

    setIsSaving(true)
    setError(null)

    const { data, error: insertError } = await supabase
      .from('maintenance_records')
      .insert({
        owner_id: user.id,
        motorcycle_id: selectedBike.id,
        service_type: serviceForm.service_type.trim(),
        service_date: serviceForm.service_date,
        mileage,
        cost: serviceForm.cost ? Number(serviceForm.cost) : null,
        notes: serviceForm.notes.trim() || null,
      })
      .select('*')
      .single()

    if (insertError) {
      notifyError('No pudimos registrar el servicio', insertError.message)
    } else if (data) {
      setRecords((current) => [data as MaintenanceRecord, ...current])
      let nextReminderCreated = false
      if (serviceForm.next_due_mileage || serviceForm.next_due_date) {
        const { data: reminderData, error: reminderError } = await supabase
          .from('reminders')
          .insert({
            owner_id: user.id,
            motorcycle_id: selectedBike.id,
            title: serviceForm.service_type.trim(),
            due_mileage: serviceForm.next_due_mileage ? Number(serviceForm.next_due_mileage) : null,
            due_date: serviceForm.next_due_date || null,
          })
          .select('*')
          .single()

        if (reminderError) {
          notifyError('El servicio se guardó, pero no se creó el próximo pendiente', reminderError.message)
        } else if (reminderData) {
          setReminders((current) => [reminderData as Reminder, ...current])
          nextReminderCreated = true
        }
      }
      if (mileage > selectedBike.mileage) {
        const { data: updatedBike } = await supabase
          .from('motorcycles')
          .update({ mileage })
          .eq('id', selectedBike.id)
          .select('*')
          .single()
        if (updatedBike) {
          setMotorcycles((current) => current.map((bike) => (bike.id === selectedBike.id ? (updatedBike as Motorcycle) : bike)))
        }
      }
      setServiceForm(emptyServiceForm)
      setShowAddService(false)
      toast.success('Servicio registrado', {
        description: nextReminderCreated ? 'También se creó el próximo pendiente.' : 'El movimiento quedó en el historial.',
      })
    }

    setIsSaving(false)
  }

  const openMileageReminder = () => {
    if (!selectedBike) return
    const firstSuggestion = maintenanceSuggestions[0]
    setReminderForm({
      ...emptyReminderForm,
      suggestion_id: firstSuggestion?.id ?? '',
      title: firstSuggestion?.name ?? emptyReminderForm.title,
      due_mileage: (selectedBike.mileage + (firstSuggestion?.recommended_interval_km ?? 3000)).toString(),
      due_date: firstSuggestion?.recommended_interval_days ? dateAfterDays(firstSuggestion.recommended_interval_days) : '',
    })
    setShowAddReminder(true)
  }

  const applyReminderSuggestion = (suggestionId: string) => {
    const suggestion = maintenanceSuggestions.find((item) => item.id === suggestionId)
    if (!suggestion || !selectedBike) {
      setReminderForm({ ...reminderForm, suggestion_id: suggestionId })
      return
    }

    setReminderForm({
      ...reminderForm,
      suggestion_id: suggestion.id,
      title: suggestion.name,
      due_mileage: suggestion.recommended_interval_km
        ? (selectedBike.mileage + suggestion.recommended_interval_km).toString()
        : reminderForm.due_mileage,
      due_date: suggestion.recommended_interval_days ? dateAfterDays(suggestion.recommended_interval_days) : reminderForm.due_date,
    })
  }

  const openEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setEditReminderForm({
      suggestion_id: '',
      title: reminder.title,
      due_mileage: reminder.due_mileage?.toString() ?? '',
      due_date: reminder.due_date ?? '',
    })
    setShowEditReminder(true)
  }

  const applyEditReminderSuggestion = (suggestionId: string) => {
    const suggestion = maintenanceSuggestions.find((item) => item.id === suggestionId)
    if (!suggestion || !selectedBike) {
      setEditReminderForm({ ...editReminderForm, suggestion_id: suggestionId })
      return
    }

    setEditReminderForm({
      ...editReminderForm,
      suggestion_id: suggestion.id,
      title: suggestion.name,
      due_mileage: suggestion.recommended_interval_km
        ? (selectedBike.mileage + suggestion.recommended_interval_km).toString()
        : editReminderForm.due_mileage,
      due_date: suggestion.recommended_interval_days ? dateAfterDays(suggestion.recommended_interval_days) : editReminderForm.due_date,
    })
  }

  const openUpdateMileage = () => {
    if (!selectedBike) return
    setMileageForm({ mileage: selectedBike.mileage.toString() })
    setShowUpdateMileage(true)
  }

  const handleUpdateMileage = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !selectedBike) return

    const mileage = Number(mileageForm.mileage)
    if (Number.isNaN(mileage) || mileage < selectedBike.mileage) {
      notifyError('Kilometraje inválido', 'El nuevo kilometraje no puede ser menor al kilometraje actual.')
      return
    }

    setIsSaving(true)
    setError(null)

    const { data, error: updateError } = await supabase
      .from('motorcycles')
      .update({ mileage })
      .eq('id', selectedBike.id)
      .eq('owner_id', selectedBike.owner_id)
      .select('*')
      .single()

    if (updateError) {
      notifyError('No pudimos actualizar el kilometraje', updateError.message)
    } else if (data) {
      setMotorcycles((current) => current.map((bike) => (bike.id === selectedBike.id ? (data as Motorcycle) : bike)))
      setMileageForm(emptyMileageForm)
      setShowUpdateMileage(false)
      toast.success('Kilometraje actualizado', {
        description:
          dueWithMileagePreview.length > 0
            ? `${dueWithMileagePreview.length} pendiente${dueWithMileagePreview.length === 1 ? '' : 's'} por km requieren revision.`
            : 'No hay pendientes vencidos por kilometraje.',
      })
    }

    setIsSaving(false)
  }

  const handleCreateReminder = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user || !selectedBike) return
    if (isNegativeNumber(reminderForm.due_mileage)) {
      notifyError('Kilometraje inválido', 'El kilometraje objetivo no puede ser negativo.')
      return
    }
    setIsSaving(true)
    setError(null)

    const { data, error: insertError } = await supabase
      .from('reminders')
      .insert({
        owner_id: user.id,
        motorcycle_id: selectedBike.id,
        title: reminderForm.title.trim(),
        due_mileage: reminderForm.due_mileage ? Number(reminderForm.due_mileage) : null,
        due_date: reminderForm.due_date || null,
      })
      .select('*')
      .single()

    if (insertError) {
      notifyError('No pudimos crear el recordatorio', insertError.message)
    } else if (data) {
      setReminders((current) => [data as Reminder, ...current])
      setReminderForm(emptyReminderForm)
      setShowAddReminder(false)
      toast.success('Recordatorio creado', { description: 'El pendiente quedó agregado a tu moto.' })
    }

    setIsSaving(false)
  }

  const handleUpdateReminder = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user || !editingReminder) return
    if (isNegativeNumber(editReminderForm.due_mileage)) {
      notifyError('Kilometraje inválido', 'El kilometraje objetivo no puede ser negativo.')
      return
    }
    setIsSaving(true)
    setError(null)

    const { data, error: updateError } = await supabase
      .from('reminders')
      .update({
        title: editReminderForm.title.trim(),
        due_mileage: editReminderForm.due_mileage ? Number(editReminderForm.due_mileage) : null,
        due_date: editReminderForm.due_date || null,
      })
      .eq('id', editingReminder.id)
      .eq('owner_id', user.id)
      .select('*')
      .single()

    if (updateError) {
      notifyError('No pudimos actualizar el recordatorio', updateError.message)
    } else if (data) {
      setReminders((current) => current.map((reminder) => (reminder.id === editingReminder.id ? (data as Reminder) : reminder)))
      setEditingReminder(null)
      setEditReminderForm(emptyReminderForm)
      setShowEditReminder(false)
      toast.success('Recordatorio actualizado', { description: 'Los cambios del pendiente quedaron guardados.' })
    }

    setIsSaving(false)
  }

  const dismissReminder = async (reminder: Reminder) => {
    if (!supabase || !user) return
    const confirmed = window.confirm(`Cancelar el pendiente "${reminder.title}"?`)
    if (!confirmed) return

    setIsSaving(true)
    setError(null)

    const { data, error: updateError } = await supabase
      .from('reminders')
      .update({ status: 'dismissed' })
      .eq('id', reminder.id)
      .eq('owner_id', user.id)
      .select('*')
      .single()

    if (updateError) {
      notifyError('No pudimos cancelar el pendiente', updateError.message)
    } else if (data) {
      setReminders((current) => current.map((item) => (item.id === reminder.id ? (data as Reminder) : item)))
      toast.success('Pendiente cancelado', { description: 'Ya no aparecerá en la lista de pendientes.' })
    }

    setIsSaving(false)
  }

  const openCompleteReminder = (reminder: Reminder) => {
    if (!selectedBike) return
    const defaultInterval = defaultIntervalForReminder(reminder.title)
    setCompletingReminder(reminder)
    setCompletionForm({
      action: reminder.title,
      mileage: selectedBike.mileage.toString(),
      service_date: todayString(),
      next_interval_km: defaultInterval.toString(),
      next_due_date: '',
      notes: '',
    })
    setShowCompleteReminder(true)
  }

  const handleCompleteReminder = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user || !selectedBike || !completingReminder) return
    setIsSaving(true)
    setError(null)

    const mileage = completionForm.mileage ? Number(completionForm.mileage) : selectedBike.mileage
    const nextIntervalKm = completionForm.next_interval_km ? Number(completionForm.next_interval_km) : null
    const nextDueMileage = nextIntervalKm ? mileage + nextIntervalKm : null

    const { data: recordData, error: recordError } = await supabase
      .from('maintenance_records')
      .insert({
        owner_id: user.id,
        motorcycle_id: selectedBike.id,
        service_type: completionForm.action.trim(),
        service_date: completionForm.service_date,
        mileage,
        cost: null,
        notes: completionForm.notes.trim() || `Completado desde pendiente: ${completingReminder.title}`,
      })
      .select('*')
      .single()

    if (recordError) {
      notifyError('No pudimos completar el pendiente', recordError.message)
      setIsSaving(false)
      return
    }

    const { data: reminderData, error: reminderError } = await supabase
      .from('reminders')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', completingReminder.id)
      .select('*')
      .single()

    if (reminderError) {
      notifyError('No pudimos marcar el pendiente como completado', reminderError.message)
      setIsSaving(false)
      return
    }

    let nextReminder: Reminder | null = null
    if (nextDueMileage || completionForm.next_due_date) {
      const { data: nextData, error: nextError } = await supabase
        .from('reminders')
        .insert({
          owner_id: user.id,
          motorcycle_id: selectedBike.id,
          title: completionForm.action.trim(),
          due_mileage: nextDueMileage,
          due_date: completionForm.next_due_date || null,
        })
        .select('*')
        .single()

      if (nextError) {
        notifyError('El pendiente se completo, pero no se creó el próximo ajuste', nextError.message)
        setIsSaving(false)
        return
      }
      nextReminder = nextData as Reminder
    }

    setRecords((current) => [recordData as MaintenanceRecord, ...current])
    setReminders((current) => {
      const updated = current.map((item) => (item.id === completingReminder.id ? (reminderData as Reminder) : item))
      return nextReminder ? [nextReminder, ...updated] : updated
    })

    if (mileage > selectedBike.mileage) {
      const { data: updatedBike } = await supabase
        .from('motorcycles')
        .update({ mileage })
        .eq('id', selectedBike.id)
        .select('*')
        .single()

      if (updatedBike) {
        setMotorcycles((current) => current.map((bike) => (bike.id === selectedBike.id ? (updatedBike as Motorcycle) : bike)))
      }
    }

    setCompletionForm(emptyCompletionForm())
    setCompletingReminder(null)
    setShowCompleteReminder(false)
    toast.success('Pendiente completado', {
      description: nextReminder ? 'Se guardó en historial y se creó el próximo pendiente.' : 'Se guardó en el historial.',
    })
    setIsSaving(false)
  }

  const sanitizeFileName = (name: string) => name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')

  const validateMotorcyclePhoto = (file: File) => {
    if (!file.type.startsWith('image/')) return 'Selecciona una imagen en formato JPG, PNG o WebP.'
    if (file.size > 5 * 1024 * 1024) return 'Usa una imagen de máximo 5 MB.'
    return null
  }

  const uploadMotorcyclePhotoFile = async (motorcycleId: string, file: File) => {
    if (!supabase || !user) return null

    const validationError = validateMotorcyclePhoto(file)
    if (validationError) {
      notifyError(validationError.includes('máximo') ? 'Imagen muy pesada' : 'Archivo no válido', validationError)
      return null
    }

    const path = `${user.id}/motorcycles/${motorcycleId}/${Date.now()}-${sanitizeFileName(file.name)}`
    const { error: uploadError } = await supabase.storage.from('motocare-public').upload(path, file, { upsert: false })

    if (uploadError) {
      notifyError('No pudimos subir la foto', uploadError.message)
      return null
    }

    const { data: publicUrlData } = supabase.storage.from('motocare-public').getPublicUrl(path)
    return `${publicUrlData.publicUrl}?v=${Date.now()}`
  }

  const uploadMotorcyclePhoto = async (file: File) => {
    if (!supabase || !user || !selectedBike) {
      notifyError('No pudimos cambiar la foto', 'Selecciona una moto antes de cargar una imagen.')
      return
    }

    setUploadingKey('photo')
    setError(null)

    const selectedBikeId = selectedBike.id
    const imageUrl = await uploadMotorcyclePhotoFile(selectedBikeId, file)
    if (!imageUrl) {
      setUploadingKey(null)
      return
    }

    const { data, error: updateError } = await supabase
      .from('motorcycles')
      .update({ image_url: imageUrl })
      .eq('id', selectedBikeId)
      .eq('owner_id', user.id)
      .select('*')
      .single()

    if (updateError) {
      notifyError('La foto subio, pero no pudimos asociarla a la moto', updateError.message)
    } else if (data) {
      setMotorcycles((current) => current.map((bike) => (bike.id === selectedBikeId ? (data as Motorcycle) : bike)))
      toast.success('Foto actualizada', { description: 'La imagen de la moto quedo guardada.' })
    } else {
      notifyError('No pudimos actualizar la moto', 'La base de datos no devolvio la moto actualizada.')
    }

    setUploadingKey(null)
  }

  const uploadMotorcycleDocument = async (file: File, documentType: MotorcycleDocument['document_type']) => {
    if (!supabase || !user || !selectedBike) return
    setUploadingKey(documentType)
    setError(null)

    const path = `${user.id}/documents/${selectedBike.id}/${documentType}-${Date.now()}-${sanitizeFileName(file.name)}`
    const { error: uploadError } = await supabase.storage.from('motocare-documents').upload(path, file, { upsert: false })

    if (uploadError) {
      notifyError('No pudimos subir el documento', uploadError.message)
      setUploadingKey(null)
      return
    }

    const { data, error: insertError } = await supabase
      .from('motorcycle_documents')
      .insert({
        owner_id: user.id,
        motorcycle_id: selectedBike.id,
        document_type: documentType,
        file_name: file.name,
        file_path: path,
        mime_type: file.type || null,
      })
      .select('*')
      .single()

    if (insertError) {
      notifyError('El archivo subio, pero no pudimos registrar el documento', insertError.message)
    } else if (data) {
      setDocuments((current) => [data as MotorcycleDocument, ...current])
      toast.success('Documento cargado', { description: `${file.name} quedó guardado en la moto.` })
    }

    setUploadingKey(null)
  }

  const deleteMotorcycleDocument = async (document: MotorcycleDocument) => {
    if (!supabase || !user) return
    const confirmed = window.confirm(`Eliminar el documento "${document.file_name}"?`)
    if (!confirmed) return

    setUploadingKey(document.document_type)
    setError(null)

    const { error: storageError } = await supabase.storage.from('motocare-documents').remove([document.file_path])
    if (storageError) {
      notifyError('No pudimos eliminar el archivo', storageError.message)
      setUploadingKey(null)
      return
    }

    const { error: deleteError } = await supabase
      .from('motorcycle_documents')
      .delete()
      .eq('id', document.id)
      .eq('owner_id', user.id)

    if (deleteError) {
      notifyError('El archivo se elimino, pero no pudimos quitar el registro', deleteError.message)
    } else {
      setDocuments((current) => current.filter((item) => item.id !== document.id))
      toast.success('Documento eliminado', { description: `${document.file_name} se quito de la moto.` })
    }

    setUploadingKey(null)
  }

  const openPrivateDocument = async (document: MotorcycleDocument) => {
    if (!supabase) return
    const { data, error: signedUrlError } = await supabase.storage
      .from('motocare-documents')
      .createSignedUrl(document.file_path, 60)

    if (signedUrlError) {
      notifyError('No pudimos abrir el documento', signedUrlError.message)
      return
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
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
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="mb-1 text-2xl font-bold">Mi moto</h1>
          <p className="text-gray-400">Tu moto, mantenimientos y vencimientos en un solo lugar.</p>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:flex sm:flex-wrap sm:gap-3">
          {!isBusinessAccount && (
            <Button className="min-w-0 bg-moto-orange px-2 text-xs text-moto-darker hover:bg-moto-orange-dark sm:px-4 sm:text-sm" onClick={openCreateBike}>
              <Plus className="mr-1 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" />
              <span className="sm:hidden">Moto</span>
              <span className="hidden sm:inline">Agregar moto</span>
            </Button>
          )}
          {selectedBike && (
            <Button variant="outline" className="min-w-0 border-white/10 px-2 text-xs sm:px-4 sm:text-sm" onClick={openCreateService}>
              <Wrench className="mr-1 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" />
              <span className="sm:hidden">Servicio</span>
              <span className="hidden sm:inline">Registrar servicio</span>
            </Button>
          )}
          {selectedBike && (
            <Button variant="outline" className="min-w-0 border-white/10 px-2 text-xs sm:px-4 sm:text-sm" onClick={openMileageReminder}>
              <Gauge className="mr-1 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" />
              <span className="sm:hidden">Km</span>
              <span className="hidden sm:inline">Recordatorio km</span>
            </Button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      {isBusinessAccount ? (
        <Card className="border-white/5 bg-moto-gray">
          <CardContent className="grid min-h-[360px] place-items-center p-8 text-center">
            <div>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-sky-500/15">
                <Wrench className="h-10 w-10 text-sky-300" />
              </div>
              <h2 className="mt-6 text-2xl font-bold">Cuenta Business</h2>
              <p className="mx-auto mt-2 max-w-md text-gray-400">
                Esta licencia es para negocios. No permite registrar motos ni operar como motero.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : motorcycles.length === 0 ? (
        <Card className="border-white/5 bg-moto-gray">
          <CardContent className="grid min-h-[420px] place-items-center p-8 text-center">
            <div>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-moto-orange/20">
                <Bike className="h-10 w-10 text-moto-orange" />
              </div>
              <h2 className="mt-6 text-2xl font-bold">Crea tu primer garaje MotoCare Co</h2>
              <p className="mx-auto mt-2 max-w-md text-gray-400">
                Registra tu moto para empezar a controlar SOAT, tecnomecánica, kilometraje y mantenimientos.
              </p>
              <Button className="mt-6 bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={openCreateBike}>
                <Plus className="mr-2 h-5 w-5" />
                Agregar mi moto
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-3">
            {orderedMotorcycles.map((motorcycle) => (
              <button
                key={motorcycle.id}
                onClick={() => setSelectedId(motorcycle.id)}
                className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 transition-all ${
                  selectedBike?.id === motorcycle.id ? 'border-moto-orange bg-moto-orange/20' : 'border-white/5 bg-moto-gray hover:border-white/20'
                }`}
              >
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-moto-darker">
                  {motorcycle.image_url ? (
                    <img src={motorcycle.image_url} alt={`${motorcycle.brand} ${motorcycle.model}`} className="h-full w-full object-cover" />
                  ) : (
                    <Bike className="h-8 w-8 text-moto-orange" />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">
                      {motorcycle.brand} {motorcycle.model}
                    </p>
                    {motorcycle.id === profile?.primary_motorcycle_id && (
                      <Badge className="shrink-0 bg-moto-orange text-moto-darker">Principal</Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-gray-400">
                    {motorcycle.year ?? 'Sin año'} - {motorcycle.plate ?? 'Sin placa'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {selectedBike && (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="overflow-hidden border-white/5 bg-moto-gray lg:col-span-2">
                <div className="relative min-h-[18rem] overflow-hidden sm:min-h-80">
                  <button
                    type="button"
                    className="absolute inset-0 h-full w-full text-left"
                    onClick={() =>
                      setViewerImage({
                        src: selectedBike.image_url ?? '/hero-motorcycle.jpg',
                        alt: `${selectedBike.brand} ${selectedBike.model}`,
                      })
                    }
                  >
                    <img src={selectedBike.image_url ?? '/hero-motorcycle.jpg'} alt={selectedBike.model} className="h-full w-full object-cover transition hover:scale-[1.01]" />
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-t from-moto-gray via-moto-gray/30 to-transparent" />
                  <div className="absolute inset-x-4 bottom-4">
                    <div className="space-y-4">
                      <div className="max-w-full">
                        <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
                          {selectedBike.brand} {selectedBike.model}
                        </h2>
                        <p className="mt-1 text-sm text-gray-300 sm:text-base">
                          {selectedBike.year ?? 'Sin año'} - {selectedBike.color ?? 'Sin color'} - {selectedBike.plate ?? 'Sin placa'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                        <Badge className="col-span-2 justify-center bg-moto-orange px-4 py-2 text-sm text-moto-darker sm:col-span-1">{healthScore}% Salud</Badge>
                        <Button size="sm" variant="outline" className="border-white/20 bg-black/30" onClick={() => openEditBike(selectedBike)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" className="border-white/20 bg-black/30" onClick={openUpdateMileage}>
                          <Gauge className="mr-2 h-4 w-4" />
                          Km
                        </Button>
                        <label className="col-span-2 inline-flex cursor-pointer items-center justify-center rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm transition-colors hover:bg-white/10 sm:col-span-1">
                          {uploadingKey === 'photo' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                          Foto
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingKey !== null}
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file) void uploadMotorcyclePhoto(file)
                              event.target.value = ''
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 sm:p-6">
                  <Tabs
                    id="bike-sections"
                    value={activeTab}
                    onValueChange={(value) => {
                      const nextTab = value as BikeTab
                      setActiveTab(nextTab)
                      window.history.replaceState(null, '', '#' + nextTab)
                    }}
                    className="w-full scroll-mt-24"
                  >
                    <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-2 border-white/5 bg-moto-darker p-1 sm:grid-cols-4">
                      <TabsTrigger value="reminders" className="min-w-0 data-[state=active]:bg-moto-orange data-[state=active]:text-moto-darker">
                        Pendientes
                      </TabsTrigger>
                      <TabsTrigger value="history" className="min-w-0 data-[state=active]:bg-moto-orange data-[state=active]:text-moto-darker">
                        Historial
                      </TabsTrigger>
                      <TabsTrigger value="reports" className="min-w-0 data-[state=active]:bg-moto-orange data-[state=active]:text-moto-darker">
                        Informes
                      </TabsTrigger>
                      <TabsTrigger value="documents" className="min-w-0 data-[state=active]:bg-moto-orange data-[state=active]:text-moto-darker">
                        Documentos
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="reminders" className="space-y-4">
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" className="border-white/10" onClick={openMileageReminder}>
                          <Gauge className="mr-2 h-4 w-4" />
                          Nuevo por km
                        </Button>
                      </div>
                      {selectedReminders.length > 0 ? (
                        selectedReminders.map((reminder) => (
                          <div key={reminder.id} className="flex flex-col gap-3 rounded-xl bg-moto-darker p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-yellow-500/20">
                                <CalendarClock className="h-5 w-5 text-yellow-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="break-words font-medium">{reminder.title}</p>
                                <p className="text-sm text-gray-400">
                                  {reminder.due_date ? `Fecha: ${reminder.due_date}` : ''}
                                  {reminder.due_mileage ? ` - ${reminder.due_mileage.toLocaleString()} km` : ''}
                                </p>
                                {reminder.due_mileage && selectedBike && (
                                  <p
                                    className={`text-xs ${
                                      reminder.due_mileage <= selectedBike.mileage ? 'text-red-400' : 'text-moto-orange'
                                    }`}
                                  >
                                    {reminder.due_mileage <= selectedBike.mileage
                                      ? `${(selectedBike.mileage - reminder.due_mileage).toLocaleString()} km vencido`
                                      : `Faltan ${(reminder.due_mileage - selectedBike.mileage).toLocaleString()} km`}
                                  </p>
                                )}
                                {reminder.due_date && !reminder.due_mileage && (
                                  <p className={`text-xs ${statusForDate(reminder.due_date).tone}`}>{statusForDate(reminder.due_date).label}</p>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
                              <Button size="sm" variant="outline" className="min-w-0 border-white/10 px-2 sm:px-3" onClick={() => openEditReminder(reminder)}>
                                Editar
                              </Button>
                              <Button size="sm" variant="outline" className="min-w-0 border-white/10 px-2 sm:px-3" onClick={() => dismissReminder(reminder)}>
                                <XCircle className="mr-1 h-4 w-4 sm:mr-2" />
                                Cancelar
                              </Button>
                              <Button size="sm" variant="outline" className="min-w-0 border-white/10 px-2 sm:px-3" onClick={() => openCompleteReminder(reminder)}>
                                Completar
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-white/5 bg-moto-darker p-5 text-center text-gray-400">
                          No tienes pendientes para esta moto.
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="history" className="space-y-2">
                      {selectedRecords.length > 0 ? (
                        selectedRecords.map((record) => (
                          <div key={record.id} className="flex flex-col gap-3 rounded-xl bg-moto-darker p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-green-500/20">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium">{record.service_type}</p>
                                <p className="text-sm text-gray-400">
                                  {record.mileage.toLocaleString()} km - {record.service_date}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
                              <Button size="sm" variant="outline" className="min-w-0 border-white/10 px-2 sm:px-3" onClick={() => openRecordDetail(record)}>
                                Ver detalle
                              </Button>
                              <Badge variant="secondary" className="min-w-0 justify-center truncate bg-green-500/20 px-1 text-[11px] text-green-500 sm:px-2 sm:text-xs">
                                Completado
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-white/5 bg-moto-darker p-5 text-center text-gray-400">
                          Aún no hay mantenimientos registrados.
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="reports" className="space-y-4">
                      {isLoadingSubscription ? (
                        <div className="grid min-h-48 place-items-center rounded-xl border border-white/5 bg-moto-darker text-moto-orange">
                          <Loader2 className="h-7 w-7 animate-spin" />
                        </div>
                      ) : canViewMaintenanceReports ? (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <ReportCard icon={DollarSign} label="Gasto total" value={formatMoney(maintenanceReport.totalSpent)} detail={`${maintenanceReport.totalServices} servicios`} />
                            <ReportCard icon={CalendarClock} label="Este año" value={formatMoney(maintenanceReport.yearSpent)} detail={`Este mes: ${formatMoney(maintenanceReport.monthSpent)}`} />
                            <ReportCard icon={BarChart3} label="Promedio por servicio" value={formatMoney(maintenanceReport.averageCost)} detail="Servicios con costo" />
                            <ReportCard
                              icon={Clock}
                              label="Último servicio"
                              value={maintenanceReport.daysSinceLast !== null ? `${maintenanceReport.daysSinceLast} días` : 'Sin datos'}
                              detail={maintenanceReport.lastRecord?.service_type ?? 'Registra un mantenimiento'}
                            />
                          </div>

                          <div className="grid gap-4 lg:grid-cols-2">
                            <Card className="border-white/5 bg-moto-darker py-0">
                              <CardContent className="p-4">
                                <h3 className="mb-3 font-semibold">Tiempos y kilometraje</h3>
                                <div className="space-y-3">
                                  <ReportLine label="Promedio entre servicios" value={maintenanceReport.averageDaysBetweenServices !== null ? `${maintenanceReport.averageDaysBetweenServices} días` : 'Sin datos suficientes'} />
                                  <ReportLine label="Promedio entre kilometrajes" value={maintenanceReport.averageKmBetweenServices !== null ? `${maintenanceReport.averageKmBetweenServices.toLocaleString()} km` : 'Sin datos suficientes'} />
                                  <ReportLine label="Último kilometraje registrado" value={maintenanceReport.lastRecord ? `${maintenanceReport.lastRecord.mileage.toLocaleString()} km` : 'Sin registros'} />
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="border-white/5 bg-moto-darker py-0">
                              <CardContent className="p-4">
                                <h3 className="mb-3 font-semibold">Gastos por tipo</h3>
                                {maintenanceReport.topExpenseTypes.length > 0 ? (
                                  <div className="space-y-3">
                                    {maintenanceReport.topExpenseTypes.map(([serviceType, total]) => (
                                      <ReportLine key={serviceType} label={serviceType} value={formatMoney(total)} />
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-400">Agrega costos a tus mantenimientos para ver este informe.</p>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-xl border border-moto-orange/20 bg-moto-orange/10 p-5">
                          <div className="mb-3 flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-moto-orange text-moto-darker">
                              <BarChart3 className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold">Informes disponibles desde Premium</h3>
                              <p className="text-sm text-gray-300">Actualice su cuenta para ver gastos, tiempos y promedios de mantenimiento.</p>
                            </div>
                          </div>
                          <Badge className="bg-moto-orange text-moto-darker">Premium</Badge>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="documents">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {([
                          ['SOAT', selectedBike.soat_expires_on, 'soat'],
                          ['Tecnomecánica', selectedBike.technical_review_expires_on, 'technical_review'],
                        ] satisfies Array<[string, string | null, MotorcycleDocument['document_type']]>).map(([title, date, documentType]) => {
                          const status = statusForDate(date)
                          const document = selectedDocuments.find((item) => item.document_type === documentType)
                          return (
                            <Card key={title} className="border-white/5 bg-moto-darker p-4">
                              <div className="flex items-start gap-3">
                                <div className="grid h-12 w-12 place-items-center rounded-lg bg-moto-orange/20">
                                  <FileText className="h-6 w-6 text-moto-orange" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">{title}</p>
                                  <p className={`text-sm ${status.tone}`}>{status.label}</p>
                                  {document && <p className="mt-1 truncate text-xs text-gray-500">{document.file_name}</p>}
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <label className="inline-flex cursor-pointer items-center rounded-md border border-white/10 px-3 py-2 text-xs transition-colors hover:bg-white/5">
                                      {uploadingKey === documentType ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <Upload className="mr-2 h-4 w-4" />
                                      )}
                                      Subir
                                      <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        disabled={uploadingKey !== null}
                                        onChange={(event) => {
                                          const file = event.target.files?.[0]
                                          if (file) void uploadMotorcycleDocument(file, documentType)
                                          event.target.value = ''
                                        }}
                                      />
                                    </label>
                                    {document && (
                                      <>
                                        <Button size="sm" variant="outline" className="border-white/10 text-xs" onClick={() => openPrivateDocument(document)}>
                                          <ExternalLink className="mr-2 h-4 w-4" />
                                          Ver
                                        </Button>
                                        <Button size="sm" variant="outline" className="border-white/10 text-xs" onClick={() => deleteMotorcycleDocument(document)}>
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Eliminar
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                      {selectedDocuments.filter((document) => document.document_type === 'other').length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h3 className="text-sm font-semibold text-gray-400">Otros documentos</h3>
                          {selectedDocuments
                            .filter((document) => document.document_type === 'other')
                            .map((document) => (
                              <div key={document.id} className="flex items-center justify-between rounded-xl bg-moto-darker p-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{document.file_name}</p>
                                  <p className="text-xs text-gray-500">{new Date(document.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  <Button size="sm" variant="outline" className="border-white/10" onClick={() => openPrivateDocument(document)}>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Ver
                                  </Button>
                                  <Button size="sm" variant="outline" className="border-white/10" onClick={() => deleteMotorcycleDocument(document)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                      <label className="mt-4 inline-flex cursor-pointer items-center rounded-md border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/5">
                        {uploadingKey === 'other' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Subir otro documento
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          disabled={uploadingKey !== null}
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) void uploadMotorcycleDocument(file, 'other')
                            event.target.value = ''
                          }}
                        />
                      </label>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="border-white/5 bg-moto-gray">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-moto-orange/20">
                        <Gauge className="h-6 w-6 text-moto-orange" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Kilometraje</p>
                        <p className="text-2xl font-bold">{selectedBike.mileage.toLocaleString()} km</p>
                      </div>
                    </div>
                    <p className="mb-4 text-xs text-gray-500">Mantén este dato al día para activar pendientes por kilometraje.</p>
                    <Button size="sm" variant="outline" className="w-full border-white/10" onClick={openUpdateMileage}>
                      <Gauge className="mr-2 h-4 w-4" />
                      Actualizar km
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-white/5 bg-moto-gray">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-green-500/20">
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Estado general</p>
                        <p className="text-2xl font-bold text-green-500">{healthScore}%</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">SOAT</span>
                        <span className={statusForDate(selectedBike.soat_expires_on).tone}>{statusForDate(selectedBike.soat_expires_on).label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tecnomecánica</span>
                        <span className={statusForDate(selectedBike.technical_review_expires_on).tone}>
                          {statusForDate(selectedBike.technical_review_expires_on).label}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/5 bg-moto-gray">
                  <CardContent className="p-4">
                    <h3 className="mb-3 font-semibold">Acciones rápidas</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start border-white/10" onClick={openCreateService}>
                        <Wrench className="mr-2 h-4 w-4" />
                        Registrar servicio
                      </Button>
                      <Button variant="outline" className="w-full justify-start border-white/10" onClick={openMileageReminder}>
                        <Gauge className="mr-2 h-4 w-4" />
                        Crear recordatorio km
                      </Button>
                      <Button variant="outline" className="w-full justify-start border-white/10" onClick={openUpdateMileage}>
                        <Gauge className="mr-2 h-4 w-4" />
                        Actualizar kilometraje
                      </Button>
                      <Button variant="outline" className="w-full justify-start border-white/10" onClick={openCreateBike}>
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar otra moto
                      </Button>
                      <Button variant="outline" className="w-full justify-start border-white/10" onClick={() => openEditBike(selectedBike)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar moto
                      </Button>
                      <label className="flex w-full cursor-pointer items-center rounded-md border border-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/5">
                        {uploadingKey === 'photo' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                        Cambiar foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingKey !== null}
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) void uploadMotorcyclePhoto(file)
                            event.target.value = ''
                          }}
                        />
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={showAddBike} onOpenChange={(open) => { setShowAddBike(open); if (!open) { setEditingBike(null); setBikeForm(emptyBikeForm); setBikePhotoFile(null) } }}>
        <DialogContent className="max-w-md border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>{editingBike ? 'Editar moto' : 'Agregar moto'}</DialogTitle>
            <DialogDescription className="text-gray-400">{editingBike ? 'Actualiza la hoja de vida y vencimientos.' : 'Crea la hoja de vida inicial de tu moto.'}</DialogDescription>
          </DialogHeader>
          <form className="mt-4 space-y-4" onSubmit={editingBike ? handleUpdateBike : handleCreateBike}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Marca</span>
                <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.brand} onChange={(e) => setBikeForm({ ...bikeForm, brand: e.target.value })} placeholder="BMW" required />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Modelo</span>
                <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.model} onChange={(e) => setBikeForm({ ...bikeForm, model: e.target.value })} placeholder="F 850 GS" required />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Ano</span>
                <input type="number" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.year} onChange={(e) => setBikeForm({ ...bikeForm, year: e.target.value })} placeholder="2024" />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Placa</span>
                <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.plate} onChange={(e) => setBikeForm({ ...bikeForm, plate: e.target.value.toUpperCase() })} placeholder="ABC123" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Kilometraje</span>
                <input type="number" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.mileage} onChange={(e) => setBikeForm({ ...bikeForm, mileage: e.target.value })} placeholder="12500" />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Color</span>
                <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.color} onChange={(e) => setBikeForm({ ...bikeForm, color: e.target.value })} placeholder="Negro" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Vence SOAT</span>
                <input type="date" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.soat_expires_on} onChange={(e) => setBikeForm({ ...bikeForm, soat_expires_on: e.target.value })} />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Vence tecnomecánica</span>
                <input type="date" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.technical_review_expires_on} onChange={(e) => setBikeForm({ ...bikeForm, technical_review_expires_on: e.target.value })} />
              </label>
            </div>
            <div className="rounded-xl border border-white/10 bg-moto-darker p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-moto-gray">
                  {bikePhotoFile ? (
                    <ImageUp className="h-6 w-6 text-moto-orange" />
                  ) : editingBike?.image_url ? (
                    <img src={editingBike.image_url} alt="Foto actual de la moto" className="h-full w-full object-cover" />
                  ) : (
                    <Bike className="h-6 w-6 text-gray-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{bikePhotoFile ? bikePhotoFile.name : editingBike ? 'Foto actual de la moto' : 'Foto de la moto'}</p>
                  <p className="mt-1 text-xs text-gray-500">JPG, PNG o WebP. Maximo 5 MB.</p>
                </div>
              </div>
              <label className="mt-3 inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-md border border-white/10 px-4 text-sm font-medium transition-colors hover:bg-white/5">
                <ImageUp className="mr-2 h-4 w-4" />
                {bikePhotoFile ? 'Cambiar seleccion' : editingBike ? 'Cambiar foto' : 'Subir foto'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isSaving}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    const validationError = validateMotorcyclePhoto(file)
                    if (validationError) {
                      notifyError(validationError.includes('máximo') ? 'Imagen muy pesada' : 'Archivo no válido', validationError)
                      event.target.value = ''
                      return
                    }
                    setBikePhotoFile(file)
                    event.target.value = ''
                  }}
                />
              </label>
              {bikePhotoFile && (
                <button type="button" className="mt-2 text-sm text-gray-400 hover:text-white" onClick={() => setBikePhotoFile(null)}>
                  Quitar foto seleccionada
                </button>
              )}
            </div>
            <Button type="submit" disabled={isSaving} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingBike ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {editingBike ? 'Guardar cambios' : 'Agregar moto'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showUpdateMileage}
        onOpenChange={(open) => {
          setShowUpdateMileage(open)
          if (!open) setMileageForm(emptyMileageForm)
        }}
      >
        <DialogContent className="max-w-md border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>Actualizar kilometraje</DialogTitle>
            <DialogDescription className="text-gray-400">
              Mantener este dato al día ayuda a detectar servicios vencidos por kilometraje.
            </DialogDescription>
          </DialogHeader>
          <form className="mt-4 space-y-4" onSubmit={handleUpdateMileage}>
            <div className="rounded-xl border border-white/10 bg-moto-darker p-3">
              <p className="text-sm text-gray-400">Kilometraje actual</p>
              <p className="text-2xl font-bold">{selectedBike?.mileage.toLocaleString() ?? '0'} km</p>
            </div>

            <label>
              <span className="mb-1 block text-sm text-gray-400">Nuevo kilometraje</span>
              <input
                type="number"
                min={selectedBike?.mileage ?? 0}
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={mileageForm.mileage}
                onChange={(event) => setMileageForm({ mileage: event.target.value })}
                required
              />
            </label>

            {mileageForm.mileage && dueWithMileagePreview.length > 0 && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
                Con este kilometraje, {dueWithMileagePreview.length} pendiente
                {dueWithMileagePreview.length === 1 ? '' : 's'} quedaria
                {dueWithMileagePreview.length === 1 ? '' : 'n'} vencido
                {dueWithMileagePreview.length === 1 ? '' : 's'} por km.
              </div>
            )}

            {mileageForm.mileage && dueWithMileagePreview.length === 0 && Number(mileageForm.mileage) >= (selectedBike?.mileage ?? 0) && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                No hay pendientes por kilometraje vencidos con este valor.
              </div>
            )}

            <Button type="submit" disabled={isSaving} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gauge className="mr-2 h-4 w-4" />}
              Guardar kilometraje
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showRecordDetail}
        onOpenChange={(open) => {
          setShowRecordDetail(open)
          if (!open) setSelectedRecordDetail(null)
        }}
      >
        <DialogContent className="max-w-md border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>Detalle del mantenimiento</DialogTitle>
            <DialogDescription className="text-gray-400">
              Informacion registrada en el historial de la moto.
            </DialogDescription>
          </DialogHeader>
          {selectedRecordDetail && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3">
                <p className="text-sm text-gray-400">Servicio</p>
                <p className="text-xl font-bold text-green-400">{selectedRecordDetail.service_type}</p>
              </div>
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-moto-darker p-3">
                  <p className="text-gray-400">Fecha</p>
                  <p className="font-medium">{selectedRecordDetail.service_date}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-moto-darker p-3">
                  <p className="text-gray-400">Kilometraje</p>
                  <p className="font-medium">{selectedRecordDetail.mileage.toLocaleString()} km</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-moto-darker p-3">
                  <p className="text-gray-400">Costo</p>
                  <p className="font-medium">
                    {selectedRecordDetail.cost !== null ? `$ ${Number(selectedRecordDetail.cost).toLocaleString()}` : 'Sin costo'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-moto-darker p-3">
                  <p className="text-gray-400">Registro</p>
                  <p className="font-medium">{new Date(selectedRecordDetail.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-moto-darker p-3">
                <p className="mb-1 text-sm text-gray-400">Notas</p>
                <p className="text-sm text-gray-200">{selectedRecordDetail.notes || 'Sin notas registradas.'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddService} onOpenChange={setShowAddService}>
        <DialogContent className="max-w-md border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>Registrar servicio</DialogTitle>
            <DialogDescription className="text-gray-400">Guarda un mantenimiento en la hoja de vida.</DialogDescription>
          </DialogHeader>
          <form className="mt-4 space-y-4" onSubmit={handleCreateService}>
            {maintenanceSuggestions.length > 0 && (
              <label>
                <span className="mb-1 block text-sm text-gray-400">Mantenimiento sugerido</span>
                <select
                  className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                  value={serviceForm.suggestion_id}
                  onChange={(event) => applyServiceSuggestion(event.target.value)}
                >
                  {maintenanceSuggestions.map((suggestion) => (
                    <option key={suggestion.id} value={suggestion.id}>
                      {suggestion.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {selectedServiceSuggestion && (
              <div className="rounded-xl border border-white/10 bg-moto-darker p-3 text-sm text-gray-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-white">{selectedServiceSuggestion.category}</span>
                  <span className="text-moto-orange">
                    {selectedServiceSuggestion.recommended_interval_km?.toLocaleString() ?? 'Sin km'} km
                  </span>
                </div>
                {selectedServiceSuggestion.description && <p className="mt-2 text-gray-400">{selectedServiceSuggestion.description}</p>}
              </div>
            )}

            <label>
              <span className="mb-1 block text-sm text-gray-400">Tipo de servicio</span>
              <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={serviceForm.service_type} onChange={(e) => setServiceForm({ ...serviceForm, service_type: e.target.value })} required />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Fecha</span>
                <input type="date" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={serviceForm.service_date} onChange={(e) => setServiceForm({ ...serviceForm, service_date: e.target.value })} required />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Kilometraje</span>
                <input
                  type="number"
                  className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                  value={serviceForm.mileage}
                  onChange={(e) => {
                    const mileage = e.target.value
                    const nextInterval = selectedServiceSuggestion?.recommended_interval_km
                    setServiceForm({
                      ...serviceForm,
                      mileage,
                      next_due_mileage: nextInterval ? (Number(mileage || 0) + nextInterval).toString() : serviceForm.next_due_mileage,
                    })
                  }}
                  placeholder={selectedBike?.mileage.toString()}
                />
              </label>
            </div>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Costo</span>
              <input type="number" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={serviceForm.cost} onChange={(e) => setServiceForm({ ...serviceForm, cost: e.target.value })} placeholder="120000" />
            </label>
            <div className="rounded-xl border border-moto-orange/20 bg-moto-orange/10 p-3">
              <p className="mb-3 text-sm font-medium text-moto-orange">Próximo servicio</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-sm text-gray-400">A los km</span>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                    value={serviceForm.next_due_mileage}
                    onChange={(e) => setServiceForm({ ...serviceForm, next_due_mileage: e.target.value })}
                    placeholder="15000"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm text-gray-400">Fecha próxima</span>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                    value={serviceForm.next_due_date}
                    onChange={(e) => setServiceForm({ ...serviceForm, next_due_date: e.target.value })}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Estos valores vienen sugeridos por el catálogo, pero puede editarlos o dejarlos vacíos.
              </p>
            </div>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Notas</span>
              <textarea className="h-20 w-full resize-none rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={serviceForm.notes} onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })} placeholder="Aceite, filtro, taller..." />
            </label>
            <Button type="submit" disabled={isSaving} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
              Guardar servicio
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCompleteReminder}
        onOpenChange={(open) => {
          setShowCompleteReminder(open)
          if (!open) {
            setCompletingReminder(null)
            setCompletionForm(emptyCompletionForm())
          }
        }}
      >
        <DialogContent className="max-w-lg border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>Completar pendiente</DialogTitle>
            <DialogDescription className="text-gray-400">
              Registra la actividad realizada y deja programado el próximo ajuste.
            </DialogDescription>
          </DialogHeader>
          <form className="mt-4 space-y-4" onSubmit={handleCompleteReminder}>
            <div className="rounded-xl border border-moto-orange/25 bg-moto-orange/10 p-3 text-sm text-moto-orange">
              <p className="font-semibold">{completingReminder?.title ?? 'Pendiente seleccionado'}</p>
              <p className="mt-1 text-moto-orange/90">
                Km actual de la moto: {selectedBike?.mileage.toLocaleString() ?? '0'} km
              </p>
            </div>

            <label>
              <span className="mb-1 block text-sm text-gray-400">Descripción de la acción</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={completionForm.action}
                onChange={(event) => setCompletionForm({ ...completionForm, action: event.target.value })}
                placeholder="Cambio de aceite"
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Kilometraje actual</span>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                  value={completionForm.mileage}
                  onChange={(event) => setCompletionForm({ ...completionForm, mileage: event.target.value })}
                  required
                />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Fecha de actividad</span>
                <input
                  type="date"
                  className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                  value={completionForm.service_date}
                  onChange={(event) => setCompletionForm({ ...completionForm, service_date: event.target.value })}
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Próximo ajuste en km</span>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                  value={completionForm.next_interval_km}
                  onChange={(event) => setCompletionForm({ ...completionForm, next_interval_km: event.target.value })}
                  placeholder="3000"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Fecha próxima opcional</span>
                <input
                  type="date"
                  className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                  value={completionForm.next_due_date}
                  onChange={(event) => setCompletionForm({ ...completionForm, next_due_date: event.target.value })}
                />
              </label>
            </div>

            {completionForm.mileage && completionForm.next_interval_km && (
              <div className="rounded-xl border border-white/10 bg-moto-darker p-3 text-sm text-gray-300">
                Próximo pendiente a los{' '}
                {(Number(completionForm.mileage) + Number(completionForm.next_interval_km)).toLocaleString()} km.
              </div>
            )}

            <label>
              <span className="mb-1 block text-sm text-gray-400">Notas</span>
              <textarea
                className="h-20 w-full resize-none rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={completionForm.notes}
                onChange={(event) => setCompletionForm({ ...completionForm, notes: event.target.value })}
                placeholder="Taller, repuestos, observaciones..."
              />
            </label>

            <Button type="submit" disabled={isSaving} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Guardar y completar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditReminder}
        onOpenChange={(open) => {
          setShowEditReminder(open)
          if (!open) {
            setEditingReminder(null)
            setEditReminderForm(emptyReminderForm)
          }
        }}
      >
        <DialogContent className="max-w-md border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>Editar recordatorio</DialogTitle>
            <DialogDescription className="text-gray-400">
              Ajusta el kilometraje, la fecha o el nombre del pendiente.
            </DialogDescription>
          </DialogHeader>
          <form className="mt-4 space-y-4" onSubmit={handleUpdateReminder}>
            {maintenanceSuggestions.length > 0 && (
              <label>
                <span className="mb-1 block text-sm text-gray-400">Usar sugerencia</span>
                <select
                  className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                  value={editReminderForm.suggestion_id}
                  onChange={(event) => applyEditReminderSuggestion(event.target.value)}
                >
                  <option value="">Mantener personalizado</option>
                  {maintenanceSuggestions.map((suggestion) => (
                    <option key={suggestion.id} value={suggestion.id}>
                      {suggestion.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {selectedEditSuggestion && (
              <div className="rounded-xl border border-white/10 bg-moto-darker p-3 text-sm text-gray-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-white">{selectedEditSuggestion.category}</span>
                  <span className="text-moto-orange">
                    {selectedEditSuggestion.recommended_interval_km?.toLocaleString() ?? 'Sin km'} km
                  </span>
                </div>
                {selectedEditSuggestion.description && <p className="mt-2 text-gray-400">{selectedEditSuggestion.description}</p>}
              </div>
            )}

            <label>
              <span className="mb-1 block text-sm text-gray-400">Titulo</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={editReminderForm.title}
                onChange={(event) => setEditReminderForm({ ...editReminderForm, title: event.target.value })}
                required
              />
            </label>

            <label>
              <span className="mb-1 block text-sm text-gray-400">Kilometraje objetivo editable</span>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={editReminderForm.due_mileage}
                onChange={(event) => setEditReminderForm({ ...editReminderForm, due_mileage: event.target.value })}
                placeholder="15000"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm text-gray-400">Fecha opcional</span>
              <input
                type="date"
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={editReminderForm.due_date}
                onChange={(event) => setEditReminderForm({ ...editReminderForm, due_date: event.target.value })}
              />
            </label>

            {selectedBike && editReminderForm.due_mileage && (
              <div className="rounded-xl border border-moto-orange/30 bg-moto-orange/10 p-3 text-sm text-moto-orange">
                Faltan {Math.max(Number(editReminderForm.due_mileage) - selectedBike.mileage, 0).toLocaleString()} km desde el kilometraje actual.
              </div>
            )}

            <Button type="submit" disabled={isSaving} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
              Guardar recordatorio
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddReminder} onOpenChange={setShowAddReminder}>
        <DialogContent className="max-w-md border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>Nuevo recordatorio por kilometraje</DialogTitle>
            <DialogDescription className="text-gray-400">
              Crea alertas como cambio de aceite, llantas, frenos o cadena según el kilometraje objetivo.
            </DialogDescription>
          </DialogHeader>
          <form className="mt-4 space-y-4" onSubmit={handleCreateReminder}>
            {maintenanceSuggestions.length > 0 && (
              <label>
                <span className="mb-1 block text-sm text-gray-400">Mantenimiento sugerido</span>
                <select
                  className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                  value={reminderForm.suggestion_id}
                  onChange={(event) => applyReminderSuggestion(event.target.value)}
                >
                  {maintenanceSuggestions.map((suggestion) => (
                    <option key={suggestion.id} value={suggestion.id}>
                      {suggestion.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {selectedSuggestion && (
              <div className="rounded-xl border border-white/10 bg-moto-darker p-3 text-sm text-gray-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-white">{selectedSuggestion.category}</span>
                  <span className="text-moto-orange">
                    {selectedSuggestion.recommended_interval_km?.toLocaleString() ?? 'Sin km'} km
                  </span>
                </div>
                {selectedSuggestion.description && <p className="mt-2 text-gray-400">{selectedSuggestion.description}</p>}
              </div>
            )}

            <label>
              <span className="mb-1 block text-sm text-gray-400">Titulo</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={reminderForm.title}
                onChange={(event) => setReminderForm({ ...reminderForm, title: event.target.value })}
                placeholder="Cambio de aceite"
                required
              />
            </label>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Kilometraje objetivo editable</span>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={reminderForm.due_mileage}
                onChange={(event) => setReminderForm({ ...reminderForm, due_mileage: event.target.value })}
                placeholder={selectedBike ? (selectedBike.mileage + 3000).toString() : '15000'}
                required
              />
              <span className="mt-1 block text-xs text-gray-500">
                La sugerencia lo llena automáticamente, pero puede cambiarlo antes de crear el pendiente.
              </span>
            </label>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Fecha opcional</span>
              <input
                type="date"
                className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white"
                value={reminderForm.due_date}
                onChange={(event) => setReminderForm({ ...reminderForm, due_date: event.target.value })}
              />
            </label>
            {selectedBike && reminderForm.due_mileage && (
              <div className="rounded-xl border border-moto-orange/30 bg-moto-orange/10 p-3 text-sm text-moto-orange">
                Faltan {Math.max(Number(reminderForm.due_mileage) - selectedBike.mileage, 0).toLocaleString()} km desde el kilometraje actual.
              </div>
            )}
            <Button type="submit" disabled={isSaving} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gauge className="mr-2 h-4 w-4" />}
              Crear recordatorio
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
