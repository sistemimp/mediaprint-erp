<?php

namespace MediaPrint\Backend;

use PDO;
use PDOException;

final class Database
{
    private static ?PDO $instance = null;

    private function __construct()
    {
    }

    public static function getConnection(): PDO
    {
        if (self::$instance instanceof PDO) {
            return self::$instance;
        }

        $dsn = getenv('DB_DSN');
        if ($dsn === false || $dsn === '') {
            $host = getenv('DB_HOST') ?: '82.223.30.31';
            $port = getenv('DB_PORT') ?: '3306';
            $dbname = getenv('DB_NAME') ?: 'mediaprint_erp_v2';
            $charset = getenv('DB_CHARSET') ?: 'utf8mb4';
            $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $host, $port, $dbname, $charset);
        }

        $username = getenv('DB_USER') ?: getenv('DB_USERNAME') ?: 'mediaprint';
        $password = getenv('DB_PASSWORD') ?: 'M3d1aPr1ntDB@';

        try {
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            if (defined('PDO::MYSQL_ATTR_INIT_COMMAND')) {
                $options[PDO::MYSQL_ATTR_INIT_COMMAND] = "SET time_zone = '+00:00'";
            }

            $pdo = new PDO($dsn, $username, $password, $options);
        } catch (PDOException $exception) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Impossibile collegarsi al database',
                'error' => $exception->getMessage(),
            ]);
            exit;
        }

        self::$instance = $pdo;
        return self::$instance;
    }
}
