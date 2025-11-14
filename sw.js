// sw.js

// ¡¡ATENCIÓN!! Incrementé la versión para forzar la actualización.
const CACHE_NAME = 'pwa-tareas-cache-v5';

// Lista de archivos a cachear.
// ¡REVISA QUE TODOS ESTOS EXISTAN EN TU GITHUB PAGES!
const urlsToCache = [
    '/',
    'index.html',
    'style.css',
    'main.js',
    'manifest.json',
    'firebase-config.js',
    'images/icon-192x192.png',
    'images/icon-512x512.png',
    'images/logo.png'
];

// 1. Evento de Instalación (install)
self.addEventListener('install', event => {
    console.log('SW (principal): Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW (principal): Abriendo caché y guardando archivos estáticos');
                // Si esto falla, es porque uno de los archivos en urlsToCache
                // no se encontró (dio 404)
                return cache.addAll(urlsToCache); 
            })
            .catch(err => {
                console.error('SW (principal): Falló cache.addAll', err);
                // Revisa la pestaña "Network" (Red) en F12
                // para ver qué archivo dio error 404.
            })
    );
});

// 2. Evento de Activación (activate)
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

// (El evento 'push' fue eliminado correctamente de aquí)