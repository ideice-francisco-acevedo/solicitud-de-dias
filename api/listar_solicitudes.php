<?php

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

$cedula = isset($_GET['cedula']) ? trim($_GET['cedula']) : '';
$todos  = isset($_GET['todos']) && $_GET['todos'] === '1';
$esAdmin = isset($_SESSION['rol']) && $_SESSION['rol'] === 'admin';

if (!$todos && empty($cedula)) {
    http_response_code(400);
    echo json_encode(['error' => 'Debe proporcionar cédula o usar todos=1'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $conn = conectarSolicitud();

    if ($todos) {
        $filtroActivo = $esAdmin ? '' : ' AND s.esta_activo = 1';
        $sql = 'SELECT s.*, td.nombre AS tipo_dia_nombre, es.nombre AS estado_nombre,
                       CONCAT(e.nombre, \' \', e.apellido) AS empleado_nombre,
                       CONCAT(c.nombre, \' \', c.apellido) AS creado_por_nombre
                FROM solicitudes s
                JOIN tipos_dia td ON s.tipo_dia_id = td.id
                JOIN estados es ON s.estado_id = es.id
                LEFT JOIN ideicego_intranet.tblempleados e ON s.empleado_id = e.id
                LEFT JOIN ideicego_intranet.tblempleados c ON s.creado_por_id = c.id
                WHERE 1=1' . $filtroActivo . '
                ORDER BY s.created_at DESC';
        $stmt = $conn->prepare($sql);
    } else {
        $sql = 'SELECT s.*, td.nombre AS tipo_dia_nombre, es.nombre AS estado_nombre,
                       CONCAT(e.nombre, \' \', e.apellido) AS empleado_nombre,
                       CONCAT(c.nombre, \' \', c.apellido) AS creado_por_nombre
                FROM solicitudes s
                JOIN tipos_dia td ON s.tipo_dia_id = td.id
                JOIN estados es ON s.estado_id = es.id
                LEFT JOIN ideicego_intranet.tblempleados e ON s.empleado_id = e.id
                LEFT JOIN ideicego_intranet.tblempleados c ON s.creado_por_id = c.id
                WHERE s.esta_activo = 1 AND s.creado_por_id = (
                    SELECT em.id FROM ideicego_intranet.tblempleados em WHERE em.cedula = ?
                )
                ORDER BY s.created_at DESC';
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new RuntimeException('Error al preparar consulta: ' . $conn->error);
        }
        $stmt->bind_param('s', $cedula);
    }

    if (!$stmt) {
        throw new RuntimeException('Error al preparar consulta: ' . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $solicitudes = [];

    while ($row = $result->fetch_assoc()) {
        $solicitudes[] = [
            'id'                => (int)$row['id'],
            'fecha_solicitud'   => $row['fecha_solicitud'],
            'empleado_id'       => (int)$row['empleado_id'],
            'empleado_nombre'   => $row['empleado_nombre'] ?: 'Desconocido',
            'dia_solicitado'    => $row['dia_solicitado'],
            'tipo_dia_id'       => (int)$row['tipo_dia_id'],
            'tipo_dia_nombre'   => $row['tipo_dia_nombre'],
            'estado_id'         => (int)$row['estado_id'],
            'estado_nombre'     => $row['estado_nombre'],
            'observaciones'     => $row['observaciones'],
            'motivo_rechazo'    => $row['motivo_rechazo'],
            'esta_activo'       => (int)$row['esta_activo'],
            'creado_por_id'     => (int)$row['creado_por_id'],
            'creado_por_nombre' => $row['creado_por_nombre'] ?: 'Desconocido',
            'created_at'        => $row['created_at'],
        ];
    }

    echo json_encode([
        'success' => true,
        'solicitudes' => $solicitudes
    ], JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
