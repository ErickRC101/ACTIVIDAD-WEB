import { db, messaging } from './firebase-config.js'; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, 
    query, orderBy, Timestamp 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Registro del SW de Caché (Offline) ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW Caché registrado:', reg.scope))
                .catch(err => console.log('Error SW Caché:', err));
        });
    }

    // --- 2. Lógica de Tareas ---
    const formTarea = document.getElementById('form-tarea');
    const inputTarea = document.getElementById('input-tarea');
    const listaTareas = document.getElementById('lista-tareas');
    const tareasCollection = collection(db, 'tareas');

    // FUNCIÓN CORREGIDA: Muestra notificaciones compatibles (PC y Móvil)
    function mostrarNotificacionOficial(titulo, cuerpo) {
        if (Notification.permission === 'granted') {
            // CORRECCIÓN: Usamos .ready (propiedad) en vez de .getReady() (función que no existe)
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(titulo, {
                    body: cuerpo,
                    icon: 'images/icon-192x192.png',
                    vibrate: [200, 100, 200]
                });
            }).catch(error => {
                console.log("No se pudo usar SW, usando fallback nativo:", error);
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
            // Guardar en Firestore
            const docRef = await addDoc(tareasCollection, nuevaTarea);
            
            // Guardar Local y Renderizar
            guardarLocal(docRef.id, nuevaTarea.texto);
            renderizarTarea(docRef.id, nuevaTarea.texto);
            
            // Notificación de éxito
            mostrarNotificacionOficial('¡Tarea Agregada!', `Guardada: "${nuevaTarea.texto}"`);

        } catch (error) {
            console.error("Error al guardar (posiblemente offline):", error);
            // Si falla la red, podríamos guardar solo en local aquí si quisiéramos lógica extra
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
            alert("Error al borrar. Revisa tu conexión.");
        }
    }

    // --- 3. Almacenamiento Local (LocalStorage) ---
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
            } catch (e) { 
                console.log("Fallo conexión, cargando caché.");
                cargarDeCacheLocal(); 
            }
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

    // --- 4. Monitor de Red ---
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

    // --- 5. Notificaciones Push ---
    onMessage(messaging, (payload) => {
        console.log('Mensaje foreground:', payload);
        const { title, body } = payload.notification;
        mostrarNotificacionOficial(title, body);
    });

    const btnNotificaciones = document.getElementById('btn-notificaciones');

    btnNotificaciones.addEventListener('click', () => {
        console.log("Pidiendo permiso...");
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                pedirToken();
            } else {
                alert("Habilita las notificaciones en el navegador.");
            }
        });
    });

    async function pedirToken() {
        const VAPID_KEY = "BFP4SNKgtthyCcA57vQGpMkBFcLgLWzntgivWXNOgHPFhKJ1osAj_26jUXGf4Tad1UhviqBrQqPxqW1tpB7o7wI"; // Tu VAPID KEY

        try {
            // Registro del SW de mensajería con espera para evitar errores
            const swRegistration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
            
            await navigator.serviceWorker.ready; // Esperamos a que esté activo

            const currentToken = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration 
            });

            if (currentToken) {
                console.log('TOKEN:', currentToken);
                btnNotificaciones.textContent = "¡Activadas!";
                btnNotificaciones.disabled = true;
                mostrarNotificacionOficial("¡Listo!", "Notificaciones activadas correctamente.");
            } else {
                console.log('No se obtuvo token.');
            }
        } catch (err) {
            console.error('Error notificaciones:', err);
            alert("Error: " + err.message);
        }
    }
});