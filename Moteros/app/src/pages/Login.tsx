import { FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MotoCareLogo } from '@/components/MotoCareLogo'
import { useAuth } from '@/contexts/AuthContext'

export function Login() {
  const { signIn, signUp, user, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        await signUp(email, password, fullName)
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
        <img src="/hero-motorcycle.jpg" alt="Ruta MotoCare" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-moto-darker via-moto-dark/80 to-transparent" />
        <div className="absolute bottom-12 left-12 max-w-xl">
          <MotoCareLogo />
          <h1 className="mt-8 text-5xl font-bold leading-tight">
            Cuida tu moto. Vive tu <span className="text-gradient">ruta</span>.
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            Registra tu moto, controla vencimientos y manten el historial listo para cada kilometro.
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
            <h2 className="mt-2 text-3xl font-bold">{mode === 'login' ? 'Entrar a MotoCare' : 'Empieza con tu moto'}</h2>
            <p className="mt-2 text-sm text-gray-400">
              {mode === 'login'
                ? 'Accede para gestionar tu moto y tus recordatorios.'
                : 'Tu primer garaje digital queda listo en minutos.'}
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
                    placeholder="Juan Perez"
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

              <label className="block">
                <span className="mb-1 block text-sm text-gray-400">Contrasena</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-moto-darker p-3 text-white outline-none focus:border-moto-orange"
                  placeholder="Minimo 6 caracteres"
                  minLength={6}
                  required
                />
              </label>

              {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

              <Button
                type="submit"
                disabled={isSubmitting || !isConfigured}
                className="w-full bg-moto-orange py-6 text-moto-darker hover:bg-moto-orange-dark"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ArrowRight className="mr-2 h-5 w-5" />}
                {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </Button>
            </form>

            <button
              className="mt-5 w-full text-center text-sm text-gray-400 hover:text-moto-orange"
              onClick={() => {
                setError(null)
                setMode(mode === 'login' ? 'signup' : 'login')
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
