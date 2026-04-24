<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Backend\Mailer\Pop3Client;
use MediaPrint\Backend\Mailer\CrmSmtpMailer;
use MediaPrint\Backend\Database;
use MediaPrint\Repo\CrmEmailRepository;
use RuntimeException;

final class CrmEmailService
{
    // Espone la configurazione SMTP/POP letta da ambiente in formato consumabile dal frontend.
    /**
     * @return array<string,mixed>
     */
    public function getConfig(): array
    {
        return [
            'source' => 'env',
            'editable' => false,
            'smtp' => [
                'host' => $this->envString('CRM_SMTP_HOST', $this->envString('SMTP_HOST', 'localhost')),
                'port' => $this->envInt('CRM_SMTP_PORT', $this->envInt('SMTP_PORT', 587)),
                'username' => $this->envString('CRM_SMTP_USERNAME', $this->envString('SMTP_USERNAME', '')),
                'password' => '',
                'password_set' => $this->envString('CRM_SMTP_PASSWORD', $this->envString('SMTP_PASSWORD', '')) !== '',
                'encryption' => $this->normalizeEncryption($this->envString('CRM_SMTP_ENCRYPTION', $this->envString('SMTP_ENCRYPTION', 'tls'))),
                'timeout' => $this->envInt('CRM_SMTP_TIMEOUT', $this->envInt('SMTP_TIMEOUT', 30)),
                'ehlo_domain' => $this->envString('CRM_SMTP_EHLO_DOMAIN', $this->envString('SMTP_EHLO_DOMAIN', '')),
                'allow_self_signed' => $this->envBool('CRM_SMTP_ALLOW_SELF_SIGNED', $this->envBool('SMTP_ALLOW_SELF_SIGNED', false)),
                'from_address' => $this->envString('CRM_SMTP_FROM_ADDRESS', $this->envString('SMTP_FROM_ADDRESS', '')),
                'from_name' => $this->envString('CRM_SMTP_FROM_NAME', $this->envString('SMTP_FROM_NAME', 'MediaPrint ERP')),
            ],
            'pop' => [
                'host' => $this->envString('POP_HOST', ''),
                'port' => $this->envInt('POP_PORT', 995),
                'username' => $this->envString('POP_USERNAME', ''),
                'password' => '',
                'password_set' => $this->envString('POP_PASSWORD', '') !== '',
                'encryption' => $this->normalizeEncryption($this->envString('POP_ENCRYPTION', 'ssl')),
                'timeout' => $this->envInt('POP_TIMEOUT', 30),
                'allow_self_signed' => $this->envBool('POP_ALLOW_SELF_SIGNED', false),
            ],
        ];
    }

    // Esegue un test di connessione SMTP usando la configurazione runtime.
    /**
     * @return array<string,mixed>
     */
    public function testSmtp(): array
    {
        if (!class_exists(CrmSmtpMailer::class)) {
            throw new RuntimeException(
                'Backend non allineato: classe CrmSmtpMailer assente. Pubblica backend/src/Mailer/CrmSmtpMailer.php e riavvia PHP/opcache.'
            );
        }

        $mailer = new CrmSmtpMailer(
            $this->envString('CRM_SMTP_HOST', $this->envString('SMTP_HOST', 'localhost')),
            $this->envInt('CRM_SMTP_PORT', $this->envInt('SMTP_PORT', 587)),
            $this->nullable($this->envString('CRM_SMTP_USERNAME', $this->envString('SMTP_USERNAME', ''))),
            $this->nullable($this->envString('CRM_SMTP_PASSWORD', $this->envString('SMTP_PASSWORD', ''))),
            $this->normalizeEncryption($this->envString('CRM_SMTP_ENCRYPTION', $this->envString('SMTP_ENCRYPTION', 'tls'))),
            $this->envInt('CRM_SMTP_TIMEOUT', $this->envInt('SMTP_TIMEOUT', 30)),
            $this->nullable($this->envString('CRM_SMTP_EHLO_DOMAIN', $this->envString('SMTP_EHLO_DOMAIN', ''))),
            $this->envBool('CRM_SMTP_ALLOW_SELF_SIGNED', $this->envBool('SMTP_ALLOW_SELF_SIGNED', false))
        );

        if (!method_exists($mailer, 'testConnection')) {
            throw new RuntimeException(
                'Backend non allineato: metodo SMTP testConnection() assente. Pubblica la versione aggiornata di CrmSmtpMailer.php e riavvia PHP/opcache.'
            );
        }

        $info = $mailer->testConnection();
        return [
            'ok' => true,
            'message' => 'Connessione SMTP riuscita (configurazione da .env).',
            'connection' => $info,
        ];
    }

