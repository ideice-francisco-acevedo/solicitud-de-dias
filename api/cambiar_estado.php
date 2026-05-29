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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$solicitudId   = isset($input['solicitud_id']) ? (int)$input['solicitud_id'] : 0;
$estadoId      = isset($input['estado_id']) ? (int)$input['estado_id'] : 0;
$motivoRechazo = isset($input['motivo_rechazo']) ? trim($input['motivo_rechazo']) : '';

if ($solicitudId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'ID de solicitud requerido'], JSON_UNESCAPED_UNICODE);
    exit;
}

$esAdmin = !empty($_SESSION['rol']) && $_SESSION['rol'] === 'admin';

if ($estadoId === 1 && !$esAdmin) {
    http_response_code(403);
    echo json_encode(['error' => 'Solo el admin puede restaurar solicitudes'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!in_array($estadoId, [1, 2, 3], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Estado no válido'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $conn = conectarSolicitud();

    $conn->begin_transaction();

    $stmt = $conn->prepare('UPDATE solicitudes SET estado_id = ?, motivo_rechazo = ? WHERE id = ?');
    if (!$stmt) {
        throw new RuntimeException('Error al preparar actualización: ' . $conn->error);
    }
    $stmt->bind_param('isi', $estadoId, $motivoRechazo, $solicitudId);
    $stmt->execute();

    if ($stmt->affected_rows === 0) {
        $conn->rollback();
        http_response_code(404);
        echo json_encode(['error' => 'Solicitud no encontrada'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $stmt->close();

    $stmtInfo = $conn->prepare('SELECT empleado_id, creado_por_id, tipo_dia_id FROM solicitudes WHERE id = ?');
    $stmtInfo->bind_param('i', $solicitudId);
    $stmtInfo->execute();
    $info = $stmtInfo->get_result()->fetch_assoc();
    $stmtInfo->close();

    $empleadoId = (int)$info['empleado_id'];
    $tipoDiaNombre = $info['tipo_dia_id'] == 1 ? 'personal' : 'cumpleaños';

    if ($estadoId === 1) {
        $estadoNombre = 'restaurada a pendiente';
    } elseif ($estadoId === 2) {
        $estadoNombre = 'aprobada';
    } else {
        $estadoNombre = 'rechazada';
    }

    $mensajeNotif = 'Tu solicitud de día ' . $tipoDiaNombre . ' ha sido ' . $estadoNombre . '.';
    if ($estadoId === 3 && $motivoRechazo !== '') {
        $mensajeNotif .= ' Motivo: ' . $motivoRechazo;
    }

    $stmtNotif = $conn->prepare(
        'INSERT INTO notificaciones (solicitud_id, empleado_id, mensaje) VALUES (?, ?, ?)'
    );
    if ($stmtNotif) {
        $stmtNotif->bind_param('iis', $solicitudId, $empleadoId, $mensajeNotif);
        $stmtNotif->execute();
        $stmtNotif->close();
    }

    $conn->commit();

    $asunto = 'Solicitud de día ' . $tipoDiaNombre . ' - ' . $estadoNombre . ' (#' . $solicitudId . ')';
    $cuerpo = "Estimado/a,\n\n";
    $cuerpo .= "Su solicitud #" . $solicitudId . " de día " . $tipoDiaNombre . " ha sido " . $estadoNombre . ".\n\n";
    if ($estadoId === 3 && $motivoRechazo !== '') {
        $cuerpo .= "Motivo del rechazo: " . $motivoRechazo . "\n\n";
    }
    $cuerpo .= "Puede consultar el estado de sus solicitudes en la intranet.\n\n";
    $cuerpo .= "Saludos,\nIDEICE - RRHH";

    $connIntra = conectarIntranet();
    $stmtEmail = $connIntra->prepare('SELECT correoi, correop FROM tblempleados WHERE id = ?');
    if ($stmtEmail) {
        $stmtEmail->bind_param('i', $empleadoId);
        $stmtEmail->execute();
        $resEmail = $stmtEmail->get_result();
        if ($resEmail->num_rows > 0) {
            $emp = $resEmail->fetch_assoc();
            $destinatario = !empty($emp['correoi']) ? $emp['correoi'] : $emp['correop'];
            if (!empty($destinatario)) {
                $cabeceras = "From: RRHH IDEICE <rrhh@ideice.gob.do>\r\n";
                $cabeceras .= "Content-Type: text/plain; charset=UTF-8\r\n";
                @mail($destinatario, $asunto, $cuerpo, $cabeceras);
            }
        }
        $stmtEmail->close();
    }
    $connIntra->close();

    $conn->close();

    echo json_encode([
        'success' => true,
        'message' => 'Solicitud ' . $estadoNombre . ' correctamente'
    ], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
