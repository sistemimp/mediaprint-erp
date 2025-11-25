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
    $prefixes = [
        'MediaPrint\\Backend\\' => __DIR__ . '/src/',
        'MediaPrint\\Repo\\' => __DIR__ . '/src/Repositories/',
    ];

    foreach ($prefixes as $prefix => $baseDir) {
        if (strncmp($prefix, $class, strlen($prefix)) !== 0) {
            continue;
        }

        $relative = substr($class, strlen($prefix));
        $path = $baseDir . str_replace('\\', '/', $relative) . '.php';

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
