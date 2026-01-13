<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Backend\AuthGuard;
use PDO;

require __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

function safeCount(PDO $pdo, string $sql): int
{
    try {
        $stmt = $pdo->query($sql);
        return (int) ($stmt ? ($stmt->fetchColumn() ?: 0) : 0);
    } catch (Throwable) {
        return 0;
    }
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['prod.read']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        HttpResponse::json([
            'ok' => true,
            'kpi' => [
                'totale_prodotti' => 0,
                'prodotti_attivi' => 0,
                'prodotti_disattivi' => 0,
                'categorie' => 0,
                'variazioni' => 0,
                'prezzi_combinati' => 0,
            ],
            'top_categorie' => [],
            'latest' => [],
        ], 200);
        return;
    }

    $pdo = Database::getConnection();

    $totalProducts = safeCount($pdo, 'SELECT COUNT(*) FROM tb_prodotti');
    $activeProducts = safeCount($pdo, 'SELECT COUNT(*) FROM tb_prodotti WHERE attivo = 1');
    $inactiveProducts = safeCount($pdo, 'SELECT COUNT(*) FROM tb_prodotti WHERE attivo = 0');
    $categoriesCount = safeCount($pdo, 'SELECT COUNT(*) FROM tb_categorie');
    $variationsCount = safeCount($pdo, 'SELECT COUNT(*) FROM tb_variazioni');
    $comboCount = safeCount($pdo, 'SELECT COUNT(*) FROM tb_prezzi_variazioni');

    $topCategories = [];
    try {
        $stmt = $pdo->query(
            'SELECT c.id_categoria, c.nome, COUNT(p.id_prodotto) AS totale
             FROM tb_categorie c
             LEFT JOIN tb_prodotti p ON p.id_categoria = c.id_categoria
             GROUP BY c.id_categoria, c.nome
             ORDER BY totale DESC, c.nome ASC
             LIMIT 5'
        );
        $rows = $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
        foreach ($rows as $row) {
            $topCategories[] = [
                'id_categoria' => (int) $row['id_categoria'],
                'nome' => (string) $row['nome'],
                'totale' => (int) $row['totale'],
            ];
        }
    } catch (Throwable) {
        $topCategories = [];
    }

    $latest = [];
    try {
        $stmt = $pdo->query(
            'SELECT p.id_prodotto, p.nome, p.codice, p.attivo, c.nome AS categoria
             FROM tb_prodotti p
             LEFT JOIN tb_categorie c ON c.id_categoria = p.id_categoria
             ORDER BY p.id_prodotto DESC
             LIMIT 10'
        );
        $rows = $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
        foreach ($rows as $row) {
            $latest[] = [
                'id_prodotto' => (int) $row['id_prodotto'],
                'nome' => (string) $row['nome'],
                'codice' => $row['codice'] ?? null,
                'categoria' => $row['categoria'] ?? null,
                'attivo' => isset($row['attivo']) ? (int) $row['attivo'] : 0,
            ];
        }
    } catch (Throwable) {
        $latest = [];
    }

    HttpResponse::json([
        'ok' => true,
        'kpi' => [
            'totale_prodotti' => $totalProducts,
            'prodotti_attivi' => $activeProducts,
            'prodotti_disattivi' => $inactiveProducts,
            'categorie' => $categoriesCount,
            'variazioni' => $variationsCount,
            'prezzi_combinati' => $comboCount,
        ],
        'top_categorie' => $topCategories,
        'latest' => $latest,
    ], 200);
} catch (Throwable $exception) {
    $code = (int) ($exception->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error('Errore interno inatteso.', $code, ['error' => $exception->getMessage()]);
}
