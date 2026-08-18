import type { ReactNode } from 'react'
import { ArrowLeft, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MotoCareLogo } from '@/components/MotoCareLogo'
import type { LegalDocumentDefinition } from '@/lib/legal'

export function LegalDocumentLayout({ document, children }: { document: LegalDocumentDefinition; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-moto-dark px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <MotoCareLogo />
          <Link to="/login" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-moto-orange">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver
          </Link>
        </div>
        <article className="mt-10 rounded-3xl border border-white/10 bg-moto-gray p-6 sm:p-10">
          <div className="flex items-center gap-3 text-moto-orange"><ShieldCheck className="h-7 w-7" aria-hidden="true" /><p className="text-sm font-bold uppercase tracking-widest">Información legal</p></div>
          <h1 className="mt-5 text-3xl font-bold sm:text-4xl">{document.title}</h1>
          <p className="mt-3 text-sm text-gray-400">Versión {document.version} · Actualización: {document.updatedAt}</p>
          {document.status === 'draft' && (
            <div role="note" className="mt-6 flex gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>Borrador no publicable. Debe ser revisado por un profesional jurídico antes de entrar en vigencia.</p>
            </div>
          )}
          <div className="mt-8 space-y-7 leading-7 text-gray-300">{children}</div>
        </article>
      </div>
    </main>
  )
}

