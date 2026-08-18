import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout'
import { LEGAL_DOCUMENTS } from '@/lib/legal'

export function Terms() {
  return (
    <LegalDocumentLayout document={LEGAL_DOCUMENTS.terms}>
      <section>
        <h2 className="text-xl font-semibold text-white">Uso de MotoCare</h2>
        <p className="mt-2">MotoCare permite organizar información de motocicletas, mantenimientos, documentos y otras funciones habilitadas. El servicio debe utilizarse de forma lícita y responsable.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">Cuenta y contenido</h2>
        <p className="mt-2">Cada persona es responsable de sus credenciales y de la legitimidad del contenido que registra o publica. MotoCare podrá moderar contenido que incumpla las condiciones vigentes.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">Alcance del servicio</h2>
        <p className="mt-2">MotoCare no sustituye revisiones mecánicas, documentos oficiales, indicaciones de autoridades ni recomendaciones profesionales.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">Datos pendientes</h2>
        <p className="mt-2">[RAZÓN SOCIAL PENDIENTE] · [NIT PENDIENTE] · [DIRECCIÓN PENDIENTE] · [CORREO LEGAL PENDIENTE]</p>
      </section>
    </LegalDocumentLayout>
  )
}
