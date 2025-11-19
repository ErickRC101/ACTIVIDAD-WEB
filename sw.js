// sw.js
// He subido la versión para forzar a que el navegador actualice este archivo
const CACHE_NAME = 'pwa-tareas-cache-v6';

// Rutas base (ajustadas a tu repositorio)
const BASE_PATH = '/ACTIVIDAD-WEB/';

const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index.html',
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
    console.log('SW (principal): Instalando...');
    self.skipWaiting(); // Fuerza al SW a activarse de inmediato
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW (principal): Cacheando archivos...');
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error('Error cacheando:', err))
    );
});

// 2. ACTIVACIÓN
self.addEventListener('activate', event => {
    console.log('SW (principal): Activando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW (principal): Borrando caché vieja:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Toma control de la página inmediatamente
    );
});

// 3. INTERCEPTACIÓN (FETCH) - ¡AQUÍ ESTABA EL ERROR!
self.addEventListener('fetch', event => {
    
    // EXCEPCIÓN IMPORTANTE:
    // Si la petición es para Firebase, Google APIs o scripts externos, 
    // NO intentes buscarla en caché local. Déjala pasar a la red.
    if (event.request.url.includes('firebase') || 
        event.request.url.includes('googleapis') || 
        event.request.url.includes('gstatic')) {
        return; // "return" vacío significa: "Service Worker, no te metas, ve a la red"
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si está en caché, devuélvelo
                if (response) {
                    return response;
                }
                // Si no, búscalo en la red
                return fetch(event.request).catch(err => {
                   // Si falla la red (offline) y no está en caché, no hacemos nada (o mostramos offline.html)
                   console.log("Error solicitando recurso:", event.request.url);
                });
            })
    );
});