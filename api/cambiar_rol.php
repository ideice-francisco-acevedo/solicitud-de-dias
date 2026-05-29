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

if (empty($_SESSION['logueado']) || $_SESSION['rol'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado'], JSON_UNESCAPED_UNICODE);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$usuarioId = isset($input['usuario_id']) ? (int)$input['usuario_id'] : 0;
$rolId     = isset($input['rol_id']) ? (int)$input['rol_id'] : 0;

if ($usuarioId <= 0 || $rolId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'usuario_id y rol_id requeridos'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $conn = conectarSolicitud();

    $stmt = $conn->prepare('UPDATE usuarios_sistema SET rol_id = ? WHERE id = ?');
    $stmt->bind_param('ii', $rolId, $usuarioId);
    $stmt->execute();

    if ($stmt->affected_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Usuario no encontrado'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $conn->close();

    echo json_encode(['success' => true, 'message' => 'Rol actualizado'], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}
