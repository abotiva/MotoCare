import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, isConfigured } = useAuth()
  const location = useLocation()

  if (!isConfigured) {
    return (
      <div className="grid min-h-screen place-items-center bg-moto-dark p-6 text-white">
        <div className="max-w-xl rounded-2xl border border-moto-orange/30 bg-moto-gray p-6 shadow-xl shadow-moto-orange/10">
          <p className="text-sm font-semibold uppercase tracking-wider text-moto-orange">Configuracion pendiente</p>
          <h1 className="mt-3 text-2xl font-bold">Conecta MotoCare con Supabase</h1>
          <p className="mt-3 text-gray-300">
            Crea un archivo <code className="rounded bg-moto-darker px-1.5 py-0.5">.env</code> a partir de
            <code className="ml-1 rounded bg-moto-darker px-1.5 py-0.5">.env.example</code> y agrega tus llaves de Supabase.
          </p>
          <p className="mt-3 text-sm text-gray-400">
            Luego ejecuta <code className="rounded bg-moto-darker px-1.5 py-0.5">supabase/schema.sql</code> en Supabase SQL Editor.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-moto-dark text-moto-orange">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
