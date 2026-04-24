<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;
use PDO;

final class CrmEmailRepository
{
    public function __construct(private readonly PDO $pdo)
    {
        $this->ensureSchema();
    }

    /**
     * @param list<array<string,mixed>> $items
     */
    public function syncEmails(array $items): void
    {
        if ($items === []) {
            return;
        }

        $allEmails = [];
        foreach ($items as $item) {
            foreach ($this->normalizeEmailList($item['sender_emails'] ?? []) as $email) {
                $allEmails[] = $email;
            }
            foreach ($this->normalizeEmailList($item['recipient_emails'] ?? []) as $email) {
                $allEmails[] = $email;
            }
        }
        $allEmails = array_values(array_unique($allEmails));
        $matchesByEmail = $this->findAnagraficheByContactEmails($allEmails);
        $accountsByEmail = $this->findAccountsByEmails($allEmails);

        foreach ($items as $item) {
            $idEmail = $this->upsertEmail($item);
            $senderEmails = $this->normalizeEmailList($item['sender_emails'] ?? []);
            $recipientEmails = $this->normalizeEmailList($item['recipient_emails'] ?? []);
            $this->replaceLinks($idEmail, $senderEmails, $recipientEmails, $matchesByEmail, $accountsByEmail);
        }
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listByToday(DateTimeZone $timezone, int $limit = 100): array
    {
        $maxItems = max(1, min($limit, 300));
        $todayStart = new DateTimeImmutable('today', $timezone);
        $todayEnd = $todayStart->setTime(23, 59, 59);
        $utc = new DateTimeZone('UTC');
        $startUtc = $todayStart->setTimezone($utc)->format('Y-m-d H:i:s');
        $endUtc = $todayEnd->setTimezone($utc)->format('Y-m-d H:i:s');

        $sql = <<<SQL
            SELECT
                e.id_email,
                e.source_index,
                e.message_id,
                e.message_uid,
                e.conversation_key,
                e.from_raw,
                e.recipients_raw,
                e.subject,
                e.message_text,
                e.message_html,
                e.attachments_json,
                e.sender_emails_json,
                e.recipient_emails_json,
                e.message_date_utc,
                e.size_bytes
            FROM tb_crm_email_inbox e
            WHERE e.message_date_utc BETWEEN :start_utc AND :end_utc
            ORDER BY e.message_date_utc DESC, e.id_email DESC
            LIMIT {$maxItems}
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':start_utc', $startUtc, PDO::PARAM_STR);
        $stmt->bindValue(':end_utc', $endUtc, PDO::PARAM_STR);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return $this->hydrateInboxRows($rows, $timezone);
    }

