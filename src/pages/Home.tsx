import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bike, Loader2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { HomeMotorcycleHero } from '@/components/home/HomeMotorcycleHero'
import { HomeQuickActions } from '@/components/home/HomeQuickActions'
import { HomeStatusSection } from '@/components/home/HomeStatusSection'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { MaintenanceRecord, Motorcycle, Reminder } from '@/types/database'

type HomeData = { motorcycle: Motorcycle | null; reminders: Reminder[]; latestMaintenance: MaintenanceRecord | null }
const emptyHomeData: HomeData = { motorcycle: null, reminders: [], latestMaintenance: null }

export function Home() {
  const { user, profile } = useAuth()
  const [data, setData] = useState<HomeData>(emptyHomeData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    if (!supabase || !user) {
      setData(emptyHomeData)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    const { data: motorcycles, error: motorcyclesError } = await supabase
      .from('motorcycles').select('*').eq('owner_id', user.id).order('created_at', { ascending: true }).limit(10)
    if (motorcyclesError) {
      setError('No pudimos cargar la información de tu moto.')
      setIsLoading(false)
      return
    }
    const availableMotorcycles = (motorcycles ?? []) as Motorcycle[]
    const motorcycle = availableMotorcycles.find((item) => item.id === profile?.primary_motorcycle_id) ?? availableMotorcycles[0] ?? null
    if (!motorcycle) {
      setData(emptyHomeData)
      setIsLoading(false)
      return
    }
    const [remindersResult, maintenanceResult] = await Promise.all([
      supabase.from('reminders').select('*').eq('owner_id', user.id).eq('motorcycle_id', motorcycle.id).eq('status', 'pending').order('due_date', { ascending: true, nullsFirst: false }).limit(12),
      supabase.from('maintenance_records').select('*').eq('owner_id', user.id).eq('motorcycle_id', motorcycle.id).order('service_date', { ascending: false }).limit(1).maybeSingle(),
    ])
    if (remindersResult.error || maintenanceResult.error) setError('Tu moto está disponible, pero no pudimos cargar todos sus próximos eventos.')
    setData({ motorcycle, reminders: (remindersResult.data ?? []) as Reminder[], latestMaintenance: (maintenanceResult.data as MaintenanceRecord | null) ?? null })
    setIsLoading(false)
  }, [profile?.primary_motorcycle_id, user])

  useEffect(() => { void loadDashboard() }, [loadDashboard])
  const displayName = useMemo(() => profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'motero', [profile?.full_name, user?.email])

  if (isLoading) return (
    <div className="mx-auto max-w-6xl p-4 pb-24 sm:p-6 lg:pb-8">
      <div className="grid min-h-[65dvh] place-items-center" role="status" aria-live="polite">
        <div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin text-moto-orange" aria-hidden="true" /><p className="mt-4 text-sm text-gray-400">Preparando el estado de tu moto…</p></div>
      </div>
    </div>
  )

  if (!data.motorcycle && error) return (
    <div className="mx-auto max-w-3xl p-4 pb-24 sm:p-6 lg:pb-8">
      <Card className="border-red-500/20 bg-moto-gray"><CardContent className="p-6 text-center sm:p-10">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-300" aria-hidden="true" /><h1 className="mt-4 text-2xl font-bold">No pudimos preparar tu inicio</h1>
        <p className="mt-2 text-sm leading-6 text-gray-400">{error}</p>
        <Button className="mt-6 bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => void loadDashboard()}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Intentar de nuevo</Button>
      </CardContent></Card>
    </div>
  )

  if (!data.motorcycle) return (
    <div className="mx-auto max-w-4xl p-4 pb-24 sm:p-6 lg:pb-8">
      <header className="mb-6"><p className="text-sm font-semibold text-moto-orange">Tu moto. Tu historia. Tu ruta.</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Hola, {displayName}</h1></header>
      <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-moto-gray to-moto-darker"><CardContent className="grid min-h-[420px] place-items-center p-6 text-center sm:p-10">
        <div><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-moto-orange/15 text-moto-orange"><Bike className="h-10 w-10" aria-hidden="true" /></div>
          <h2 className="mt-6 text-2xl font-bold sm:text-3xl">Tu moto será la protagonista</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-400 sm:text-base">Agrégala para ver su kilometraje, próximos mantenimientos, documentos y alertas en un solo lugar.</p>
          <Button asChild className="mt-7 bg-moto-orange text-moto-darker hover:bg-moto-orange-dark"><Link to="/app/my-bikes">Agregar mi moto</Link></Button>
        </div>
      </CardContent></Card>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 sm:p-6 lg:pb-8">
      <header className="mb-5 sm:mb-6"><p className="text-sm font-semibold text-moto-orange">Tu moto. Tu historia. Tu ruta.</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Hola, {displayName}</h1></header>
      {error && <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100" role="alert"><span>{error}</span><button type="button" className="shrink-0 font-semibold underline underline-offset-4" onClick={() => void loadDashboard()}>Reintentar</button></div>}
      <HomeMotorcycleHero motorcycle={data.motorcycle} />
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <HomeStatusSection motorcycle={data.motorcycle} reminders={data.reminders} latestMaintenance={data.latestMaintenance} />
        <HomeQuickActions />
      </div>
    </div>
  )
}
