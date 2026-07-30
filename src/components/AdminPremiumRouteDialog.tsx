import { useEffect, useState } from 'react'
import { FileUp, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { analyzeGpx, type GpxAnalysis } from '@/lib/gpx'
import type { RouteTrack } from '@/lib/gpx'
import { supabase } from '@/lib/supabase'

export type CreatedPremiumRoute = {
  id: string
  title: string
  description: string
  location: string | null
  level: 3 | 4 | 5
  distance_km: number
  duration_minutes: number | null
  elevation_gain_m: number | null
  terrain: string | null
  motorcycle_compatibility: string
  gpx_storage_path: string
  is_monthly_free: boolean
  track_geojson: RouteTrack | null
}

type FormState = {
  title: string
  description: string
  location: string
  level: 3 | 4 | 5
  terrain: string
  compatibility: string
  isMonthlyFree: boolean
}

const initialForm: FormState = {
  title: '',
  description: '',
  location: '',
  level: 3,
  terrain: '',
  compatibility: '',
  isMonthlyFree: true,
}

export function AdminPremiumRouteDialog({
  open,
  onOpenChange,
  userId,
  onCreated,
  initialRoute = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onCreated: (route: CreatedPremiumRoute) => void
  initialRoute?: CreatedPremiumRoute | null
}) {
  const [form, setForm] = useState(initialForm)
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<GpxAnalysis | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const isEditing = Boolean(initialRoute)

  useEffect(() => {
    if (!open) return
    setForm(initialRoute ? {
      title: initialRoute.title,
      description: initialRoute.description,
      location: initialRoute.location || '',
      level: initialRoute.level,
      terrain: initialRoute.terrain || '',
      compatibility: initialRoute.motorcycle_compatibility,
      isMonthlyFree: initialRoute.is_monthly_free,
    } : initialForm)
    setFile(null)
    setAnalysis(null)
  }, [initialRoute, open])

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleFile = async (selectedFile?: File) => {
    if (!selectedFile) return
    if (!selectedFile.name.toLowerCase().endsWith('.gpx')) {
      toast.error('Selecciona un archivo con extensión .gpx')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('El GPX no puede superar 10 MB')
      return
    }

    try {
      const result = analyzeGpx(await selectedFile.text(), selectedFile.name)
      setFile(selectedFile)
      setAnalysis(result)
      setForm((current) => ({
        ...current,
        title: current.title || result.track.properties.name || '',
        description: current.description || result.suggestedDescription,
        level: result.suggestedLevel,
        compatibility: current.compatibility || result.suggestedCompatibility,
      }))
      toast.success('GPX analizado', {
        description: `${result.distanceKm.toFixed(1)} km y ${result.pointCount.toLocaleString('es-CO')} puntos detectados.`,
      })
    } catch (error) {
      setFile(null)
      setAnalysis(null)
      toast.error('No pudimos analizar el GPX', {
        description: error instanceof Error ? error.message : 'Revisa el archivo.',
      })
    }
  }

  const save = async () => {
    if (!supabase || (!isEditing && (!file || !analysis))) {
      toast.error('Debes cargar un GPX válido')
      return
    }
    if (form.title.trim().length < 5 || form.description.trim().length < 20 || !form.compatibility.trim()) {
      toast.error('Completa el nombre, la descripción y la compatibilidad')
      return
    }

    setIsSaving(true)
    const routeId = initialRoute?.id ?? crypto.randomUUID()
    let storagePath = initialRoute?.gpx_storage_path ?? ''
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      storagePath = `${routeId}/${Date.now()}-${safeName}`
      const { error: uploadError } = await supabase.storage
        .from('premium-route-files')
        .upload(storagePath, file, { contentType: file.type || 'application/gpx+xml', upsert: false })

      if (uploadError) {
        setIsSaving(false)
        toast.error('No pudimos subir el GPX', { description: uploadError.message })
        return
      }
    }

    const payload = {
      id: routeId,
      created_by: userId,
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim() || null,
      level: form.level,
      distance_km: analysis ? Number(analysis.distanceKm.toFixed(2)) : initialRoute!.distance_km,
      duration_minutes: analysis ? analysis.durationMinutes : initialRoute!.duration_minutes,
      elevation_gain_m: analysis ? analysis.elevationGainM : initialRoute!.elevation_gain_m,
      terrain: form.terrain.trim() || null,
      motorcycle_compatibility: form.compatibility.trim(),
      gpx_storage_path: storagePath,
      track_geojson: analysis ? analysis.track : initialRoute!.track_geojson,
      is_monthly_free: form.isMonthlyFree,
    }
    const query = isEditing
      ? supabase.from('premium_routes').update(payload).eq('id', routeId)
      : supabase.from('premium_routes').insert(payload)
    const { data, error } = await query.select().single()

    if (error) {
      if (file) await supabase.storage.from('premium-route-files').remove([storagePath])
      setIsSaving(false)
      toast.error('No pudimos publicar la ruta', { description: error.message })
      return
    }

    if (file && initialRoute?.gpx_storage_path && initialRoute.gpx_storage_path !== storagePath) {
      await supabase.storage.from('premium-route-files').remove([initialRoute.gpx_storage_path])
    }
    setIsSaving(false)
    setForm(initialForm)
    setFile(null)
    setAnalysis(null)
    onCreated(data as CreatedPremiumRoute)
    onOpenChange(false)
    toast.success(isEditing ? 'Ruta Premium actualizada' : 'Ruta Premium publicada')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="inset-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-white/10 bg-moto-gray text-white sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[92dvh] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar ruta Premium' : 'Crear ruta Premium'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza la presentación o reemplaza el GPX. Si conservas el archivo, sus métricas actuales no cambian.'
              : 'Solo administradores pueden publicar. Los datos calculados desde el GPX quedan disponibles para revisión.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <label className="grid min-h-28 cursor-pointer place-items-center rounded-xl border border-dashed border-moto-orange/40 bg-moto-orange/5 p-5 text-center hover:bg-moto-orange/10">
            <span>
              <FileUp className="mx-auto mb-2 h-6 w-6 text-moto-orange" />
              <span className="block font-semibold">{file?.name || (isEditing ? 'Reemplazar archivo GPX (opcional)' : 'Seleccionar archivo GPX')}</span>
              <span className="mt-1 block text-xs text-gray-400">Máximo 10 MB</span>
            </span>
            <input className="sr-only" type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onChange={(event) => void handleFile(event.target.files?.[0])} />
          </label>

          {analysis && (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-moto-darker p-3 text-sm sm:grid-cols-4">
              <Metric label="Distancia" value={`${analysis.distanceKm.toFixed(1)} km`} />
              <Metric label="Ascenso" value={analysis.elevationGainM === null ? 'Sin datos' : `${analysis.elevationGainM} m`} />
              <Metric label="Duración GPX" value={analysis.durationMinutes === null ? 'Sin tiempos' : `${analysis.durationMinutes} min`} />
              <Metric label="Puntos" value={analysis.pointCount.toLocaleString('es-CO')} />
            </div>
          )}

          <Field label="Nombre">
            <Input value={form.title} maxLength={120} onChange={(event) => setField('title', event.target.value)} />
          </Field>
          <Field label="Descripción">
            <Textarea className="min-h-28" value={form.description} maxLength={5000} onChange={(event) => setField('description', event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ubicación o recorrido">
              <Input value={form.location} placeholder="Bogotá - Guatavita" onChange={(event) => setField('location', event.target.value)} />
            </Field>
            <Field label="Nivel sugerido">
              <select className="flex h-9 w-full rounded-md border border-white/10 bg-moto-darker px-3 text-sm" value={form.level} onChange={(event) => setField('level', Number(event.target.value) as 3 | 4 | 5)}>
                <option value={3}>Nivel 3 · Intermedio</option>
                <option value={4}>Nivel 4 · Avanzado</option>
                <option value={5}>Nivel 5 · Extremo</option>
              </select>
            </Field>
          </div>
          <Field label="Terreno">
            <Input value={form.terrain} placeholder="Ej. 70% pavimento / 30% destapado" onChange={(event) => setField('terrain', event.target.value)} />
          </Field>
          <Field label="Compatibilidad con la moto">
            <Textarea className="min-h-20" value={form.compatibility} onChange={(event) => setField('compatibility', event.target.value)} />
            <p className="mt-1 flex gap-1 text-xs text-gray-500"><Sparkles className="h-3.5 w-3.5 shrink-0" />Es una sugerencia por exigencia; confirma el terreno real antes de publicar.</p>
          </Field>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 p-4">
            <div>
              <Label htmlFor="monthly-free">Gratis para Premium este mes</Label>
              <p className="mt-1 text-xs text-gray-400">Permite elegirla dentro del cupo mensual de cinco rutas.</p>
            </div>
            <Switch id="monthly-free" checked={form.isMonthlyFree} onCheckedChange={(checked) => setField('isMonthlyFree', checked)} />
          </div>
          <Button disabled={isSaving} className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => void save()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Guardar cambios' : 'Publicar ruta Premium'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white/5 p-2"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 font-semibold text-gray-200">{value}</p></div>
}
