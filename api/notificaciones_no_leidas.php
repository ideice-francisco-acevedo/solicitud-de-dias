<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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
        'SELECT COUNT(*) AS total FROM notificaciones WHERE empleado_id = ? AND leida = 0'
    );
    $stmt->bind_param('i', $empleadoId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    echo json_encode([
        'success' => true,
        'no_leidas' => (int)$row['total']
    ], JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
