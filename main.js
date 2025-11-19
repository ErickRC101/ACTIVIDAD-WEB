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

    // Función auxiliar: Notificaciones (PC y Móvil)
    function mostrarNotificacionOficial(titulo, cuerpo) {
        if (Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(titulo, {
                    body: cuerpo,
                    icon: 'images/icon-192x192.png',
                    vibrate: [200, 100, 200]
                });
            }).catch(error => {
                console.log("Usando fallback notificación:", error);
                new Notification(titulo, { body: cuerpo, icon: 'images/icon-192x192.png' });
            });
        }
    }

    // --- NUEVO GPS: Función Renderizar modificada para mostrar mapa ---
    function renderizarTarea(id, data) {
        // data puede ser el objeto entero (con texto y ubicacion) o solo texto si es antiguo
        const texto = typeof data === 'object' ? data.texto : data;
        const ubicacion = typeof data === 'object' ? data.ubicacion : null;

        const li = document.createElement('li');
        li.setAttribute('data-id', id);

        let htmlContent = `<span>${texto}</span>`;
        
        // Si tiene ubicación, agregamos un enlace a Google Maps
        if (ubicacion) {
            htmlContent += `
                <br>
                <a href="https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lon}" 
                   target="_blank" 
                   style="color: #3498db; font-size: 0.8em; text-decoration: none;">
                   📍 Ver ubicación
                </a>`;
        }

        htmlContent += `<button class="delete-btn">Borrar</button>`;
        li.innerHTML = htmlContent;
        
        li.querySelector('.delete-btn').onclick = () => borrarTarea(id, li);
        listaTareas.appendChild(li);
    }

    async function agregarTarea(e) {
        e.preventDefault();
        const textoTarea = inputTarea.value.trim();
        if (textoTarea === '') return;

        // --- NUEVO GPS: Capturar coordenadas ---
        let ubicacionCapturada = null;
        
        // Preguntamos si el navegador soporta Geo
        if ('geolocation' in navigator) {
            try {
                // Mostramos un texto temporal en el botón (opcional)
                const btnSubmit = formTarea.querySelector('button');
                const textoOriginal = btnSubmit.textContent;
                btnSubmit.textContent = "📍 Localizando...";
                
                // Promesa para obtener posición (esperamos a que el usuario acepte)
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 5000 // Esperamos máximo 5 seg
                    });
                });

                ubicacionCapturada = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                
                btnSubmit.textContent = textoOriginal; // Restaurar botón
            } catch (err) {
                console.warn("No se pudo obtener GPS (Usuario denegó o error):", err);
                const btnSubmit = formTarea.querySelector('button');
                btnSubmit.textContent = "Agregar"; // Restaurar botón si falla
            }
        }

        const nuevaTarea = {
            texto: textoTarea,
            timestamp: Timestamp.fromDate(new Date()),
            ubicacion: ubicacionCapturada // Guardamos lat/lon o null
        };

        try {
            // Guardar en Firestore
            const docRef = await addDoc(tareasCollection, nuevaTarea);
            
            // Guardar Local y Renderizar
            guardarLocal(docRef.id, nuevaTarea);
            renderizarTarea(docRef.id, nuevaTarea);
            
            mostrarNotificacionOficial('¡Tarea Agregada!', `Guardada con éxito`);

        } catch (error) {
            console.error("Error al guardar:", error);
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

    // --- Almacenamiento Local ---
    // Modificado para guardar el objeto completo (texto + ubicacion)
    function guardarLocal(id, data) {
        const tareas = JSON.parse(localStorage.getItem('tareas') || '{}');
        tareas[id] = data;
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
                    const data = doc.data();
                    renderizarTarea(doc.id, data);
                    guardarLocal(doc.id, data);
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
        for (const id in tareas) {
            renderizarTarea(id, tareas[id]);
        }
    }

    formTarea.addEventListener('submit', agregarTarea);
    cargarTareas();

    // --- Monitor de Red ---
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

    // --- Notificaciones Push ---
    onMessage(messaging, (payload) => {
        console.log('Mensaje foreground:', payload);
        const { title, body } = payload.notification;
        mostrarNotificacionOficial(title, body);
    });

    const btnNotificaciones = document.getElementById('btn-notificaciones');
    btnNotificaciones.addEventListener('click', () => {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                pedirToken();
            } else {
                alert("Habilita las notificaciones.");
            }
        });
    });

    async function pedirToken() {
        const VAPID_KEY = "BFP4SNKgtthyCcA57vQGpMkBFcLgLWzntgivWXNOgHPFhKJ1osAj_26jUXGf4Tad1UhviqBrQqPxqW1tpB7o7wI";
        try {
            const swRegistration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
            await navigator.serviceWorker.ready;
            const currentToken = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration 
            });
            if (currentToken) {
                console.log('TOKEN:', currentToken);
                btnNotificaciones.textContent = "¡Activadas!";
                btnNotificaciones.disabled = true;
            }
        } catch (err) {
            console.error('Error notificaciones:', err);
        }
    }
});