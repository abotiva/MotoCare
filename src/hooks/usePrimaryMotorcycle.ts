import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { selectPrimaryMotorcycle } from '@/lib/motorcycles'
import type { Motorcycle } from '@/types/database'

export function usePrimaryMotorcycle() {
  const { user, profile } = useAuth()
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([])
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setMotorcycles([]); setMotorcycle(null); setIsLoading(false); return
    }
    setIsLoading(true); setError(null)
    const { data, error: queryError } = await supabase.from('motorcycles').select('*').eq('owner_id', user.id).order('created_at', { ascending: true }).limit(10)
    if (queryError) { setError('No pudimos cargar la información de tu moto.'); setIsLoading(false); return }
    const available = (data ?? []) as Motorcycle[]
    setMotorcycles(available)
    setMotorcycle(selectPrimaryMotorcycle(available, profile?.primary_motorcycle_id))
    setIsLoading(false)
  }, [profile?.primary_motorcycle_id, user])

  useEffect(() => { void refresh() }, [refresh])
  return { motorcycle, motorcycles, isLoading, error, refresh }
}
