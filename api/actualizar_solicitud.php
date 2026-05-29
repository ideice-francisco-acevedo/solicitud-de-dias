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

$solicitudId = isset($input['solicitud_id']) ? (int)$input['solicitud_id'] : 0;
$empleadoId  = isset($input['empleado_id']) ? (int)$input['empleado_id'] : 0;

if ($solicitudId <= 0 || $empleadoId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'solicitud_id y empleado_id requeridos'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $connSol = conectarSolicitud();

    $stmtSol = $connSol->prepare('SELECT empleado_id, creado_por_id, estado_id FROM solicitudes WHERE id = ?');
    $stmtSol->bind_param('i', $solicitudId);
    $stmtSol->execute();
    $resultSol = $stmtSol->get_result();

    if ($resultSol->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Solicitud no encontrada'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $sol = $resultSol->fetch_assoc();
    $stmtSol->close();

    $connIntra = conectarIntranet();

    $esRrhh = false;
    $stmtRrhh = $connIntra->prepare(
        'SELECT id FROM tblempleados WHERE id = ? AND id_arealaboral = 3 AND id_estado = \'1\''
    );
    if ($stmtRrhh) {
        $stmtRrhh->bind_param('i', $empleadoId);
        $stmtRrhh->execute();
        $esRrhh = $stmtRrhh->get_result()->num_rows > 0;
        $stmtRrhh->close();
    }

    $esPropietario = ((int)$sol['empleado_id'] === $empleadoId || (int)$sol['creado_por_id'] === $empleadoId);

    if (!$esRrhh && !$esPropietario) {
        http_response_code(403);
        echo json_encode(['error' => 'No tiene permiso para editar esta solicitud'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $campos = [];
    $tipos  = '';
    $valores = [];

    if ($esRrhh) {
        if (isset($input['fecha_solicitud']) && $input['fecha_solicitud'] !== '') {
            $campos[] = 'fecha_solicitud = ?';
            $tipos .= 's';
            $valores[] = $input['fecha_solicitud'];
        }
        if (isset($input['dia_solicitado']) && $input['dia_solicitado'] !== '') {
            $campos[] = 'dia_solicitado = ?';
            $tipos .= 's';
            $valores[] = $input['dia_solicitado'];
        }
        if (isset($input['tipo_dia_id']) && in_array((int)$input['tipo_dia_id'], [1, 2], true)) {
            $campos[] = 'tipo_dia_id = ?';
            $tipos .= 'i';
            $valores[] = (int)$input['tipo_dia_id'];
        }
        if (isset($input['estado_id']) && in_array((int)$input['estado_id'], [1, 2, 3], true)) {
            $campos[] = 'estado_id = ?';
            $tipos .= 'i';
            $valores[] = (int)$input['estado_id'];
        }
        if (isset($input['observaciones'])) {
            $campos[] = 'observaciones = ?';
            $tipos .= 's';
            $valores[] = trim($input['observaciones']);
        }
    } else {
        if (isset($input['fecha_solicitud']) && $input['fecha_solicitud'] !== '') {
            $campos[] = 'fecha_solicitud = ?';
            $tipos .= 's';
            $valores[] = $input['fecha_solicitud'];
        }
        if (isset($input['observaciones'])) {
            $campos[] = 'observaciones = ?';
            $tipos .= 's';
            $valores[] = trim($input['observaciones']);
        }
    }

    if (empty($campos)) {
        http_response_code(400);
        echo json_encode(['error' => 'No se enviaron campos para actualizar'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $tipos .= 'i';
    $valores[] = $solicitudId;

    $sql = 'UPDATE solicitudes SET ' . implode(', ', $campos) . ' WHERE id = ?';
    $stmtUpd = $connSol->prepare($sql);

    if (!$stmtUpd) {
        throw new RuntimeException('Error al preparar: ' . $connSol->error);
    }

    $stmtUpd->bind_param($tipos, ...$valores);

    if (!$stmtUpd->execute()) {
        throw new RuntimeException('Error al actualizar: ' . $stmtUpd->error);
    }

    $connSol->close();
    $connIntra->close();

    echo json_encode([
        'success' => true,
        'message' => 'Solicitud actualizada correctamente'
    ], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}
