// Importar los scripts clásicos de Firebase para SW
importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js");

// Tu configuración de Firebase
firebase.initializeApp({
  apiKey: "AIzaSyCEefPRDaJKCqVjH-EnBOexaWjZzGKPsUk",
  authDomain: "lista-de-tareas-3365f.firebaseapp.com",
  projectId: "lista-de-tareas-3365f",
  storageBucket: "lista-de-tareas-3365f.firebasestorage.app",
  messagingSenderId: "918288225000",
  appId: "1:918288225000:web:ee31ac6c481f1bd3ab6f5d",
  measurementId: "G-93Z01RW3HN"
});

// Inicializar Messaging
const messaging = firebase.messaging();

// Manejar mensajes cuando la app está cerrada o en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message:", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/images/icon-192x192.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
