// -------------------------------------------------------------------------
// firebase-messaging-sw.js
// Service Worker exclusivo para recibir notificaciones Push en segundo plano
// -------------------------------------------------------------------------

// Importamos los scripts de Firebase Compat (Más estables para SW)
importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js");

// Inicializa Firebase (Asegúrate de que estos datos sean de TU proyecto)
firebase.initializeApp({
  apiKey: "AIzaSyCEefPRDaJKCqVjH-EnBOexaWjZzGKPsUk",
  authDomain: "lista-de-tareas-3365f.firebaseapp.com",
  projectId: "lista-de-tareas-3365f",
  storageBucket: "lista-de-tareas-3365f.firebasestorage.app",
  messagingSenderId: "918288225000",
  appId: "1:918288225000:web:ee31ac6c481f1bd3ab6f5d",
  measurementId: "G-93Z01RW3HN"
});

// Obtenemos la instancia de mensajería
const messaging = firebase.messaging();

// Manejador para cuando la App está CERRADA (Background)
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Notificación recibida en background:", payload);

  // Extraemos datos
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: './images/icon-192x192.png', // Ruta relativa importante para GitHub Pages
    badge: './images/icon-192x192.png', // Icono pequeño para la barra de estado (Android)
    vibrate: [200, 100, 200],
    tag: 'notificacion-push' // Evita acumulación excesiva de notificaciones
  };

  // Mostramos la notificación usando la API nativa del Service Worker
  return self.registration.showNotification(notificationTitle, notificationOptions);
});