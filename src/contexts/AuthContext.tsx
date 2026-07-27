import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isConfigured: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  retryAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const AUTH_TIMEOUT_MS = 10_000

function withTimeout<T>(promise: PromiseLike<T>, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS)

    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      }
    )
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [authError, setAuthError] = useState<string | null>(null)

  const loadSession = useCallback(async () => {
    if (!supabase) {
      setSession(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setAuthError(null)

    try {
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        'La validación de la sesión tardó demasiado.'
      )

      if (error) {
        setSession(null)
        setAuthError('No fue posible validar la sesión. Revisa tu conexión e inténtalo de nuevo.')
        return
      }

      setSession(data.session)
    } catch (error) {
      setSession(null)
      setAuthError(error instanceof Error ? error.message : 'No fue posible validar la sesión.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      setAuthError(null)
      if (!nextSession) setProfile(null)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [loadSession])

  const refreshProfile = useCallback(async () => {
    if (!supabase || !session?.user) {
      setProfile(null)
      return
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle(),
        'La carga del perfil tardó demasiado.'
      )

      if (error) {
        setProfile(null)
        setAuthError('La sesión está activa, pero no fue posible cargar tu perfil. Inténtalo de nuevo.')
        return
      }

      // `data === null` without an error means that the account has no profile yet.
      setProfile((data as Profile | null) ?? null)
      setAuthError(null)
    } catch (error) {
      setProfile(null)
      setAuthError(error instanceof Error ? error.message : 'No fue posible cargar tu perfil.')
    }
  }, [session?.user])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      isConfigured: isSupabaseConfigured,
      authError,
      async signIn(email, password) {
        if (!supabase) throw new Error('Supabase no esta configurado.')
        setAuthError(null)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      async signUp(email, password, fullName) {
        if (!supabase) throw new Error('Supabase no esta configurado.')
        setAuthError(null)
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })
        if (error) throw error
      },
      async signOut() {
        if (!supabase) return
        const { error } = await supabase.auth.signOut()
        if (error) {
          setAuthError('No fue posible cerrar la sesión. Inténtalo de nuevo.')
          return
        }
        setSession(null)
        setProfile(null)
        setAuthError(null)
      },
      refreshProfile,
      async retryAuth() {
        await loadSession()
        if (session?.user) await refreshProfile()
      },
    }),
    [authError, isLoading, loadSession, profile, refreshProfile, session]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