    // Esegue un test di connessione POP per verificare raggiungibilita e credenziali.
    /**
     * @return array<string,mixed>
     */
    public function testPop(): array
    {
        if (!class_exists(Pop3Client::class)) {
            throw new RuntimeException(
                'Backend non allineato: classe Pop3Client assente. Pubblica backend/src/Mailer/Pop3Client.php e riavvia PHP/opcache.'
            );
        }

        $client = new Pop3Client(
            $this->envString('POP_HOST', ''),
            $this->envInt('POP_PORT', 995),
            $this->envString('POP_USERNAME', ''),
            $this->envString('POP_PASSWORD', ''),
            $this->normalizeEncryption($this->envString('POP_ENCRYPTION', 'ssl')),
            $this->envInt('POP_TIMEOUT', 30),
            $this->envBool('POP_ALLOW_SELF_SIGNED', false)
        );

        $info = $client->ping();
        return [
            'ok' => true,
            'message' => 'Connessione POP riuscita (configurazione da .env).',
            'connection' => $info,
        ];
    }

    // Legge le email odierne da POP, le sincronizza in archivio e restituisce la lista locale.
    /**
     * @return array{items:list<array<string,mixed>>,count:int}
     */
    public function listTodayEmails(): array
    {
        if (!class_exists(Pop3Client::class)) {
            throw new RuntimeException(
                'Backend non allineato: classe Pop3Client assente. Pubblica backend/src/Mailer/Pop3Client.php e riavvia PHP/opcache.'
            );
        }

        $timezoneName = $this->envString('APP_TIMEZONE', 'Europe/Rome');
        try {
            $timezone = new \DateTimeZone($timezoneName);
        } catch (\Throwable $ignored) {
            $timezone = new \DateTimeZone('Europe/Rome');
        }

        $client = new Pop3Client(
            $this->envString('POP_HOST', ''),
            $this->envInt('POP_PORT', 995),
            $this->envString('POP_USERNAME', ''),
            $this->envString('POP_PASSWORD', ''),
            $this->normalizeEncryption($this->envString('POP_ENCRYPTION', 'ssl')),
            $this->envInt('POP_TIMEOUT', 30),
            $this->envBool('POP_ALLOW_SELF_SIGNED', false)
        );

        $items = $client->listToday(100, $timezone);
        $repository = new CrmEmailRepository(Database::getConnection());
        $repository->syncEmails($items);
        $items = $repository->listByToday($timezone, 100);
        return [
            'items' => $items,
            'count' => count($items),
        ];
    }

    // Cerca l'archivio email con filtri testuali, paginazione e chiave conversazione.
    /**
     * @return array{items:list<array<string,mixed>>,count:int,page:int,page_size:int}
     */
    public function searchArchiveEmails(
        string $sender = '',
        string $subject = '',
        string $anagrafica = '',
        int $page = 1,
        int $pageSize = 100,
        string $conversationKey = ''
    ): array
    {
        $timezoneName = $this->envString('APP_TIMEZONE', 'Europe/Rome');
        try {
            $timezone = new \DateTimeZone($timezoneName);
        } catch (\Throwable $ignored) {
            $timezone = new \DateTimeZone('Europe/Rome');
        }

        $repository = new CrmEmailRepository(Database::getConnection());
        return $repository->searchArchive($timezone, $sender, $subject, $anagrafica, $page, $pageSize, $conversationKey);
    }

    // Recupera il dettaglio completo di una email archiviata per ID.
    /**
     * @return array<string,mixed>
     */
    public function getEmailDetail(int $idEmail): array
    {
        if ($idEmail <= 0) {
            throw new RuntimeException('ID email non valido.', 422);
        }

        $timezoneName = $this->envString('APP_TIMEZONE', 'Europe/Rome');
        try {
            $timezone = new \DateTimeZone($timezoneName);
        } catch (\Throwable $ignored) {
            $timezone = new \DateTimeZone('Europe/Rome');
        }

        $repository = new CrmEmailRepository(Database::getConnection());
        $item = $repository->findEmailDetailById($timezone, $idEmail);
        if ($item === null) {
            throw new RuntimeException('Email non trovata.', 404);
        }
        return $item;
    }

