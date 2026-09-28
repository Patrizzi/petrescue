-- ==========================================================
-- SCRIPT SQL OPTIMIZADO PARA TiDB SERVERLESS Y MYSQL
-- ==========================================================
-- Incluye control de roles: ADMIN_ONG y USER (SENATI Tarea 6)
-- ==========================================================

-- 1. Crear y seleccionar la base de datos
CREATE DATABASE IF NOT EXISTS `petrescue_db`;
USE `petrescue_db`;

-- 2. Tabla de Usuarios y Roles (Seguridad y Sesiones)
CREATE TABLE IF NOT EXISTS `usuarios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(100) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `rol` VARCHAR(20) NOT NULL DEFAULT 'USER',
    `fecha_creacion` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Mascotas Rescatadas
CREATE TABLE IF NOT EXISTS `mascotas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(30) NOT NULL UNIQUE,
    `nombre` VARCHAR(100) NOT NULL,
    `especie` VARCHAR(50) NOT NULL,
    `raza` VARCHAR(100) DEFAULT 'Mestizo',
    `edad` VARCHAR(50) DEFAULT 'Desconocida',
    `peso` VARCHAR(50) DEFAULT 'Desconocido',
    `sexo` VARCHAR(20) DEFAULT 'Macho',
    `esterilizado` VARCHAR(20) DEFAULT 'Sí',
    `descripcion_estado` TEXT NOT NULL,
    `ubicacion_rescate` VARCHAR(255) NOT NULL,
    `imagen_url` TEXT,
    `estado_adopcion` VARCHAR(30) DEFAULT 'Disponible',
    `fecha_rescate` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Historial Médico
CREATE TABLE IF NOT EXISTS `historial_medico` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `mascota_id` INT NOT NULL,
    `tipo_evento` VARCHAR(50) DEFAULT 'Chequeo',
    `titulo` VARCHAR(150) NOT NULL,
    `veterinario` VARCHAR(150) NOT NULL,
    `fecha` DATE NOT NULL,
    `notas` TEXT NOT NULL,
    `fecha_creacion` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_mascota_id` (`mascota_id`)
);

-- 5. Tabla de Solicitudes de Adopción (Contiene Datos Personales Protegidos)
CREATE TABLE IF NOT EXISTS `solicitudes_adopcion` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `mascota_id` INT NOT NULL,
    `codigo_solicitud` VARCHAR(30) NOT NULL UNIQUE,
    `tipo_vivienda` VARCHAR(100) NOT NULL,
    `metros_cuadrados` VARCHAR(50) DEFAULT '',
    `colonia` VARCHAR(100) NOT NULL,
    `ciudad` VARCHAR(100) NOT NULL,
    `tiene_jardin` TINYINT(1) DEFAULT 0,
    `permite_mascotas` TINYINT(1) DEFAULT 0,
    `area_descanso` TINYINT(1) DEFAULT 0,
    `horas_solo` VARCHAR(50) DEFAULT '',
    `responsable` VARCHAR(100) DEFAULT '',
    `tiempo_paseos` VARCHAR(100) DEFAULT '',
    `plan_emergencia` TEXT,
    `experiencia_previa` VARCHAR(100) DEFAULT '',
    `otras_mascotas` VARCHAR(200) DEFAULT '',
    `veterinario_referencia` VARCHAR(150) DEFAULT '',
    `acuerdo_familiar` VARCHAR(50) DEFAULT '',
    -- Datos personales restringidos a ADMIN_ONG:
    `nombre_solicitante` VARCHAR(150) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `telefono` VARCHAR(50) NOT NULL,
    `presupuesto_estimado` VARCHAR(100) DEFAULT '',
    `compromiso_cuidados` TINYINT(1) DEFAULT 1,
    `acepta_seguimiento` TINYINT(1) DEFAULT 1,
    `estado_solicitud` VARCHAR(30) DEFAULT 'Pendiente',
    `fecha_solicitud` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_solicitud_mascota` (`mascota_id`)
);

-- 6. Usuarios Iniciales (Credenciales: admin/1234 y usuario/1234)
REPLACE INTO `usuarios` (`id`, `username`, `password`, `nombre`, `rol`)
VALUES
(1, 'admin', '1234', 'Administrador PetRescue ONG', 'ADMIN_ONG'),
(2, 'usuario', '1234', 'Usuario General / Adoptante', 'USER');

-- 7. Datos Iniciales: Luna y Max
REPLACE INTO `mascotas` (`id`, `codigo`, `nombre`, `especie`, `raza`, `edad`, `peso`, `sexo`, `esterilizado`, `descripcion_estado`, `ubicacion_rescate`, `imagen_url`, `estado_adopcion`)
VALUES 
(1, '#PR-2024-0091', 'Luna', 'Perro', 'Mestizo Terrier', '1 año y medio', '4.2 kg', 'Hembra', 'Sí', 'Rescatada en condición vulnerable, actualmente recuperada y en seguimiento de salud continuo.', 'Av. Central 310, Col. San Rafael, CDMX', '/images/luna.jpg', 'En Proceso'),
(2, '#PR-2026-0347', 'Max', 'Perro', 'Pastor Alemán', '2 años', '28 kg', 'Macho', 'Sí', 'Max es cariñoso, enérgico y muy leal. Ideal para familias activas con espacio exterior.', 'Parque México, Col. Hipódromo Condesa, CDMX', '/images/max.jpg', 'Disponible');

-- 8. Historial Médico de Luna (#PR-2024-0091)
REPLACE INTO `historial_medico` (`id`, `mascota_id`, `tipo_evento`, `titulo`, `veterinario`, `fecha`, `notas`)
VALUES
(1, 1, 'Chequeo', 'Chequeo general', 'Dra. Sofía Arredondo', '2026-09-14', 'Animal en buen estado general. Peso: 4.2 kg. Vacuna antirrábica aplicada.'),
(2, 1, 'Diagnóstico', 'Diagnóstico', 'Dr. Martín Casas', '2026-08-02', 'Otitis leve en oído izquierdo. Prescrito: gotas otológicas 7 días.'),
(3, 1, 'Tratamiento', 'Tratamiento', 'Dra. Sofía Arredondo', '2026-06-18', 'Desparasitación interna y externa completada. Revisión programada en 3 meses.');
