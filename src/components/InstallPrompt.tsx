import { useEffect, useState } from 'react'
import { Download, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    if ((window.navigator as NavigatorWithStandalone).standalone === true) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        alert('Para instalar en iOS:\n\n1. Toca el boton Compartir\n2. Selecciona "Agregar a Inicio"\n3. Toca "Agregar"')
      }
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('PWA instalada')
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  if (isInstalled || !showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 lg:bottom-6 lg:left-auto lg:right-6 lg:w-96">
      <div className="animate-slide-up rounded-2xl border border-moto-orange/30 bg-moto-gray p-4 shadow-xl shadow-moto-orange/10">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-moto-orange">
            <Smartphone className="h-6 w-6 text-moto-darker" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Instalar MotoCare</h3>
              <button onClick={() => setShowPrompt(false)} className="rounded-lg p-1 transition-colors hover:bg-white/5">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Instala la app para acceso rapido y notificaciones incluso sin conexion.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="flex-1 bg-moto-orange text-xs text-moto-darker hover:bg-moto-orange-dark" onClick={handleInstall}>
                <Download className="mr-1 h-4 w-4" />
                Instalar
              </Button>
              <Button size="sm" variant="ghost" className="text-xs text-gray-400" onClick={() => setShowPrompt(false)}>
                Ahora no
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
