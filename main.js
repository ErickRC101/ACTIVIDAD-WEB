// Importar 'db' y 'messaging' de tu archivo de configuración
import { db, messaging } from './firebase-config.js'; 

// Importar las funciones de Firestore que usaremos
import { 
    collection, addDoc, getDocs, deleteDoc, doc, 
    query, orderBy, Timestamp 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ¡NUEVA IMPORTACIÓN!
import { getToken } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- Lógica de Registro del Service Worker (Etapa 3) ---
    // ¡¡ESTE ES EL BLOQUE CORREGIDO!!
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            
            // 1. Registra tu SW principal (para caché offline)
            navigator.serviceWorker.register('sw.js') 
                .then(registration => {
                    console.log('SW (principal) registrado:', registration);
                })
                .catch(error => {
                    console.log('Error al registrar SW (principal):', error);
                });

            // 2. ¡NUEVO! Registra el SW de Firebase Messaging
            // Esto le dice a Firebase dónde está el archivo
            // y soluciona el error 404 de la raíz.
            navigator.serviceWorker.register('firebase-messaging-sw.js') 
                .then(registration => {
                    console.log('SW (Firebase) registrado:', registration);
                })
                .catch(error => {
                    console.log('Error al registrar SW (Firebase):', error);
                });
        });
    }

    // --- Ejercicio 1: Lógica de Almacenamiento (Etapa 4) ---

    // Referencias del DOM
    const formTarea = document.getElementById('form-tarea');
    const inputTarea = document.getElementById('input-tarea');
    const listaTareas = document.getElementById('lista-tareas');

    // Referencia a la colección de Firestore
    const tareasCollection = collection(db, 'tareas');

    // Función para renderizar una tarea en la UI
    function renderizarTarea(id, texto) {
        const li = document.createElement('li');
        li.setAttribute('data-id', id);
        li.innerHTML = `
            <span>${texto}</span>
            <button class="delete-btn">Borrar</button>
        `;
        
        // Asignar evento al botón de borrar
        li.querySelector('.delete-btn').onclick = () => {
            borrarTarea(id, li);
        };

        listaTareas.appendChild(li);
    }

    // Función para agregar tarea
    async function agregarTarea(e) {
        e.preventDefault(); // Evita que el formulario recargue la página
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
        inputTarea.value = ''; // Limpiar el input
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
                console.log("No hay tareas en Firestore, cargando de localStorage...");
                const tareasLocales = obtenerTareasLocal();
                for (const id in tareasLocales) {
                    renderizarTarea(id, tareasLocales[id]);
                }
            } else {
                console.log("Cargando tareas desde Firestore...");
                localStorage.removeItem('tareas'); // Limpiamos local
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

    // Asignar el evento al ENVIAR el formulario
    formTarea.addEventListener('submit', agregarTarea);
    
    // Cargar tareas al iniciar la app
    cargarTareas();

    // --- Extensión Ejercicio 1: Detectar estado de red ---
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
        pedirToken();
    });

    function pedirToken() {
        // ¡¡CLAVE VAPID ARREGLADA (sin espacio al final)!!
        const VAPID_KEY = "BFP4SNKgtthyCcA57vQGpMkBFcLgLWzntgivWXNOgHPFhKJ1osAj_26jUXGf4Tad1UhviqBrQqPxqW1tpB7o7wI";

        getToken(messaging, { vapidKey: VAPID_KEY })
            .then((currentToken) => {
                if (currentToken) {
                    // ¡Token obtenido!
                    console.log('Token de dispositivo (FCM):', currentToken);
                    
                    btnNotificaciones.textContent = "¡Notificaciones Activadas!";
                    btnNotificaciones.disabled = true;

                } else {
                    // El usuario no dio permiso
                    console.log('No se obtuvo permiso para notificaciones.');
                }
            })
            .catch((err) => {
                console.log('Ocurrió un error al obtener el token.', err);
            });
    }

});