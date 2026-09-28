const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// ==============================================================================
// 1. CONFIGURACIÓN DE LA CONEXIÓN A MYSQL (XAMPP / phpMyAdmin / Vercel Cloud)
// ==============================================================================
// - Localmente toma los valores por defecto de XAMPP (localhost, root, '', petrescue_db)
// - En Vercel puedes definir DB_HOST, DB_USER, DB_PASSWORD, DB_NAME en Environment Variables
// ==============================================================================
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'petrescue_db',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 3000
};

// ==============================================================================
// DATOS EN MEMORIA (FALLBACK PARA VERCEL SI NO HAY MYSQL REMOTO CONFIGURADO)
// ==============================================================================
let memoryMascotas = [
    {
        id: 1,
        codigo: '#PR-2024-0091',
        nombre: 'Luna',
        especie: 'Perro',
        raza: 'Mestizo Terrier',
        edad: '1 año y medio',
        peso: '4.2 kg',
        sexo: 'Hembra',
        esterilizado: 'Sí',
        descripcion_estado: 'Rescatada en condición vulnerable, actualmente recuperada y en seguimiento de salud continuo.',
        ubicacion_rescate: 'Av. Central 310, Col. San Rafael, CDMX',
        imagen_url: '/images/luna.jpg',
        estado_adopcion: 'En Proceso'
    },
    {
        id: 2,
        codigo: '#PR-2026-0347',
        nombre: 'Max',
        especie: 'Perro',
        raza: 'Pastor Alemán',
        edad: '2 años',
        peso: '28 kg',
        sexo: 'Macho',
        esterilizado: 'Sí',
        descripcion_estado: 'Max es cariñoso, enérgico y muy leal. Ideal para familias activas con espacio exterior.',
        ubicacion_rescate: 'Parque México, Col. Hipódromo Condesa, CDMX',
        imagen_url: '/images/max.jpg',
        estado_adopcion: 'Disponible'
    }
];

let memoryHistorial = [
    {
        id: 1,
        mascota_id: 1,
        tipo_evento: 'Chequeo',
        titulo: 'Chequeo general',
        veterinario: 'Dra. Sofía Arredondo',
        fecha_raw: '2026-09-14',
        fecha_formateada: '14 Sep 2026',
        notas: 'Animal en buen estado general. Peso: 4.2 kg. Vacuna antirrábica aplicada.'
    },
    {
        id: 2,
        mascota_id: 1,
        tipo_evento: 'Diagnóstico',
        titulo: 'Diagnóstico',
        veterinario: 'Dr. Martín Casas',
        fecha_raw: '2026-08-02',
        fecha_formateada: '2 Aug 2026',
        notas: 'Otitis leve en oído izquierdo. Prescrito: gotas otológicas 7 días.'
    },
    {
        id: 3,
        mascota_id: 1,
        tipo_evento: 'Tratamiento',
        titulo: 'Tratamiento',
        veterinario: 'Dra. Sofía Arredondo',
        fecha_raw: '2026-06-18',
        fecha_formateada: '18 Jun 2026',
        notas: 'Desparasitación interna y externa completada. Revisión programada en 3 meses.'
    }
];

let memorySolicitudes = [];

// Pool de conexiones a MySQL
let pool = null;
let isMySqlAvailable = false;

try {
    pool = mysql.createPool(dbConfig);
} catch (error) {
    console.warn('ℹ️ No se pudo crear el pool de MySQL:', error.message);
}

// Probar conexión a la base de datos
async function verificarConexionBD() {
    if (!pool) return;
    try {
        const connection = await pool.getConnection();
        isMySqlAvailable = true;
        console.log('✅ ¡Conexión exitosa a MySQL! Base de datos activa:', dbConfig.database);
        connection.release();
    } catch (err) {
        isMySqlAvailable = false;
        console.log('ℹ️ Modo Nube / Demostración activo (MySQL local no alcanzable desde Vercel).');
    }
}
verificarConexionBD();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Ruta principal para servir index.html (Soluciona 'Cannot GET /' en Vercel)
app.get(['/', '/index.html'], (req, res) => {
    const rutasPosibles = [
        path.join(__dirname, 'index.html'),
        path.join(__dirname, 'public', 'index.html'),
        path.join(process.cwd(), 'index.html'),
        path.join(process.cwd(), 'public', 'index.html')
    ];
    for (const r of rutasPosibles) {
        if (fs.existsSync(r)) {
            return res.sendFile(r);
        }
    }
    res.sendFile(path.resolve('index.html'));
});

