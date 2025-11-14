// sw.js

// ¡¡ATENCIÓN!! Incrementé la versión para forzar la actualización.
const CACHE_NAME = 'pwa-tareas-cache-v4';

// Lista de archivos a cachear
const urlsToCache = [
    '/',
    'index.html',
    'style.css',
    'main.js',
    'manifest.json',
    'firebase-config.js',
    'images/icon-192x192.png',
    'images/icon-512x512.png',
    'images/logo.png',
    'firebase-messaging-sw.js' 
];

// 1. Evento de Instalación (install)
self.addEventListener('install', event => {
    console.log('SW (principal): Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW (principal): Abriendo caché y guardando archivos estáticos');
                return cache.addAll(urlsToCache);
            })
            .catch(err => {
                console.error('SW (principal): Falló cache.addAll', err);
            })
    );
});

// 2. Evento de Activación (activate)
// Limpia cachés antiguas
self.addEventListener('activate', event => {
    console.log('SW (principal): Activando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW (principal): Limpiando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 3. Evento de Interceptación (fetch)
self.addEventListener('fetch', event => {
    // Estrategia: Cache-First (primero caché, si falla, red)
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si está en caché, lo devuelve
                if (response) {
                    return response;
                }
                // Si no, va a la red
                return fetch(event.request);
            })
    );
});

//
// 4. Evento Push
// (¡ELIMINADO!)
// El archivo 'firebase-messaging-sw.js' se encarga ahora de esto.
//