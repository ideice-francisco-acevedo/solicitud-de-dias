<?php

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if (empty($_SESSION['logueado']) || $_SESSION['rol'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $connSol = conectarSolicitud();

    $stmt = $connSol->prepare(
        'SELECT us.id, us.empleado_id, us.rol_id, r.nombre AS rol_nombre, us.created_at
         FROM usuarios_sistema us
         JOIN roles r ON us.rol_id = r.id
         ORDER BY us.rol_id, us.id'
    );
    $stmt->execute();
    $result = $stmt->get_result();

    $usuarios = [];

    $connIntra = conectarIntranet();

    while ($row = $result->fetch_assoc()) {
        $empId = (int)$row['empleado_id'];
        $nombre = 'Desconocido';

        $stmtEmp = $connIntra->prepare('SELECT nombre, apellido, cedula FROM tblempleados WHERE id = ?');
        if ($stmtEmp) {
            $stmtEmp->bind_param('i', $empId);
            $stmtEmp->execute();
            $resEmp = $stmtEmp->get_result();
            if ($resEmp->num_rows > 0) {
                $emp = $resEmp->fetch_assoc();
                $nombre = $emp['nombre'] . ' ' . $emp['apellido'];
            }
            $stmtEmp->close();
        }

        $usuarios[] = [
            'id'           => (int)$row['id'],
            'empleado_id'  => $empId,
            'nombre'       => $nombre,
            'rol_id'       => (int)$row['rol_id'],
            'rol_nombre'   => $row['rol_nombre'],
            'created_at'   => $row['created_at'],
        ];
    }

    $stmt->close();

    $stmtRoles = $connSol->query('SELECT id, nombre FROM roles ORDER BY id');
    $roles = [];
    while ($r = $stmtRoles->fetch_assoc()) {
        $roles[] = ['id' => (int)$r['id'], 'nombre' => $r['nombre']];
    }

    $connSol->close();
    $connIntra->close();

    echo json_encode([
        'success' => true,
        'usuarios' => $usuarios,
        'roles' => $roles,
    ], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}
