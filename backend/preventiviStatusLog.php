<?php
// Minimal endpoint per logging cambi stato preventivi (GET/POST).
// Esempio da adattare al backend reale (auth/DB).

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// NOTE: Sostituire con storage su DB. Qui persistiamo su file JSON per demo.
$DATA_DIR = __DIR__ . '/data';
$DATA_FILE = $DATA_DIR . '/preventivi_status_log.json';
if (!is_dir($DATA_DIR)) { @mkdir($DATA_DIR, 0777, true); }
if (!file_exists($DATA_FILE)) { file_put_contents($DATA_FILE, json_encode([]), LOCK_EX); }

function read_json($path) {
  $fp = @fopen($path, 'r');
  if (!$fp) return [];
  @flock($fp, LOCK_SH);
  $raw = stream_get_contents($fp);
  @flock($fp, LOCK_UN);
  @fclose($fp);
  if ($raw === false) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function write_json($path, $data) {
  $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
  return file_put_contents($path, $json, LOCK_EX);
}

// Helper per risposta standard
function respond($payload, $status = 200) {
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

// Lettura token (qui non validato; integrare con auth reale)
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
$bearer = '';
if (stripos($authHeader, 'Bearer ') === 0) {
  $bearer = substr($authHeader, 7);
}

// GET: ?id=123  -> lista eventi
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $id = isset($_GET['id']) ? $_GET['id'] : null;
  if ($id === null || $id === '') {
    respond([ 'message' => 'Parametro id mancante' ], 400);
  }
  $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
  $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
  $limit = ($limit > 0 && $limit <= 500) ? $limit : 100;
  $offset = max(0, $offset);

  $store = read_json($DATA_FILE);
  $items = isset($store[$id]) && is_array($store[$id]) ? $store[$id] : [];

  // Ordina per data decrescente
  usort($items, function($a, $b) {
    $ta = isset($a['at']) ? strtotime($a['at']) : 0;
    $tb = isset($b['at']) ? strtotime($b['at']) : 0;
    if ($ta === $tb) return 0;
    return ($ta > $tb) ? -1 : 1;
  });

  $total = count($items);
  $itemsPage = array_slice($items, $offset, $limit);
  respond([
    'items' => $itemsPage,
    'meta' => [
      'total' => $total,
      'limit' => $limit,
      'offset' => $offset,
      'count' => count($itemsPage),
    ],
  ]);
}

// POST: salva evento log
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true);
  if (!is_array($input)) {
    respond([ 'message' => 'Body non valido' ], 400);
  }
  $id = isset($input['id']) ? $input['id'] : null;
  if ($id === null || $id === '') {
    respond([ 'message' => 'Campo id mancante' ], 400);
  }
  // Info richiesta
  $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null;
  $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : null;

  $event = [
    'id' => $id,
    'at' => isset($input['at']) ? $input['at'] : date('c'),
    'from_status' => isset($input['from_status']) ? $input['from_status'] : null,
    'to_status' => isset($input['to_status']) ? $input['to_status'] : null,
    'note' => isset($input['note']) ? $input['note'] : null,
    'description' => isset($input['description']) ? $input['description'] : null,
    'context' => isset($input['context']) ? $input['context'] : null,
    'user_id' => isset($input['user_id']) ? $input['user_id'] : null,
    'user_name' => isset($input['user_name']) ? $input['user_name'] : null,
    'ip' => $ip,
    'user_agent' => $ua,
  ];
  $store = read_json($DATA_FILE);
  if (!isset($store[$id]) || !is_array($store[$id])) { $store[$id] = []; }
  // Accoda e mantieni ultimi 200 eventi per ID
  $store[$id][] = $event;
  if (count($store[$id]) > 200) { $store[$id] = array_slice($store[$id], -200); }
  write_json($DATA_FILE, $store);
  http_response_code(201);
  respond([ 'ok' => true, 'data' => $event ]);
}

respond([ 'message' => 'Metodo non supportato' ], 405);
