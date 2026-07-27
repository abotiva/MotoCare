import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MotoCareLogo } from '@/components/MotoCareLogo'

export function Terms() {
  return (
    <main className="min-h-screen bg-moto-dark px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <MotoCareLogo />
          <Link
            to="/app/home"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-moto-orange"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver
          </Link>
        </div>

        <article className="mt-10 rounded-3xl border border-white/10 bg-moto-gray p-6 sm:p-10">
          <div className="flex items-center gap-3 text-moto-orange">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
            <p className="text-sm font-bold uppercase tracking-widest">Información legal</p>
          </div>
          <h1 className="mt-5 text-3xl font-bold sm:text-4xl">Términos y condiciones</h1>
          <p className="mt-3 text-sm text-gray-500">Última actualización: 27 de julio de 2026</p>

          <div className="mt-8 space-y-7 leading-7 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white">Uso de MotoCare</h2>
              <p className="mt-2">
                MotoCare permite organizar información relacionada con motocicletas, mantenimientos,
                documentos, rutas y actividades de la comunidad. Debes utilizar el servicio de forma
                responsable y proporcionar información legítima.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-white">Tu cuenta y tu información</h2>
              <p className="mt-2">
                Eres responsable de mantener seguras tus credenciales. La información registrada
                permanece asociada a tu cuenta y se utiliza para ofrecer las funciones de MotoCare.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-white">Contenido y comunidad</h2>
              <p className="mt-2">
                No está permitido publicar contenido ilegal, engañoso, ofensivo o que vulnere los
                derechos de otras personas. MotoCare puede moderar contenido que incumpla estas condiciones.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-white">Disponibilidad</h2>
              <p className="mt-2">
                Algunas funciones pueden cambiar, suspenderse o incorporarse progresivamente. MotoCare
                no sustituye revisiones mecánicas, documentos oficiales ni recomendaciones profesionales.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  )
}
