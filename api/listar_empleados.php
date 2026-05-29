<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $conn = conectarIntranet();

    $stmt = $conn->prepare(
        "SELECT e.id, e.nombre, e.apellido, e.cedula,
                al.nombre AS area_trabajo
         FROM tblempleados e
         LEFT JOIN tblareaslaborales al ON e.id_arealaboral = al.id
         WHERE e.id_estado = '2'
         ORDER BY e.nombre, e.apellido"
    );

    if (!$stmt) {
        throw new RuntimeException('Error al preparar consulta: ' . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $empleados = [];

    while ($row = $result->fetch_assoc()) {
        $empleados[] = [
            'id'           => (int)$row['id'],
            'nombre'       => $row['nombre'],
            'apellido'     => $row['apellido'],
            'cedula'       => $row['cedula'],
            'nombre_completo' => $row['nombre'] . ' ' . $row['apellido'],
            'area_trabajo' => $row['area_trabajo'] ?: '',
        ];
    }

    echo json_encode([
        'success' => true,
        'empleados' => $empleados
    ], JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
