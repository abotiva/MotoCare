let isRefreshing = false

function dispatchUpdateAvailable(registration: ServiceWorkerRegistration) {
  window.dispatchEvent(new CustomEvent('motocare:update-available', { detail: registration }))
}

function watchInstallingWorker(registration: ServiceWorkerRegistration, worker: ServiceWorker) {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      dispatchUpdateAvailable(registration)
    }
  })
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isRefreshing) return
    isRefreshing = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (registration.waiting) {
          dispatchUpdateAvailable(registration)
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          if (worker) watchInstallingWorker(registration, worker)
        })

        window.setInterval(() => {
          void registration.update()
        }, 60 * 60 * 1000)
      })
      .catch((error) => {
        console.log('SW error:', error)
      })
  })
}
