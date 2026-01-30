<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use PDO;

final class TicketsRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * @param array{q?:?string,stato?:?string,priorita?:?string,assigned_to?:?int,created_by?:?int} $filters
     * @return list<array<string, mixed>>
     */
    public function listTickets(array $filters): array
    {
        $sql = <<<SQL
        SELECT
            t.id_ticket,
            t.titolo,
            t.stato,
            t.priorita,
            t.modulo,
            t.url,
            t.created_by,
            t.assigned_to,
            t.created_at,
            t.updated_at,
            t.closed_at,
            creator.username AS created_by_name,
            assignee.username AS assigned_to_name,
            (
                SELECT COUNT(*)
                FROM tb_bug_ticket_messages m
                WHERE m.id_ticket = t.id_ticket
            ) AS messages_count
        FROM tb_bug_tickets t
        LEFT JOIN auth_accounts creator ON creator.id_account = t.created_by
        LEFT JOIN auth_accounts assignee ON assignee.id_account = t.assigned_to
        WHERE 1=1
        SQL;

        $params = [];

        if (!empty($filters['q'])) {
            $sql .= ' AND (t.titolo LIKE :q OR t.descrizione LIKE :q OR t.modulo LIKE :q)';
            $params[':q'] = '%' . trim((string) $filters['q']) . '%';
        }
        if (!empty($filters['stato'])) {
            $sql .= ' AND t.stato = :stato';
            $params[':stato'] = (string) $filters['stato'];
        }
        if (!empty($filters['priorita'])) {
            $sql .= ' AND t.priorita = :priorita';
            $params[':priorita'] = (string) $filters['priorita'];
        }
        if (!empty($filters['assigned_to'])) {
            $sql .= ' AND t.assigned_to = :assigned_to';
            $params[':assigned_to'] = (int) $filters['assigned_to'];
        }
        if (!empty($filters['created_by'])) {
            $sql .= ' AND t.created_by = :created_by';
            $params[':created_by'] = (int) $filters['created_by'];
        }

        $sql .= ' ORDER BY t.updated_at DESC, t.id_ticket DESC LIMIT 200';

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $type = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $stmt->bindValue($key, $value, $type);
        }
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getTicket(int $idTicket): ?array
    {
        $sql = <<<SQL
        SELECT
            t.id_ticket,
            t.titolo,
            t.descrizione,
            t.stato,
            t.priorita,
            t.modulo,
            t.url,
            t.created_by,
            t.assigned_to,
            t.created_at,
            t.updated_at,
            t.closed_at,
            creator.username AS created_by_name,
            assignee.username AS assigned_to_name
        FROM tb_bug_tickets t
        LEFT JOIN auth_accounts creator ON creator.id_account = t.created_by
        LEFT JOIN auth_accounts assignee ON assignee.id_account = t.assigned_to
        WHERE t.id_ticket = :id
        LIMIT 1
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $idTicket, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listMessages(int $idTicket): array
    {
        $sql = <<<SQL
        SELECT
            m.id_message,
            m.message,
            m.created_by,
            m.created_at,
            acc.username AS created_by_name
        FROM tb_bug_ticket_messages m
        LEFT JOIN auth_accounts acc ON acc.id_account = m.created_by
        WHERE m.id_ticket = :id
        ORDER BY m.created_at ASC, m.id_message ASC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $idTicket, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @param array{titolo:string,descrizione:?string,stato:string,priorita:string,modulo:?string,url:?string,created_by:?int,assigned_to:?int} $data
     */
    public function createTicket(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO tb_bug_tickets (titolo, descrizione, stato, priorita, modulo, url, created_by, assigned_to, created_at, updated_at)
             VALUES (:titolo, :descrizione, :stato, :priorita, :modulo, :url, :created_by, :assigned_to, NOW(), NOW())'
        );
        $stmt->bindValue(':titolo', (string) $data['titolo'], PDO::PARAM_STR);
        $stmt->bindValue(':descrizione', $data['descrizione'] ?? null, ($data['descrizione'] ?? null) !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':stato', (string) $data['stato'], PDO::PARAM_STR);
        $stmt->bindValue(':priorita', (string) $data['priorita'], PDO::PARAM_STR);
        $stmt->bindValue(':modulo', $data['modulo'] ?? null, ($data['modulo'] ?? null) !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':url', $data['url'] ?? null, ($data['url'] ?? null) !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':created_by', $data['created_by'] ?? null, ($data['created_by'] ?? null) !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->bindValue(':assigned_to', $data['assigned_to'] ?? null, ($data['assigned_to'] ?? null) !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @param array{titolo:string,descrizione:?string,stato:string,priorita:string,modulo:?string,url:?string,assigned_to:?int,closed_at:?string} $data
     */
    public function updateTicket(int $idTicket, array $data): void
    {
        $closedAt = $data['closed_at'] ?? null;
        $closedSql = $closedAt === 'NOW' ? 'NOW()' : ':closed_at';

        $sql = <<<SQL
        UPDATE tb_bug_tickets
        SET
            titolo = :titolo,
            descrizione = :descrizione,
            stato = :stato,
            priorita = :priorita,
            modulo = :modulo,
            url = :url,
            assigned_to = :assigned_to,
            closed_at = {$closedSql},
            updated_at = NOW()
        WHERE id_ticket = :id
        LIMIT 1
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $idTicket, PDO::PARAM_INT);
        $stmt->bindValue(':titolo', (string) $data['titolo'], PDO::PARAM_STR);
        $stmt->bindValue(':descrizione', $data['descrizione'] ?? null, ($data['descrizione'] ?? null) !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':stato', (string) $data['stato'], PDO::PARAM_STR);
        $stmt->bindValue(':priorita', (string) $data['priorita'], PDO::PARAM_STR);
        $stmt->bindValue(':modulo', $data['modulo'] ?? null, ($data['modulo'] ?? null) !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':url', $data['url'] ?? null, ($data['url'] ?? null) !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':assigned_to', $data['assigned_to'] ?? null, ($data['assigned_to'] ?? null) !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        if ($closedAt !== 'NOW') {
            $stmt->bindValue(':closed_at', $closedAt, $closedAt !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        }
        $stmt->execute();
    }

    public function addMessage(int $idTicket, string $message, ?int $createdBy): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO tb_bug_ticket_messages (id_ticket, message, created_by, created_at) VALUES (:id_ticket, :message, :created_by, NOW())'
        );
        $stmt->bindValue(':id_ticket', $idTicket, PDO::PARAM_INT);
        $stmt->bindValue(':message', $message, PDO::PARAM_STR);
        $stmt->bindValue(':created_by', $createdBy, $createdBy !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->execute();

        $touch = $this->pdo->prepare('UPDATE tb_bug_tickets SET updated_at = NOW() WHERE id_ticket = :id LIMIT 1');
        $touch->bindValue(':id', $idTicket, PDO::PARAM_INT);
        $touch->execute();

        return (int) $this->pdo->lastInsertId();
    }
}