    // Collega una email a una anagrafica esistente validando input e casi di errore.
    public function linkEmailAnagrafica(int $idEmail, int $idAnagrafica): array
    {
        if ($idEmail <= 0) {
            throw new RuntimeException('ID email non valido.', 422);
        }
        if ($idAnagrafica <= 0) {
            throw new RuntimeException('ID anagrafica non valido.', 422);
        }

        $repository = new CrmEmailRepository(Database::getConnection());
        try {
            $repository->linkEmailToAnagrafica($idEmail, $idAnagrafica);
        } catch (\RuntimeException $runtimeException) {
            $message = $runtimeException->getMessage();
            if (str_contains(strtolower($message), 'email non trovata')) {
                throw new RuntimeException('Email non trovata.', 404);
            }
            if (str_contains(strtolower($message), 'anagrafica')) {
                throw new RuntimeException($message, 422);
            }
            throw $runtimeException;
        }

        return [
            'ok' => true,
            'message' => 'Anagrafica collegata correttamente.',
            'id_email' => $idEmail,
            'id_anagrafica' => $idAnagrafica,
        ];
    }

    // Collega una email a un ticket, con eventuale riferimento a una sezione gestionale.
    /**
     * @return array<string,mixed>
     */
    public function linkEmailTicket(int $idEmail, int $idTicket, string $sectionType = '', ?int $sectionId = null): array
    {
        if ($idEmail <= 0) {
            throw new RuntimeException('ID email non valido.', 422);
        }
        if ($idTicket <= 0) {
            throw new RuntimeException('ID ticket non valido.', 422);
        }

        $normalizedSectionType = strtolower(trim($sectionType));
        if ($normalizedSectionType === '') {
            $normalizedSectionType = '';
        } elseif (!in_array($normalizedSectionType, ['preventivo', 'lavorazione', 'fattura'], true)) {
            throw new RuntimeException('Sezione gestionale non valida.', 422);
        }

        $normalizedSectionId = $sectionId !== null ? (int) $sectionId : null;
        if ($normalizedSectionType !== '' && ($normalizedSectionId === null || $normalizedSectionId <= 0)) {
            throw new RuntimeException('ID sezione gestionale non valido.', 422);
        }

        $repository = new CrmEmailRepository(Database::getConnection());
        try {
            $repository->linkEmailToTicket(
                $idEmail,
                $idTicket,
                $normalizedSectionType !== '' ? $normalizedSectionType : null,
                $normalizedSectionType !== '' ? $normalizedSectionId : null
            );
        } catch (\RuntimeException $runtimeException) {
            $message = strtolower($runtimeException->getMessage());
            if (str_contains($message, 'email non trovata')) {
                throw new RuntimeException('Email non trovata.', 404);
            }
            if (str_contains($message, 'ticket non trovato')) {
                throw new RuntimeException('Ticket non trovato.', 404);
            }
            throw $runtimeException;
        }

        return [
            'ok' => true,
            'message' => 'Ticket collegato correttamente alla email.',
            'id_email' => $idEmail,
            'id_ticket' => $idTicket,
            'section_type' => $normalizedSectionType !== '' ? $normalizedSectionType : null,
            'section_id' => $normalizedSectionType !== '' ? $normalizedSectionId : null,
        ];
    }

