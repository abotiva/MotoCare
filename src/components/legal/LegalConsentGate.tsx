import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { LEGAL_DOCUMENTS } from '@/lib/legal'
import { supabase } from '@/lib/supabase'

type PendingDocument = { id: string; document_type: 'terms' | 'privacy'; title: string; version: string }

export function LegalConsentGate({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingDocument[]>([])
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPending = useCallback(async () => {
    setLoading(true)
    setError(null)
    if (!supabase) { setLoading(false); return }
    const { data, error: queryError } = await supabase.rpc('get_pending_legal_documents')
    if (queryError) {
      const hasPublishedLocalDocuments = Object.values(LEGAL_DOCUMENTS).some((document) => document.status === 'published')

      // Legal infrastructure may not be installed yet in early environments. Draft
      // documents never require reacceptance, so they must not lock users out.
      if (!hasPublishedLocalDocuments) {
        setPending([])
        setLoading(false)
        return
      }

      setError('No fue posible validar las aceptaciones legales.')
      setLoading(false)
      return
    }
    setPending((data ?? []) as PendingDocument[])
    setLoading(false)
  }, [])

  useEffect(() => { void loadPending() }, [loadPending])

  if (loading) return <div className="grid min-h-screen place-items-center bg-moto-dark text-moto-orange"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (pending.length === 0 && !error) return children

  const allAccepted = pending.every((document) => accepted[document.id])
  const submit = async () => {
    if (!supabase || !allAccepted) return
    setSaving(true); setError(null)
    for (const document of pending) {
      const { error: acceptError } = await supabase.rpc('accept_legal_document', { target_document_id: document.id })
      if (acceptError) { setError('No fue posible registrar la aceptación. Inténtalo nuevamente.'); setSaving(false); return }
    }
    await loadPending(); setSaving(false)
  }

  return (
    <main className="grid min-h-screen place-items-center bg-moto-dark p-6 text-white">
      <section className="w-full max-w-xl rounded-2xl border border-moto-orange/30 bg-moto-gray p-6 shadow-xl">
        <ShieldCheck className="h-8 w-8 text-moto-orange" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">Actualización legal pendiente</h1>
        <p className="mt-2 text-sm text-gray-300">Lee y acepta las versiones vigentes para continuar.</p>
        {pending.map((document) => {
          const path = document.document_type === 'terms' ? '/legal/terminos' : '/legal/privacidad'
          return <label key={document.id} className="mt-5 flex items-start gap-3"><Checkbox checked={accepted[document.id] ?? false} onCheckedChange={(value) => setAccepted((current) => ({ ...current, [document.id]: value === true }))} /><span className="text-sm">Acepto <Link className="text-moto-orange underline" to={path} target="_blank">{document.title} versión {document.version}</Link>.</span></label>
        })}
        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
        {error && pending.length === 0 ? (
          <Button className="mt-6 w-full bg-moto-orange text-moto-darker" disabled={loading} onClick={() => void loadPending()}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reintentar validación
          </Button>
        ) : (
          <Button className="mt-6 w-full bg-moto-orange text-moto-darker" disabled={!allAccepted || saving || pending.length === 0} onClick={() => void submit()}>{saving ? 'Guardando…' : 'Aceptar y continuar'}</Button>
        )}
      </section>
    </main>
  )
}
