<?php

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use MediaPrint\Backend\Cors;

// CORS per tutti gli endpoint
Cors::handle();


function strStartsWith(string $haystack, string $needle): bool
{
    return $needle !== '' && strncmp($haystack, $needle, strlen($needle)) === 0;
}

function loadEnv(string $path): void
{
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === '' || strStartsWith($line, '#') || strStartsWith($line, ';')) {
            continue;
        }

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }

        [$name, $value] = $parts;
        $name = trim($name);
        $value = trim($value);

        if ($value !== '' && ($value[0] === '"' || $value[0] === '\'')) {
            $value = trim($value, '"\'');
        }

        putenv("{$name}={$value}");
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}

spl_autoload_register(static function (string $class): void {
    $baseDir = __DIR__ . '/src/';

    // MediaPrint\\Backend\\ maps to src/ (classes directly under src)
    $backendPrefix = 'MediaPrint\\Backend\\';
    if (strncmp($backendPrefix, $class, strlen($backendPrefix)) === 0) {
        $relative = substr($class, strlen($backendPrefix));
        $path = $baseDir . str_replace('\\', '/', $relative) . '.php';
        if (is_readable($path)) {
            require_once $path;
        }
        return;
    }

    // MediaPrint\\Service\\ maps to src/Service/
    $servicePrefix = 'MediaPrint\\Service\\';
    if (strncmp($servicePrefix, $class, strlen($servicePrefix)) === 0) {
        $relative = substr($class, strlen($servicePrefix));
        $path = $baseDir . 'Service/' . str_replace('\\', '/', $relative) . '.php';
        if (is_readable($path)) {
            require_once $path;
        }
        return;
    }

    // MediaPrint\\Repo\\ maps to src/Repositories/
    $repoPrefix = 'MediaPrint\\Repo\\';
    if (strncmp($repoPrefix, $class, strlen($repoPrefix)) === 0) {
        $relative = substr($class, strlen($repoPrefix));
        $path = $baseDir . 'Repositories/' . str_replace('\\', '/', $relative) . '.php';
        if (is_readable($path)) {
            require_once $path;
        }
        return;
    }
});

loadEnv(__DIR__ . '/.env');

$autoload = __DIR__ . '/vendor/autoload.php';
if (is_readable($autoload)) {
    require_once $autoload;
}
