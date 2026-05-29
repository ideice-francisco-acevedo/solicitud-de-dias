<?php

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

$empleadoId = isset($_GET['empleado_id']) ? (int)$_GET['empleado_id'] : 0;

if ($empleadoId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'empleado_id requerido'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $conn = conectarSolicitud();

    $stmt = $conn->prepare(
        'SELECT n.id, n.solicitud_id, n.mensaje, n.leida, n.created_at
         FROM notificaciones n
         WHERE n.empleado_id = ?
         ORDER BY n.created_at DESC
         LIMIT 50'
    );
    $stmt->bind_param('i', $empleadoId);
    $stmt->execute();
    $result = $stmt->get_result();

    $notificaciones = [];
    while ($row = $result->fetch_assoc()) {
        $notificaciones[] = [
            'id'           => (int)$row['id'],
            'solicitud_id' => (int)$row['solicitud_id'],
            'mensaje'      => $row['mensaje'],
            'leida'        => (int)$row['leida'],
            'created_at'   => $row['created_at'],
        ];
    }

    echo json_encode([
        'success' => true,
        'notificaciones' => $notificaciones
    ], JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
