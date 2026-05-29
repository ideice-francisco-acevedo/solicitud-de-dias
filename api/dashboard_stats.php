<?php

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if (empty($_SESSION['logueado'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado'], JSON_UNESCAPED_UNICODE);
    exit;
}

$empleadoId = (int)$_SESSION['empleado_id'];
$esRrhh = $_SESSION['rol'] === 'rrhh';

require_once __DIR__ . '/../config/database.php';

try {
    $conn = conectarSolicitud();

    $total = 0;
    $pendientes = 0;
    $aprobadas = 0;
    $rechazadas = 0;

    if ($esRrhh) {
        $sql = "SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN estado_id = 1 THEN 1 ELSE 0 END) AS pendientes,
                    SUM(CASE WHEN estado_id = 2 THEN 1 ELSE 0 END) AS aprobadas,
                    SUM(CASE WHEN estado_id = 3 THEN 1 ELSE 0 END) AS rechazadas
                FROM solicitudes WHERE esta_activo = 1";
        $stmt = $conn->prepare($sql);
    } else {
        $sql = "SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN estado_id = 1 THEN 1 ELSE 0 END) AS pendientes,
                    SUM(CASE WHEN estado_id = 2 THEN 1 ELSE 0 END) AS aprobadas,
                    SUM(CASE WHEN estado_id = 3 THEN 1 ELSE 0 END) AS rechazadas
                FROM solicitudes WHERE esta_activo = 1 AND empleado_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $empleadoId);
    }

    if ($stmt) {
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $total      = (int)$res['total'];
        $pendientes = (int)$res['pendientes'];
        $aprobadas  = (int)$res['aprobadas'];
        $rechazadas = (int)$res['rechazadas'];
        $stmt->close();
    }

    $conn->close();

    echo json_encode([
        'success'    => true,
        'total'      => $total,
        'pendientes' => $pendientes,
        'aprobadas'  => $aprobadas,
        'rechazadas' => $rechazadas,
    ], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error'], JSON_UNESCAPED_UNICODE);
    exit;
}
