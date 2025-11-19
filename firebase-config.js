// Importar las funciones necesarias
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
// IMPORTANTE: Importamos initializeFirestore para poder configurar la conexión
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging.js";

// Tu configuración exacta
const firebaseConfig = {
  apiKey: "AIzaSyCEefPRDaJKCqVjH-EnBOexaWjZzGKPsUk",
  authDomain: "lista-de-tareas-3365f.firebaseapp.com",
  projectId: "lista-de-tareas-3365f",
  storageBucket: "lista-de-tareas-3365f.firebasestorage.app",
  messagingSenderId: "918288225000",
  appId: "1:918288225000:web:ee31ac6c481f1bd3ab6f5d",
  measurementId: "G-93Z01RW3HN"
};

// 1. Inicializar App
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 2. Inicializar Firestore con la SOLUCIÓN para PC
// 'experimentalForceLongPolling: true' obliga a usar HTTP normal,
// evitando el error "QUIC_PROTOCOL_ERROR" que te salía en la computadora.
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true, 
});

// 3. Inicializar Messaging (Notificaciones)
export const messaging = getMessaging(app);