    // Invia una risposta SMTP alla mail selezionata e prova a salvarla nello storico CRM.
    /**
     * @param list<string> $cc
     * @return array<string,mixed>
     */
    public function replyEmail(int $idEmail, string $body, string $subject = '', array $cc = []): array
    {
        if ($idEmail <= 0) {
            throw new RuntimeException('ID email non valido.', 422);
        }

        $trimmedBody = trim($body);
        if ($trimmedBody === '') {
            throw new RuntimeException('Testo risposta non valido.', 422);
        }

        $timezoneName = $this->envString('APP_TIMEZONE', 'Europe/Rome');
        try {
            $timezone = new \DateTimeZone($timezoneName);
        } catch (\Throwable $ignored) {
            $timezone = new \DateTimeZone('Europe/Rome');
        }

        $repository = new CrmEmailRepository(Database::getConnection());
        $email = $repository->findEmailDetailById($timezone, $idEmail);
        if ($email === null) {
            throw new RuntimeException('Email non trovata.', 404);
        }

        $to = $this->normalizeAddressList($email['sender_emails'] ?? []);
        if ($to === []) {
            $to = $this->extractEmailsFromText((string) ($email['from'] ?? ''));
        }
        if ($to === []) {
            throw new RuntimeException('Impossibile determinare il destinatario della risposta.', 422);
        }

        $ccList = $this->normalizeAddressList($cc);
        $finalSubject = trim($subject);
        if ($finalSubject === '') {
            $originalSubject = trim((string) ($email['subject'] ?? ''));
            $finalSubject = $originalSubject !== '' ? 'Re: ' . $originalSubject : 'Re: Comunicazione MediaPrint';
        }

        $htmlBody = nl2br(htmlspecialchars($trimmedBody, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
        $fromAddress = $this->envString('CRM_SMTP_FROM_ADDRESS', $this->envString('SMTP_FROM_ADDRESS', ''));
        if (!filter_var($fromAddress, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Indirizzo mittente SMTP non configurato correttamente.', 422);
        }
        $fromName = $this->envString('CRM_SMTP_FROM_NAME', $this->envString('SMTP_FROM_NAME', 'MediaPrint ERP'));

        $originalMessageId = trim((string) ($email['message_id'] ?? ''));
        $headers = [];
        if ($originalMessageId !== '') {
            $headers['In-Reply-To'] = $originalMessageId;
            $headers['References'] = $originalMessageId;
        }

        $mailer = new CrmSmtpMailer(
            $this->envString('CRM_SMTP_HOST', $this->envString('SMTP_HOST', 'localhost')),
            $this->envInt('CRM_SMTP_PORT', $this->envInt('SMTP_PORT', 587)),
            $this->nullable($this->envString('CRM_SMTP_USERNAME', $this->envString('SMTP_USERNAME', ''))),
            $this->nullable($this->envString('CRM_SMTP_PASSWORD', $this->envString('SMTP_PASSWORD', ''))),
            $this->normalizeEncryption($this->envString('CRM_SMTP_ENCRYPTION', $this->envString('SMTP_ENCRYPTION', 'tls'))),
            $this->envInt('CRM_SMTP_TIMEOUT', $this->envInt('SMTP_TIMEOUT', 30)),
            $this->nullable($this->envString('CRM_SMTP_EHLO_DOMAIN', $this->envString('SMTP_EHLO_DOMAIN', ''))),
            $this->envBool('CRM_SMTP_ALLOW_SELF_SIGNED', $this->envBool('SMTP_ALLOW_SELF_SIGNED', false))
        );

        $mailer->send($to, $ccList, $finalSubject, $htmlBody, $fromAddress, $fromName, [], $headers);

        $savedToDb = true;
        $saveWarning = null;
        try {
            $repository->syncEmails([
                $this->buildSentEmailRecord(
                    $email,
                    $fromAddress,
                    $fromName,
                    $to,
                    $ccList,
                    $finalSubject,
                    $trimmedBody,
                    $htmlBody,
                    $originalMessageId
                ),
            ]);
        } catch (\Throwable $saveError) {
            $savedToDb = false;
            $saveWarning = 'Email inviata ma non salvata in archivio: ' . $saveError->getMessage();
        }

        return [
            'ok' => true,
            'message' => $savedToDb
                ? 'Risposta email inviata e salvata correttamente.'
                : 'Risposta email inviata correttamente.',
            'id_email' => $idEmail,
            'to' => $to,
            'cc' => $ccList,
            'subject' => $finalSubject,
            'saved_to_db' => $savedToDb,
            'warning' => $saveWarning,
        ];
    }

    // Scarica un singolo allegato dal messaggio POP originario.
    /**
     * @return array{filename:string,mime_type:string,content:string}
     */
    public function downloadAttachment(int $idEmail, string $attachmentName): array
    {
        if (!class_exists(Pop3Client::class)) {
            throw new RuntimeException(
                'Backend non allineato: classe Pop3Client assente. Pubblica backend/src/Mailer/Pop3Client.php e riavvia PHP/opcache.'
            );
        }

        $repository = new CrmEmailRepository(Database::getConnection());
        $email = $repository->findEmailById($idEmail);
        if ($email === null) {
            throw new RuntimeException('Email non trovata.', 404);
        }

        $sourceIndex = isset($email['source_index']) ? (int) $email['source_index'] : 0;
        if ($sourceIndex <= 0) {
            throw new RuntimeException('Indice POP non disponibile per questa email. Aggiorna la lista e riprova.', 422);
        }

        $safeAttachmentName = trim($attachmentName);
        if ($safeAttachmentName === '') {
            throw new RuntimeException('Nome allegato non valido.', 422);
        }

        $knownAttachments = isset($email['attachments']) && is_array($email['attachments']) ? $email['attachments'] : [];
        $isKnown = false;
        foreach ($knownAttachments as $known) {
            if (!is_string($known)) {
                continue;
            }
            if (strcasecmp(trim($known), $safeAttachmentName) === 0) {
                $safeAttachmentName = trim($known);
                $isKnown = true;
                break;
            }
        }
        if (!$isKnown && $knownAttachments !== []) {
            throw new RuntimeException('Allegato non presente nella email selezionata.', 404);
        }

        $client = new Pop3Client(
            $this->envString('POP_HOST', ''),
            $this->envInt('POP_PORT', 995),
            $this->envString('POP_USERNAME', ''),
            $this->envString('POP_PASSWORD', ''),
            $this->normalizeEncryption($this->envString('POP_ENCRYPTION', 'ssl')),
            $this->envInt('POP_TIMEOUT', 30),
            $this->envBool('POP_ALLOW_SELF_SIGNED', false)
        );

        return $client->downloadAttachmentByIndex(
            $sourceIndex,
            $safeAttachmentName,
            isset($email['message_id']) ? (string) $email['message_id'] : null
        );
    }

    // Scarica piu allegati e li impacchetta in un unico ZIP in memoria.
    /**
     * @param list<string> $attachmentNames
     * @return array{filename:string,mime_type:string,content:string}
     */
    public function downloadAttachmentsZip(int $idEmail, array $attachmentNames): array
    {
        if (!class_exists(Pop3Client::class)) {
            throw new RuntimeException(
                'Backend non allineato: classe Pop3Client assente. Pubblica backend/src/Mailer/Pop3Client.php e riavvia PHP/opcache.'
            );
        }
        if (!class_exists(\ZipArchive::class)) {
            throw new RuntimeException('Estensione ZIP non disponibile sul server.', 500);
        }

        $repository = new CrmEmailRepository(Database::getConnection());
        $email = $repository->findEmailById($idEmail);
        if ($email === null) {
            throw new RuntimeException('Email non trovata.', 404);
        }

        $sourceIndex = isset($email['source_index']) ? (int) $email['source_index'] : 0;
        if ($sourceIndex <= 0) {
            throw new RuntimeException('Indice POP non disponibile per questa email. Aggiorna la lista e riprova.', 422);
        }

        $knownAttachments = isset($email['attachments']) && is_array($email['attachments']) ? $email['attachments'] : [];
        $selectedNames = $this->normalizeRequestedAttachments($attachmentNames, $knownAttachments);
        if ($selectedNames === []) {
            throw new RuntimeException('Nessun allegato valido selezionato.', 422);
        }

        $client = new Pop3Client(
            $this->envString('POP_HOST', ''),
            $this->envInt('POP_PORT', 995),
            $this->envString('POP_USERNAME', ''),
            $this->envString('POP_PASSWORD', ''),
            $this->normalizeEncryption($this->envString('POP_ENCRYPTION', 'ssl')),
            $this->envInt('POP_TIMEOUT', 30),
            $this->envBool('POP_ALLOW_SELF_SIGNED', false)
        );

        $attachments = $client->downloadAttachmentsByIndex(
            $sourceIndex,
            $selectedNames,
            isset($email['message_id']) ? (string) $email['message_id'] : null
        );
        if ($attachments === []) {
            throw new RuntimeException('Allegati non trovati nel messaggio.', 404);
        }

        $zipTempPath = tempnam(sys_get_temp_dir(), 'crm_mail_zip_');
        if ($zipTempPath === false) {
            throw new RuntimeException('Impossibile creare file ZIP temporaneo.', 500);
        }

        $zip = new \ZipArchive();
        $opened = $zip->open($zipTempPath, \ZipArchive::OVERWRITE);
        if ($opened !== true) {
            @unlink($zipTempPath);
            throw new RuntimeException('Impossibile creare archivio ZIP.', 500);
        }

        $usedNames = [];
        foreach ($attachments as $attachment) {
            $baseName = $this->sanitizeFilenameForZip((string) ($attachment['filename'] ?? 'allegato.bin'));
            $name = $baseName;
            $seq = 1;
            while (isset($usedNames[strtolower($name)])) {
                $name = $this->appendSequenceToFilename($baseName, $seq);
                $seq++;
            }
            $usedNames[strtolower($name)] = true;
            $zip->addFromString($name, (string) ($attachment['content'] ?? ''));
        }
        $zip->close();

        $zipContent = file_get_contents($zipTempPath);
        @unlink($zipTempPath);
        if ($zipContent === false) {
            throw new RuntimeException('Impossibile leggere archivio ZIP generato.', 500);
        }

        $zipName = 'email_' . $idEmail . '_allegati.zip';
        return [
            'filename' => $zipName,
            'mime_type' => 'application/zip',
            'content' => $zipContent,
        ];
    }

    // Legge una variabile ambiente stringa con fallback di default.
    private function envString(string $key, string $default): string
    {
        $value = getenv($key);
        if ($value === false) {
            return $default;
        }
        $value = trim((string) $value);
        return $value === '' ? $default : $value;
    }

    // Legge una variabile ambiente numerica con clamp su range valido porta/timeout.
    private function envInt(string $key, int $default): int
    {
        $value = getenv($key);
        if ($value === false || !is_numeric($value)) {
            return $default;
        }
        $parsed = (int) $value;
        if ($parsed <= 0) {
            return $default;
        }
        if ($parsed > 65535) {
            return 65535;
        }
        return $parsed;
    }

    // Interpreta una variabile ambiente booleana usando un set di valori truthy.
    private function envBool(string $key, bool $default): bool
    {
        $value = getenv($key);
        if ($value === false) {
            return $default;
        }
        $candidate = strtolower(trim((string) $value));
        if ($candidate === '') {
            return $default;
        }
        return in_array($candidate, ['1', 'true', 'yes', 'si', 'on'], true);
    }

    // Normalizza il tipo cifratura a none/ssl/tls con fallback sicuro.
    private function normalizeEncryption(string $value): string
    {
        $candidate = strtolower(trim($value));
        if (!in_array($candidate, ['none', 'ssl', 'tls'], true)) {
            return 'none';
        }
        return $candidate;
    }

    // Converte stringhe vuote in null per parametri opzionali del mailer.
    private function nullable(string $value): ?string
    {
        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }

    // Filtra l'elenco richiesto degli allegati mantenendo solo nomi validi noti.
    /**
     * @param list<string> $requested
     * @param list<mixed> $known
     * @return list<string>
     */
    private function normalizeRequestedAttachments(array $requested, array $known): array
    {
        $knownMap = [];
        foreach ($known as $name) {
            if (!is_string($name)) {
                continue;
            }
            $trimmed = trim($name);
            if ($trimmed !== '') {
                $knownMap[strtolower($trimmed)] = $trimmed;
            }
        }

        $selected = [];
        if ($requested === []) {
            foreach ($knownMap as $value) {
                $selected[] = $value;
            }
            return $selected;
        }

        foreach ($requested as $name) {
            $trimmed = trim((string) $name);
            if ($trimmed === '') {
                continue;
            }
            $key = strtolower($trimmed);
            if (isset($knownMap[$key])) {
                $selected[$key] = $knownMap[$key];
            }
        }
        return array_values($selected);
    }

    // Rende sicuro un filename per ZIP eliminando caratteri illegali o di controllo.
    private function sanitizeFilenameForZip(string $name): string
    {
        $candidate = trim($name);
        if ($candidate === '') {
            return 'allegato.bin';
        }
        $candidate = preg_replace('/[\\\\\/:*?"<>|]+/', '_', $candidate) ?? $candidate;
        $candidate = preg_replace('/[\x00-\x1F\x7F]/u', '', $candidate) ?? $candidate;
        $candidate = trim($candidate);
        if ($candidate === '') {
            return 'allegato.bin';
        }
        if (mb_strlen($candidate) > 180) {
            $candidate = mb_substr($candidate, 0, 180);
        }
        return $candidate;
    }

    // Aggiunge un suffisso progressivo al nome file in caso di collisione.
    private function appendSequenceToFilename(string $filename, int $seq): string
    {
        $dotPos = strrpos($filename, '.');
        if ($dotPos === false || $dotPos === 0) {
            return $filename . ' (' . $seq . ')';
        }
        $base = substr($filename, 0, $dotPos);
        $ext = substr($filename, $dotPos);
        return $base . ' (' . $seq . ')' . $ext;
    }

    // Costruisce il record email "inviata" da sincronizzare nello storico CRM.
    /**
     * @param list<string> $to
     * @param list<string> $cc
     * @param array<string,mixed> $originalEmail
     * @return array<string,mixed>
     */
    private function buildSentEmailRecord(
        array $originalEmail,
        string $fromAddress,
        string $fromName,
        array $to,
        array $cc,
        string $subject,
        string $messageText,
        string $messageHtml,
        string $originalMessageId
    ): array {
        $recipients = array_values(array_unique(array_filter(array_merge($to, $cc))));
        $conversationKey = trim((string) ($originalEmail['conversation_key'] ?? ''));
        if ($conversationKey === '' && $originalMessageId !== '') {
            $token = $this->normalizeMessageIdToken($originalMessageId);
            if ($token !== '') {
                $conversationKey = 'irt:' . $token;
            }
        }
        if ($conversationKey === '') {
            $conversationKey = 'sub:' . sha1(strtolower(trim($subject)));
        }

        return [
            'index' => null,
            'from' => sprintf('%s <%s>', trim($fromName), strtolower(trim($fromAddress))),
            'sender_emails' => [strtolower(trim($fromAddress))],
            'recipients' => implode(' | ', $recipients),
            'recipient_emails' => $recipients,
            'subject' => $subject,
            'message_text' => $messageText,
            'message_html' => $messageHtml,
            'attachments' => [],
            'date_iso' => (new \DateTimeImmutable('now'))->format(\DateTimeInterface::ATOM),
            'message_id' => '',
            'conversation_key' => $conversationKey,
            'size_bytes' => null,
        ];
    }

    // Normalizza un Message-Id in token compatto per correlazione conversazioni.
    private function normalizeMessageIdToken(string $value): string
    {
        $candidate = strtolower(trim($value));
        if ($candidate === '') {
            return '';
        }
        $candidate = trim($candidate, "<> \t\n\r\0\x0B");
        $candidate = preg_replace('/[\x00-\x20\x7F]/u', '', $candidate) ?? '';
        return $candidate;
    }

    // Valida e deduplica una lista indirizzi email.
    /**
     * @param mixed $value
     * @return list<string>
     */
    private function normalizeAddressList(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $normalized = [];
        foreach ($value as $entry) {
            $candidate = strtolower(trim((string) $entry));
            if (filter_var($candidate, FILTER_VALIDATE_EMAIL) !== false) {
                $normalized[] = $candidate;
            }
        }
        return array_values(array_unique($normalized));
    }

    // Estrae indirizzi email da testo libero (header from, note, ecc.).
    /**
     * @return list<string>
     */
    private function extractEmailsFromText(string $text): array
    {
        if ($text === '') {
            return [];
        }
        preg_match_all("/[A-Z0-9._%+\-']+@[A-Z0-9.\-]+\.[A-Z]{2,}/i", $text, $matches);
        $emails = isset($matches[0]) && is_array($matches[0]) ? $matches[0] : [];
        $normalized = [];
        foreach ($emails as $email) {
            $candidate = strtolower(trim((string) $email));
            if (filter_var($candidate, FILTER_VALIDATE_EMAIL) !== false) {
                $normalized[] = $candidate;
            }
        }
        return array_values(array_unique($normalized));
    }
}
