import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Gauge,
  MapPinned,
  MessageCircle,
  Plus,
  ShoppingBag,
  Wrench,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { MaintenanceRecord, Motorcycle, Reminder } from '@/types/database'
import { formatCurrency, formatShortDate, getMotorcycleHealth } from '@/features/motorcycles/utils/motorcycleHealth'

const exploreItems = [
  { label: 'Rutas', description: 'Planea tu próxima salida.', to: '/app/map', icon: MapPinned },
  { label: 'Clubes', description: 'Conecta con grupos moteros.', to: '/app/clubs', icon: Bike },
  { label: 'Comunidad', description: 'Comparte experiencias.', to: '/app/messages', icon: MessageCircle },
  { label: 'Marketplace', description: 'Motos, repuestos y servicios.', to: '/app/marketplace', icon: ShoppingBag },
]

export function Home() {
  const { user, profile } = useAuth()
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !user) return
    const client = supabase
    const loadDashboard = async () => {
      setIsLoading(true)
      const motorcyclesResult = await client.from('motorcycles').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
      const nextMotorcycles = (motorcyclesResult.data ?? []) as Motorcycle[]
      setMotorcycles(nextMotorcycles)
      const preferred = nextMotorcycles.find((motorcycle) => motorcycle.id === profile?.primary_motorcycle_id) ?? nextMotorcycles[0]
      setSelectedId((current) => nextMotorcycles.some((motorcycle) => motorcycle.id === current) ? current : preferred?.id ?? null)
      setIsLoading(false)
    }
    void loadDashboard()
  }, [profile?.primary_motorcycle_id, user])

  useEffect(() => {
    if (!supabase || !user || !selectedId) {
      setRecords([])
      setReminders([])
      return
    }
    const client = supabase
    void Promise.all([
      client.from('maintenance_records').select('*').eq('owner_id', user.id).eq('motorcycle_id', selectedId).order('service_date', { ascending: false }).limit(20),
      client.from('reminders').select('*').eq('owner_id', user.id).eq('motorcycle_id', selectedId).order('due_date', { ascending: true, nullsFirst: false }).limit(50),
    ]).then(([recordsResult, remindersResult]) => {
      setRecords((recordsResult.data ?? []) as MaintenanceRecord[])
      setReminders((remindersResult.data ?? []) as Reminder[])
    })
  }, [selectedId, user])

  const selectedBike = motorcycles.find((motorcycle) => motorcycle.id === selectedId) ?? motorcycles[0] ?? null
  const health = useMemo(() => selectedBike ? getMotorcycleHealth(selectedBike, reminders) : null, [reminders, selectedBike])
  const nextReminder = reminders.find((reminder) => reminder.status === 'pending') ?? null
  const monthExpenses = records.filter((record) => {
    const date = new Date(`${record.service_date}T00:00:00`)
    const now = new Date()
    return record.cost !== null && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })
  const monthExpenseTotal = monthExpenses.reduce((sum, record) => sum + Number(record.cost ?? 0), 0)
  const bikeBasePath = selectedBike ? `/app/bikes/${selectedBike.id}` : '/app/bikes'
  const statusStyles = health?.level === 'urgent'
    ? 'border-red-500/30 bg-red-500/10 text-red-300'
    : health?.level === 'attention'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'

  if (isLoading) {
    return <div className="mx-auto max-w-7xl animate-pulse space-y-4 p-4 pb-24 sm:p-6"><div className="h-12 rounded-2xl bg-white/5" /><div className="h-96 rounded-3xl bg-white/5" /></div>
  }

  if (!selectedBike) {
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center p-6 text-center">
        <div>
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-moto-orange/15"><Bike className="h-10 w-10 text-moto-orange" /></div>
          <h1 className="mt-6 text-3xl font-bold">Empieza la historia de tu moto</h1>
          <p className="mx-auto mt-3 max-w-lg text-gray-400">Registra tu moto para controlar mantenimientos, documentos y próximos servicios desde un solo lugar.</p>
          <Link to="/app/bikes" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-moto-orange px-5 font-semibold text-moto-darker"><Plus className="h-5 w-5" />Agregar mi moto</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-24 sm:p-6 lg:pb-8">
      <section aria-labelledby="bike-selector-title">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-moto-orange">Tu moto. Tu historia. Tu ruta.</p>
            <h1 id="bike-selector-title" className="mt-1 text-2xl font-bold sm:text-3xl">Estado de tu moto</h1>
          </div>
          <label className="text-sm text-gray-400">
            Moto seleccionada
            <select value={selectedBike.id} onChange={(event) => setSelectedId(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-moto-darker px-3 text-white sm:w-72">
              {motorcycles.map((motorcycle) => <option key={motorcycle.id} value={motorcycle.id}>{motorcycle.brand} {motorcycle.model}{motorcycle.plate ? ` · ${motorcycle.plate}` : ''}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-moto-darker">
        <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="relative min-h-64 overflow-hidden bg-moto-gray">
            <img src={selectedBike.image_url ?? '/hero-motorcycle.jpg'} alt={`${selectedBike.brand} ${selectedBike.model}`} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-moto-darker via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${statusStyles}`}>
                {health?.level === 'urgent' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{health?.label}
              </span>
              <h2 className="mt-3 text-3xl font-bold">{selectedBike.brand} {selectedBike.model}</h2>
              <p className="mt-1 text-gray-300">{selectedBike.plate ?? 'Sin placa'} · {selectedBike.year ?? 'Año sin registrar'}</p>
            </div>
          </div>
          <div className="grid content-start gap-5 p-5 sm:p-7">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs uppercase tracking-wide text-gray-500">Kilometraje</p><p className="mt-1 text-xl font-bold">{selectedBike.mileage.toLocaleString('es-CO')} km</p></div>
              <div><p className="text-xs uppercase tracking-wide text-gray-500">Última actualización</p><p className="mt-1 text-sm font-semibold">{formatShortDate(selectedBike.updated_at)}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-gray-500">Próximo mantenimiento</p><p className="mt-1 text-sm font-semibold">{nextReminder?.title ?? 'Sin programar'}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-gray-500">Pendientes</p><p className="mt-1 text-xl font-bold">{health?.pendingCount ?? 0}</p></div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-moto-orange">Próxima acción recomendada</p>
              <p className="mt-2 font-semibold">{health?.level === 'urgent' ? 'Revisa las alertas vencidas hoy' : nextReminder ? `${nextReminder.title}${nextReminder.due_date ? ` · ${formatShortDate(nextReminder.due_date)}` : ''}` : 'Programa tu próximo mantenimiento'}</p>
              <Link to={`${bikeBasePath}/schedule`} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-moto-orange">Abrir agenda <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </section>

      {(health?.documentAlerts.length || health?.overdueReminders.length) ? (
        <section aria-labelledby="critical-alerts-title" className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5">
          <h2 id="critical-alerts-title" className="flex items-center gap-2 font-bold text-red-200"><AlertTriangle className="h-5 w-5" />Alertas críticas</h2>
          <div className="mt-3 grid gap-2 text-sm text-red-100">
            {health.documentAlerts.map((alert) => <p key={alert.label}>{alert.label}: {alert.days < 0 ? `venció hace ${Math.abs(alert.days)} días` : `vence en ${alert.days} días`}.</p>)}
            {health.overdueReminders.map((reminder) => <p key={reminder.id}>{reminder.title} está vencido.</p>)}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="metrics-title">
        <h2 id="metrics-title" className="mb-3 text-xl font-bold">Lo importante, de un vistazo</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Próximo servicio', value: nextReminder?.title ?? 'Sin programar', icon: Wrench },
            { label: 'Pendientes', value: String(health?.pendingCount ?? 0), icon: CalendarClock },
            { label: 'Documentos por vencer', value: String(health?.documentAlerts.length ?? 0), icon: FileText },
            { label: 'Gastos del mes', value: monthExpenses.length ? formatCurrency(monthExpenseTotal) : 'Sin gastos registrados', icon: CircleDollarSign },
          ].map((metric) => <div key={metric.label} className="rounded-2xl border border-white/5 bg-moto-darker p-4"><metric.icon className="h-5 w-5 text-moto-orange" /><p className="mt-4 text-sm text-gray-400">{metric.label}</p><p className="mt-1 font-bold">{metric.value}</p></div>)}
        </div>
      </section>

      <section aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="mb-3 text-xl font-bold">Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Registrar mantenimiento', to: `${bikeBasePath}/history?action=service`, icon: Wrench },
            { label: 'Actualizar kilometraje', to: `${bikeBasePath}/overview?action=mileage`, icon: Gauge },
            { label: 'Crear recordatorio', to: `${bikeBasePath}/schedule?action=reminder`, icon: CalendarClock },
            { label: 'Agregar documento', to: `${bikeBasePath}/documents`, icon: FileText },
          ].map((action) => <Link key={action.label} to={action.to} className="flex min-h-28 flex-col justify-between rounded-2xl border border-white/5 bg-moto-darker p-4 hover:border-moto-orange/40"><action.icon className="h-6 w-6 text-moto-orange" /><span className="font-semibold">{action.label}</span></Link>)}
        </div>
      </section>

      <section aria-labelledby="recent-history-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-history-title" className="text-xl font-bold">Historial reciente</h2>
          <Link to={`${bikeBasePath}/history`} className="text-sm font-semibold text-moto-orange">Ver historial</Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-moto-darker">
          {records.length ? records.slice(0, 4).map((record) => <div key={record.id} className="flex items-center justify-between gap-4 border-b border-white/5 p-4 last:border-0"><div className="min-w-0"><p className="truncate font-semibold">{record.service_type}</p><p className="text-sm text-gray-400">{formatShortDate(record.service_date)} · {record.mileage.toLocaleString('es-CO')} km</p></div><p className="shrink-0 text-sm font-semibold">{record.cost === null ? 'Sin costo' : formatCurrency(Number(record.cost))}</p></div>) : <p className="p-6 text-center text-gray-400">Aún no hay mantenimientos. Registra el primero para iniciar la historia de tu moto.</p>}
        </div>
      </section>

      <section aria-labelledby="explore-title">
        <div className="mb-3">
          <p className="text-sm text-gray-500">Cuando tengas tu moto al día</p>
          <h2 id="explore-title" className="text-xl font-bold">Explorar MotoCare</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {exploreItems.map((item) => <Link key={item.label} to={item.to} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 hover:border-white/15"><item.icon className="h-6 w-6 text-gray-400" /><h3 className="mt-5 font-semibold">{item.label}</h3><p className="mt-1 text-sm text-gray-500">{item.description}</p></Link>)}
        </div>
      </section>
    </div>
  )
}
