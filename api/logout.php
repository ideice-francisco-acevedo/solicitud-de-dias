<?php

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$_SESSION = [];
session_destroy();

echo json_encode(['success' => true, 'message' => 'Sesión cerrada'], JSON_UNESCAPED_UNICODE);
exit;
