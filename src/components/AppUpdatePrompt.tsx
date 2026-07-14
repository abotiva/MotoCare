import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { appVersion, buildTime } from '@/lib/appVersion'

type UpdateEvent = CustomEvent<ServiceWorkerRegistration>

async function clearOldCaches() {
  if (!('caches' in window)) return

  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames
      .filter((name) => name.startsWith('motocare-cache-'))
      .map((name) => caches.delete(name))
  )
}

export function AppUpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const handleUpdateAvailable = (event: Event) => {
      setRegistration((event as UpdateEvent).detail)
      setIsDismissed(false)
    }

    window.addEventListener('motocare:update-available', handleUpdateAvailable)
    return () => window.removeEventListener('motocare:update-available', handleUpdateAvailable)
  }, [])

  const updateApp = async () => {
    if (!registration?.waiting) return

    setIsUpdating(true)
    await clearOldCaches()
    registration.waiting.postMessage({ type: 'CLEAR_OLD_CACHES' })
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  if (!registration || isDismissed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 lg:bottom-6 lg:left-auto lg:right-6 lg:w-96">
      <div className="rounded-2xl border border-moto-orange/30 bg-moto-gray p-4 shadow-xl shadow-moto-orange/10">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-moto-orange">
            <RefreshCw className={`h-6 w-6 text-moto-darker ${isUpdating ? 'animate-spin' : ''}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Nueva versión disponible</h3>
              <button type="button" className="rounded-lg p-1 transition-colors hover:bg-white/5" onClick={() => setIsDismissed(true)}>
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Actualiza MotoCare Co para cargar los últimos cambios y limpiar la caché local.
            </p>
            <p className="mt-2 text-[11px] text-gray-500">
              Version actual: {appVersion} · Build: {new Date(buildTime).toLocaleString('es-CO')}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="flex-1 bg-moto-orange text-xs text-moto-darker hover:bg-moto-orange-dark" disabled={isUpdating} onClick={updateApp}>
                <RefreshCw className={`mr-1 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                Actualizar app
              </Button>
              <Button size="sm" variant="ghost" className="text-xs text-gray-400" onClick={() => setIsDismissed(true)}>
                Luego
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
