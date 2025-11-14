// sw.js

// ¡¡ATENCIÓN!! Incrementa este número (v4, v5...) si haces cambios
// en cualquier archivo cacheado para forzar la actualización.
const CACHE_NAME = 'pwa-tareas-cache-v3';

// Lista de archivos a cachear
const urlsToCache = [
    '/',
    'index.html',
    'style.css',
    'main.js',
    'manifest.json',
    'firebase-config.js', // ¡Importante! Cachear este también
    'images/icon-192x192.png',
    'images/icon-512x512.png',
    'images/logo.png'
    // 'offline.html' // (Lo agregaremos en el Ejercicio 4)
];

// 1. Evento de Instalación (install)
self.addEventListener('install', event => {
    console.log('SW: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Abriendo caché y guardando archivos estáticos');
                return cache.addAll(urlsToCache);
            })
            .catch(err => {
                console.error('SW: Falló cache.addAll', err);
            })
    );
});

// 2. Evento de Activación (activate)
// Limpia cachés antiguas
self.addEventListener('activate', event => {
    console.log('SW: Activando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Limpiando caché antigua:', cacheName);
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

// 4. Evento Push (para Notificaciones Push reales)
self.addEventListener('push', event => {
    console.log('SW: Notificación Push recibida');
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Nueva Tarea';
    const options = {
        body: data.body || '¡Tienes nuevas tareas pendientes!',
        icon: 'images/icon-192x192.png',
        badge: 'images/logo.png'
    };
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});