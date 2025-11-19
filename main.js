// Importar 'db' y 'messaging' de tu archivo de configuración
import { db, messaging } from './firebase-config.js'; 

// Importar las funciones de Firestore que usaremos
import { 
    collection, addDoc, getDocs, deleteDoc, doc, 
    query, orderBy, Timestamp 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// Importar el 'getToken' para las notificaciones
import { getToken } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- Lógica de Registro del Service Worker PRINCIPAL (Para caché offline) ---
    // Solo registramos sw.js aquí. El de Firebase se carga al pedir permiso.
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/ACTIVIDAD-WEB/sw.js') // Ruta absoluta
                .then(registration => {
                    console.log('SW (principal) registrado correctamente:', registration);
                })
                .catch(error => {
                    console.log('Error al registrar SW (principal):', error);
                });
        });
    }

    // --- Lógica de Almacenamiento (Etapa 4) ---
    const formTarea = document.getElementById('form-tarea');
    const inputTarea = document.getElementById('input-tarea');
    const listaTareas = document.getElementById('lista-tareas');
    const tareasCollection = collection(db, 'tareas');

    // Función para renderizar una tarea en la UI
    function renderizarTarea(id, texto) {
        const li = document.createElement('li');
        li.setAttribute('data-id', id);
        li.innerHTML = `<span>${texto}</span><button class="delete-btn">Borrar</button>`;
        li.querySelector('.delete-btn').onclick = () => borrarTarea(id, li);
        listaTareas.appendChild(li);
    }

    // Función para agregar tarea
    async function agregarTarea(e) {
        e.preventDefault();
        const textoTarea = inputTarea.value.trim();
        if (textoTarea === '') return;
        const nuevaTarea = { texto: textoTarea, timestamp: Timestamp.fromDate(new Date()) };
        try {
            const docRef = await addDoc(tareasCollection, nuevaTarea);
            guardarLocal(docRef.id, nuevaTarea.texto);
            renderizarTarea(docRef.id, nuevaTarea.texto);
        } catch (error) { console.error("Error Firestore:", error); }
        inputTarea.value = ''; 
    }

    // Función para borrar tarea
    async function borrarTarea(id, elementoLi) {
        try {
            await deleteDoc(doc(db, 'tareas', id));
            borrarLocal(id);
            listaTareas.removeChild(elementoLi);
        } catch (error) { console.error("Error Firestore:", error); }
    }

    // --- Almacenamiento Local ---
    function guardarLocal(id, texto) {
        const tareas = obtenerTareasLocal();
        tareas[id] = texto;
        localStorage.setItem('tareas', JSON.stringify(tareas));
    }
    function borrarLocal(id) {
        const tareas = obtenerTareasLocal();
        delete tareas[id];
        localStorage.setItem('tareas', JSON.stringify(tareas));
    }
    function obtenerTareasLocal() {
        const tareas = localStorage.getItem('tareas');
        return tareas ? JSON.parse(tareas) : {};
    }

    // Cargar tareas
    async function cargarTareas() {
        try {
            const q = query(tareasCollection, orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                const tareasLocales = obtenerTareasLocal();
                for (const id in tareasLocales) renderizarTarea(id, tareasLocales[id]);
            } else {
                localStorage.removeItem('tareas'); 
                querySnapshot.forEach(doc => {
                    renderizarTarea(doc.id, doc.data().texto);
                    guardarLocal(doc.id, doc.data().texto);
                });
            }
        } catch (error) {
            console.warn("Offline, cargando local:", error.message);
            const tareasLocales = obtenerTareasLocal();
            for (const id in tareasLocales) renderizarTarea(id, tareasLocales[id]);
        }
    }

    formTarea.addEventListener('submit', agregarTarea);
    cargarTareas();

    // --- Estado de red ---
    const divEstadoRed = document.getElementById('estado-red');
    function actualizarEstadoRed() {
        divEstadoRed.className = navigator.onLine ? 'online' : 'offline';
        divEstadoRed.textContent = navigator.onLine ? 'Estás Conectado (Online)' : 'Estás Desconectado (Offline)';
    }
    window.addEventListener('online', actualizarEstadoRed);
    window.addEventListener('offline', actualizarEstadoRed);
    actualizarEstadoRed();

    // --- NOTIFICACIONES PUSH (CORREGIDO) ---
    const btnNotificaciones = document.getElementById('btn-notificaciones');

    btnNotificaciones.addEventListener('click', () => {
        console.log("Solicitando permiso...");
        pedirToken();
    });

    async function pedirToken() {
        const VAPID_KEY = "BFP4SNKgtthyCcA57vQGpMkBFcLgLWzntgivWXNOgHPFhKJ1osAj_26jUXGf4Tad1UhviqBrQqPxqW1tpB7o7wI";

        try {
            // 1. Registramos el SW de Firebase usando la RUTA ABSOLUTA
            // Esto evita el error de "ACTIVIDAD-WEB/ACTIVIDAD-WEB/"
            const swRegistration = await navigator.serviceWorker.register('/ACTIVIDAD-WEB/firebase-messaging-sw.js', {
                // Usamos un scope diferente para que no sobrescriba a tu sw.js principal
                scope: '/ACTIVIDAD-WEB/firebase-cloud-messaging-push-scope'
            });
            
            console.log('SW (Firebase) registrado manualmente:', swRegistration);

            // 2. Pasamos ese registro a getToken
            const currentToken = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration
            });

            if (currentToken) {
                console.log('Token FCM:', currentToken);
                btnNotificaciones.textContent = "¡Notificaciones Activadas!";
                btnNotificaciones.disabled = true;
                // ¡Prueba enviar un mensaje desde Firebase Console a este token!
            } else {
                console.log('No se obtuvo permiso.');
            }
        } catch (err) {
            console.log('Error al obtener token:', err);
        }
    }
});