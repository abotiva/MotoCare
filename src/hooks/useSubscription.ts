import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { UserPlan, UserPlanStatus, UserSubscription } from '@/types/database'

const planRank: Record<UserPlan, number> = {
  free: 0,
  pro: 1,
  premium: 1,
  business: 2,
}

export const planLabels: Record<UserPlan, string> = {
  free: 'Free',
  pro: 'Premium',
  premium: 'Premium',
  business: 'Business',
}

const activeStatuses: UserPlanStatus[] = ['active', 'trialing']

const defaultSubscription: UserSubscription = {
  user_id: '',
  plan: 'free',
  status: 'active',
  expires_at: null,
  updated_at: null,
}

function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now())
}

function effectivePlanFor(subscription: UserSubscription): UserPlan {
  if (!activeStatuses.includes(subscription.status)) return 'free'
  if (isExpired(subscription.expires_at)) return 'free'
  return subscription.plan
}

export function useSubscription() {
  const { user } = useAuth()
  const userId = user?.id
  const [subscription, setSubscription] = useState<UserSubscription>(defaultSubscription)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)

  useEffect(() => {
    if (!supabase || !userId) {
      setSubscription(defaultSubscription)
      setIsLoadingSubscription(false)
      return
    }
    const client = supabase

    const loadSubscription = async () => {
      setIsLoadingSubscription(true)
      const { data, error } = await client.rpc('current_user_subscription')

      if (error) {
        setSubscription({ ...defaultSubscription, user_id: userId })
      } else {
        const row = Array.isArray(data) ? data[0] : data
        setSubscription({
          user_id: row?.user_id ?? userId,
          plan: (row?.plan as UserPlan | undefined) ?? 'free',
          status: (row?.status as UserPlanStatus | undefined) ?? 'active',
          expires_at: row?.expires_at ?? null,
          updated_at: row?.updated_at ?? null,
        })
      }

      setIsLoadingSubscription(false)
    }

    void loadSubscription()
  }, [userId])

  const effectivePlan = useMemo(() => effectivePlanFor(subscription), [subscription])

  return {
    subscription,
    plan: subscription.plan,
    effectivePlan,
    isLoadingSubscription,
    hasPlan(requiredPlan: UserPlan) {
      return planRank[effectivePlan] >= planRank[requiredPlan]
    },
  }
}
