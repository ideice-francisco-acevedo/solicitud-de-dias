<?php

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (empty($_SESSION['logueado'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado'], JSON_UNESCAPED_UNICODE);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$solicitudId = isset($input['solicitud_id']) ? (int)$input['solicitud_id'] : 0;
$activo      = isset($input['activo']) ? (int)$input['activo'] : 0;

if ($solicitudId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'ID de solicitud requerido'], JSON_UNESCAPED_UNICODE);
    exit;
}

$rol = $_SESSION['rol'] ?? 'empleado';
if (!in_array($rol, ['admin', 'rrhh'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Solo admin o RRHH pueden desactivar solicitudes'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $conn = conectarSolicitud();
    $stmt = $conn->prepare('UPDATE solicitudes SET esta_activo = ? WHERE id = ?');
    $stmt->bind_param('ii', $activo, $solicitudId);
    $stmt->execute();

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    $conn->close();
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}
