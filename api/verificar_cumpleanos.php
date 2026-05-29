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

$cedula        = isset($_GET['cedula']) ? trim($_GET['cedula']) : '';
$diaSolicitado = isset($_GET['dia_solicitado']) ? trim($_GET['dia_solicitado']) : '';

if (empty($cedula) || empty($diaSolicitado)) {
    http_response_code(400);
    echo json_encode(['error' => 'Cédula y día solicitado son requeridos'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $conn = conectarIntranet();

    $stmt = $conn->prepare(
        'SELECT fechan AS fecha_nacimiento FROM tblempleados WHERE cedula = ?'
    );

    if (!$stmt) {
        throw new RuntimeException('Error al preparar consulta: ' . $conn->error);
    }

    $stmt->bind_param('s', $cedula);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Empleado no encontrado'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $empleado = $result->fetch_assoc();
    $fechaNacimiento = $empleado['fecha_nacimiento'];

    if (empty($fechaNacimiento)) {
        http_response_code(400);
        echo json_encode(['error' => 'El empleado no tiene fecha de nacimiento registrada'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $fn = new DateTime($fechaNacimiento);
    $ds = new DateTime($diaSolicitado);

    $anoActual = (int)$ds->format('Y');
    $mesNac   = (int)$fn->format('m');
    $diaNac   = (int)$fn->format('d');

    $cumpleanosEsteAno = new DateTime("$anoActual-$mesNac-$diaNac");

    $diferencia = $ds->diff($cumpleanosEsteAno);
    $diasDiferencia = (int)$diferencia->format('%R%a');

    $esValido = ($diasDiferencia >= 0 && $diasDiferencia <= 30);

    echo json_encode([
        'success'    => true,
        'valido'     => $esValido,
        'mensaje'    => $esValido
            ? 'El día de cumpleaños está dentro del período permitido (1 mes desde su cumpleaños).'
            : 'El día solicitado NO está dentro del mes posterior a su fecha de cumpleaños.',
        'fecha_nacimiento' => $fechaNacimiento,
        'cumpleanos_este_ano' => $cumpleanosEsteAno->format('Y-m-d'),
        'dias_desde_cumpleanos' => $diasDiferencia
    ], JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
