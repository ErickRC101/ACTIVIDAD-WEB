// Importar las funciones necesarias de los SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
// OJO: Importamos initializeFirestore en lugar de getFirestore para configurarlo
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCEefPRDaJKCqVjH-EnBOexaWjZzGKPsUk", // Tu API Key real
  authDomain: "lista-de-tareas-3365f.firebaseapp.com",
  projectId: "lista-de-tareas-3365f",
  storageBucket: "lista-de-tareas-3365f.firebasestorage.app",
  messagingSenderId: "918288225000",
  appId: "1:918288225000:web:ee31ac6c481f1bd3ab6f5d",
  measurementId: "G-93Z01RW3HN"
};

// 1. Inicializar Firebase App
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 2. Inicializar Firestore con configuración anti-errores de red (QUIC fix)
export const db = initializeFirestore(app, {
    // Esto fuerza el uso de HTTP estándar, evitando el error QUIC_PROTOCOL_ERROR
    experimentalForceLongPolling: true, 
    // (Opcional) Persistencia offline nativa de Firebase
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()}) 
});

// 3. Inicializar Messaging
export const messaging = getMessaging(app);