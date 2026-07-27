import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

type AdminAccess = 'checking' | 'allowed' | 'denied' | 'error'

export function AdminRoute({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<AdminAccess>('checking')

  const checkAccess = useCallback(async () => {
    if (!supabase) {
      setAccess('error')
      return
    }

    setAccess('checking')
    const { data, error } = await supabase.rpc('is_current_user_admin')

    if (error) {
      setAccess('error')
      return
    }

    setAccess(data === true ? 'allowed' : 'denied')
  }, [])

  useEffect(() => {
    void checkAccess()
  }, [checkAccess])

  if (access === 'checking') {
    return (
      <div className="grid min-h-[70vh] place-items-center text-moto-orange" role="status" aria-label="Validando acceso administrativo">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    )
  }

  if (access === 'denied') {
    return <Navigate to="/app/home" replace />
  }

  if (access === 'error') {
    return (
      <div className="grid min-h-[70vh] place-items-center p-6 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-moto-gray p-6 text-center">
          <h1 className="text-2xl font-bold">No pudimos validar tu acceso</h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-gray-300">
            El panel administrativo permanece bloqueado hasta confirmar tu rol.
          </p>
          <Button
            type="button"
            className="mt-6 bg-moto-orange text-moto-darker hover:bg-moto-orange-dark"
            onClick={() => void checkAccess()}
          >
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return children
}
