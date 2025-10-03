<?php

use MediaPrint\Backend\Cors;

require __DIR__ . '/../bootstrap.php';


 
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;

use MediaPrint\Repo\AuthRepository;

use MediaPrint\Service\AuthService;


// use RuntimeException;
// use Throwable;

if (!class_exists('Firebase\JWT\JWT')) {
    HttpResponse::error('Dipendenza firebase/php-jwt mancante. Esegui "composer install" nella cartella backend/.', 500);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo !== POST non consentito.', 405);
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody ?: '[]', true);

if (!is_array($payload)) {
    HttpResponse::error('Formato JSON non valido.', 400);
}

$identifier = (string) ($payload['identifier'] ?? $payload['email'] ?? $payload['username'] ?? '');
$password = (string) ($payload['password'] ?? '');

$authService = new AuthService(new AuthRepository(Database::getConnection()));

try {
    $result = $authService->login($identifier, $password);
    HttpResponse::json($result, 200);
} catch (RuntimeException $exception) {
    $message = $exception->getMessage();
    $status = 401;

    if ($message === 'Email/username e password sono obbligatori.') {
        $status = 422;
    } elseif ($message === 'Accesso non autorizzato per il tipo di account.') {
        $status = 403;
    }

    HttpResponse::error($message, $status);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