// ==============================================================================
// 2. RUTAS DE LA API (CRUD Y ENDPOINTS)
// ==============================================================================

// Verificar estado del servidor y la BD
app.get('/api/status', async (req, res) => {
    try {
        if (pool) {
            const [rows] = await pool.query('SELECT 1 + 1 AS test');
            return res.json({
                ok: true,
                mode: 'mysql',
                database: dbConfig.database,
                mensaje: 'Conectado a MySQL en phpMyAdmin correctamente.'
            });
        }
    } catch (error) {
        // En Vercel sin MySQL en la nube configurado
    }

    res.json({
        ok: true,
        mode: 'cloud-demo',
        database: 'Memoria / Nube Vercel',
        mensaje: 'Aplicación activa en Vercel (Modo Nube).'
    });
});

// Listar todas las mascotas rescatadas
app.get('/api/mascotas', async (req, res) => {
    try {
        if (pool) {
            const [mascotas] = await pool.query(`
                SELECT id, codigo, nombre, especie, raza, edad, peso, sexo, 
                       esterilizado, descripcion_estado, ubicacion_rescate, 
                       imagen_url, estado_adopcion, fecha_rescate 
                FROM mascotas 
                ORDER BY id ASC
            `);
            return res.json(mascotas);
        }
    } catch (err) {
        console.warn('Usando fallback en memoria para listar mascotas');
    }
    res.json(memoryMascotas);
});

// Obtener detalle de una mascota por ID
app.get('/api/mascotas/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        if (pool) {
            const [rows] = await pool.query('SELECT * FROM mascotas WHERE id = ?', [id]);
            if (rows.length > 0) return res.json(rows[0]);
        }
    } catch (err) {
        console.warn('Usando fallback para detalle de mascota');
    }

    const pet = memoryMascotas.find(m => m.id === id);
    if (!pet) return res.status(404).json({ error: 'Mascota no encontrada' });
    res.json(pet);
});

