<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use PDO;

final class InstantMessagingRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getAccountSummary(int $accountId): ?array
    {
        $sql = <<<SQL
            SELECT
                a.id_account,
                a.account_type,
                a.username,
                a.email,
                a.is_active,
                r.code AS role_code,
                r.label AS role_label
            FROM auth_accounts a
            LEFT JOIN cfg_auth_ruoli r ON r.id_ruolo = a.id_ruolo
            WHERE a.id_account = :id
            LIMIT 1
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listActiveAccountsExcept(int $excludeId): array
    {
        $sql = <<<SQL
            SELECT
                a.id_account,
                a.account_type,
                a.username,
                a.email,
                a.is_active,
                r.code AS role_code,
                r.label AS role_label
            FROM auth_accounts a
            LEFT JOIN cfg_auth_ruoli r ON r.id_ruolo = a.id_ruolo
            WHERE a.is_active = 1
              AND a.id_account <> :exclude
            ORDER BY r.label ASC, a.username ASC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':exclude', $excludeId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function findThreadByPairKey(string $pairKey): ?int
    {
        $stmt = $this->pdo->prepare('SELECT id_thread FROM im_threads WHERE pair_key = :pair LIMIT 1');
        $stmt->bindValue(':pair', $pairKey, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (int) $row['id_thread'] : null;
    }

    public function createThread(string $pairKey, int $createdBy): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO im_threads (pair_key, created_by) VALUES (:pair, :created)');
        $stmt->bindValue(':pair', $pairKey, PDO::PARAM_STR);
        $stmt->bindValue(':created', $createdBy, PDO::PARAM_INT);
        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @param list<int> $accountIds
     */
    public function addParticipants(int $threadId, array $accountIds): void
    {
        $stmt = $this->pdo->prepare('INSERT INTO im_participants (id_thread, id_account) VALUES (:thread, :account)');
        foreach ($accountIds as $accountId) {
            $stmt->bindValue(':thread', $threadId, PDO::PARAM_INT);
            $stmt->bindValue(':account', $accountId, PDO::PARAM_INT);
            $stmt->execute();
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listThreadsForAccount(int $accountId): array
    {
        $sql = <<<SQL
            SELECT
                t.id_thread,
                t.created_at,
                t.last_message_at,
                p_self.last_read_at,
                last_msg.id_message AS last_message_id,
                last_msg.body AS last_message_body,
                last_msg.created_at AS last_message_created_at,
                (
                    -- Unread lato utente corrente: solo messaggi altrui successivi all'ultimo read.
                    SELECT COUNT(*)
                    FROM im_messages unread
                    WHERE unread.id_thread = t.id_thread
                      AND unread.id_account <> :self_unread
                      AND unread.created_at > COALESCE(p_self.last_read_at, '1970-01-01 00:00:00')
                ) AS unread_count
            FROM im_participants p_self
            INNER JOIN im_threads t ON t.id_thread = p_self.id_thread
            LEFT JOIN im_messages last_msg ON last_msg.id_message = (
                SELECT id_message
                FROM im_messages m
                WHERE m.id_thread = t.id_thread
                ORDER BY m.created_at DESC, m.id_message DESC
                LIMIT 1
            )
            WHERE p_self.id_account = :self
            ORDER BY COALESCE(t.last_message_at, t.created_at) DESC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':self', $accountId, PDO::PARAM_INT);
        $stmt->bindValue(':self_unread', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @param list<int> $threadIds
     * @return array<int, list<array<string, mixed>>>
     */
    public function listParticipantsForThreads(array $threadIds, int $excludeAccountId): array
    {
        if ($threadIds === []) {
            return [];
        }
        $placeholders = [];
        $params = [];
        foreach (array_values($threadIds) as $index => $threadId) {
            $key = ':thread' . $index;
            $placeholders[] = $key;
            $params[$key] = $threadId;
        }
        $placeholderList = implode(',', $placeholders);

        $sql = <<<SQL
            SELECT
                p.id_thread,
                a.id_account,
                a.account_type,
                a.username,
                a.email,
                a.is_active,
                r.code AS role_code,
                r.label AS role_label
            FROM im_participants p
            INNER JOIN auth_accounts a ON a.id_account = p.id_account
            LEFT JOIN cfg_auth_ruoli r ON r.id_ruolo = a.id_ruolo
            WHERE p.id_thread IN ({$placeholderList})
              AND p.id_account <> :exclude
            ORDER BY r.label ASC, a.username ASC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_INT);
        }
        $stmt->bindValue(':exclude', $excludeAccountId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $grouped = [];
        foreach ($rows as $row) {
            $threadId = (int) ($row['id_thread'] ?? 0);
            if ($threadId <= 0) {
                continue;
            }
            if (!isset($grouped[$threadId])) {
                $grouped[$threadId] = [];
            }
            $grouped[$threadId][] = $row;
        }
        return $grouped;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listMessages(int $threadId, int $limit = 200, ?int $beforeId = null): array
    {
        // Cap lato backend per evitare payload eccessivi da query parametrica.
        $limit = max(1, min($limit, 500));
        $sql = <<<SQL
            SELECT
                m.id_message,
                m.id_thread,
                m.id_account,
                m.body,
                m.created_at,
                a.username AS sender_username,
                a.account_type AS sender_account_type,
                r.code AS sender_role_code,
                r.label AS sender_role_label
            FROM im_messages m
            INNER JOIN auth_accounts a ON a.id_account = m.id_account
            LEFT JOIN cfg_auth_ruoli r ON r.id_ruolo = a.id_ruolo
            WHERE m.id_thread = :thread
        SQL;

        $params = [':thread' => $threadId];

        if ($beforeId !== null && $beforeId > 0) {
            $sql .= ' AND m.id_message < :before';
            $params[':before'] = $beforeId;
        }

        $sql .= ' ORDER BY m.created_at ASC, m.id_message ASC LIMIT ' . (int) $limit;

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_INT);
        }
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getOtherParticipantsReadAt(int $threadId, int $accountId): ?string
    {
        $stmt = $this->pdo->prepare(
            'SELECT SUM(CASE WHEN last_read_at IS NULL THEN 1 ELSE 0 END) AS missing, MIN(last_read_at) AS min_read
             FROM im_participants
             WHERE id_thread = :thread AND id_account <> :account'
        );
        $stmt->bindValue(':thread', $threadId, PDO::PARAM_INT);
        $stmt->bindValue(':account', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $missing = isset($row['missing']) ? (int) $row['missing'] : 0;
        // Se anche un partecipante non ha letto nulla, il messaggio non puo' essere considerato "letto da tutti".
        if ($missing > 0) {
            return null;
        }
        $value = $row['min_read'] ?? null;
        return $value ? (string) $value : null;
    }

    public function isParticipant(int $threadId, int $accountId): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM im_participants WHERE id_thread = :thread AND id_account = :account LIMIT 1');
        $stmt->bindValue(':thread', $threadId, PDO::PARAM_INT);
        $stmt->bindValue(':account', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchColumn() !== false;
    }

    /**
     * @return list<int>
     */
    public function listThreadParticipants(int $threadId): array
    {
        $stmt = $this->pdo->prepare('SELECT id_account FROM im_participants WHERE id_thread = :thread');
        $stmt->bindValue(':thread', $threadId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $ids = [];
        foreach ($rows as $row) {
            if (isset($row['id_account'])) {
                $ids[] = (int) $row['id_account'];
            }
        }
        return array_values(array_unique(array_filter($ids, static fn(int $id): bool => $id > 0)));
    }

    public function insertMessage(int $threadId, int $accountId, string $body): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO im_messages (id_thread, id_account, body) VALUES (:thread, :account, :body)');
        $stmt->bindValue(':thread', $threadId, PDO::PARAM_INT);
        $stmt->bindValue(':account', $accountId, PDO::PARAM_INT);
        $stmt->bindValue(':body', $body, PDO::PARAM_STR);
        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }

    public function updateThreadLastMessageAt(int $threadId): void
    {
        $stmt = $this->pdo->prepare('UPDATE im_threads SET last_message_at = NOW() WHERE id_thread = :thread');
        $stmt->bindValue(':thread', $threadId, PDO::PARAM_INT);
        $stmt->execute();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getMessage(int $messageId): ?array
    {
        $sql = <<<SQL
            SELECT
                m.id_message,
                m.id_thread,
                m.id_account,
                m.body,
                m.created_at,
                a.username AS sender_username,
                a.account_type AS sender_account_type,
                r.code AS sender_role_code,
                r.label AS sender_role_label
            FROM im_messages m
            INNER JOIN auth_accounts a ON a.id_account = m.id_account
            LEFT JOIN cfg_auth_ruoli r ON r.id_ruolo = a.id_ruolo
            WHERE m.id_message = :id
            LIMIT 1
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $messageId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function markThreadRead(int $threadId, int $accountId): void
    {
        $stmt = $this->pdo->prepare('UPDATE im_participants SET last_read_at = NOW() WHERE id_thread = :thread AND id_account = :account');
        $stmt->bindValue(':thread', $threadId, PDO::PARAM_INT);
        $stmt->bindValue(':account', $accountId, PDO::PARAM_INT);
        $stmt->execute();
    }
}
