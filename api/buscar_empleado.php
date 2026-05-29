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

$cedula = isset($_GET['cedula']) ? trim($_GET['cedula']) : '';

if (empty($cedula)) {
    http_response_code(400);
    echo json_encode(['error' => 'Cédula es requerida'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $conn = conectarIntranet();

    $stmt = $conn->prepare(
        'SELECT e.id, e.nombre, e.apellido, e.cedula, e.fechan,
                al.nombre AS area_trabajo,
                f.nombre AS puesto,
                e.id_supervisor,
                s.id AS supervisor_id,
                s.nombre AS supervisor_nombre,
                s.apellido AS supervisor_apellido,
                s.cedula AS supervisor_cedula
         FROM tblempleados e
         LEFT JOIN tblareaslaborales al ON e.id_arealaboral = al.id
         LEFT JOIN tblfunciones f ON e.id_funcion = f.id
         LEFT JOIN tblempleados s ON e.id_supervisor = s.id
         WHERE e.cedula = ?'
    );

    if (!$stmt) {
        throw new RuntimeException('Error al preparar consulta: ' . $conn->error);
    }

    $stmt->bind_param('s', $cedula);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Empleado no encontrado con la cédula proporcionada'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $empleado = $result->fetch_assoc();
    $stmt->close();

    $supervisorId = 0;
    $supervisorNombre = 'No asignado';

    if (!empty($empleado['id_supervisor']) && !empty($empleado['supervisor_nombre'])) {
        $supervisorId = (int)$empleado['supervisor_id'];
        $supervisorNombre = $empleado['supervisor_nombre'] . ' ' . $empleado['supervisor_apellido'];
    }

    $rrhhId = 0;
    $rrhhNombre = 'No asignado';

    $stmtRrhh = $conn->prepare(
        'SELECT e.id, e.nombre, e.apellido
         FROM tblempleados e
         WHERE e.id_arealaboral = 3 AND e.id_estado = \'1\'
         LIMIT 1'
    );

    if ($stmtRrhh) {
        $stmtRrhh->execute();
        $resultRrhh = $stmtRrhh->get_result();
        if ($resultRrhh->num_rows > 0) {
            $rrhh = $resultRrhh->fetch_assoc();
            $rrhhId = (int)$rrhh['id'];
            $rrhhNombre = $rrhh['nombre'] . ' ' . $rrhh['apellido'];
        }
        $stmtRrhh->close();
    }

    echo json_encode([
        'success' => true,
        'empleado' => [
            'id'                   => (int)$empleado['id'],
            'apellidos'            => $empleado['apellido'],
            'nombres'              => $empleado['nombre'],
            'cedula'               => $empleado['cedula'],
            'puesto'               => $empleado['puesto'] ?: 'No registrado',
            'area_trabajo'         => $empleado['area_trabajo'] ?: 'No registrado',
            'fecha_nacimiento'     => $empleado['fechan'],
            'supervisor_id'        => $supervisorId,
            'supervisor_nombre'    => $supervisorNombre,
            'rrhh_id'              => $rrhhId,
            'rrhh_nombre'          => $rrhhNombre,
        ]
    ], JSON_UNESCAPED_UNICODE);

    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
