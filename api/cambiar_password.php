<?php

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (empty($_SESSION['logueado'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$actual   = isset($input['actual']) ? $input['actual'] : '';
$nueva    = isset($input['nueva']) ? $input['nueva'] : '';
$empleadoId = (int)$_SESSION['empleado_id'];

if (empty($actual) || empty($nueva)) {
    http_response_code(400);
    echo json_encode(['error' => 'Contraseña actual y nueva requeridas'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (strlen($nueva) < 4) {
    http_response_code(400);
    echo json_encode(['error' => 'La nueva contraseña debe tener al menos 4 caracteres'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $conn = conectarSolicitud();

    $stmt = $conn->prepare('SELECT contrasena FROM usuarios_sistema WHERE empleado_id = ?');
    $stmt->bind_param('i', $empleadoId);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Usuario no encontrado'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $row = $res->fetch_assoc();
    $stmt->close();

    if (!password_verify($actual, $row['contrasena'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Contraseña actual incorrecta'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $nuevoHash = password_hash($nueva, PASSWORD_BCRYPT);
    $stmtUpd = $conn->prepare('UPDATE usuarios_sistema SET contrasena = ? WHERE empleado_id = ?');
    $stmtUpd->bind_param('si', $nuevoHash, $empleadoId);
    $stmtUpd->execute();

    $conn->close();

    echo json_encode(['success' => true, 'message' => 'Contraseña actualizada correctamente'], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error del servidor'], JSON_UNESCAPED_UNICODE);
    exit;
}
