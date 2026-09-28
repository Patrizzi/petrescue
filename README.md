# 🐾 PetRescue - Dashboard de Rescates y Solicitud de Adopción

Sistema web completo adaptado fielmente al diseño de Figma, con backend en **Node.js + Express** y base de datos relacional en **MySQL (XAMPP / phpMyAdmin)**.

---

## 🎯 Vistas Implementadas

1. **Panel del Voluntario (`Vista Voluntario`)**:
   - **Nuevo Rescate**: Formulario con subida de fotografía (arrastrar y soltar o clic, previsualización interactiva), selector de especie, descripción detallada del estado físico/comportamiento del animal y ubicación del rescate. Guarda directamente en la tabla `mascotas` en MySQL.
   - **Historial Médico**: Tarjeta de seguimiento clínico para Luna (`#PR-2024-0091`) con contadores métricos en tiempo real (Consultas, Tratamientos, Último chequeo), línea de tiempo (timeline) con nodos y badges de colores por tipo de evento (`Chequeo`, `Diagnóstico`, `Tratamiento`), y botón modal `+ Agregar registro` para añadir nuevos eventos a MySQL.

2. **Solicitud de Adopción (`Vista Adoptante`)**:
   - **Ficha del Animal**: Tarjeta destacada de **Max**, pastor alemán disponible (`#PR-2026-0347`), con fotografía en alta resolución, badge de disponibilidad y tabla de atributos (Especie, Raza, Edad, Peso, Sexo, Esterilizado).
   - **Formulario Multipaso (Wizard de 4 Pasos)**:
     - **Paso 1 - Hogar**: Tipo de vivienda, metros cuadrados, colonia/barrio, ciudad y casillas de verificación de seguridad.
     - **Paso 2 - Rutina**: Horas que pasará solo, responsable principal, tiempo de paseos y plan de emergencia.
     - **Paso 3 - Experiencia**: Experiencia previa con mascotas, animales actuales en casa, veterinario de cabecera y consenso familiar.
     - **Paso 4 - Compromiso**: Datos del solicitante (nombre, correo, teléfono), presupuesto mensual y términos de compromiso.
   - Envío y almacenamiento de la solicitud en la tabla `solicitudes_adopcion` de MySQL, con generación automática de código identificador (`#SOL-2026-XXXX`) y modal de confirmación.

---

## 🗄️ Base de Datos en MySQL / phpMyAdmin (XAMPP)

El archivo con toda la estructura y datos de prueba es:
📁 [`database.sql`](./database.sql)

### ⚙️ Dónde configurar la Conexión de la Base de Datos
En el archivo [`server.js`](./server.js), al inicio del código (líneas 17-25):

```javascript
// ==============================================================================
// 1. CONFIGURACIÓN DE LA CONEXIÓN A MYSQL (XAMPP / phpMyAdmin)
// ==============================================================================
const dbConfig = {
    host: 'localhost',        // Servidor MySQL (por defecto 'localhost' en XAMPP)
    user: 'root',             // Usuario de MySQL (por defecto 'root')
    password: '',             // Contraseña de MySQL (en XAMPP viene vacía '')
    database: 'petrescue_db', // <-- AQUÍ DEFINES EL NOMBRE DE LA BD
    port: 3306                // Puerto de MySQL (por defecto 3306)
};
```

---

## 🚀 Cómo Ejecutar el Proyecto

1. **Asegúrate de que MySQL esté activo en XAMPP**:
   - Abre el **XAMPP Control Panel**.
   - Haz clic en **Start** en el módulo **MySQL** (y **Apache** si deseas usar phpMyAdmin).

2. **Importar la Base de Datos (si aún no lo has hecho)**:
   - Entra a `http://localhost/phpmyadmin` en tu navegador.
   - Ve a la pestaña **SQL**, copia el contenido del archivo [`database.sql`](./database.sql), pégalo y haz clic en **Continuar** (Go).
   - Esto creará la base de datos `petrescue_db` con las 3 tablas (`mascotas`, `historial_medico`, `solicitudes_adopcion`) y los datos iniciales.

3. **Iniciar el Servidor Backend**:
   Abre una terminal en esta carpeta y ejecuta:
   ```bash
   node server.js
   ```
   o
   ```bash
   npm start
   ```

4. **Abrir la Aplicación**:
   Entra en tu navegador a:
   👉 **http://localhost:3000**