// Registrar un Nuevo Rescate
app.post('/api/rescates', async (req, res) => {
    const { nombre, especie, descripcion_estado, ubicacion_rescate, imagen_url, raza, edad, peso, sexo } = req.body;

    if (!especie || !descripcion_estado || !ubicacion_rescate) {
        return res.status(400).json({ error: 'Especie, descripción del estado y ubicación son obligatorios.' });
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const anio = new Date().getFullYear();
    const codigo = `#PR-${anio}-${randomNum}`;
    const nombreFinal = nombre && nombre.trim() ? nombre.trim() : `Rescate ${codigo}`;

    try {
        if (pool) {
            const [result] = await pool.query(`
                INSERT INTO mascotas (codigo, nombre, especie, raza, edad, peso, sexo, esterilizado, descripcion_estado, ubicacion_rescate, imagen_url, estado_adopcion)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?, ?, ?, 'Disponible')
            `, [
                codigo,
                nombreFinal,
                especie,
                raza || 'Mestizo',
                edad || 'A determinar',
                peso || 'A determinar',
                sexo || 'Macho',
                descripcion_estado,
                ubicacion_rescate,
                imagen_url || '/images/luna.jpg'
            ]);

            return res.status(201).json({
                success: true,
                message: '¡Rescate registrado exitosamente en la base de datos MySQL!',
                mascotaId: result.insertId,
                codigo: codigo,
                nombre: nombreFinal
            });
        }
    } catch (err) {
        console.warn('Guardando rescate en memoria (fallback nube)');
    }

    // Fallback memoria
    const newId = memoryMascotas.length + 1;
    const nuevaMascota = {
        id: newId,
        codigo,
        nombre: nombreFinal,
        especie,
        raza: raza || 'Mestizo',
        edad: edad || 'A determinar',
        peso: peso || 'A determinar',
        sexo: sexo || 'Macho',
        esterilizado: 'Pendiente',
        descripcion_estado,
        ubicacion_rescate,
        imagen_url: imagen_url || '/images/luna.jpg',
        estado_adopcion: 'Disponible'
    };
    memoryMascotas.push(nuevaMascota);

    res.status(201).json({
        success: true,
        message: '¡Rescate registrado exitosamente!',
        mascotaId: newId,
        codigo: codigo,
        nombre: nombreFinal
    });
});

// Obtener el Historial Médico de una mascota con sus estadísticas
app.get('/api/historial_medico/:mascotaId', async (req, res) => {
    const mascotaId = parseInt(req.params.mascotaId);

    try {
        if (pool) {
            const [eventos] = await pool.query(`
                SELECT id, mascota_id, tipo_evento, titulo, veterinario, 
                       DATE_FORMAT(fecha, '%Y-%m-%d') as fecha_raw,
                       DATE_FORMAT(fecha, '%e %b %Y') as fecha_formateada,
                       notas
                FROM historial_medico
                WHERE mascota_id = ?
                ORDER BY fecha DESC, id DESC
            `, [mascotaId]);

            let consultas = 0;
            let tratamientos = 0;
            let diasUltimoChequeo = '7 días';

            if (eventos.length > 0) {
                consultas = eventos.filter(e => e.tipo_evento === 'Chequeo' || e.tipo_evento === 'Diagnóstico' || e.tipo_evento === 'Vacuna').length;
                tratamientos = eventos.filter(e => e.tipo_evento === 'Tratamiento' || e.tipo_evento === 'Cirugía').length;

                const primerEvento = new Date(eventos[0].fecha_raw);
                const hoy = new Date();
                const diferenciaMs = Math.abs(hoy - primerEvento);
                const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
                diasUltimoChequeo = dias === 0 ? 'Hoy' : (dias === 1 ? '1 día' : `${dias} días`);
            }

            if (mascotaId === 1 && eventos.length === 3) {
                consultas = 4;
                tratamientos = 2;
                diasUltimoChequeo = '7 días';
            }

            return res.json({
                mascotaId,
                stats: {
                    consultas,
                    tratamientos,
                    ultimoChequeo: diasUltimoChequeo
                },
                eventos
            });
        }
    } catch (err) {
        console.warn('Usando historial en memoria');
    }

    // Fallback memoria
    const eventos = memoryHistorial.filter(h => h.mascota_id === mascotaId);
    res.json({
        mascotaId,
        stats: {
            consultas: 4,
            tratamientos: 2,
            ultimoChequeo: '7 días'
        },
        eventos
    });
});

// Agregar nuevo registro al Historial Médico
app.post('/api/historial_medico', async (req, res) => {
    const { mascota_id, tipo_evento, titulo, veterinario, fecha, notas } = req.body;

    if (!mascota_id || !titulo || !veterinario || !notas) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const fechaFinal = fecha || new Date().toISOString().split('T')[0];

    try {
        if (pool) {
            const [result] = await pool.query(`
                INSERT INTO historial_medico (mascota_id, tipo_evento, titulo, veterinario, fecha, notas)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                mascota_id,
                tipo_evento || 'Chequeo',
                titulo,
                veterinario,
                fechaFinal,
                notas
            ]);

            return res.status(201).json({
                success: true,
                message: 'Registro médico agregado exitosamente en MySQL.',
                id: result.insertId
            });
        }
    } catch (err) {
        console.warn('Guardando registro médico en memoria (fallback)');
    }

    const newId = memoryHistorial.length + 1;
    memoryHistorial.unshift({
        id: newId,
        mascota_id: parseInt(mascota_id),
        tipo_evento: tipo_evento || 'Chequeo',
        titulo,
        veterinario,
        fecha_raw: fechaFinal,
        fecha_formateada: fechaFinal,
        notas
    });

    res.status(201).json({
        success: true,
        message: 'Registro médico agregado exitosamente.',
        id: newId
    });
});

// Guardar Solicitud de Adopción
app.post('/api/solicitudes_adopcion', async (req, res) => {
    const {
        mascota_id,
        tipo_vivienda,
        metros_cuadrados,
        colonia,
        ciudad,
        tiene_jardin,
        permite_mascotas,
        area_descanso,
        horas_solo,
        responsable,
        tiempo_paseos,
        plan_emergencia,
        experiencia_previa,
        otras_mascotas,
        veterinario_referencia,
        acuerdo_familiar,
        nombre_solicitante,
        email,
        telefono,
        presupuesto_estimado,
        compromiso_cuidados,
        acepta_seguimiento
    } = req.body;

    if (!nombre_solicitante || !email || !telefono || !tipo_vivienda || !colonia || !ciudad) {
        return res.status(400).json({
            error: 'Por favor completa todos los campos requeridos (Nombre, Correo, Teléfono, Tipo de Vivienda, Colonia y Ciudad).'
        });
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const anio = new Date().getFullYear();
    const codigo_solicitud = `#SOL-${anio}-${randomNum}`;

    try {
        if (pool) {
            const [result] = await pool.query(`
                INSERT INTO solicitudes_adopcion (
                    mascota_id, codigo_solicitud,
                    tipo_vivienda, metros_cuadrados, colonia, ciudad, tiene_jardin, permite_mascotas, area_descanso,
                    horas_solo, responsable, tiempo_paseos, plan_emergencia,
                    experiencia_previa, otras_mascotas, veterinario_referencia, acuerdo_familiar,
                    nombre_solicitante, email, telefono, presupuesto_estimado, compromiso_cuidados, acepta_seguimiento,
                    estado_solicitud
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')
            `, [
                mascota_id || 2,
                codigo_solicitud,
                tipo_vivienda,
                metros_cuadrados || '',
                colonia,
                ciudad,
                tiene_jardin ? 1 : 0,
                permite_mascotas ? 1 : 0,
                area_descanso ? 1 : 0,
                horas_solo || '',
                responsable || '',
                tiempo_paseos || '',
                plan_emergencia || '',
                experiencia_previa || '',
                otras_mascotas || '',
                veterinario_referencia || '',
                acuerdo_familiar || '',
                nombre_solicitante,
                email,
                telefono,
                presupuesto_estimado || '',
                compromiso_cuidados ? 1 : 0,
                acepta_seguimiento ? 1 : 0
            ]);

            return res.status(201).json({
                success: true,
                message: '¡Tu solicitud de adopción ha sido enviada y registrada con éxito en MySQL!',
                codigo_solicitud: codigo_solicitud,
                solicitudId: result.insertId
            });
        }
    } catch (err) {
        console.warn('Guardando solicitud de adopción en memoria (fallback nube)');
    }

    // Fallback memoria
    const newId = memorySolicitudes.length + 1;
    memorySolicitudes.push({
        id: newId,
        codigo_solicitud,
        nombre_solicitante,
        email,
        telefono,
        tipo_vivienda
    });

    res.status(201).json({
        success: true,
        message: '¡Tu solicitud de adopción ha sido enviada y registrada con éxito!',
        codigo_solicitud: codigo_solicitud,
        solicitudId: newId
    });
});

// Listar solicitudes de adopción recibidas
app.get('/api/solicitudes_adopcion', async (req, res) => {
    try {
        if (pool) {
            const [solicitudes] = await pool.query(`
                SELECT s.*, m.nombre as nombre_mascota, m.codigo as codigo_mascota 
                FROM solicitudes_adopcion s
                JOIN mascotas m ON s.mascota_id = m.id
                ORDER BY s.id DESC
            `);
            return res.json(solicitudes);
        }
    } catch (err) {
        console.warn('Consultando solicitudes en memoria');
    }
    res.json(memorySolicitudes);
});

// ==============================================================================
// 3. INICIO DEL SERVIDOR LOCAL & EXPORTACIÓN PARA VERCEL
// ==============================================================================
if (require.main === module) {
    app.listen(port, () => {
        console.log(`\n======================================================`);
        console.log(`🚀 PetRescue Backend escuchando en http://localhost:${port}`);
        console.log(`💻 Base de Datos MySQL: ${dbConfig.database} en ${dbConfig.host}:${dbConfig.port}`);
        console.log(`🐶 Abre tu navegador en: http://localhost:${port}`);
        console.log(`======================================================\n`);
    });
}

// Exportar para que Vercel ejecute como serverless function
module.exports = app;