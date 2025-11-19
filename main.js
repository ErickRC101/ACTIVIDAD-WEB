// Importar configuración y SDKs
import { db, messaging } from './firebase-config.js'; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, 
    query, orderBy, Timestamp 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging.js";

document.addEventListener('DOMContentLoaded', () => {

    // ==============================================================
    // 1. REGISTRO DEL SERVICE WORKER PRINCIPAL (Caché / Offline)
    // ==============================================================
    // Este SW (sw.js) se encarga de que la app funcione sin internet
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('SW (Caché) registrado:', registration.scope);
                })
                .catch(err => console.log('Fallo al registrar SW Caché:', err));
        });
    }

    // ==============================================================
    // 2. LÓGICA DE LA APLICACIÓN (Tareas)
    // ==============================================================
    const formTarea = document.getElementById('form-tarea');
    const inputTarea = document.getElementById('input-tarea');
    const listaTareas = document.getElementById('lista-tareas');
    const tareasCollection = collection(db, 'tareas');

    // Función auxiliar: Muestra notificación compatible con PC y Android
    function mostrarNotificacionOficial(titulo, cuerpo) {
        if (Notification.permission === 'granted') {
            // Intentamos usar el SW activo para mostrar la notificación (requerido en Android)
            navigator.serviceWorker.getReady.then(registration => {
                registration.showNotification(titulo, {
                    body: cuerpo,
                    icon: 'images/icon-192x192.png',
                    vibrate: [200, 100, 200]
                });
            }).catch(() => {
                // Fallback simple si algo falla
                new Notification(titulo, { 
                    body: cuerpo, 
                    icon: 'images/icon-192x192.png' 
                });
            });
        }
    }

    function renderizarTarea(id, texto) {
        const li = document.createElement('li');
        li.setAttribute('data-id', id);
        li.innerHTML = `<span>${texto}</span> <button class="delete-btn">Borrar</button>`;
        li.querySelector('.delete-btn').onclick = () => borrarTarea(id, li);
        listaTareas.appendChild(li);
    }

    async function agregarTarea(e) {
        e.preventDefault();
        const textoTarea = inputTarea.value.trim();
        if (textoTarea === '') return;

        const nuevaTarea = {
            texto: textoTarea,
            timestamp: Timestamp.fromDate(new Date())
        };

        try {
            // 1. Guardar en Firestore
            const docRef = await addDoc(tareasCollection, nuevaTarea);
            
            // 2. Guardar Local y Renderizar
            guardarLocal(docRef.id, nuevaTarea.texto);
            renderizarTarea(docRef.id, nuevaTarea.texto);
            
            // 3. Notificación Local (Feedback inmediato)
            mostrarNotificacionOficial('¡Tarea Agregada!', `Guardada: "${nuevaTarea.texto}"`);

        } catch (error) {
            console.error("Error guardando (posiblemente offline): ", error);
            // Aquí podrías añadir lógica para guardar pendiente de sincronización
        }
        inputTarea.value = ''; 
    }

    async function borrarTarea(id, elementoLi) {
        try {
            await deleteDoc(doc(db, 'tareas', id));
            borrarLocal(id);
            listaTareas.removeChild(elementoLi);
        } catch (error) {
            console.error("Error al borrar:", error);
            alert("Error al borrar. Verifica tu conexión.");
        }
    }

    // ==============================================================
    // 3. GESTIÓN DE DATOS (Offline/Online)
    // ==============================================================
    function guardarLocal(id, texto) {
        const tareas = JSON.parse(localStorage.getItem('tareas') || '{}');
        tareas[id] = texto;
        localStorage.setItem('tareas', JSON.stringify(tareas));
    }

    function borrarLocal(id) {
        const tareas = JSON.parse(localStorage.getItem('tareas') || '{}');
        delete tareas[id];
        localStorage.setItem('tareas', JSON.stringify(tareas));
    }

    async function cargarTareas() {
        listaTareas.innerHTML = '';
        if (navigator.onLine) {
            try {
                const q = query(tareasCollection, orderBy("timestamp", "desc"));
                const querySnapshot = await getDocs(q);
                localStorage.removeItem('tareas'); 
                querySnapshot.forEach(doc => {
                    renderizarTarea(doc.id, doc.data().texto);
                    guardarLocal(doc.id, doc.data().texto);
                });
            } catch (e) { cargarDeCacheLocal(); }
        } else {
            cargarDeCacheLocal();
        }
    }

    function cargarDeCacheLocal() {
        const tareas = JSON.parse(localStorage.getItem('tareas') || '{}');
        for (const id in tareas) renderizarTarea(id, tareas[id]);
    }

    formTarea.addEventListener('submit', agregarTarea);
    cargarTareas();

    // Monitor de Red
    const divEstadoRed = document.getElementById('estado-red');
    function actualizarEstadoRed() {
        if (navigator.onLine) {
            divEstadoRed.textContent = '🟢 Online';
            divEstadoRed.className = 'online';
            divEstadoRed.style.color = 'green';
            cargarTareas();
        } else {
            divEstadoRed.textContent = '🔴 Offline';
            divEstadoRed.className = 'offline';
            divEstadoRed.style.color = 'red';
        }
    }
    window.addEventListener('online', actualizarEstadoRed);
    window.addEventListener('offline', actualizarEstadoRed);
    actualizarEstadoRed();

    // ==============================================================
    // 4. NOTIFICACIONES PUSH (FIREBASE CLOUD MESSAGING)
    // ==============================================================
    
    // Listener para mensajes en PRIMER PLANO (App abierta)
    onMessage(messaging, (payload) => {
        console.log('Mensaje recibido en primer plano:', payload);
        const { title, body } = payload.notification;
        mostrarNotificacionOficial(title, body);
    });

    const btnNotificaciones = document.getElementById('btn-notificaciones');

    btnNotificaciones.addEventListener('click', () => {
        console.log("Solicitando permiso al usuario...");
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log("Permiso concedido. Obteniendo token...");
                pedirToken();
            } else {
                alert("Permiso denegado. Habilita las notificaciones en el navegador.");
            }
        });
    });

    async function pedirToken() {
        const VAPID_KEY = "BFP4SNKgtthyCcA57vQGpMkBFcLgLWzntgivWXNOgHPFhKJ1osAj_26jUXGf4Tad1UhviqBrQqPxqW1tpB7o7wI";

        try {
            // PASO CLAVE: Registrar SW manualmente antes de pedir token para evitar AbortError
            const swRegistration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
            
            // Esperamos a que el SW esté activo
            await navigator.serviceWorker.ready;

            console.log('SW de Mensajería listo. Solicitando token a Firebase...');

            const currentToken = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration 
            });

            if (currentToken) {
                console.log('Token generado con éxito:', currentToken);
                btnNotificaciones.textContent = "¡Notificaciones Activadas!";
                btnNotificaciones.disabled = true;
                mostrarNotificacionOficial("Configuración Exitosa", "Ahora puedes recibir notificaciones Push.");
            } else {
                console.log('No se obtuvo el token.');
            }
        } catch (err) {
            console.error('Error al configurar notificaciones:', err);
            alert("Hubo un error: " + err.message + ". Revisa la consola (F12).");
        }
    }
});