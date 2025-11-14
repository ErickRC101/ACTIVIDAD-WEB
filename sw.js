// sw.js

// Definimos los recursos a cachear (Etapa 3 / Ejercicio 2)
const CACHE_NAME = 'pwa-tareas-cache-v1';
const urlsToCache = [
    '/',
    'index.html',
    'style.css',
    'main.js',
    'manifest.json',
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
                return cache.addAll(urlsToCache); // [cite: 64]
            })
    );
});

// 2. Evento de Activación (activate)
self.addEventListener('activate', event => {
    console.log('SW: Activando...');
    // Aquí podrías limpiar cachés antiguas si es necesario
});

// 3. Evento de Interceptación (fetch)
self.addEventListener('fetch', event => {
    console.log('SW: Interceptando fetch para', event.request.url);
    
    // Estrategia: Cache-First (primero caché, si falla, red)
    // Esto hace que la app funcione offline 
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
            // (Agregaremos el manejo de 'offline.html' en el Ejercicio 4)
    );
});