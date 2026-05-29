DROP DATABASE IF EXISTS solicitud_dias;
CREATE DATABASE IF NOT EXISTS solicitud_dias
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE solicitud_dias;

DROP TABLE IF EXISTS tipos_dia;
CREATE TABLE IF NOT EXISTS tipos_dia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tipos_dia (nombre) VALUES
    ('personal'),
    ('cumpleanos');

DROP TABLE IF EXISTS estados;
CREATE TABLE IF NOT EXISTS estados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO estados (nombre) VALUES
    ('pendiente'),
    ('aprobado'),
    ('rechazado');

DROP TABLE IF EXISTS solicitudes;
CREATE TABLE IF NOT EXISTS solicitudes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha_solicitud DATE NOT NULL,
    empleado_id INT NOT NULL,
    dia_solicitado DATE NOT NULL,
    tipo_dia_id INT NOT NULL,
    estado_id INT NOT NULL DEFAULT 1,
    observaciones TEXT NULL,
    motivo_rechazo TEXT NULL,
    esta_activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_por_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_empleado_id (empleado_id),
    INDEX idx_estado_id (estado_id),
    INDEX idx_tipo_dia_id (tipo_dia_id),
    CONSTRAINT fk_tipo_dia FOREIGN KEY (tipo_dia_id) REFERENCES tipos_dia(id),
    CONSTRAINT fk_estado FOREIGN KEY (estado_id) REFERENCES estados(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS notificaciones;
CREATE TABLE IF NOT EXISTS notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    empleado_id INT NOT NULL,
    mensaje VARCHAR(500) NOT NULL,
    leida TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_empleado_id (empleado_id),
    INDEX idx_leida (leida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS roles;
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (nombre) VALUES ('admin'), ('rrhh'), ('empleado');


DROP TABLE IF EXISTS usuarios_sistema;
CREATE TABLE IF NOT EXISTS usuarios_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_empleado_id (empleado_id),
    INDEX idx_rol_id (rol_id),
    CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO usuarios_sistema (empleado_id) VALUES ('admin'), ('rrhh'), ('empleado');
