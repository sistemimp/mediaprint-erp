<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use PDO;
use PDOException;

final class TicketsRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * @param array{q?:?string,stato?:?string,priorita?:?string,assigned_to?:?int,created_by?:?int,modulo?:?string,exclude_modulo?:?string,visible_to_account?:?int} $filters
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
        if (!empty($filters['modulo'])) {
            $sql .= ' AND t.modulo = :modulo';
            $params[':modulo'] = trim((string) $filters['modulo']);
        }
        if (!empty($filters['exclude_modulo'])) {
            $sql .= ' AND (t.modulo IS NULL OR t.modulo <> :exclude_modulo)';
            $params[':exclude_modulo'] = trim((string) $filters['exclude_modulo']);
        }
        if (!empty($filters['visible_to_account'])) {
            $visibleId = (int) $filters['visible_to_account'];
            $sql .= ' AND (t.created_by = :visible_to_account_created OR t.assigned_to = :visible_to_account_assigned';
            $params[':visible_to_account_created'] = $visibleId;
            $params[':visible_to_account_assigned'] = $visibleId;

            if ($this->ticketAssigneesTableExists()) {
                $sql .= ' OR EXISTS (
                    SELECT 1
                    FROM tb_bug_ticket_assignees ta
                    WHERE ta.id_ticket = t.id_ticket
                      AND ta.id_account = :visible_to_account_multi
                )';
                $params[':visible_to_account_multi'] = $visibleId;
            }
            $sql .= ')';
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

    public function setPrimaryAssignee(int $idTicket, ?int $assignedTo): void
    {
        $stmt = $this->pdo->prepare('UPDATE tb_bug_tickets SET assigned_to = :assigned_to, updated_at = NOW() WHERE id_ticket = :id LIMIT 1');
        $stmt->bindValue(':id', $idTicket, PDO::PARAM_INT);
        $stmt->bindValue(':assigned_to', $assignedTo, $assignedTo !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->execute();
    }

    /**
     * @param list<int> $accountIds
     */
    public function replaceTicketAssignees(int $idTicket, array $accountIds): void
    {
        $unique = [];
        foreach ($accountIds as $id) {
            $n = (int) $id;
            if ($n > 0) {
                $unique[$n] = $n;
            }
        }
        $values = array_values($unique);
        $primary = $values[0] ?? null;

        try {
            $this->pdo->beginTransaction();

            $delete = $this->pdo->prepare('DELETE FROM tb_bug_ticket_assignees WHERE id_ticket = :id_ticket');
            $delete->bindValue(':id_ticket', $idTicket, PDO::PARAM_INT);
            $delete->execute();

            if ($values !== []) {
                $insert = $this->pdo->prepare(
                    'INSERT INTO tb_bug_ticket_assignees (id_ticket, id_account, created_at)
                     VALUES (:id_ticket, :id_account, NOW())'
                );
                foreach ($values as $idAccount) {
                    $insert->bindValue(':id_ticket', $idTicket, PDO::PARAM_INT);
                    $insert->bindValue(':id_account', $idAccount, PDO::PARAM_INT);
                    $insert->execute();
                }
            }

            $this->setPrimaryAssignee($idTicket, $primary);
            $this->pdo->commit();
        } catch (PDOException $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            // Fallback compatibile prima della migration.
            $this->setPrimaryAssignee($idTicket, $primary);
        }
    }

    /**
     * @return list<array{id_account:int,username:string}>
     */
    public function listTicketAssignees(int $idTicket): array
    {
        try {
            $sql = <<<SQL
            SELECT a.id_account, a.username
            FROM tb_bug_ticket_assignees ta
            INNER JOIN auth_accounts a ON a.id_account = ta.id_account
            WHERE ta.id_ticket = :id_ticket
            ORDER BY a.username ASC, a.id_account ASC
            SQL;
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id_ticket', $idTicket, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            return array_map(
                static fn(array $row): array => [
                    'id_account' => (int) ($row['id_account'] ?? 0),
                    'username' => (string) ($row['username'] ?? ''),
                ],
                $rows
            );
        } catch (PDOException $_exception) {
            $ticket = $this->getTicket($idTicket);
            $id = isset($ticket['assigned_to']) ? (int) $ticket['assigned_to'] : 0;
            $name = isset($ticket['assigned_to_name']) ? (string) $ticket['assigned_to_name'] : '';
            if ($id <= 0) {
                return [];
            }
            return [['id_account' => $id, 'username' => $name]];
        }
    }

    public function isAccountAssignedToTicket(int $idTicket, int $idAccount): bool
    {
        if ($idTicket <= 0 || $idAccount <= 0) {
            return false;
        }

        try {
            $stmt = $this->pdo->prepare(
                'SELECT 1 FROM tb_bug_ticket_assignees WHERE id_ticket = :id_ticket AND id_account = :id_account LIMIT 1'
            );
            $stmt->bindValue(':id_ticket', $idTicket, PDO::PARAM_INT);
            $stmt->bindValue(':id_account', $idAccount, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetchColumn() !== false;
        } catch (PDOException $_exception) {
            $ticket = $this->getTicket($idTicket);
            if ($ticket === null) {
                return false;
            }
            return isset($ticket['assigned_to']) && (int) $ticket['assigned_to'] === $idAccount;
        }
    }

    private function ticketAssigneesTableExists(): bool
    {
        try {
            $stmt = $this->pdo->query("SHOW TABLES LIKE 'tb_bug_ticket_assignees'");
            return $stmt !== false && $stmt->fetchColumn() !== false;
        } catch (PDOException $_exception) {
            return false;
        }
    }

    public function isModulo(int $idTicket, string $modulo): bool
    {
        $stmt = $this->pdo->prepare('SELECT modulo FROM tb_bug_tickets WHERE id_ticket = :id LIMIT 1');
        $stmt->bindValue(':id', $idTicket, PDO::PARAM_INT);
        $stmt->execute();
        $value = $stmt->fetchColumn();
        return is_string($value) && $value === $modulo;
    }

    public function preventivoExistsAndIsAcquisto(int $idPreventivo): bool
    {
        $stmt = $this->pdo->prepare('SELECT is_acquisto FROM tb_preventivi WHERE id_preventivo = :id LIMIT 1');
        $stmt->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            return false;
        }
        return (int) ($row['is_acquisto'] ?? 0) === 1;
    }

    public function linkAcquistiPreventivo(int $idTicket, int $idPreventivo, ?int $createdBy): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT IGNORE INTO tb_bug_ticket_preventivi_acquisto (id_ticket, id_preventivo, created_by, created_at)
             VALUES (:id_ticket, :id_preventivo, :created_by, NOW())'
        );
        $stmt->bindValue(':id_ticket', $idTicket, PDO::PARAM_INT);
        $stmt->bindValue(':id_preventivo', $idPreventivo, PDO::PARAM_INT);
        $stmt->bindValue(':created_by', $createdBy, $createdBy !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->execute();
    }

    public function unlinkAcquistiPreventivo(int $idTicket, int $idPreventivo): void
    {
        $stmt = $this->pdo->prepare(
            'DELETE FROM tb_bug_ticket_preventivi_acquisto WHERE id_ticket = :id_ticket AND id_preventivo = :id_preventivo LIMIT 1'
        );
        $stmt->bindValue(':id_ticket', $idTicket, PDO::PARAM_INT);
        $stmt->bindValue(':id_preventivo', $idPreventivo, PDO::PARAM_INT);
        $stmt->execute();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listAcquistiPreventiviLinks(int $idTicket): array
    {
        $sql = <<<SQL
        SELECT
            l.id_preventivo,
            l.created_at AS linked_at,
            l.created_by AS linked_by,
            acc.username AS linked_by_name,
            p.numero_documento,
            p.anno_preventivo,
            p.data_preventivo,
            p.totale,
            p.id_stato_prev,
            sp.label AS stato_label,
            a.ragione_sociale
        FROM tb_bug_ticket_preventivi_acquisto l
        INNER JOIN tb_preventivi p ON p.id_preventivo = l.id_preventivo
        LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = p.id_anagrafica
        LEFT JOIN cfg_stati_preventivo sp ON sp.id_stato = p.id_stato_prev
        LEFT JOIN auth_accounts acc ON acc.id_account = l.created_by
        WHERE l.id_ticket = :id_ticket
        ORDER BY l.created_at DESC, l.id_preventivo DESC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id_ticket', $idTicket, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}
