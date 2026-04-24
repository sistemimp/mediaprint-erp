<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use PDO;

final class ReleaseNotesRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function listNotes(): array
    {
        $sql = <<<SQL
        SELECT
            n.id_note,
            n.titolo,
            n.versione,
            n.contenuto,
            n.created_at,
            acc.username AS created_by_name
        FROM tb_release_notes n
        LEFT JOIN auth_accounts acc ON acc.id_account = n.created_by
        ORDER BY n.created_at DESC, n.id_note DESC
        LIMIT 200
        SQL;
        // Limite difensivo per mantenere leggera la timeline iniziale.

        $stmt = $this->pdo->query($sql);
        return $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    }

    public function createNote(string $titolo, ?string $versione, string $contenuto, ?int $createdBy): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO tb_release_notes (titolo, versione, contenuto, created_by, created_at) VALUES (:titolo, :versione, :contenuto, :created_by, NOW())'
        );
        $stmt->bindValue(':titolo', $titolo, PDO::PARAM_STR);
        $stmt->bindValue(':versione', $versione, $versione !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':contenuto', $contenuto, PDO::PARAM_STR);
        $stmt->bindValue(':created_by', $createdBy, $createdBy !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }
}
