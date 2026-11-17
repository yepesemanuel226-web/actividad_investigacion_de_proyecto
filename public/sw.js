const CACHE_NAME = 'ecocert360-v1'

// Recursos estáticos a cachear en la instalación
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
]

// Instalar SW y cachear recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activar y limpiar cachés anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Estrategia: Network First para API/server actions, Cache First para estáticos
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // No interceptar requests de API, server actions ni admin
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin') ||
    request.method !== 'GET'
  ) {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cachear respuestas exitosas de recursos estáticos
        if (response.ok && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/'))) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        // Si no hay red, intentar desde caché
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // Si es navegación y no hay caché, mostrar la página principal
          if (request.mode === 'navigate') {
            return caches.match('/')
          }
        })
      })
  )
})

// Escuchar mensajes del cliente (ej. forzar actualización)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
