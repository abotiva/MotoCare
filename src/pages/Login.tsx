import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MotoCareLogo } from '@/components/MotoCareLogo'
import { useAuth } from '@/contexts/AuthContext'
import { Checkbox } from '@/components/ui/checkbox'
import { LEGAL_DOCUMENTS } from '@/lib/legal'

export function Login() {
  const { signIn, signUp, user, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup'>(() => searchParams.get('mode') === 'signup' ? 'signup' : 'login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/app/home'

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (mode === 'signup') {
        if (!termsAccepted || !privacyAccepted) throw new Error('Debes aceptar ambos documentos legales para crear la cuenta.')
        await signUp(email, password, fullName, {
          termsAccepted: true,
          privacyAccepted: true,
          termsVersion: LEGAL_DOCUMENTS.terms.version,
          privacyVersion: LEGAL_DOCUMENTS.privacy.version,
        })
      } else {
        await signIn(email, password)
      }
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar sesion.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-moto-dark text-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden lg:block">
        <img src="/hero-motorcycle.jpg" alt="Motociclista recorriendo una ruta" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-moto-darker via-moto-dark/80 to-transparent" />
        <div className="absolute bottom-12 left-12 max-w-xl">
          <MotoCareLogo />
          <h1 className="mt-8 text-5xl font-bold leading-tight">
            Cuida tu moto. Vive tu <span className="text-gradient">ruta</span>.
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            Registra tu moto, controla vencimientos y mantén el historial listo para cada kilómetro.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <MotoCareLogo />
          </div>

          <div className="rounded-2xl border border-white/5 bg-moto-gray p-6 shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-moto-orange">
              {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
            </p>
            <h2 className="mt-2 text-3xl font-bold">{mode === 'login' ? 'Entrar a la app' : 'Empieza con tu moto'}</h2>
            <p className="mt-2 text-sm text-gray-400">
              {mode === 'login'
                ? 'Accede para gestionar tu moto y tus recordatorios.'
                : 'La hoja de vida digital de tu moto queda lista en minutos.'}
            </p>

            {!isConfigured && (
              <div className="mt-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                Falta configurar Supabase. Copia <code>.env.example</code> a <code>.env</code> y agrega tus llaves.
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <label className="block">
                  <span className="mb-1 block text-sm text-gray-400">Nombre</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-moto-darker p-3 text-white outline-none focus:border-moto-orange"
                    placeholder="Juan Pérez"
                    required
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1 block text-sm text-gray-400">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-moto-darker p-3 text-white outline-none focus:border-moto-orange"
                  placeholder="tu@email.com"
                  required
                />
              </label>

              {mode === 'signup' && (
                <fieldset className="space-y-3 rounded-xl border border-white/10 bg-moto-darker/50 p-4">
                  <legend className="px-1 text-sm font-medium text-gray-300">Consentimientos obligatorios</legend>
                  <div className="flex items-start gap-3">
                    <Checkbox id="accept-terms" checked={termsAccepted} onCheckedChange={(value) => setTermsAccepted(value === true)} />
                    <label htmlFor="accept-terms" className="text-sm leading-5 text-gray-300">Acepto los <Link to={LEGAL_DOCUMENTS.terms.path} target="_blank" className="text-moto-orange underline">Términos y Condiciones</Link> <span className="text-gray-500">({LEGAL_DOCUMENTS.terms.version})</span>.</label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox id="accept-privacy" checked={privacyAccepted} onCheckedChange={(value) => setPrivacyAccepted(value === true)} />
                    <label htmlFor="accept-privacy" className="text-sm leading-5 text-gray-300">He leído la <Link to={LEGAL_DOCUMENTS.privacy.path} target="_blank" className="text-moto-orange underline">Política de Privacidad</Link> <span className="text-gray-500">({LEGAL_DOCUMENTS.privacy.version})</span>.</label>
                  </div>
                  <p className="text-xs text-amber-200">Versiones de prueba en estado borrador; requerirán nueva aceptación cuando sean aprobadas.</p>
                </fieldset>
              )}

              <label className="block">
                <span className="mb-1 block text-sm text-gray-400">Contraseña</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-moto-darker p-3 text-white outline-none focus:border-moto-orange"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </label>

              {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

              <Button
                type="submit"
                disabled={isSubmitting || !isConfigured || (mode === 'signup' && (!termsAccepted || !privacyAccepted))}
                className="w-full bg-moto-orange py-6 text-moto-darker hover:bg-moto-orange-dark"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ArrowRight className="mr-2 h-5 w-5" />}
                {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </Button>
            </form>

            <button
              className="mt-5 w-full rounded-lg px-3 py-2 text-center text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-moto-orange"
              onClick={() => {
                setError(null)
                const nextMode = mode === 'login' ? 'signup' : 'login'
                setMode(nextMode)
                setTermsAccepted(false)
                setPrivacyAccepted(false)
                setSearchParams(nextMode === 'signup' ? { mode: 'signup' } : {}, { replace: true })
              }}
            >
              {mode === 'login' ? 'No tengo cuenta, quiero registrarme' : 'Ya tengo cuenta, quiero entrar'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