    /**
     * @return array{items:list<array<string,mixed>>,count:int,page:int,page_size:int}
     */
    public function searchArchive(
        DateTimeZone $timezone,
        string $sender = '',
        string $subject = '',
        string $anagrafica = '',
        int $page = 1,
        int $pageSize = 100,
        string $conversationKey = ''
    ): array
    {
        $currentPage = max(1, $page);
        $maxItems = max(1, min($pageSize, 200));
        $offset = ($currentPage - 1) * $maxItems;

        $conditions = ['1=1'];
        $params = [];

        $subjectFilter = trim($subject);
        if ($subjectFilter !== '') {
            $conditions[] = 'LOWER(COALESCE(e.subject, \'\')) LIKE :subject_filter';
            $params[':subject_filter'] = '%' . strtolower($subjectFilter) . '%';
        }

        $senderFilter = trim($sender);
        if ($senderFilter !== '') {
            $conditions[] = <<<SQL
                (
                    LOWER(COALESCE(e.from_raw, '')) LIKE :sender_filter_from
                    OR EXISTS (
                        SELECT 1
                        FROM tb_crm_email_links ls
                        WHERE ls.id_email = e.id_email
                          AND ls.link_type = 'sender'
                          AND LOWER(COALESCE(ls.email_address, '')) LIKE :sender_filter_link
                    )
                )
            SQL;
            $senderPattern = '%' . strtolower($senderFilter) . '%';
            $params[':sender_filter_from'] = $senderPattern;
            $params[':sender_filter_link'] = $senderPattern;
        }

        $anagraficaFilter = trim($anagrafica);
        if ($anagraficaFilter !== '') {
            if (ctype_digit($anagraficaFilter)) {
                $conditions[] = <<<SQL
                    EXISTS (
                        SELECT 1
                        FROM tb_crm_email_links la
                        WHERE la.id_email = e.id_email
                          AND la.id_anagrafica = :anagrafica_id
                    )
                SQL;
                $params[':anagrafica_id'] = (int) $anagraficaFilter;
            } else {
                $conditions[] = <<<SQL
                    EXISTS (
                        SELECT 1
                        FROM tb_crm_email_links la
                        INNER JOIN tb_anagrafiche aa ON aa.id_anagrafica = la.id_anagrafica
                        WHERE la.id_email = e.id_email
                          AND LOWER(COALESCE(aa.ragione_sociale, '')) LIKE :anagrafica_name
                    )
                SQL;
                $params[':anagrafica_name'] = '%' . strtolower($anagraficaFilter) . '%';
            }
        }

        $conversationFilter = trim($conversationKey);
        if ($conversationFilter !== '') {
            $conditions[] = 'LOWER(COALESCE(e.conversation_key, \'\')) = :conversation_key';
            $params[':conversation_key'] = strtolower($conversationFilter);
        }

        $whereSql = implode("\nAND ", $conditions);

        $countSql = <<<SQL
            SELECT COUNT(*) AS total_rows
            FROM tb_crm_email_inbox e
            WHERE $whereSql
        SQL;
        $countStmt = $this->pdo->prepare($countSql);
        foreach ($params as $key => $value) {
            $countStmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $countStmt->execute();
        $totalRows = (int) ($countStmt->fetchColumn() ?: 0);

        $sql = <<<SQL
            SELECT
                e.id_email,
                e.source_index,
                e.message_id,
                e.message_uid,
                e.conversation_key,
                e.from_raw,
                e.recipients_raw,
                e.subject,
                e.message_text,
                e.message_html,
                e.attachments_json,
                e.sender_emails_json,
                e.recipient_emails_json,
                e.message_date_utc,
                e.size_bytes
            FROM tb_crm_email_inbox e
            WHERE $whereSql
            ORDER BY e.message_date_utc DESC, e.id_email DESC
            LIMIT {$maxItems} OFFSET {$offset}
        SQL;
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return [
            'items' => $this->hydrateInboxRows($rows, $timezone),
            'count' => $totalRows,
            'page' => $currentPage,
            'page_size' => $maxItems,
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findEmailById(int $idEmail): ?array
    {
        if ($idEmail <= 0) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT id_email, source_index, message_id, attachments_json
             FROM tb_crm_email_inbox
             WHERE id_email = :id_email
             LIMIT 1'
        );
        $stmt->bindValue(':id_email', $idEmail, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            return null;
        }
        $row['attachments'] = $this->decodeJsonStringList((string) ($row['attachments_json'] ?? ''));
        return $row;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findEmailDetailById(DateTimeZone $timezone, int $idEmail): ?array
    {
        if ($idEmail <= 0) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT
                e.id_email,
                e.source_index,
                e.message_id,
                e.message_uid,
                e.conversation_key,
                e.from_raw,
                e.recipients_raw,
                e.subject,
                e.message_text,
                e.message_html,
                e.attachments_json,
                e.sender_emails_json,
                e.recipient_emails_json,
                e.message_date_utc,
                e.size_bytes
             FROM tb_crm_email_inbox e
             WHERE e.id_email = :id_email
             LIMIT 1'
        );
        $stmt->bindValue(':id_email', $idEmail, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            return null;
        }

        $items = $this->hydrateInboxRows([$row], $timezone);
        if ($items === []) {
            return null;
        }
        $item = $items[0];
        $item['tickets'] = $this->listTicketsByEmailId($idEmail);
        return $item;
    }

    public function linkEmailToTicket(int $idEmail, int $idTicket, ?string $sectionType = null, ?int $sectionId = null): void
    {
        if ($idEmail <= 0 || $idTicket <= 0) {
            throw new \RuntimeException('Parametri collegamento ticket non validi.');
        }

        $emailExistsStmt = $this->pdo->prepare(
            'SELECT 1 FROM tb_crm_email_inbox WHERE id_email = :id_email LIMIT 1'
        );
        $emailExistsStmt->bindValue(':id_email', $idEmail, PDO::PARAM_INT);
        $emailExistsStmt->execute();
        if ($emailExistsStmt->fetchColumn() === false) {
            throw new \RuntimeException('Email non trovata.');
        }

        $ticketExistsStmt = $this->pdo->prepare(
            'SELECT 1 FROM tb_bug_tickets WHERE id_ticket = :id_ticket LIMIT 1'
        );
        $ticketExistsStmt->bindValue(':id_ticket', $idTicket, PDO::PARAM_INT);
        $ticketExistsStmt->execute();
        if ($ticketExistsStmt->fetchColumn() === false) {
            throw new \RuntimeException('Ticket non trovato.');
        }

        $insertStmt = $this->pdo->prepare(
            'INSERT IGNORE INTO tb_crm_email_ticket_links (id_email, id_ticket, created_at)
             VALUES (:id_email, :id_ticket, NOW())'
        );
        $insertStmt->bindValue(':id_email', $idEmail, PDO::PARAM_INT);
        $insertStmt->bindValue(':id_ticket', $idTicket, PDO::PARAM_INT);
        $insertStmt->execute();

        if ($sectionType !== null && trim($sectionType) !== '') {
            $this->updateTicketSectionLink($idTicket, $sectionType, $sectionId);
        }
    }

    public function linkEmailToAnagrafica(int $idEmail, int $idAnagrafica): void
    {
        if ($idEmail <= 0 || $idAnagrafica <= 0) {
            throw new \RuntimeException('Parametri di collegamento non validi.');
        }

        $emailExistsStmt = $this->pdo->prepare(
            'SELECT 1 FROM tb_crm_email_inbox WHERE id_email = :id_email LIMIT 1'
        );
        $emailExistsStmt->bindValue(':id_email', $idEmail, PDO::PARAM_INT);
        $emailExistsStmt->execute();
        if ($emailExistsStmt->fetchColumn() === false) {
            throw new \RuntimeException('Email non trovata.');
        }

        $anagExistsStmt = $this->pdo->prepare(
            'SELECT 1 FROM tb_anagrafiche WHERE id_anagrafica = :id_anagrafica AND is_active = 1 LIMIT 1'
        );
        $anagExistsStmt->bindValue(':id_anagrafica', $idAnagrafica, PDO::PARAM_INT);
        $anagExistsStmt->execute();
        if ($anagExistsStmt->fetchColumn() === false) {
            throw new \RuntimeException('Anagrafica non valida o non attiva.');
        }

        $existingStmt = $this->pdo->prepare(
            'SELECT 1
             FROM tb_crm_email_links
             WHERE id_email = :id_email
               AND id_anagrafica = :id_anagrafica
             LIMIT 1'
        );
        $existingStmt->bindValue(':id_email', $idEmail, PDO::PARAM_INT);
        $existingStmt->bindValue(':id_anagrafica', $idAnagrafica, PDO::PARAM_INT);
        $existingStmt->execute();
        if ($existingStmt->fetchColumn() !== false) {
            return;
        }

        $insertStmt = $this->pdo->prepare(
            'INSERT INTO tb_crm_email_links
                (id_email, link_type, email_address, id_account, id_contatto, id_anagrafica)
             VALUES
                (:id_email, :link_type, :email_address, :id_account, :id_contatto, :id_anagrafica)'
        );
        $insertStmt->bindValue(':id_email', $idEmail, PDO::PARAM_INT);
        $insertStmt->bindValue(':link_type', 'manual', PDO::PARAM_STR);
        $insertStmt->bindValue(':email_address', 'manual-link', PDO::PARAM_STR);
        $insertStmt->bindValue(':id_account', null, PDO::PARAM_NULL);
        $insertStmt->bindValue(':id_contatto', null, PDO::PARAM_NULL);
        $insertStmt->bindValue(':id_anagrafica', $idAnagrafica, PDO::PARAM_INT);
        $insertStmt->execute();
    }

    private function ensureSchema(): void
    {
        $this->pdo->exec(
            "CREATE TABLE IF NOT EXISTS tb_crm_email_inbox (
                id_email BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                message_uid CHAR(64) NOT NULL,
                message_id VARCHAR(255) NULL,
                conversation_key VARCHAR(255) NULL,
                source_index INT NULL,
                from_raw TEXT NULL,
                recipients_raw TEXT NULL,
                subject VARCHAR(500) NULL,
                message_text LONGTEXT NULL,
                message_html LONGTEXT NULL,
                attachments_json LONGTEXT NULL,
                sender_emails_json LONGTEXT NULL,
                recipient_emails_json LONGTEXT NULL,
                message_date_utc DATETIME NULL,
                size_bytes INT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_email),
                UNIQUE KEY uq_crm_email_uid (message_uid),
                KEY idx_crm_email_message_id (message_id),
                KEY idx_crm_email_conversation_key (conversation_key),
                KEY idx_crm_email_message_date (message_date_utc)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->pdo->exec(
            "CREATE TABLE IF NOT EXISTS tb_crm_email_links (
                id_link BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                id_email BIGINT UNSIGNED NOT NULL,
                link_type VARCHAR(16) NOT NULL,
                email_address VARCHAR(320) NOT NULL,
                id_account INT NULL,
                id_contatto INT NULL,
                id_anagrafica INT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_link),
                UNIQUE KEY uq_crm_email_link (id_email, link_type, email_address, id_account, id_contatto, id_anagrafica),
                KEY idx_crm_email_link_email (id_email),
                KEY idx_crm_email_link_account (id_account),
                KEY idx_crm_email_link_contatto (id_contatto),
                KEY idx_crm_email_link_anagrafica (id_anagrafica)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->ensureInboxMessageTextColumn();
        $this->ensureInboxMessageHtmlColumn();
        $this->ensureInboxAttachmentsColumn();
        $this->ensureInboxConversationKeyColumn();
        $this->ensureLinksAccountColumn();
        $this->ensureLinksIndexes();
        $this->ensureEmailTicketLinksTable();
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function listTicketsByEmailId(int $idEmail): array
    {
        if ($idEmail <= 0) {
            return [];
        }

        $sql = <<<SQL
            SELECT
                t.id_ticket,
                t.titolo,
                t.stato,
                t.priorita,
                t.modulo,
                t.url,
                t.updated_at
            FROM tb_crm_email_ticket_links l
            INNER JOIN tb_bug_tickets t ON t.id_ticket = l.id_ticket
            WHERE l.id_email = :id_email
            ORDER BY t.updated_at DESC, t.id_ticket DESC
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id_email', $idEmail, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function ensureEmailTicketLinksTable(): void
    {
        $this->pdo->exec(
            "CREATE TABLE IF NOT EXISTS tb_crm_email_ticket_links (
                id_link BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                id_email BIGINT UNSIGNED NOT NULL,
                id_ticket INT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_link),
                UNIQUE KEY uq_crm_email_ticket (id_email, id_ticket),
                KEY idx_crm_email_ticket_email (id_email),
                KEY idx_crm_email_ticket_ticket (id_ticket)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
    }

    private function updateTicketSectionLink(int $idTicket, string $sectionType, ?int $sectionId): void
    {
        $type = strtolower(trim($sectionType));
        if (!in_array($type, ['preventivo', 'lavorazione', 'fattura'], true)) {
            throw new \RuntimeException('Sezione gestionale non valida.');
        }
        $targetId = $sectionId ?? 0;
        if ($targetId <= 0) {
            throw new \RuntimeException('ID sezione gestionale non valido.');
        }

        $table = '';
        $idColumn = '';
        $modulo = '';
        $url = '';

        if ($type === 'preventivo') {
            $table = 'tb_preventivi';
            $idColumn = 'id_preventivo';
            $modulo = 'preventivi';
            $url = '/preventivi/dettagli?id=' . $targetId;
        } elseif ($type === 'lavorazione') {
            $table = 'tb_lavorazioni';
            $idColumn = 'id_lavorazione';
            $modulo = 'lavorazioni';
            $url = '/lavorazioni/dettaglio?id=' . $targetId;
        } else {
            $table = 'tb_fatture';
            $idColumn = 'id_fattura';
            $modulo = 'fatture';
            $url = '/fatture/dettagli?id=' . $targetId;
        }

        $existsStmt = $this->pdo->prepare(sprintf('SELECT 1 FROM %s WHERE %s = :id LIMIT 1', $table, $idColumn));
        $existsStmt->bindValue(':id', $targetId, PDO::PARAM_INT);
        $existsStmt->execute();
        if ($existsStmt->fetchColumn() === false) {
            throw new \RuntimeException('Record sezione gestionale non trovato.');
        }

        $updateStmt = $this->pdo->prepare(
            'UPDATE tb_bug_tickets
             SET modulo = :modulo, url = :url, updated_at = NOW()
             WHERE id_ticket = :id_ticket
             LIMIT 1'
        );
        $updateStmt->bindValue(':modulo', $modulo, PDO::PARAM_STR);
        $updateStmt->bindValue(':url', $url, PDO::PARAM_STR);
        $updateStmt->bindValue(':id_ticket', $idTicket, PDO::PARAM_INT);
        $updateStmt->execute();
    }

    /**
     * @param array<string,mixed> $item
     */
    private function upsertEmail(array $item): int
    {
        $messageId = trim((string) ($item['message_id'] ?? ''));
        $conversationKey = trim((string) ($item['conversation_key'] ?? ''));
        $messageUid = $this->buildMessageUid($item, $messageId);
        $sourceIndex = isset($item['index']) ? (int) $item['index'] : null;
        $fromRaw = (string) ($item['from'] ?? '');
        $recipientsRaw = (string) ($item['recipients'] ?? '');
        $subject = trim((string) ($item['subject'] ?? ''));
        if ($subject === '') {
            $subject = null;
        }
        $messageText = trim((string) ($item['message_text'] ?? ''));
        if ($messageText === '') {
            $messageText = null;
        }
        $messageHtml = trim((string) ($item['message_html'] ?? ''));
        if ($messageHtml === '') {
            $messageHtml = null;
        }
        $attachments = $this->normalizeAttachmentList($item['attachments'] ?? []);
        $senderEmails = $this->normalizeEmailList($item['sender_emails'] ?? []);
        $recipientEmails = $this->normalizeEmailList($item['recipient_emails'] ?? []);
        $sizeBytes = isset($item['size_bytes']) ? (int) $item['size_bytes'] : null;
        $messageDateUtc = $this->normalizeDateUtc($item['date_iso'] ?? null);

        $sql = <<<SQL
            INSERT INTO tb_crm_email_inbox (
                message_uid,
                message_id,
                conversation_key,
                source_index,
                from_raw,
                recipients_raw,
                subject,
                message_text,
                message_html,
                attachments_json,
                sender_emails_json,
                recipient_emails_json,
                message_date_utc,
                size_bytes
            ) VALUES (
                :message_uid,
                :message_id,
                :conversation_key,
                :source_index,
                :from_raw,
                :recipients_raw,
                :subject,
                :message_text,
                :message_html,
                :attachments_json,
                :sender_emails_json,
                :recipient_emails_json,
                :message_date_utc,
                :size_bytes
            )
            ON DUPLICATE KEY UPDATE
                id_email = LAST_INSERT_ID(id_email),
                message_id = VALUES(message_id),
                conversation_key = VALUES(conversation_key),
                source_index = VALUES(source_index),
                from_raw = VALUES(from_raw),
                recipients_raw = VALUES(recipients_raw),
                subject = VALUES(subject),
                message_text = VALUES(message_text),
                message_html = VALUES(message_html),
                attachments_json = VALUES(attachments_json),
                sender_emails_json = VALUES(sender_emails_json),
                recipient_emails_json = VALUES(recipient_emails_json),
                message_date_utc = VALUES(message_date_utc),
                size_bytes = VALUES(size_bytes),
                updated_at = CURRENT_TIMESTAMP
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':message_uid', $messageUid, PDO::PARAM_STR);
        $stmt->bindValue(':message_id', $messageId !== '' ? $messageId : null, $messageId !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':conversation_key', $conversationKey !== '' ? $conversationKey : null, $conversationKey !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':source_index', $sourceIndex, $sourceIndex !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->bindValue(':from_raw', $fromRaw !== '' ? $fromRaw : null, $fromRaw !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':recipients_raw', $recipientsRaw !== '' ? $recipientsRaw : null, $recipientsRaw !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':subject', $subject, $subject !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':message_text', $messageText, $messageText !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':message_html', $messageHtml, $messageHtml !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':attachments_json', json_encode($attachments), PDO::PARAM_STR);
        $stmt->bindValue(':sender_emails_json', json_encode($senderEmails), PDO::PARAM_STR);
        $stmt->bindValue(':recipient_emails_json', json_encode($recipientEmails), PDO::PARAM_STR);
        $stmt->bindValue(':message_date_utc', $messageDateUtc, $messageDateUtc !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':size_bytes', $sizeBytes, $sizeBytes !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->execute();

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @param list<string> $senderEmails
     * @param list<string> $recipientEmails
     * @param array<string, list<array{id_anagrafica:int,ragione_sociale:string,email:string,id_contatto:int|null,nome_contatto:string|null}>> $matchesByEmail
     * @param array<string, list<array{id_account:int,username:string,email:string,account_type:string,is_active:int}>> $accountsByEmail
     */
    private function replaceLinks(int $idEmail, array $senderEmails, array $recipientEmails, array $matchesByEmail, array $accountsByEmail): void
    {
        $delete = $this->pdo->prepare('DELETE FROM tb_crm_email_links WHERE id_email = :id_email');
        $delete->bindValue(':id_email', $idEmail, PDO::PARAM_INT);
        $delete->execute();

        $insert = $this->pdo->prepare(
            'INSERT IGNORE INTO tb_crm_email_links (id_email, link_type, email_address, id_account, id_contatto, id_anagrafica)
             VALUES (:id_email, :link_type, :email_address, :id_account, :id_contatto, :id_anagrafica)'
        );

        $insertEmailLinks = function (string $linkType, array $emails) use ($idEmail, $matchesByEmail, $accountsByEmail, $insert): void {
            foreach ($emails as $email) {
                $matches = $matchesByEmail[$email] ?? [];
                $accounts = $accountsByEmail[$email] ?? [];
                if ($matches === []) {
                    $insert->bindValue(':id_email', $idEmail, PDO::PARAM_INT);
                    $insert->bindValue(':link_type', $linkType, PDO::PARAM_STR);
                    $insert->bindValue(':email_address', $email, PDO::PARAM_STR);
                    $insert->bindValue(':id_account', null, PDO::PARAM_NULL);
                    $insert->bindValue(':id_contatto', null, PDO::PARAM_NULL);
                    $insert->bindValue(':id_anagrafica', null, PDO::PARAM_NULL);
                    $insert->execute();
                }

                foreach ($matches as $match) {
                    $idContatto = isset($match['id_contatto']) ? (int) $match['id_contatto'] : null;
                    $idAnagrafica = isset($match['id_anagrafica']) ? (int) $match['id_anagrafica'] : null;
                    $insert->bindValue(':id_email', $idEmail, PDO::PARAM_INT);
                    $insert->bindValue(':link_type', $linkType, PDO::PARAM_STR);
                    $insert->bindValue(':email_address', $email, PDO::PARAM_STR);
                    $insert->bindValue(':id_account', null, PDO::PARAM_NULL);
                    $insert->bindValue(':id_contatto', $idContatto, $idContatto !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
                    $insert->bindValue(':id_anagrafica', $idAnagrafica, $idAnagrafica !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
                    $insert->execute();
                }

                foreach ($accounts as $account) {
                    $idAccount = isset($account['id_account']) ? (int) $account['id_account'] : null;
                    if ($idAccount === null || $idAccount <= 0) {
                        continue;
                    }
                    $insert->bindValue(':id_email', $idEmail, PDO::PARAM_INT);
                    $insert->bindValue(':link_type', $linkType, PDO::PARAM_STR);
                    $insert->bindValue(':email_address', $email, PDO::PARAM_STR);
                    $insert->bindValue(':id_account', $idAccount, PDO::PARAM_INT);
                    $insert->bindValue(':id_contatto', null, PDO::PARAM_NULL);
                    $insert->bindValue(':id_anagrafica', null, PDO::PARAM_NULL);
                    $insert->execute();
                }
            }
        };

        $insertEmailLinks('sender', $senderEmails);
        $insertEmailLinks('recipient', $recipientEmails);
    }

    /**
     * @param list<int> $emailIds
     * @return array<int,array{anagrafiche:list<array<string,mixed>>,contatti:list<array<string,mixed>>,utenti:list<array<string,mixed>>}>
     */
    private function findLinksByEmailIds(array $emailIds): array
    {
        if ($emailIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($emailIds), '?'));
        $sql = <<<SQL
            SELECT
                l.id_email,
                l.link_type,
                l.email_address,
                l.id_account,
                l.id_contatto,
                l.id_anagrafica,
                a.ragione_sociale,
                sc.nome AS nome_contatto,
                acc.username,
                acc.account_type,
                acc.email AS account_email
            FROM tb_crm_email_links l
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = l.id_anagrafica
            LEFT JOIN tb_sedi_contatti sc ON sc.id_contatto = l.id_contatto
            LEFT JOIN auth_accounts acc ON acc.id_account = l.id_account
            WHERE l.id_email IN ($placeholders)
            ORDER BY l.id_email ASC, l.id_account ASC, l.id_anagrafica ASC, l.id_contatto ASC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        foreach ($emailIds as $index => $emailId) {
            $stmt->bindValue($index + 1, $emailId, PDO::PARAM_INT);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $result = [];
        foreach ($rows as $row) {
            $idEmail = (int) ($row['id_email'] ?? 0);
            if ($idEmail <= 0) {
                continue;
            }
            if (!isset($result[$idEmail])) {
                $result[$idEmail] = [
                    'anagrafiche' => [],
                    'contatti' => [],
                    'utenti' => [],
                ];
            }

            $idAnagrafica = isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : null;
            $idAccount = isset($row['id_account']) ? (int) $row['id_account'] : null;
            $idContatto = isset($row['id_contatto']) ? (int) $row['id_contatto'] : null;
            $email = strtolower(trim((string) ($row['email_address'] ?? '')));

            if ($idAnagrafica !== null && $idAnagrafica > 0) {
                $linkType = (string) ($row['link_type'] ?? '');
                $dedupeKey = $idAnagrafica . '|' . ($idContatto ?? 0) . '|' . $email . '|' . $linkType;
                $already = false;
                foreach ($result[$idEmail]['anagrafiche'] as $entry) {
                    $current = (int) ($entry['id_anagrafica'] ?? 0)
                        . '|' . ((int) ($entry['id_contatto'] ?? 0))
                        . '|' . strtolower((string) ($entry['email'] ?? ''))
                        . '|' . strtolower((string) ($entry['link_type'] ?? ''));
                    if ($current === $dedupeKey) {
                        $already = true;
                        break;
                    }
                }
                if (!$already) {
                    $result[$idEmail]['anagrafiche'][] = [
                        'id_anagrafica' => $idAnagrafica,
                        'ragione_sociale' => (string) ($row['ragione_sociale'] ?? ''),
                        'email' => $email,
                        'id_contatto' => $idContatto !== null && $idContatto > 0 ? $idContatto : null,
                        'nome_contatto' => isset($row['nome_contatto']) && trim((string) $row['nome_contatto']) !== ''
                            ? (string) $row['nome_contatto']
                            : null,
                        'link_type' => $linkType,
                    ];
                }
            }

            if ($idContatto !== null && $idContatto > 0) {
                $dedupeKey = $idContatto . '|' . ($idAnagrafica ?? 0) . '|' . $email;
                $already = false;
                foreach ($result[$idEmail]['contatti'] as $entry) {
                    $current = (int) ($entry['id_contatto'] ?? 0) . '|' . ((int) ($entry['id_anagrafica'] ?? 0)) . '|' . strtolower((string) ($entry['email'] ?? ''));
                    if ($current === $dedupeKey) {
                        $already = true;
                        break;
                    }
                }
                if (!$already) {
                    $result[$idEmail]['contatti'][] = [
                        'id_contatto' => $idContatto,
                        'nome_contatto' => isset($row['nome_contatto']) && trim((string) $row['nome_contatto']) !== ''
                            ? (string) $row['nome_contatto']
                            : null,
                        'email' => $email,
                        'id_anagrafica' => $idAnagrafica !== null && $idAnagrafica > 0 ? $idAnagrafica : null,
                        'ragione_sociale' => isset($row['ragione_sociale']) && trim((string) $row['ragione_sociale']) !== ''
                            ? (string) $row['ragione_sociale']
                            : null,
                        'link_type' => (string) ($row['link_type'] ?? ''),
                    ];
                }
            }

            if ($idAccount !== null && $idAccount > 0) {
                $dedupeKey = $idAccount . '|' . $email . '|' . strtolower((string) ($row['link_type'] ?? ''));
                $already = false;
                foreach ($result[$idEmail]['utenti'] as $entry) {
                    $current = (int) ($entry['id_account'] ?? 0)
                        . '|' . strtolower((string) ($entry['email'] ?? ''))
                        . '|' . strtolower((string) ($entry['link_type'] ?? ''));
                    if ($current === $dedupeKey) {
                        $already = true;
                        break;
                    }
                }
                if (!$already) {
                    $result[$idEmail]['utenti'][] = [
                        'id_account' => $idAccount,
                        'username' => isset($row['username']) && trim((string) $row['username']) !== ''
                            ? (string) $row['username']
                            : null,
                        'account_type' => isset($row['account_type']) && trim((string) $row['account_type']) !== ''
                            ? (string) $row['account_type']
                            : null,
                        'email' => isset($row['account_email']) && trim((string) $row['account_email']) !== ''
                            ? strtolower(trim((string) $row['account_email']))
                            : $email,
                        'link_type' => (string) ($row['link_type'] ?? ''),
                    ];
                }
            }
        }

        return $result;
    }

    /**
     * @param list<array<string,mixed>> $rows
     * @return list<array<string,mixed>>
     */
    private function hydrateInboxRows(array $rows, DateTimeZone $timezone): array
    {
        if ($rows === []) {
            return [];
        }

        $ids = [];
        foreach ($rows as $row) {
            $id = (int) ($row['id_email'] ?? 0);
            if ($id > 0) {
                $ids[] = $id;
            }
        }
        $linksByEmailId = $this->findLinksByEmailIds($ids);
        $utc = new DateTimeZone('UTC');

        $result = [];
        foreach ($rows as $row) {
            $idEmail = (int) ($row['id_email'] ?? 0);
            $messageDate = null;
            if (!empty($row['message_date_utc'])) {
                try {
                    $messageDate = (new DateTimeImmutable((string) $row['message_date_utc'], $utc))->setTimezone($timezone);
                } catch (\Throwable $ignored) {
                    $messageDate = null;
                }
            }
            $result[] = [
                'index' => isset($row['source_index']) ? (int) $row['source_index'] : $idEmail,
                'id_email' => $idEmail,
                'from' => (string) ($row['from_raw'] ?? ''),
                'sender_emails' => $this->decodeJsonEmails((string) ($row['sender_emails_json'] ?? '')),
                'recipients' => (string) ($row['recipients_raw'] ?? ''),
                'recipient_emails' => $this->decodeJsonEmails((string) ($row['recipient_emails_json'] ?? '')),
                'subject' => (string) ($row['subject'] ?? ''),
                'message_text' => (string) ($row['message_text'] ?? ''),
                'message_html' => (string) ($row['message_html'] ?? ''),
                'attachments' => $this->decodeJsonStringList((string) ($row['attachments_json'] ?? '')),
                'date' => $messageDate ? $messageDate->format('d/m/Y H:i') : '',
                'date_iso' => $messageDate ? $messageDate->format(DateTimeInterface::ATOM) : null,
                'message_id' => (string) ($row['message_id'] ?? ''),
                'conversation_key' => (string) ($row['conversation_key'] ?? ''),
                'message_uid' => (string) ($row['message_uid'] ?? ''),
                'size_bytes' => isset($row['size_bytes']) ? (int) $row['size_bytes'] : null,
                'anagrafiche' => $linksByEmailId[$idEmail]['anagrafiche'] ?? [],
                'contatti' => $linksByEmailId[$idEmail]['contatti'] ?? [],
                'utenti' => $linksByEmailId[$idEmail]['utenti'] ?? [],
            ];
        }

        return $result;
    }

    /**
     * @param list<string> $emails
     * @return array<string, list<array{id_anagrafica:int,ragione_sociale:string,email:string,id_contatto:int|null,nome_contatto:string|null}>>
     */
    private function findAnagraficheByContactEmails(array $emails): array
    {
        if ($emails === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($emails), '?'));
        $sql = <<<SQL
            SELECT
                LOWER(TRIM(sc.email)) AS email_key,
                a.id_anagrafica,
                a.ragione_sociale,
                sc.email,
                sc.id_contatto,
                sc.nome AS nome_contatto
            FROM tb_sedi_contatti sc
            INNER JOIN tb_contatti_anagrafiche ca ON ca.id_contatto = sc.id_contatto
            INNER JOIN tb_anagrafiche a ON a.id_anagrafica = ca.id_anagrafica
            WHERE sc.email IS NOT NULL
              AND TRIM(sc.email) <> ''
              AND a.is_active = 1
              AND LOWER(TRIM(sc.email)) IN ($placeholders)
            ORDER BY a.ragione_sociale ASC, a.id_anagrafica ASC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        foreach ($emails as $index => $email) {
            $stmt->bindValue($index + 1, $email, PDO::PARAM_STR);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $result = [];
        foreach ($rows as $row) {
            $key = strtolower(trim((string) ($row['email_key'] ?? '')));
            if ($key === '') {
                continue;
            }
            $entry = [
                'id_anagrafica' => (int) ($row['id_anagrafica'] ?? 0),
                'ragione_sociale' => (string) ($row['ragione_sociale'] ?? ''),
                'email' => (string) ($row['email'] ?? ''),
                'id_contatto' => isset($row['id_contatto']) ? (int) $row['id_contatto'] : null,
                'nome_contatto' => isset($row['nome_contatto']) && trim((string) $row['nome_contatto']) !== ''
                    ? (string) $row['nome_contatto']
                    : null,
            ];
            if ($entry['id_anagrafica'] <= 0) {
                continue;
            }
            if (!isset($result[$key])) {
                $result[$key] = [];
            }
            $dedupeKey = $entry['id_anagrafica'] . '|' . ($entry['id_contatto'] ?? 0);
            $already = false;
            foreach ($result[$key] as $existing) {
                $existingKey = $existing['id_anagrafica'] . '|' . ($existing['id_contatto'] ?? 0);
                if ($existingKey === $dedupeKey) {
                    $already = true;
                    break;
                }
            }
            if (!$already) {
                $result[$key][] = $entry;
            }
        }

        return $result;
    }

    /**
     * @param mixed $value
     * @return list<string>
     */
    private function normalizeEmailList(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $normalized = [];
        foreach ($value as $entry) {
            $clean = $this->sanitizeEmailAddress((string) $entry);
            if ($clean !== null) {
                $normalized[] = $clean;
            }
        }
        return array_values(array_unique($normalized));
    }

    private function buildMessageUid(array $item, string $messageId): string
    {
        $normalizedMessageId = strtolower(trim($messageId));
        if ($normalizedMessageId !== '') {
            return hash('sha256', 'msgid|' . $normalizedMessageId);
        }
        $parts = [
            trim((string) ($item['date_iso'] ?? '')),
            strtolower(trim((string) ($item['from'] ?? ''))),
            strtolower(trim((string) ($item['subject'] ?? ''))),
            strtolower(trim((string) ($item['recipients'] ?? ''))),
        ];
        return hash('sha256', implode('|', $parts));
    }

    private function normalizeDateUtc(mixed $dateIso): ?string
    {
        $value = trim((string) $dateIso);
        if ($value === '') {
            return null;
        }
        try {
            $date = new DateTimeImmutable($value);
            return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        } catch (\Throwable $ignored) {
            return null;
        }
    }

    /**
     * @return list<string>
     */
    private function decodeJsonEmails(string $value): array
    {
        $decoded = json_decode($value, true);
        if (!is_array($decoded)) {
            return [];
        }
        return $this->normalizeEmailList($decoded);
    }

    private function ensureLinksAccountColumn(): void
    {
        try {
            $stmt = $this->pdo->query("SHOW COLUMNS FROM tb_crm_email_links LIKE 'id_account'");
            $hasColumn = $stmt !== false && $stmt->fetch(PDO::FETCH_ASSOC) !== false;
            if (!$hasColumn) {
                $this->pdo->exec('ALTER TABLE tb_crm_email_links ADD COLUMN id_account INT NULL AFTER email_address');
            }
        } catch (\Throwable $ignored) {
            // best effort migration on existing installations
        }
    }

    private function ensureInboxMessageTextColumn(): void
    {
        try {
            $stmt = $this->pdo->query("SHOW COLUMNS FROM tb_crm_email_inbox LIKE 'message_text'");
            $hasColumn = $stmt !== false && $stmt->fetch(PDO::FETCH_ASSOC) !== false;
            if (!$hasColumn) {
                $this->pdo->exec('ALTER TABLE tb_crm_email_inbox ADD COLUMN message_text LONGTEXT NULL AFTER subject');
            }
        } catch (\Throwable $ignored) {
            // best effort migration on existing installations
        }
    }

    private function ensureInboxMessageHtmlColumn(): void
    {
        try {
            $stmt = $this->pdo->query("SHOW COLUMNS FROM tb_crm_email_inbox LIKE 'message_html'");
            $hasColumn = $stmt !== false && $stmt->fetch(PDO::FETCH_ASSOC) !== false;
            if (!$hasColumn) {
                $this->pdo->exec('ALTER TABLE tb_crm_email_inbox ADD COLUMN message_html LONGTEXT NULL AFTER message_text');
            }
        } catch (\Throwable $ignored) {
            // best effort migration on existing installations
        }
    }

    private function ensureInboxAttachmentsColumn(): void
    {
        try {
            $stmt = $this->pdo->query("SHOW COLUMNS FROM tb_crm_email_inbox LIKE 'attachments_json'");
            $hasColumn = $stmt !== false && $stmt->fetch(PDO::FETCH_ASSOC) !== false;
            if (!$hasColumn) {
                $this->pdo->exec('ALTER TABLE tb_crm_email_inbox ADD COLUMN attachments_json LONGTEXT NULL AFTER message_text');
            }
        } catch (\Throwable $ignored) {
            // best effort migration on existing installations
        }
    }

    private function ensureInboxConversationKeyColumn(): void
    {
        try {
            $stmt = $this->pdo->query("SHOW COLUMNS FROM tb_crm_email_inbox LIKE 'conversation_key'");
            $hasColumn = $stmt !== false && $stmt->fetch(PDO::FETCH_ASSOC) !== false;
            if (!$hasColumn) {
                $this->pdo->exec('ALTER TABLE tb_crm_email_inbox ADD COLUMN conversation_key VARCHAR(255) NULL AFTER message_id');
            }
        } catch (\Throwable $ignored) {
            // best effort migration on existing installations
        }

        try {
            $stmt = $this->pdo->query("SHOW INDEX FROM tb_crm_email_inbox WHERE Key_name = 'idx_crm_email_conversation_key'");
            $exists = $stmt !== false && $stmt->fetch(PDO::FETCH_ASSOC) !== false;
            if (!$exists) {
                $this->pdo->exec('ALTER TABLE tb_crm_email_inbox ADD KEY idx_crm_email_conversation_key (conversation_key)');
            }
        } catch (\Throwable $ignored) {
            // best effort migration on existing installations
        }
    }

    private function ensureLinksIndexes(): void
    {
        try {
            $indexRows = $this->pdo->query("SHOW INDEX FROM tb_crm_email_links WHERE Key_name = 'uq_crm_email_link'");
            $columns = [];
            if ($indexRows !== false) {
                foreach ($indexRows->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                    $seq = isset($row['Seq_in_index']) ? (int) $row['Seq_in_index'] : 0;
                    $name = (string) ($row['Column_name'] ?? '');
                    if ($seq > 0 && $name !== '') {
                        $columns[$seq] = $name;
                    }
                }
            }
            ksort($columns);
            $columnList = array_values($columns);
            $expected = ['id_email', 'link_type', 'email_address', 'id_account', 'id_contatto', 'id_anagrafica'];
            if ($columnList !== $expected) {
                $this->pdo->exec('ALTER TABLE tb_crm_email_links DROP INDEX uq_crm_email_link');
                $this->pdo->exec(
                    'ALTER TABLE tb_crm_email_links
                     ADD UNIQUE KEY uq_crm_email_link (id_email, link_type, email_address, id_account, id_contatto, id_anagrafica)'
                );
            }
        } catch (\Throwable $ignored) {
            // best effort migration on existing installations
        }

        try {
            $stmt = $this->pdo->query("SHOW INDEX FROM tb_crm_email_links WHERE Key_name = 'idx_crm_email_link_account'");
            $exists = $stmt !== false && $stmt->fetch(PDO::FETCH_ASSOC) !== false;
            if (!$exists) {
                $this->pdo->exec('ALTER TABLE tb_crm_email_links ADD KEY idx_crm_email_link_account (id_account)');
            }
        } catch (\Throwable $ignored) {
            // best effort migration on existing installations
        }
    }

    /**
     * @param list<string> $emails
     * @return array<string, list<array{id_account:int,username:string,email:string,account_type:string,is_active:int}>>
     */
    private function findAccountsByEmails(array $emails): array
    {
        if ($emails === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($emails), '?'));
        $sql = <<<SQL
            SELECT
                id_account,
                username,
                email,
                account_type,
                is_active
            FROM auth_accounts
            WHERE email IS NOT NULL
              AND TRIM(email) <> ''
              AND is_active = 1
              AND LOWER(TRIM(email)) IN ($placeholders)
            ORDER BY username ASC, id_account ASC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        foreach ($emails as $index => $email) {
            $stmt->bindValue($index + 1, $email, PDO::PARAM_STR);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $result = [];
        foreach ($rows as $row) {
            $key = strtolower(trim((string) ($row['email'] ?? '')));
            $idAccount = isset($row['id_account']) ? (int) $row['id_account'] : 0;
            if ($key === '' || $idAccount <= 0) {
                continue;
            }
            if (!isset($result[$key])) {
                $result[$key] = [];
            }
            $already = false;
            foreach ($result[$key] as $entry) {
                if ((int) ($entry['id_account'] ?? 0) === $idAccount) {
                    $already = true;
                    break;
                }
            }
            if (!$already) {
                $result[$key][] = [
                    'id_account' => $idAccount,
                    'username' => (string) ($row['username'] ?? ''),
                    'email' => $key,
                    'account_type' => (string) ($row['account_type'] ?? ''),
                    'is_active' => (int) ($row['is_active'] ?? 0),
                ];
            }
        }

        return $result;
    }

    private function sanitizeEmailAddress(string $value): ?string
    {
        $candidate = trim($value);
        if ($candidate === '') {
            return null;
        }

        // Prevent header/control-char injection vectors.
        if (preg_match('/[\r\n]/', $candidate) === 1) {
            return null;
        }
        $candidate = preg_replace('/[\x00-\x1F\x7F]/u', '', $candidate) ?? '';
        $candidate = trim($candidate, " \t\n\r\0\x0B<>()[]{}\"'");
        $candidate = strtolower($candidate);
        if ($candidate === '' || strlen($candidate) > 320) {
            return null;
        }

        return filter_var($candidate, FILTER_VALIDATE_EMAIL) !== false ? $candidate : null;
    }

    /**
     * @param mixed $value
     * @return list<string>
     */
    private function normalizeAttachmentList(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $normalized = [];
        foreach ($value as $entry) {
            $name = $this->sanitizeAttachmentName((string) $entry);
            if ($name !== null) {
                $normalized[] = $name;
            }
        }
        return array_values(array_unique($normalized));
    }

    /**
     * @return list<string>
     */
    private function decodeJsonStringList(string $value): array
    {
        $decoded = json_decode($value, true);
        if (!is_array($decoded)) {
            return [];
        }
        return $this->normalizeAttachmentList($decoded);
    }

    private function sanitizeAttachmentName(string $value): ?string
    {
        $candidate = trim($value);
        if ($candidate === '') {
            return null;
        }
        $candidate = preg_replace('/[\x00-\x1F\x7F]/u', '', $candidate) ?? '';
        $candidate = trim($candidate, "\"' ");
        if ($candidate === '') {
            return null;
        }
        if (mb_strlen($candidate) > 255) {
            $candidate = mb_substr($candidate, 0, 255);
        }
        return $candidate;
    }
}
