<?php
declare(strict_types=1);

use MediaPrint\Backend\HttpResponse;

require __DIR__ . '/../bootstrap.php';

$origin = getenv('WEB_AUTHN_ORIGIN') ?: ((isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'https') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
$rpId = getenv('WEB_AUTHN_RP_ID') ?: ($_SERVER['HTTP_HOST'] ?? 'localhost');

HttpResponse::json([
    'origin' => $origin,
    'rpId' => $rpId,
], 200);
