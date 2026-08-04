import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'

export function RiderOnlyRoute({ children }: { children: ReactNode }) {
  const { effectivePlan, isLoadingSubscription } = useSubscription()

  if (isLoadingSubscription) {
    return <div className="grid min-h-[50vh] place-items-center text-moto-orange"><Loader2 className="h-7 w-7 animate-spin" /></div>
  }
  if (effectivePlan === 'business') return <Navigate to="/app/marketplace" replace />
  return children
}
