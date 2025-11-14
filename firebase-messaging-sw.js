import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCEefPRDaJKCqVjH-EnBOexaWjZzGKPsUk",
    authDomain: "lista-de-tareas-3365f.firebaseapp.com",
    projectId: "lista-de-tareas-3365f",
    storageBucket: "lista-de-tareas-3365f.firebasestorage.app",
    messagingSenderId: "918288225000",
    appId: "1:918288225000:web:ee31ac6c481f1bd3ab6f5d",
    measurementId: "G-93Z01RW3HN"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  // Obtener la instancia de Messaging
const messaging = firebase.messaging();

// Manejar notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Mensaje en segundo plano recibido.",
    payload
  );

  // Personalizar la notificación
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/images/icon-192x192.png' // Usa uno de tus íconos
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});