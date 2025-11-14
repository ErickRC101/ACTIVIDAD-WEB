import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

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
  const analytics = getAnalytics(app);
  export const db = getFirestore(app);