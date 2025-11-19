// sw.js (Versión Final - Completa)
// Incrementamos versión para forzar actualización
const CACHE_NAME = 'pwa-tareas-cache-v7-final';

// Ruta base (Ajustada para GitHub Pages)
const BASE_PATH = '/ACTIVIDAD-WEB/';

const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'offline.html', // <--- NUEVO: Agregamos la página de error
  BASE_PATH + 'style.css',
  BASE_PATH + 'main.js',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'firebase-config.js',
  BASE_PATH + 'images/icon-192x192.png',
  BASE_PATH + 'images/icon-512x512.png',
  BASE_PATH + 'images/logo.png'
];

// 1. INSTALACIÓN
self.addEventListener('install', event => {
    console.log('SW: Instalando y cacheando offline.html...');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error('Fallo en caché inicial:', err))
    );
});

// 2. ACTIVACIÓN (Limpieza de caché vieja)
self.addEventListener('activate', event => {
    console.log('SW: Activando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. INTERCEPTACIÓN (Estrategia Offline)
self.addEventListener('fetch', event => {
    
    // A. Ignorar peticiones a Google/Firebase (Para evitar errores de CORS/QUIC)
    if (event.request.url.includes('firebase') || 
        event.request.url.includes('googleapis') || 
        event.request.url.includes('gstatic')) {
        return; 
    }

    // B. Estrategia: Cache First, falling back to Network, falling back to Offline Page
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 1. Si está en caché, devolverlo
                if (response) {
                    return response;
                }

                // 2. Si no, intentar red
                return fetch(event.request).catch(error => {
                    // 3. Si falla la red (Offline)...
                    console.log("Petición fallida:", event.request.url);

                    // Verificar si lo que pedía era una PÁGINA (HTML)
                    if (event.request.mode === 'navigate') {
                        // Devolver la página offline personalizada
                        return caches.match(BASE_PATH + 'offline.html');
                    }
                });
            })
    );
});