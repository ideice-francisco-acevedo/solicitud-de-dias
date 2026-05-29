<?php

$isLocal = in_array($_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '', ['localhost', '127.0.0.1', '::1']);

if ($isLocal) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    define('DB_INTRANET_HOST', 'localhost');
    define('DB_INTRANET_USER', 'root');
    define('DB_INTRANET_PASS', '');
    define('DB_INTRANET_NAME', 'ideicego_intranet');

    define('DB_SOLICITUD_HOST', 'localhost');
    define('DB_SOLICITUD_USER', 'root');
    define('DB_SOLICITUD_PASS', '');
    define('DB_SOLICITUD_NAME', 'solicitud_dias');
} else {
    error_reporting(0);
    ini_set('display_errors', 0);

    define('DB_INTRANET_HOST', 'localhost');
    define('DB_INTRANET_USER', '');
    define('DB_INTRANET_PASS', '');
    define('DB_INTRANET_NAME', 'ideicego_intranet');

    define('DB_SOLICITUD_HOST', 'localhost');
    define('DB_SOLICITUD_USER', '');
    define('DB_SOLICITUD_PASS', '');
    define('DB_SOLICITUD_NAME', 'solicitud_dias');
}

function conectarIntranet(): mysqli {
    $conn = new mysqli(DB_INTRANET_HOST, DB_INTRANET_USER, DB_INTRANET_PASS, DB_INTRANET_NAME);
    if ($conn->connect_error) {
        throw new RuntimeException('Error de conexión a intranet: ' . $conn->connect_error);
    }
    $conn->set_charset('utf8');
    return $conn;
}

function conectarSolicitud(): mysqli {
    $conn = new mysqli(DB_SOLICITUD_HOST, DB_SOLICITUD_USER, DB_SOLICITUD_PASS, DB_SOLICITUD_NAME);
    if ($conn->connect_error) {
        throw new RuntimeException('Error de conexión a solicitud_dias: ' . $conn->connect_error);
    }
    $conn->set_charset('utf8');
    return $conn;
}
