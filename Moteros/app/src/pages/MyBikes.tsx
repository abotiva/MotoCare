import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Bike,
  CalendarClock,
  CheckCircle,
  FileText,
  Gauge,
  Loader2,
  Plus,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { MaintenanceRecord, Motorcycle, Reminder } from '@/types/database'

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
  service_type: string
  service_date: string
  mileage: string
  cost: string
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
  service_type: 'Cambio de aceite',
  service_date: new Date().toISOString().slice(0, 10),
  mileage: '',
  cost: '',
  notes: '',
}

function daysUntil(date: string | null) {
  if (!date) return null
  const today = new Date()
  const target = new Date(`${date}T00:00:00`)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function statusForDate(date: string | null) {
  const days = daysUntil(date)
  if (days === null) return { label: 'Sin fecha', tone: 'text-gray-400' }
  if (days < 0) return { label: `Vencido hace ${Math.abs(days)} dias`, tone: 'text-red-400' }
  if (days <= 30) return { label: `Vence en ${days} dias`, tone: 'text-yellow-400' }
  return { label: `Vigente hasta ${date}`, tone: 'text-green-500' }
}

export function MyBikes() {
  const { user } = useAuth()
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([])
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddBike, setShowAddBike] = useState(false)
  const [showAddService, setShowAddService] = useState(false)
  const [bikeForm, setBikeForm] = useState<BikeForm>(emptyBikeForm)
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm)

  const selectedBike = useMemo(
    () => motorcycles.find((motorcycle) => motorcycle.id === selectedId) ?? motorcycles[0] ?? null,
    [motorcycles, selectedId]
  )

  const selectedRecords = useMemo(
    () => records.filter((record) => record.motorcycle_id === selectedBike?.id),
    [records, selectedBike?.id]
  )

  const selectedReminders = useMemo(
    () => reminders.filter((reminder) => reminder.motorcycle_id === selectedBike?.id && reminder.status === 'pending'),
    [reminders, selectedBike?.id]
  )

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

    const loadGarage = async () => {
      setIsLoading(true)
      setError(null)

      const [motorcyclesResult, recordsResult, remindersResult] = await Promise.all([
        supabase.from('motorcycles').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
        supabase.from('maintenance_records').select('*').eq('owner_id', user.id).order('service_date', { ascending: false }),
        supabase.from('reminders').select('*').eq('owner_id', user.id).order('due_date', { ascending: true, nullsFirst: false }),
      ])

      if (motorcyclesResult.error || recordsResult.error || remindersResult.error) {
        setError(
          motorcyclesResult.error?.message ||
            recordsResult.error?.message ||
            remindersResult.error?.message ||
            'No pudimos cargar tu garaje.'
        )
      } else {
        const nextMotorcycles = (motorcyclesResult.data ?? []) as Motorcycle[]
        setMotorcycles(nextMotorcycles)
        setRecords((recordsResult.data ?? []) as MaintenanceRecord[])
        setReminders((remindersResult.data ?? []) as Reminder[])
        setSelectedId((current) => current ?? nextMotorcycles[0]?.id ?? null)
      }

      setIsLoading(false)
    }

    loadGarage()
  }, [user])

  const handleCreateBike = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return
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
      setError(insertError.message)
    } else if (data) {
      const motorcycle = data as Motorcycle
      setMotorcycles((current) => [motorcycle, ...current])
      setSelectedId(motorcycle.id)
      setBikeForm(emptyBikeForm)
      setShowAddBike(false)

      const starterReminders: StarterReminder[] = [
        motorcycle.soat_expires_on
          ? { owner_id: user.id, motorcycle_id: motorcycle.id, title: 'Renovar SOAT', due_date: motorcycle.soat_expires_on }
          : null,
        motorcycle.technical_review_expires_on
          ? {
              owner_id: user.id,
              motorcycle_id: motorcycle.id,
              title: 'Renovar tecnomecanica',
              due_date: motorcycle.technical_review_expires_on,
            }
          : null,
      ].filter((reminder): reminder is StarterReminder => Boolean(reminder))

      if (starterReminders.length > 0) {
        const { data: reminderData } = await supabase.from('reminders').insert(starterReminders).select('*')
        setReminders((current) => [...((reminderData as Reminder[] | null) ?? []), ...current])
      }
    }

    setIsSaving(false)
  }

  const handleCreateService = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user || !selectedBike) return
    setIsSaving(true)
    setError(null)

    const mileage = serviceForm.mileage ? Number(serviceForm.mileage) : selectedBike.mileage
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
      setError(insertError.message)
    } else if (data) {
      setRecords((current) => [data as MaintenanceRecord, ...current])
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
    }

    setIsSaving(false)
  }

  const markReminderDone = async (reminder: Reminder) => {
    if (!supabase) return
    const { data, error: updateError } = await supabase
      .from('reminders')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', reminder.id)
      .select('*')
      .single()

    if (updateError) {
      setError(updateError.message)
      return
    }

    setReminders((current) => current.map((item) => (item.id === reminder.id ? (data as Reminder) : item)))
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
          <p className="text-gray-400">Hoja de vida, mantenimientos y vencimientos en un solo lugar.</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => setShowAddBike(true)}>
            <Plus className="mr-2 h-5 w-5" />
            Agregar moto
          </Button>
          {selectedBike && (
            <Button variant="outline" className="border-white/10" onClick={() => setShowAddService(true)}>
              <Wrench className="mr-2 h-5 w-5" />
              Registrar servicio
            </Button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      {motorcycles.length === 0 ? (
        <Card className="border-white/5 bg-moto-gray">
          <CardContent className="grid min-h-[420px] place-items-center p-8 text-center">
            <div>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-moto-orange/20">
                <Bike className="h-10 w-10 text-moto-orange" />
              </div>
              <h2 className="mt-6 text-2xl font-bold">Crea tu primer garaje MotoCare</h2>
              <p className="mx-auto mt-2 max-w-md text-gray-400">
                Registra tu moto para empezar a controlar SOAT, tecnomecanica, kilometraje y mantenimientos.
              </p>
              <Button className="mt-6 bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => setShowAddBike(true)}>
                <Plus className="mr-2 h-5 w-5" />
                Agregar mi moto
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex gap-4 overflow-x-auto pb-4">
            {motorcycles.map((motorcycle) => (
              <button
                key={motorcycle.id}
                onClick={() => setSelectedId(motorcycle.id)}
                className={`flex flex-shrink-0 items-center gap-3 rounded-xl border p-3 transition-all ${
                  selectedBike?.id === motorcycle.id ? 'border-moto-orange bg-moto-orange/20' : 'border-white/5 bg-moto-gray hover:border-white/20'
                }`}
              >
                <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-lg bg-moto-darker">
                  {motorcycle.image_url ? (
                    <img src={motorcycle.image_url} alt={`${motorcycle.brand} ${motorcycle.model}`} className="h-full w-full object-cover" />
                  ) : (
                    <Bike className="h-8 w-8 text-moto-orange" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-semibold">
                    {motorcycle.brand} {motorcycle.model}
                  </p>
                  <p className="text-sm text-gray-400">
                    {motorcycle.year ?? 'Sin ano'} · {motorcycle.plate ?? 'Sin placa'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {selectedBike && (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="overflow-hidden border-white/5 bg-moto-gray lg:col-span-2">
                <div className="relative h-64 overflow-hidden">
                  <img src={selectedBike.image_url ?? '/hero-motorcycle.jpg'} alt={selectedBike.model} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-moto-gray via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <h2 className="text-3xl font-bold">
                          {selectedBike.brand} {selectedBike.model}
                        </h2>
                        <p className="text-gray-300">
                          {selectedBike.year ?? 'Sin ano'} · {selectedBike.color ?? 'Sin color'} · {selectedBike.plate ?? 'Sin placa'}
                        </p>
                      </div>
                      <Badge className="bg-moto-orange px-4 py-1 text-lg text-moto-darker">{healthScore}% Salud</Badge>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6">
                  <Tabs defaultValue="reminders" className="w-full">
                    <TabsList className="mb-4 w-full border-white/5 bg-moto-darker">
                      <TabsTrigger value="reminders" className="flex-1 data-[state=active]:bg-moto-orange data-[state=active]:text-moto-darker">
                        Pendientes
                      </TabsTrigger>
                      <TabsTrigger value="history" className="flex-1 data-[state=active]:bg-moto-orange data-[state=active]:text-moto-darker">
                        Historial
                      </TabsTrigger>
                      <TabsTrigger value="documents" className="flex-1 data-[state=active]:bg-moto-orange data-[state=active]:text-moto-darker">
                        Documentos
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="reminders" className="space-y-4">
                      {selectedReminders.length > 0 ? (
                        selectedReminders.map((reminder) => (
                          <div key={reminder.id} className="flex items-center justify-between gap-3 rounded-xl bg-moto-darker p-3">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-lg bg-yellow-500/20">
                                <CalendarClock className="h-5 w-5 text-yellow-400" />
                              </div>
                              <div>
                                <p className="font-medium">{reminder.title}</p>
                                <p className="text-sm text-gray-400">
                                  {reminder.due_date ? `Fecha: ${reminder.due_date}` : ''}
                                  {reminder.due_mileage ? ` · ${reminder.due_mileage.toLocaleString()} km` : ''}
                                </p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="border-white/10" onClick={() => markReminderDone(reminder)}>
                              Completar
                            </Button>
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
                          <div key={record.id} className="flex items-center justify-between gap-3 rounded-xl bg-moto-darker p-3">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-lg bg-green-500/20">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              </div>
                              <div>
                                <p className="font-medium">{record.service_type}</p>
                                <p className="text-sm text-gray-400">
                                  {record.mileage.toLocaleString()} km · {record.service_date}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-green-500/20 text-green-500">
                              Completado
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-white/5 bg-moto-darker p-5 text-center text-gray-400">
                          Aun no hay mantenimientos registrados.
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="documents">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {([
                          ['SOAT', selectedBike.soat_expires_on],
                          ['Tecnomecanica', selectedBike.technical_review_expires_on],
                        ] satisfies Array<[string, string | null]>).map(([title, date]) => {
                          const status = statusForDate(date)
                          return (
                            <Card key={title} className="border-white/5 bg-moto-darker p-4">
                              <div className="flex items-center gap-3">
                                <div className="grid h-12 w-12 place-items-center rounded-lg bg-moto-orange/20">
                                  <FileText className="h-6 w-6 text-moto-orange" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">{title}</p>
                                  <p className={`text-sm ${status.tone}`}>{status.label}</p>
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
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
                    <p className="text-xs text-gray-500">Actualiza el kilometraje cuando registres un servicio.</p>
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
                        <span className="text-gray-400">Tecnomecanica</span>
                        <span className={statusForDate(selectedBike.technical_review_expires_on).tone}>
                          {statusForDate(selectedBike.technical_review_expires_on).label}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/5 bg-moto-gray">
                  <CardContent className="p-4">
                    <h3 className="mb-3 font-semibold">Acciones rapidas</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start border-white/10" onClick={() => setShowAddService(true)}>
                        <Wrench className="mr-2 h-4 w-4" />
                        Registrar servicio
                      </Button>
                      <Button variant="outline" className="w-full justify-start border-white/10" onClick={() => setShowAddBike(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar otra moto
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={showAddBike} onOpenChange={setShowAddBike}>
        <DialogContent className="max-w-md border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>Agregar moto</DialogTitle>
            <DialogDescription className="text-gray-400">Crea la hoja de vida inicial de tu moto.</DialogDescription>
          </DialogHeader>
          <form className="mt-4 space-y-4" onSubmit={handleCreateBike}>
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Marca</span>
                <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.brand} onChange={(e) => setBikeForm({ ...bikeForm, brand: e.target.value })} placeholder="BMW" required />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Modelo</span>
                <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.model} onChange={(e) => setBikeForm({ ...bikeForm, model: e.target.value })} placeholder="F 850 GS" required />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Ano</span>
                <input type="number" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.year} onChange={(e) => setBikeForm({ ...bikeForm, year: e.target.value })} placeholder="2024" />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Placa</span>
                <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.plate} onChange={(e) => setBikeForm({ ...bikeForm, plate: e.target.value.toUpperCase() })} placeholder="ABC123" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Kilometraje</span>
                <input type="number" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.mileage} onChange={(e) => setBikeForm({ ...bikeForm, mileage: e.target.value })} placeholder="12500" />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Color</span>
                <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.color} onChange={(e) => setBikeForm({ ...bikeForm, color: e.target.value })} placeholder="Negro" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Vence SOAT</span>
                <input type="date" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.soat_expires_on} onChange={(e) => setBikeForm({ ...bikeForm, soat_expires_on: e.target.value })} />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Vence tecnomecanica</span>
                <input type="date" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={bikeForm.technical_review_expires_on} onChange={(e) => setBikeForm({ ...bikeForm, technical_review_expires_on: e.target.value })} />
              </label>
            </div>
            <Button type="submit" disabled={isSaving} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Agregar moto
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddService} onOpenChange={setShowAddService}>
        <DialogContent className="max-w-md border-white/10 bg-moto-gray text-white">
          <DialogHeader>
            <DialogTitle>Registrar servicio</DialogTitle>
            <DialogDescription className="text-gray-400">Guarda un mantenimiento en la hoja de vida.</DialogDescription>
          </DialogHeader>
          <form className="mt-4 space-y-4" onSubmit={handleCreateService}>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Tipo de servicio</span>
              <input className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={serviceForm.service_type} onChange={(e) => setServiceForm({ ...serviceForm, service_type: e.target.value })} required />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="mb-1 block text-sm text-gray-400">Fecha</span>
                <input type="date" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={serviceForm.service_date} onChange={(e) => setServiceForm({ ...serviceForm, service_date: e.target.value })} required />
              </label>
              <label>
                <span className="mb-1 block text-sm text-gray-400">Kilometraje</span>
                <input type="number" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={serviceForm.mileage} onChange={(e) => setServiceForm({ ...serviceForm, mileage: e.target.value })} placeholder={selectedBike?.mileage.toString()} />
              </label>
            </div>
            <label>
              <span className="mb-1 block text-sm text-gray-400">Costo</span>
              <input type="number" className="w-full rounded-lg border border-white/10 bg-moto-darker p-2 text-white" value={serviceForm.cost} onChange={(e) => setServiceForm({ ...serviceForm, cost: e.target.value })} placeholder="120000" />
            </label>
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
    </div>
  )
}
