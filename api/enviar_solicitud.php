<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$camposRequeridos = ['fecha_solicitud', 'empleado_id', 'dia_solicitado', 'tipo_dia_id'];
$faltantes = [];

foreach ($camposRequeridos as $campo) {
    if (empty($input[$campo])) {
        $faltantes[] = $campo;
    }
}

if (!empty($faltantes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Faltan campos requeridos: ' . implode(', ', $faltantes)], JSON_UNESCAPED_UNICODE);
    exit;
}

$empleadoId = (int)$input['empleado_id'];
$tipoDiaId = (int)$input['tipo_dia_id'];
$creadoPorId = isset($input['creado_por_id']) ? (int)$input['creado_por_id'] : $empleadoId;
$observaciones = isset($input['observaciones']) ? trim($input['observaciones']) : '';
$rrhhId = isset($input['rrhh_id']) ? (int)$input['rrhh_id'] : 0;

if ($tipoDiaId < 1 || $tipoDiaId > 2) {
    http_response_code(400);
    echo json_encode(['error' => 'Tipo de día no válido'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $conn = conectarSolicitud();

    $stmt = $conn->prepare(
        'INSERT INTO solicitudes (fecha_solicitud, empleado_id, dia_solicitado, tipo_dia_id, estado_id, creado_por_id, observaciones)
         VALUES (?, ?, ?, ?, 1, ?, ?)'
    );

    if (!$stmt) {
        throw new RuntimeException('Error al preparar inserción: ' . $conn->error);
    }

    $stmt->bind_param(
        'sisiis',
        $input['fecha_solicitud'],
        $empleadoId,
        $input['dia_solicitado'],
        $tipoDiaId,
        $creadoPorId,
        $observaciones
    );

    if (!$stmt->execute()) {
        throw new RuntimeException('Error al guardar solicitud: ' . $stmt->error);
    }

    $idInsertado = $stmt->insert_id;
    $stmt->close();

    if ($rrhhId > 0) {
        $tipoDiaNombre = $tipoDiaId === 1 ? 'personal' : 'cumpleaños';
        $stmtNotif = $conn->prepare(
            'INSERT INTO notificaciones (solicitud_id, empleado_id, mensaje) VALUES (?, ?, ?)'
        );
        if ($stmtNotif) {
            $mensajeNotif = 'Nueva solicitud de día ' . $tipoDiaNombre . ' pendiente de revisión';
            $stmtNotif->bind_param('iis', $idInsertado, $rrhhId, $mensajeNotif);
            $stmtNotif->execute();
            $stmtNotif->close();
        }
    }

    $conn->close();

    echo json_encode([
        'success' => true,
        'message' => 'Solicitud enviada correctamente',
        'solicitud_id' => $idInsertado
    ], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}
