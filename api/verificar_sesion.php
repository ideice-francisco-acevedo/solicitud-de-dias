<?php

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if (!empty($_SESSION['logueado'])) {
    echo json_encode([
        'success' => true,
        'logueado' => true,
        'usuario' => [
            'id'     => $_SESSION['empleado_id'],
            'nombre' => $_SESSION['nombre'],
            'cedula' => $_SESSION['cedula'],
            'puesto' => $_SESSION['puesto'],
            'area'   => $_SESSION['area'],
            'rol'    => $_SESSION['rol'],
        ]
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(['success' => true, 'logueado' => false], JSON_UNESCAPED_UNICODE);
}
exit;
