import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout'
import { LEGAL_DOCUMENTS } from '@/lib/legal'

export function Privacy() {
  return (
    <LegalDocumentLayout document={LEGAL_DOCUMENTS.privacy}>
      <section>
        <h2 className="text-xl font-semibold text-white">Responsable del tratamiento</h2>
        <p className="mt-2">[RAZÓN SOCIAL PENDIENTE] · [NIT PENDIENTE] · [CORREO LEGAL PENDIENTE]</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">Datos y finalidades</h2>
        <p className="mt-2">
          MotoCare podrá tratar datos de cuenta, perfil, motocicletas, mantenimientos, documentos, rutas,
          contenido y registros técnicos para prestar, proteger y mejorar el servicio.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">Derechos y conservación</h2>
        <p className="mt-2">
          Los canales para ejercer derechos y los periodos de conservación deben definirse antes de publicar esta política.
        </p>
      </section>
    </LegalDocumentLayout>
  )
}

