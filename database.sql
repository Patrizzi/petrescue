-- ==========================================================
-- BASE DE DATOS: PetRescue (Para XAMPP / phpMyAdmin / MySQL)
-- ==========================================================
-- Instrucciones:
-- 1. Abre XAMPP y haz clic en "Start" en el módulo Apache y MySQL.
-- 2. Entra a tu navegador en: http://localhost/phpmyadmin
-- 3. Ve a la pestaña "SQL", pega todo este código y haz clic en "Continuar" (Go).
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `petrescue_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `petrescue_db`;

-- ----------------------------------------------------------
-- 1. Tabla de Mascotas Rescatadas
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mascotas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(30) NOT NULL UNIQUE,
    `nombre` VARCHAR(100) NOT NULL,
    `especie` VARCHAR(50) NOT NULL,
    `raza` VARCHAR(100) DEFAULT 'Mestizo',
    `edad` VARCHAR(50) DEFAULT 'Desconocida',
    `peso` VARCHAR(50) DEFAULT 'Desconocido',
    `sexo` ENUM('Macho', 'Hembra') DEFAULT 'Macho',
    `esterilizado` ENUM('Sí', 'No', 'Pendiente') DEFAULT 'Sí',
    `descripcion_estado` TEXT NOT NULL,
    `ubicacion_rescate` VARCHAR(255) NOT NULL,
    `imagen_url` LONGTEXT,
    `estado_adopcion` ENUM('Disponible', 'En Proceso', 'Adoptado') DEFAULT 'Disponible',
    `fecha_rescate` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- 2. Tabla de Historial Médico
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `historial_medico` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `mascota_id` INT NOT NULL,
    `tipo_evento` ENUM('Chequeo', 'Diagnóstico', 'Tratamiento', 'Vacuna', 'Cirugía') DEFAULT 'Chequeo',
    `titulo` VARCHAR(150) NOT NULL,
    `veterinario` VARCHAR(150) NOT NULL,
    `fecha` DATE NOT NULL,
    `notas` TEXT NOT NULL,
    `fecha_creacion` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`mascota_id`) REFERENCES `mascotas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- 3. Tabla de Solicitudes de Adopción
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solicitudes_adopcion` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `mascota_id` INT NOT NULL,
    `codigo_solicitud` VARCHAR(30) NOT NULL UNIQUE,
    -- Paso 1: Hogar
    `tipo_vivienda` VARCHAR(100) NOT NULL,
    `metros_cuadrados` VARCHAR(50) NULL,
    `colonia` VARCHAR(100) NOT NULL,
    `ciudad` VARCHAR(100) NOT NULL,
    `tiene_jardin` TINYINT(1) DEFAULT 0,
    `permite_mascotas` TINYINT(1) DEFAULT 0,
    `area_descanso` TINYINT(1) DEFAULT 0,
    -- Paso 2: Rutina
    `horas_solo` VARCHAR(50) NULL,
    `responsable` VARCHAR(100) NULL,
    `tiempo_paseos` VARCHAR(100) NULL,
    `plan_emergencia` TEXT NULL,
    -- Paso 3: Experiencia
    `experiencia_previa` VARCHAR(100) NULL,
    `otras_mascotas` VARCHAR(200) NULL,
    `veterinario_referencia` VARCHAR(150) NULL,
    `acuerdo_familiar` VARCHAR(50) NULL,
    -- Paso 4: Compromiso y Datos del Solicitante
    `nombre_solicitante` VARCHAR(150) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `telefono` VARCHAR(50) NOT NULL,
    `presupuesto_estimado` VARCHAR(100) NULL,
    `compromiso_cuidados` TINYINT(1) DEFAULT 1,
    `acepta_seguimiento` TINYINT(1) DEFAULT 1,
    `estado_solicitud` ENUM('Pendiente', 'Aprobada', 'Rechazada') DEFAULT 'Pendiente',
    `fecha_solicitud` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`mascota_id`) REFERENCES `mascotas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- Datos Iniciales (Seed Data basado en los diseños de Figma)
-- ----------------------------------------------------------

-- Mascota 1: Luna (Historial Médico en Vista Voluntario)
INSERT INTO `mascotas` (`id`, `codigo`, `nombre`, `especie`, `raza`, `edad`, `peso`, `sexo`, `esterilizado`, `descripcion_estado`, `ubicacion_rescate`, `imagen_url`, `estado_adopcion`)
VALUES (
    1,
    '#PR-2024-0091',
    'Luna',
    'Perro',
    'Mestizo Terrier',
    '1 año y medio',
    '4.2 kg',
    'Hembra',
    'Sí',
    'Rescatada en condición vulnerable, actualmente recuperada y en seguimiento de salud continuo.',
    'Av. Central 310, Col. San Rafael, CDMX',
    '/images/luna.jpg',
    'En Proceso'
) ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- Mascota 2: Max (Tarjeta de Adopción en Vista Adoptante)
INSERT INTO `mascotas` (`id`, `codigo`, `nombre`, `especie`, `raza`, `edad`, `peso`, `sexo`, `esterilizado`, `descripcion_estado`, `ubicacion_rescate`, `imagen_url`, `estado_adopcion`)
VALUES (
    2,
    '#PR-2026-0347',
    'Max',
    'Perro',
    'Pastor Alemán',
    '2 años',
    '28 kg',
    'Macho',
    'Sí',
    'Max es cariñoso, enérgico y muy leal. Ideal para familias activas con espacio exterior.',
    'Parque México, Col. Hipódromo Condesa, CDMX',
    '/images/max.jpg',
    'Disponible'
) ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- Historial Médico de Luna (#PR-2024-0091)
DELETE FROM `historial_medico` WHERE `mascota_id` = 1;

INSERT INTO `historial_medico` (`mascota_id`, `tipo_evento`, `titulo`, `veterinario`, `fecha`, `notas`) VALUES
(1, 'Chequeo', 'Chequeo general', 'Dra. Sofía Arredondo', '2026-09-14', 'Animal en buen estado general. Peso: 4.2 kg. Vacuna antirrábica aplicada.'),
(1, 'Diagnóstico', 'Diagnóstico', 'Dr. Martín Casas', '2026-08-02', 'Otitis leve en oído izquierdo. Prescrito: gotas otológicas 7 días.'),
(1, 'Tratamiento', 'Tratamiento', 'Dra. Sofía Arredondo', '2026-06-18', 'Desparasitación interna y externa completada. Revisión programada en 3 meses.');
