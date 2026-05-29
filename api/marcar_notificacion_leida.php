<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$notificacionId = isset($input['id']) ? (int)$input['id'] : 0;

if ($notificacionId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'ID de notificación requerido'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $conn = conectarSolicitud();
    $stmt = $conn->prepare('UPDATE notificaciones SET leida = 1 WHERE id = ?');
    $stmt->bind_param('i', $notificacionId);
    $stmt->execute();

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
