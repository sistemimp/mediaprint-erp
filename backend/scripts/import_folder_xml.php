<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Service\FatturaXmlImporter;

require __DIR__ . '/../bootstrap.php';

$folder = getenv('MEDIAPRINT_SDI_IMPORT_PATH') ?: __DIR__ . '/../uploads/import_sdi';
$processed = $folder . '/processed';
$failed = $folder . '/failed';

foreach ([$folder, $processed, $failed] as $path) {
    if (!is_dir($path) && !mkdir($path, 0755, true)) {
        fwrite(STDERR, "Impossibile assicurare la cartella $path\n");
        exit(1);
    }
}

$files = array_filter(scandir($folder) ?: [], static fn ($file) => $file !== '.' && $file !== '..');
if ($files === []) {
    echo "Nessun file da importare in $folder\n";
    exit(0);
}

$pdo = Database::getConnection();
$importer = new FatturaXmlImporter($pdo);
$resultSummary = [];

foreach ($files as $file) {
    $fullPath = $folder . '/' . $file;
    if (!is_file($fullPath)) {
        continue;
    }

    $upload = [
        'name' => $file,
        'type' => mime_content_type($fullPath) ?: 'application/octet-stream',
        'tmp_name' => $fullPath,
        'error' => 0,
        'size' => filesize($fullPath) ?: 0,
    ];

    try {
        $payload = $importer->import($upload);
        $dest = $processed . '/' . $file;
        if (!@rename($fullPath, $dest)) {
            fwrite(STDERR, "Non posso spostare $file in processed\n");
        }
        $resultSummary[] = [
            'file' => $file,
            'status' => 'ok',
            'numero' => $payload['numero_documento_originale'] ?? null,
            'log' => $payload['log'] ?? null,
        ];
    } catch (RuntimeException $exception) {
        $dest = $failed . '/' . $file;
        if (!@rename($fullPath, $dest)) {
            fwrite(STDERR, "Non posso spostare $file in failed\n");
        }
        $resultSummary[] = [
            'file' => $file,
            'status' => 'failed',
            'reason' => $exception->getMessage(),
            'log' => $importer->getImportLogForUpload($upload),
        ];
    }
}

foreach ($resultSummary as $item) {
    echo json_encode($item, JSON_UNESCAPED_UNICODE) . PHP_EOL;
}
