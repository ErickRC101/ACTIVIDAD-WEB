// Importar la 'db' de tu archivo de configuración
import { db } from './firebase-config.js'; 
// Importar las funciones de Firestore que usaremos
import { 
    collection, addDoc, getDocs, deleteDoc, doc, 
    query, orderBy, Timestamp 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- Lógica de Registro del Service Worker (Etapa 3) ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('SW registrado:', registration);
                })
                .catch(error => {
                    console.log('Error al registrar SW:', error);
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
        
        console.log("Intentando agregar tarea..."); // Para depuración

        const textoTarea = inputTarea.value.trim();
        if (textoTarea === '') return;

        const nuevaTarea = {
            texto: textoTarea,
            timestamp: Timestamp.fromDate(new Date())
        };

        try {
            // Guardar en Firestore
            const docRef = await addDoc(tareasCollection, nuevaTarea);
            console.log("Tarea guardada en Firestore:", docRef.id);
            
            // Guardar en localStorage
            guardarLocal(docRef.id, nuevaTarea.texto);
            
            // Renderizar en la UI
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
            console.log("Tarea eliminada:", id);
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
            // Cargar desde Firestore, ordenadas por fecha
            const q = query(tareasCollection, orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // Si Firestore está vacío, cargar de localStorage
                console.log("No hay tareas en Firestore, cargando de localStorage...");
                const tareasLocales = obtenerTareasLocal();
                for (const id in tareasLocales) {
                    renderizarTarea(id, tareasLocales[id]);
                }
            } else {
                // Si hay datos en Firestore, son la fuente de verdad
                console.log("Cargando tareas desde Firestore...");
                localStorage.removeItem('tareas'); // Limpiamos local
                querySnapshot.forEach(doc => {
                    const tarea = doc.data();
                    renderizarTarea(doc.id, tarea.texto);
                    guardarLocal(doc.id, tarea.texto); // Sincronizamos local
                });
            }
        } catch (error) {
            // Si falla Firestore (ej. offline), cargar de localStorage
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

    // --- Etapa 5 / Ejercicio 2: Notificaciones Push ---
    const btnNotificaciones = document.getElementById('btn-notificaciones');

    btnNotificaciones.addEventListener('click', () => {
        Notification.requestPermission().then(resultado => {
            if (resultado === 'granted') {
                mostrarNotificacionSimple();
                btnNotificaciones.disabled = true;
            }
        });
    });

    function mostrarNotificacionSimple() {
        const opciones = {
            body: '¡Todo listo para recibir actualizaciones!',
            icon: 'images/icon-192x192.png',
        };
        new Notification('Notificaciones Activadas', opciones);
    }
});