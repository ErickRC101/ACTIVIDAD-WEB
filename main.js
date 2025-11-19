// Importar 'db' y 'messaging' de tu archivo de configuración
import { db, messaging } from './firebase-config.js'; 

// Importar las funciones de Firestore
import { 
    collection, addDoc, getDocs, deleteDoc, doc, 
    query, orderBy, Timestamp 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// Importar funciones de Messaging (getToken para pedir permiso, onMessage para recibir en primer plano)
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging.js";

document.addEventListener('DOMContentLoaded', () => {

    // ==============================================================
    // 1. REGISTRO DEL SERVICE WORKER PRINCIPAL (Caché / Offline)
    // ==============================================================
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Usamos ruta relativa './sw.js' para que funcione dinámicamente en GitHub Pages
            navigator.serviceWorker.register('./sw.js') 
                .then(registration => {
                    console.log('SW (Cache) registrado correctamente:', registration.scope);
                })
                .catch(error => {
                    console.log('Error al registrar SW (Cache):', error);
                });
        });
    }

    // ==============================================================
    // 2. LÓGICA DE LA APLICACIÓN (Lista de Tareas)
    // ==============================================================
    const formTarea = document.getElementById('form-tarea');
    const inputTarea = document.getElementById('input-tarea');
    const listaTareas = document.getElementById('lista-tareas');
    const tareasCollection = collection(db, 'tareas');

    // --- Función para renderizar una tarea en la UI ---
    function renderizarTarea(id, texto) {
        const li = document.createElement('li');
        li.setAttribute('data-id', id);
        li.innerHTML = `
            <span>${texto}</span>
            <button class="delete-btn">Borrar</button>
        `;
        
        // Evento borrar
        li.querySelector('.delete-btn').onclick = () => {
            borrarTarea(id, li);
        };

        listaTareas.appendChild(li);
    }

    // --- Función para agregar tarea ---
    async function agregarTarea(e) {
        e.preventDefault();
        const textoTarea = inputTarea.value.trim();
        if (textoTarea === '') return;

        const nuevaTarea = {
            texto: textoTarea,
            timestamp: Timestamp.fromDate(new Date())
        };

        try {
            // A. Guardar en Firestore (Nube)
            const docRef = await addDoc(tareasCollection, nuevaTarea);
            
            // B. Guardar en localStorage (Respaldo Offline)
            guardarLocal(docRef.id, nuevaTarea.texto);
            
            // C. Renderizar
            renderizarTarea(docRef.id, nuevaTarea.texto);
            
            // D. Notificación LOCAL (Feedback inmediato al usuario)
            if (Notification.permission === 'granted') {
                new Notification('¡Tarea Agregada!', {
                    body: `Has creado: "${nuevaTarea.texto}"`,
                    icon: 'images/icon-192x192.png', // Asegúrate de que esta ruta exista
                    vibrate: [200, 100, 200]
                });
            }

        } catch (error) {
            console.error("Error al guardar (probablemente offline): ", error);
            // Si falla Firestore (ej. offline), podrías implementar una lógica para
            // guardar temporalmente en local y sincronizar luego.
        }
        
        inputTarea.value = ''; 
    }

    // --- Función para borrar tarea ---
    async function borrarTarea(id, elementoLi) {
        try {
            await deleteDoc(doc(db, 'tareas', id));
            borrarLocal(id);
            listaTareas.removeChild(elementoLi);
        } catch (error) {
            console.error("Error al eliminar: ", error);
            alert("Error al borrar. Revisa tu conexión.");
        }
    }

    // ==============================================================
    // 3. GESTIÓN DE DATOS (Offline/Online)
    // ==============================================================
    
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

    // Carga inicial de datos
    async function cargarTareas() {
        listaTareas.innerHTML = ''; // Limpiar lista antes de cargar
        
        // Estrategia: Intentar cargar de la Red (Firestore) primero.
        // Si falla o está offline, cargar de LocalStorage.
        if (navigator.onLine) {
            try {
                const q = query(tareasCollection, orderBy("timestamp", "desc"));
                const querySnapshot = await getDocs(q);

                console.log("Cargando desde Firestore...");
                localStorage.removeItem('tareas'); // Limpiamos caché local vieja para actualizarla

                querySnapshot.forEach(doc => {
                    const tarea = doc.data();
                    renderizarTarea(doc.id, tarea.texto);
                    guardarLocal(doc.id, tarea.texto); // Actualizamos respaldo local
                });
            } catch (error) {
                console.log("Error conectando a Firestore, usando caché local.");
                cargarDeCacheLocal();
            }
        } else {
            console.log("Offline detectado, cargando de LocalStorage.");
            cargarDeCacheLocal();
        }
    }

    function cargarDeCacheLocal() {
        const tareasLocales = obtenerTareasLocal();
        for (const id in tareasLocales) {
            renderizarTarea(id, tareasLocales[id]);
        }
    }

    formTarea.addEventListener('submit', agregarTarea);
    cargarTareas();

    // ==============================================================
    // 4. EXTENSIÓN: DETECCIÓN DE ESTADO DE RED
    // ==============================================================
    const divEstadoRed = document.getElementById('estado-red');
    
    function actualizarEstadoRed() {
        if (navigator.onLine) {
            divEstadoRed.className = 'online';
            divEstadoRed.textContent = '🟢 En línea (Sincronizando)';
            divEstadoRed.style.color = 'green';
            cargarTareas(); // Recargar datos frescos al volver la conexión
        } else {
            divEstadoRed.className = 'offline';
            divEstadoRed.textContent = '🔴 Sin conexión (Modo Offline)';
            divEstadoRed.style.color = 'red';
        }
    }
    
    window.addEventListener('online', actualizarEstadoRed);
    window.addEventListener('offline', actualizarEstadoRed);
    actualizarEstadoRed(); // Chequeo inicial

    // ==============================================================
    // 5. NOTIFICACIONES PUSH (FIREBASE CLOUD MESSAGING)
    // ==============================================================
    const btnNotificaciones = document.getElementById('btn-notificaciones');

    // Escuchar mensajes en PRIMER PLANO (App abierta)
    onMessage(messaging, (payload) => {
        console.log('Mensaje recibido en primer plano:', payload);
        const { title, body } = payload.notification;
        
        // Mostrar notificación del sistema incluso con la app abierta
        if (Notification.permission === 'granted') {
             new Notification(title, {
                body: body,
                icon: 'images/icon-192x192.png'
            });
        } else {
            alert(`Notificación: ${title}\n${body}`);
        }
    });

    btnNotificaciones.addEventListener('click', () => {
        console.log("Solicitando permiso...");
        pedirToken();
    });

    async function pedirToken() {
        const VAPID_KEY = "BFP4SNKgtthyCcA57vQGpMkBFcLgLWzntgivWXNOgHPFhKJ1osAj_26jUXGf4Tad1UhviqBrQqPxqW1tpB7o7wI";

        try {
            // Registramos el SW de mensajería (firebase-messaging-sw.js)
            // NOTA: No usamos type: 'module' porque tu SW usa importScripts (es clásico)
            const swRegistration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
            
            console.log('SW (Messaging) registrado:', swRegistration);

            const currentToken = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration 
            });

            if (currentToken) {
                console.log('Token generado:', currentToken);
                btnNotificaciones.textContent = "¡Notificaciones Activadas!";
                btnNotificaciones.disabled = true;
                // Aquí podrías enviar este token a tu base de datos si quisieras guardar usuarios
            } else {
                console.log('No se obtuvo el token. Permiso denegado.');
            }
        } catch (err) {
            console.log('Error al configurar notificaciones:', err);
        }
    }

});