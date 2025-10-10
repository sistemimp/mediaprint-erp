<?php

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AnagraficheRepository;
use MediaPrint\Service\AnagraficheService;

require __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

try {
    $service = new AnagraficheService(
        new AnagraficheRepository(Database::getConnection())
    );

    $result = $service->listArchived($_GET);
    HttpResponse::json($result, 200);
} catch (RuntimeException $exception) {
    HttpResponse::error($exception->getMessage(), 422);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}

