// Importar scripts de Firebase Compat (Estable para Service Workers)
importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js");

// Configuración de Firebase (Debe coincidir con la tuya)
firebase.initializeApp({
  apiKey: "AIzaSyCEefPRDaJKCqVjH-EnBOexaWjZzGKPsUk",
  authDomain: "lista-de-tareas-3365f.firebaseapp.com",
  projectId: "lista-de-tareas-3365f",
  storageBucket: "lista-de-tareas-3365f.firebasestorage.app",
  messagingSenderId: "918288225000",
  appId: "1:918288225000:web:ee31ac6c481f1bd3ab6f5d",
  measurementId: "G-93Z01RW3HN"
});

const messaging = firebase.messaging();

// Manejador de mensajes en SEGUNDO PLANO (App cerrada/minimizada)
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Notificación Push recibida:", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: './images/icon-192x192.png', // Ruta relativa corregida
    badge: './images/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'push-notification'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});