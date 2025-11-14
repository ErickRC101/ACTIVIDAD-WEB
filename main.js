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

    // --- Lógica de Registro del Service Worker (Etapa 3) ---
    // Solo registramos el SW principal aquí.
    // El de Firebase se registrará al hacer clic en el botón.
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('SW (principal) registrado:', registration);
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

    // (Aquí van tus funciones: renderizarTarea, agregarTarea, borrarTarea)
    // (Aquí van tus funciones: guardarLocal, borrarLocal, obtenerTareasLocal)
    // (Aquí va tu función: cargarTareas)
    
    // Función para renderizar una tarea en la UI
    function renderizarTarea(id, texto) {
        const li = document.createElement('li');
        li.setAttribute('data-id', id);
        li.innerHTML = `
            <span>${texto}</span>
            <button class="delete-btn">Borrar</button>
        `;
        li.querySelector('.delete-btn').onclick = () => {
            borrarTarea(id, li);
        };
        listaTareas.appendChild(li);
    }

    // Función para agregar tarea
    async function agregarTarea(e) {
        e.preventDefault(); 
        const textoTarea = inputTarea.value.trim();
        if (textoTarea === '') return;
        const nuevaTarea = {
            texto: textoTarea,
            timestamp: Timestamp.fromDate(new Date())
        };
        try {
            const docRef = await addDoc(tareasCollection, nuevaTarea);
            guardarLocal(docRef.id, nuevaTarea.texto);
            renderizarTarea(docRef.id, nuevaTarea.texto);
        } catch (error) {
            console.error("Error al guardar en Firestore: ", error);
        }
        inputTarea.value = ''; 
    }

    // Función para borrar tarea
    async function borrarTarea(id, elementoLi) {
        try {
            await deleteDoc(doc(db, 'tareas', id));
            borrarLocal(id);
            listaTareas.removeChild(elementoLi);
        } catch (error) {
            console.error("Error al eliminar de Firestore: ", error);
        }
    }

    // --- Almacenamiento Local (localStorage) ---
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

    // Cargar tareas al iniciar
    async function cargarTareas() {
        try {
            const q = query(tareasCollection, orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                const tareasLocales = obtenerTareasLocal();
                for (const id in tareasLocales) {
                    renderizarTarea(id, tareasLocales[id]);
                }
            } else {
                localStorage.removeItem('tareas'); 
                querySnapshot.forEach(doc => {
                    const tarea = doc.data();
                    renderizarTarea(doc.id, tarea.texto);
                    guardarLocal(doc.id, tarea.texto);
                });
            }
        } catch (error) {
            console.warn("Error de Firestore. Cargando de localStorage.", error.message);
            const tareasLocales = obtenerTareasLocal();
            for (const id in tareasLocales) {
                renderizarTarea(id, tareasLocales[id]);
            }
        }
    }

    // Asignar eventos
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

    // --- Etapa 5 / Ejercicio 2: Notificaciones Push (Modificado para FCM) ---
    const btnNotificaciones = document.getElementById('btn-notificaciones');

    btnNotificaciones.addEventListener('click', () => {
        console.log("Solicitando permiso para Notificaciones Push...");
        // ¡Se llama a la NUEVA función async!
        pedirToken();
    });

    // ¡¡FUNCIÓN 'pedirToken' ACTUALIZADA!!
    // La convertimos en 'async' para poder usar 'await'
    async function pedirToken() {
        
        const VAPID_KEY = "BFP4SNKgtthyCcA57vQGpMkBFcLgLWzntgivWXNOgHPFhKJ1osAj_26jUXGf4Tad1UhviqBrQqPxqW1tpB7o7wI";

        try {
            // ¡¡ESTE ES EL ARREGLO!!
            // 1. Registramos manualmente el SW de Firebase
            //    en la ruta correcta (el directorio actual).
            const swRegistration = await navigator.serviceWorker.register('ACTIVIDAD-WEB/firebase-messaging-sw.js');
            console.log('SW (Firebase) registrado manualmente:', swRegistration);

            // 2. Pasamos ESE registro a getToken.
            //    Esto evita que getToken busque en la raíz (error 404).
            const currentToken = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration // <-- ¡Esta es la magia!
            });

            if (currentToken) {
                // ¡Token obtenido!
                console.log('Token de dispositivo (FCM):', currentToken);
                
                btnNotificaciones.textContent = "¡Notificaciones Activadas!";
                btnNotificaciones.disabled = true;

            } else {
                // El usuario no dio permiso
                console.log('No se obtuvo permiso para notificaciones.');
            }
        } catch (err) {
            console.log('Ocurrió un error al obtener el token.', err);
        }
    }

});