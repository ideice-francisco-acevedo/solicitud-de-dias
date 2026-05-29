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

$cedula   = isset($input['cedula']) ? trim($input['cedula']) : '';
$password = isset($input['password']) ? trim($input['password']) : '';

function normalizarCedula($valor) {
    $digitos = preg_replace('/\D/', '', $valor);
    if (strlen($digitos) === 11) {
        $digitos = substr($digitos, 0, 3) . '-' . substr($digitos, 3, 7) . '-' . substr($digitos, 10, 1);
    }
    return $digitos;
}

$cedula = normalizarCedula($cedula);

$passwordNormalizado = normalizarCedula($password);
if ($passwordNormalizado === $cedula) {
    $password = $passwordNormalizado;
}

if (empty($cedula) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Cédula y contraseña requeridas'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $connIntra = conectarIntranet();

    $stmt = $connIntra->prepare(
        'SELECT e.id, e.nombre, e.apellido, e.cedula,
                e.id_arealaboral, e.id_funcion,
                al.nombre AS area_trabajo,
                f.nombre AS puesto
         FROM tblempleados e
         LEFT JOIN tblareaslaborales al ON e.id_arealaboral = al.id
         LEFT JOIN tblfunciones f ON e.id_funcion = f.id
         WHERE e.cedula = ? AND e.id_estado IN (\'1\', \'2\')'
    );

    if (!$stmt) {
        throw new RuntimeException('Error al preparar consulta');
    }

    $stmt->bind_param('s', $cedula);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(401);
        echo json_encode(['error' => 'Cédula o contraseña incorrecta'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $empleado = $result->fetch_assoc();
    $stmt->close();
    $connIntra->close();

    $empleadoId = (int)$empleado['id'];

    $connSol = conectarSolicitud();
    $stmtPass = $connSol->prepare('SELECT contrasena, rol_id FROM usuarios_sistema WHERE empleado_id = ?');
    $stmtPass->bind_param('i', $empleadoId);
    $stmtPass->execute();
    $resPass = $stmtPass->get_result();

    $rolId = 3;

    if ($resPass->num_rows === 0) {
        $stmtPass->close();

        $hashCedula = password_hash($cedula, PASSWORD_BCRYPT);
        $stmtCrear = $connSol->prepare('INSERT INTO usuarios_sistema (empleado_id, contrasena) VALUES (?, ?)');
        $stmtCrear->bind_param('is', $empleadoId, $hashCedula);
        $stmtCrear->execute();
        $stmtCrear->close();

        if (!password_verify($password, $hashCedula)) {
            $connSol->close();
            http_response_code(401);
            echo json_encode(['error' => 'Cédula o contraseña incorrecta'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    } else {
        $userRow = $resPass->fetch_assoc();
        $stmtPass->close();
        $rolId = (int)$userRow['rol_id'];

        if (!password_verify($password, $userRow['contrasena'])) {
            $connSol->close();
            http_response_code(401);
            echo json_encode(['error' => 'Cédula o contraseña incorrecta'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $connSol->close();

    if ($rolId === 3) {
        $esRrhh = ($empleado['id_arealaboral'] == 3);
        if ($esRrhh) {
            $rolId = 2;
            $connUpd = conectarSolicitud();
            $connUpd->query('UPDATE usuarios_sistema SET rol_id = 2 WHERE empleado_id = ' . $empleadoId);
            $connUpd->close();
        }
    }

    $rolesMap = [1 => 'admin', 2 => 'rrhh', 3 => 'empleado'];
    $rol = $rolesMap[$rolId] ?? 'empleado';

    $_SESSION['logueado']    = true;
    $_SESSION['empleado_id'] = $empleadoId;
    $_SESSION['cedula']      = $empleado['cedula'];
    $_SESSION['nombre']      = $empleado['nombre'] . ' ' . $empleado['apellido'];
    $_SESSION['puesto']      = $empleado['puesto'] ?: '';
    $_SESSION['area']        = $empleado['area_trabajo'] ?: '';
    $_SESSION['rol']         = $rol;

    echo json_encode([
        'success' => true,
        'usuario' => [
            'id'     => $empleadoId,
            'nombre' => $_SESSION['nombre'],
            'cedula' => $_SESSION['cedula'],
            'puesto' => $_SESSION['puesto'],
            'area'   => $_SESSION['area'],
            'rol'    => $rol,
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error del servidor'], JSON_UNESCAPED_UNICODE);
    exit;
}
