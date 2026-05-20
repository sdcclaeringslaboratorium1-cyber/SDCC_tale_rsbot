<?php
require_once __DIR__ . '/_talebot-config.php';

setCorsHeaders();
header('Content-Type: application/json; charset=utf-8');

$character = preg_replace('/[^a-z_]/', '', strtolower($_GET['character'] ?? 'mogens'));
echo json_encode(loadConfig($character));
