<?php
// backend/src/Service/PreventiviService.php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Backend\Mailer\EmailTemplate;
use MediaPrint\Backend\Mailer\SmtpMailer;
use MediaPrint\Repo\DdtRepository;
use MediaPrint\Repo\FattureRepository;
use MediaPrint\Repo\PreventiviRepository;
use MediaPrint\Repo\ProdottiRepository;
use MediaPrint\Repo\LavorazioniRepository;

final class PreventiviService
{
    public function __construct(
        private PreventiviRepository $repository,
        private ?DdtRepository $ddtRepository = null,
        private ?FattureRepository $fattureRepository = null,
        private ?LavorazioniRepository $lavorazioniRepository = null
    ) {}

    private function requireDdtRepository(): DdtRepository
    {
        if ($this->ddtRepository instanceof DdtRepository) {
            return $this->ddtRepository;
        }

        throw new \RuntimeException('FunzionalitÃ  DDT non disponibile.', 503);
    }

    private function requireFattureRepository(): FattureRepository
    {
        if ($this->fattureRepository instanceof FattureRepository) {
            return $this->fattureRepository;
        }

        throw new \RuntimeException('FunzionalitÃ  fatture non disponibile.', 503);
    }

    /**
     * @param array<string,mixed> $tipo
     */
    private function isPurchaseInvoiceType(array $tipo): bool
    {
        $code = strtolower(trim((string) ($tipo['code'] ?? '')));
        $label = strtolower(trim((string) ($tipo['label'] ?? '')));
        $text = $code . ' ' . $label;
        return str_contains($text, 'acquisto')
            || str_contains($text, 'passiv')
            || str_contains($text, 'fornitor');
    }

    private function resolveInvoiceTypeId(FattureRepository $fattureRepository, bool $isAcquisto, int $requestedTypeId = 0): int
    {
        $tipi = $fattureRepository->listTipi();
        if (empty($tipi)) {
            return $requestedTypeId > 0 ? $requestedTypeId : 2;
        }

        $byId = [];
        foreach ($tipi as $tipo) {
            $id = isset($tipo['id_tipo']) ? (int) $tipo['id_tipo'] : 0;
            if ($id > 0) {
                $byId[$id] = $tipo;
            }
        }

        if ($isAcquisto) {
            foreach ($byId as $id => $tipo) {
                if ($this->isPurchaseInvoiceType($tipo)) {
                    return $id;
                }
            }
        }

        if ($requestedTypeId > 0 && isset($byId[$requestedTypeId])) {
            return $requestedTypeId;
        }

        foreach ($byId as $id => $tipo) {
            $code = strtolower(trim((string) ($tipo['code'] ?? '')));
            $label = strtolower(trim((string) ($tipo['label'] ?? '')));
            if ($code === 'immediata' || $label === 'immediata') {
                return $id;
            }
        }

        $firstId = array_key_first($byId);
        if (is_int($firstId) && $firstId > 0) {
            return $firstId;
        }

        return $requestedTypeId > 0 ? $requestedTypeId : 2;
    }

    private function requireLavorazioniRepository(): LavorazioniRepository
    {
        if ($this->lavorazioniRepository instanceof LavorazioniRepository) {
            return $this->lavorazioniRepository;
        }

        throw new \RuntimeException('FunzionalitÃ  lavorazioni non disponibile.', 503);
    }

    /**
     * @param mixed $value
     * @return list<string>
     */
    private function normalizeEmailList($value): array
    {
        if ($value === null) {
            return [];
        }
        $list = [];
        if (is_string($value)) {
            $parts = preg_split('/[;,]+|\r\n|\n|\r/', $value) ?: [];
            foreach ($parts as $part) {
                $part = trim($part);
                if ($part !== '') {
                    $list[] = $part;
                }
            }
        } elseif (is_array($value)) {
            foreach ($value as $item) {
                if (is_string($item)) {
                    $trimmed = trim($item);
                    if ($trimmed !== '') {
                        $list[] = $trimmed;
                    }
                }
            }
        }
        $valid = [];
        foreach ($list as $email) {
            if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $valid[] = strtolower($email);
            }
        }
        $valid = array_values(array_unique($valid));
        return $valid;
    }

    private function getMailerDomain(): string
    {
        $envDomain = getenv('SMTP_FROM_DOMAIN');
        if ($envDomain && filter_var('test@' . $envDomain, FILTER_VALIDATE_EMAIL)) {
            return $envDomain;
        }
        $host = gethostname();
        if ($host && strpos($host, '.') !== false) {
            return $host;
        }
        return 'mediaprint.it';
    }

    private function normalizeHtmlMessage(?string $rawMessage, string $cliente, string $numero, ?int $anno, ?string $oggetto, ?float $totale): string
    {
        if ($rawMessage !== null && $rawMessage !== '') {
            $containsHtml = $rawMessage !== strip_tags($rawMessage);
            if ($containsHtml) {
                return $rawMessage;
            }
            $paragraphs = array_filter(array_map('trim', preg_split("/\r\n|\r|\n/", $rawMessage) ?: []), static fn ($p) => $p !== '');
            if (!empty($paragraphs)) {
                $escaped = array_map(static fn ($p) => htmlspecialchars($p, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'), $paragraphs);
                return '<p>' . implode('</p><p>', $escaped) . '</p>';
            }
        }

        $formattedTotale = $totale !== null ? $this->formatCurrency($totale) : 'il totale indicato';
        $safeCliente = htmlspecialchars($cliente, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeNumero = htmlspecialchars($numero, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeAnno = htmlspecialchars($anno !== null ? '/' . $anno : '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeOggetto = htmlspecialchars($oggetto ?? 'la lavorazione richiesta', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeTotale = htmlspecialchars($formattedTotale, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        return sprintf(
            '<p>Gentile %s,</p><p>in allegato trova il preventivo n. <strong>%s%s</strong> relativo a %s. Il valore complessivo del documento Ã¨ <strong>%s</strong>.</p><p>Restiamo a disposizione per ulteriori informazioni.</p><p>Cordiali saluti,<br />MediaPrint ERP</p>',
            $safeCliente,
            $safeNumero,
            $safeAnno,
            $safeOggetto,
            $safeTotale
        );
    }

    private function renderPreventivoEmailTemplate(array $info, string $introHtml): string
    {
        $summaryRows = [];
        if (!empty($info['cliente'])) {
            $summaryRows['Cliente'] = $info['cliente'];
        }
        if (!empty($info['numero'])) {
            $summaryRows['Numero preventivo'] = $info['numero'] . ($info['anno'] ? '/' . $info['anno'] : '');
        }
        if (!empty($info['data'])) {
            $summaryRows['Data preventivo'] = $info['data'];
        }
        if (!empty($info['oggetto'])) {
            $summaryRows['Oggetto'] = $info['oggetto'];
        }
        if (!empty($info['riferimento'])) {
            $summaryRows['Riferimento cliente'] = $info['riferimento'];
        }
        if (array_key_exists('totale', $info)) {
            $summaryRows['Totale'] = $this->formatCurrency($info['totale']);
        }
        if (array_key_exists('totale_imponibile', $info)) {
            $summaryRows['Imponibile'] = $this->formatCurrency($info['totale_imponibile']);
        }
        if (array_key_exists('totale_iva', $info)) {
            $summaryRows['IVA'] = $this->formatCurrency($info['totale_iva']);
        }

        if (trim($introHtml) === '') {
            $introHtml = '<p>Gentile Cliente,</p><p>in allegato trova il preventivo aggiornato.</p>';
        }

        $preheaderParts = [];
        if (!empty($info['numero'])) {
            $preheaderParts[] = 'Preventivo ' . $info['numero'] . ($info['anno'] ? '/' . $info['anno'] : '');
        }
        if (!empty($info['cliente'])) {
            $preheaderParts[] = $info['cliente'];
        }
        $preheader = $preheaderParts !== [] ? implode(' · ', $preheaderParts) : 'Preventivo MediaPrint ERP';

        return EmailTemplate::render(
            'Preventivo',
            $introHtml,
            $summaryRows,
            $info['cliente'] ?? 'Cliente',
            null,
            null,
            (new \DateTimeImmutable('now'))->format('d/m/Y')
        );
    }

    private function formatCurrency(?float $value): string
    {
        if ($value === null) {
            return '-';
        }
        return number_format($value, 2, ',', '.') . ' €';
    }

    private function ensureAcceptanceSchema(): void
    {
        $pdo = $this->repository->getConnection();
        $pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS tb_preventivi_acceptance_links (
                id_link INT UNSIGNED NOT NULL AUTO_INCREMENT,
                id_preventivo INT NOT NULL,
                token_hash CHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                used_at DATETIME NULL,
                PRIMARY KEY (id_link),
                UNIQUE KEY uq_token_hash (token_hash),
                KEY idx_prev (id_preventivo),
                CONSTRAINT fk_prev_acc_link_prev FOREIGN KEY (id_preventivo)
                    REFERENCES tb_preventivi (id_preventivo) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        SQL);
        $pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS tb_preventivi_acceptance_otp (
                id_otp INT UNSIGNED NOT NULL AUTO_INCREMENT,
                id_link INT UNSIGNED NOT NULL,
                channel VARCHAR(16) NOT NULL DEFAULT 'email',
                destination VARCHAR(255) NOT NULL,
                otp_hash CHAR(64) NOT NULL,
                attempts INT NOT NULL DEFAULT 0,
                expires_at DATETIME NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                verified_at DATETIME NULL,
                request_ip VARCHAR(64) NULL,
                user_agent VARCHAR(255) NULL,
                PRIMARY KEY (id_otp),
                KEY idx_link_created (id_link, created_at),
                CONSTRAINT fk_prev_acc_otp_link FOREIGN KEY (id_link)
                    REFERENCES tb_preventivi_acceptance_links (id_link) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        SQL);
        $pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS tb_preventivi_acceptance_receipts (
                id_receipt INT UNSIGNED NOT NULL AUTO_INCREMENT,
                id_preventivo INT NOT NULL,
                id_link INT UNSIGNED NOT NULL,
                signer_nome VARCHAR(255) NOT NULL,
                signer_cognome VARCHAR(255) NOT NULL,
                signer_email VARCHAR(255) NOT NULL,
                signer_cf_piva VARCHAR(32) NULL,
                otp_channel VARCHAR(16) NOT NULL,
                otp_destination VARCHAR(255) NOT NULL,
                accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(64) NULL,
                user_agent VARCHAR(255) NULL,
                evidence_json JSON NULL,
                PRIMARY KEY (id_receipt),
                KEY idx_prev (id_preventivo),
                CONSTRAINT fk_prev_acc_receipt_prev FOREIGN KEY (id_preventivo)
                    REFERENCES tb_preventivi (id_preventivo) ON DELETE CASCADE,
                CONSTRAINT fk_prev_acc_receipt_link FOREIGN KEY (id_link)
                    REFERENCES tb_preventivi_acceptance_links (id_link) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        SQL);
    }

    private function createAcceptanceLink(int $idPreventivo): string
    {
        $this->ensureAcceptanceSchema();
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        $hash = hash('sha256', $token);
        $expiresAt = (new \DateTimeImmutable('+30 days'))->format('Y-m-d H:i:s');
        $stmt = $this->repository->getConnection()->prepare(
            'INSERT INTO tb_preventivi_acceptance_links (id_preventivo, token_hash, expires_at) VALUES (:id, :hash, :expires_at)'
        );
        $stmt->bindValue(':id', $idPreventivo, \PDO::PARAM_INT);
        $stmt->bindValue(':hash', $hash, \PDO::PARAM_STR);
        $stmt->bindValue(':expires_at', $expiresAt, \PDO::PARAM_STR);
        $stmt->execute();
        return $token;
    }

    /**
     * @return array{id_link:int,id_preventivo:int,expires_at:string,used_at:?string}
     */
    private function getAcceptanceLinkByToken(string $token): array
    {
        $this->ensureAcceptanceSchema();
        $hash = hash('sha256', $token);
        $stmt = $this->repository->getConnection()->prepare(
            'SELECT id_link, id_preventivo, expires_at, used_at FROM tb_preventivi_acceptance_links WHERE token_hash = :hash LIMIT 1'
        );
        $stmt->bindValue(':hash', $hash, \PDO::PARAM_STR);
        $stmt->execute();
        $link = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
        if ($link === null) {
            throw new \RuntimeException('Link non valido.', 404);
        }
        if (!empty($link['used_at'])) {
            throw new \RuntimeException('Questo link è già stato utilizzato.', 410);
        }
        if (strtotime((string) $link['expires_at']) < time()) {
            throw new \RuntimeException('Link scaduto.', 410);
        }
        return [
            'id_link' => (int) $link['id_link'],
            'id_preventivo' => (int) $link['id_preventivo'],
            'expires_at' => (string) $link['expires_at'],
            'used_at' => isset($link['used_at']) ? (string) $link['used_at'] : null,
        ];
    }

    private function fetchPreventivoPdfFromJasper(int $idPreventivo): string
    {
        $remoteUrl = sprintf(
            'https://jaspersoft.mediaprint.it/jasperserver/rest_v2/reports/Mediaprint/GestionaleMP/Preventivi.pdf?id_preventivo=%d&j_username=gestionaleMp&j_password=gestionaleMp',
            $idPreventivo
        );

        $content = null;
        $sslVerify = getenv('JASPER_SSL_VERIFY');
        $verifySsl = !($sslVerify !== false && in_array(strtolower(trim((string) $sslVerify)), ['0', 'false', 'off', 'no'], true));
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 30,
                'ignore_errors' => true,
                'header' => "Accept: application/pdf\r\nUser-Agent: MediaPrint-ERP/1.0\r\n",
            ],
            'ssl' => [
                'verify_peer' => $verifySsl,
                'verify_peer_name' => $verifySsl,
            ],
        ]);
        $raw = @file_get_contents($remoteUrl, false, $context);
        if (is_string($raw) && $raw !== '') {
            $content = $raw;
        } elseif (function_exists('curl_init')) {
            $ch = curl_init($remoteUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_SSL_VERIFYPEER => $verifySsl,
                CURLOPT_SSL_VERIFYHOST => $verifySsl ? 2 : 0,
                CURLOPT_HTTPHEADER => [
                    'Accept: application/pdf',
                    'User-Agent: MediaPrint-ERP/1.0',
                ],
            ]);
            $curlRaw = curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
            curl_close($ch);
            if ($status >= 200 && $status < 300 && is_string($curlRaw) && $curlRaw !== '') {
                $content = $curlRaw;
            } elseif (is_string($curlRaw) && $curlRaw !== '') {
                $this->storeJasperDebugResponse($idPreventivo, $status, $contentType, $curlRaw);
            }
        }

        if (!is_string($content) || $content === '') {
            throw new \RuntimeException('Impossibile recuperare il PDF da Jasper.', 502);
        }
        if (strpos($content, '%PDF') !== 0) {
            $this->storeJasperDebugResponse($idPreventivo, 200, 'unknown', $content);
            throw new \RuntimeException('Risposta Jasper non valida: PDF non riconosciuto.', 502);
        }
        return $content;
    }

    private function storeJasperDebugResponse(int $idPreventivo, int $status, string $contentType, string $body): void
    {
        try {
            $baseDir = $this->getPreventiviPdfStorageDir();
            if (!is_dir($baseDir) && !mkdir($baseDir, 0775, true) && !is_dir($baseDir)) {
                return;
            }
            $snippet = substr($body, 0, 4000);
            $payload = "status={$status}\ncontent_type={$contentType}\n\n{$snippet}";
            @file_put_contents($baseDir . '/jasper_debug_' . $idPreventivo . '.txt', $payload, LOCK_EX);
        } catch (\Throwable $ignored) {
            // no-op
        }
    }

    private function getPreventivoPdfLocalPath(int $idPreventivo, bool $forceRefresh = false): string
    {
        $baseDir = $this->getPreventiviPdfStorageDir();
        if (!is_dir($baseDir) && !mkdir($baseDir, 0775, true) && !is_dir($baseDir)) {
            throw new \RuntimeException('Impossibile creare la cartella PDF preventivi.', 500);
        }
        $targetPath = $baseDir . '/preventivo_' . $idPreventivo . '.pdf';

        // Cache semplice: rigenera solo se non esiste o file troppo piccolo.
        $needsRefresh = $forceRefresh || !is_readable($targetPath) || (filesize($targetPath) !== false && (int) filesize($targetPath) < 500);
        if (!$needsRefresh) {
            return $targetPath;
        }
        $content = $this->fetchPreventivoPdfFromJasper($idPreventivo);
        if (@file_put_contents($targetPath, $content, LOCK_EX) === false) {
            throw new \RuntimeException('Impossibile salvare il PDF locale del preventivo.', 500);
        }
        return $targetPath;
    }

    private function getPublicApiBaseUrl(): string
    {
        $configured = getenv('PUBLIC_API_BASE_URL');
        if (is_string($configured) && trim($configured) !== '') {
            return rtrim(trim($configured), '/');
        }
        return 'https://gestionale.mediaprint.it/pubblica';
    }

    private function getPreventiviPdfStorageDir(): string
    {
        $configured = getenv('PREVENTIVI_PDF_DIR');
        if (is_string($configured) && trim($configured) !== '') {
            return rtrim(trim($configured), '/');
        }
        return dirname(__DIR__, 2) . '/d0cum3nt1/preventivi';
    }

    private function deleteAcceptancePdfArtifacts(int $idPreventivo): void
    {
        $baseDir = $this->getPreventiviPdfStorageDir();
        $candidates = [
            $baseDir . '/preventivo_' . $idPreventivo . '.pdf',
            $baseDir . '/preventivo_' . $idPreventivo . '_signed.pdf',
            $baseDir . '/preventivo_' . $idPreventivo . '_pdfa_tmp.pdf',
            $baseDir . '/jasper_debug_' . $idPreventivo . '.txt',
        ];
        foreach ($candidates as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }

    private function resetAcceptanceForPreventivo(int $idPreventivo): void
    {
        if ($idPreventivo <= 0) {
            return;
        }
        $this->deleteAcceptancePdfArtifacts($idPreventivo);
        $this->ensureAcceptanceSchema();
        $pdo = $this->repository->getConnection();
        $started = false;
        if (!$pdo->inTransaction()) {
            $pdo->beginTransaction();
            $started = true;
        }
        try {
            $linkIdsStmt = $pdo->prepare('SELECT id_link FROM tb_preventivi_acceptance_links WHERE id_preventivo = :id');
            $linkIdsStmt->bindValue(':id', $idPreventivo, \PDO::PARAM_INT);
            $linkIdsStmt->execute();
            $ids = $linkIdsStmt->fetchAll(\PDO::FETCH_COLUMN) ?: [];
            if (!empty($ids)) {
                $placeholders = [];
                foreach ($ids as $idx => $idLink) {
                    $placeholders[] = ':l' . $idx;
                }
                $delOtp = $pdo->prepare('DELETE FROM tb_preventivi_acceptance_otp WHERE id_link IN (' . implode(',', $placeholders) . ')');
                $delReceipt = $pdo->prepare('DELETE FROM tb_preventivi_acceptance_receipts WHERE id_link IN (' . implode(',', $placeholders) . ')');
                foreach ($ids as $idx => $idLink) {
                    $delOtp->bindValue(':l' . $idx, (int) $idLink, \PDO::PARAM_INT);
                    $delReceipt->bindValue(':l' . $idx, (int) $idLink, \PDO::PARAM_INT);
                }
                $delOtp->execute();
                $delReceipt->execute();
            }
            $resetLinks = $pdo->prepare(
                'UPDATE tb_preventivi_acceptance_links
                 SET used_at = NULL,
                     expires_at = :expires_at
                 WHERE id_preventivo = :id'
            );
            $resetLinks->bindValue(':id', $idPreventivo, \PDO::PARAM_INT);
            $resetLinks->bindValue(':expires_at', (new \DateTimeImmutable('+30 days'))->format('Y-m-d H:i:s'), \PDO::PARAM_STR);
            $resetLinks->execute();

            if ($started && $pdo->inTransaction()) {
                $pdo->commit();
            }

            // Best effort: traccia l'invalidazione firma in revisione/storico.
            try {
                $snapshot = $this->detail(['id' => $idPreventivo]);
                $this->repository->createRevision(
                    $idPreventivo,
                    'Accettazione invalidata per modifica documento.',
                    null,
                    [
                        'event' => 'acceptance_reset_on_edit',
                        'detail' => $snapshot,
                    ]
                );
            } catch (\Throwable $ignored) {
                // Non bloccare il flusso operativo se il log fallisce.
            }
        } catch (\Throwable $e) {
            if ($started && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    private function getGhostscriptBinary(): string
    {
        $bin = getenv('GS_BIN');
        return (is_string($bin) && trim($bin) !== '') ? trim($bin) : 'gs';
    }

    private function getQpdfBinary(): string
    {
        $bin = getenv('QPDF_BIN');
        return (is_string($bin) && trim($bin) !== '') ? trim($bin) : 'qpdf';
    }

    private function commandExists(string $command): bool
    {
        $checkCmd = stripos(PHP_OS_FAMILY, 'Windows') === 0
            ? 'where ' . escapeshellarg($command)
            : 'command -v ' . escapeshellarg($command) . ' >/dev/null 2>&1';
        $output = [];
        $code = 1;
        @exec($checkCmd, $output, $code);
        return $code === 0;
    }

    /**
     * @param array<string,mixed> $receipt
     */
    private function buildSignatureWatermark(array $receipt): string
    {
        $fullName = trim(((string) ($receipt['nome'] ?? '')) . ' ' . ((string) ($receipt['cognome'] ?? '')));
        $email = (string) ($receipt['email'] ?? '');
        $acceptedAt = (string) ($receipt['accepted_at'] ?? '');
        $idReceipt = (string) ($receipt['id_receipt'] ?? '');
        $parts = array_values(array_filter([
            $fullName !== '' ? $fullName : null,
            $email !== '' ? $email : null,
            $acceptedAt !== '' ? $acceptedAt : null,
            $idReceipt !== '' ? ('ID ' . $idReceipt) : null,
        ]));
        return 'Accettato OTP - ' . implode(' | ', $parts);
    }

    /**
     * @param array<string,mixed> $receipt
     */
    private function buildSignatureFooter(array $receipt): string
    {
        $fullName = trim(((string) ($receipt['nome'] ?? '')) . ' ' . ((string) ($receipt['cognome'] ?? '')));
        $email = (string) ($receipt['email'] ?? '');
        $acceptedAt = (string) ($receipt['accepted_at'] ?? '');
        $idReceipt = (string) ($receipt['id_receipt'] ?? '');
        return trim(sprintf(
            'Firma elettronica semplice OTP - %s - %s - %s - ricevuta #%s',
            $fullName !== '' ? $fullName : 'N/D',
            $email !== '' ? $email : 'N/D',
            $acceptedAt !== '' ? $acceptedAt : 'N/D',
            $idReceipt !== '' ? $idReceipt : 'N/D'
        ));
    }

    /**
     * Converte PDF in PDF/A e applica filigrana firma OTP.
     * Ritorna path del file firmato se disponibile.
     *
     * @param array<string,mixed> $receipt
     */
    private function generateSignedAcceptancePdf(int $idPreventivo, array $receipt): ?string
    {
        $inputPath = $this->getPreventivoPdfLocalPath($idPreventivo, true);
        if (!is_readable($inputPath)) {
            return null;
        }

        $baseDir = $this->getPreventiviPdfStorageDir();
        $signedPath = $baseDir . '/preventivo_' . $idPreventivo . '_signed.pdf';
        $tmpPdfaPath = $baseDir . '/preventivo_' . $idPreventivo . '_pdfa_tmp.pdf';

        $gs = $this->getGhostscriptBinary();
        if (!$this->commandExists($gs)) {
            return null;
        }

        $watermark = $this->buildSignatureWatermark($receipt);
        $footer = $this->buildSignatureFooter($receipt);
        $watermarkSafe = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $watermark);
        $footerSafe = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $footer);
        $beginPageScript = "<< /BeginPage {" .
            "2 dict begin " .
            "/Helvetica-Bold findfont 42 scalefont setfont " .
            "0.88 setgray " .
            "306 430 moveto 35 rotate (" . $watermarkSafe . ") show -35 rotate " .
            "/Helvetica findfont 9 scalefont setfont " .
            "0.35 setgray " .
            // Footer firma: ancorato dal primo pixel utile in basso a sinistra.
            "0 10 moveto (" . $footerSafe . ") show " .
            "end" .
            "} >> setpagedevice";
        $gsCmd = sprintf(
            '%s -dBATCH -dNOPAUSE -dSAFER -sDEVICE=pdfwrite -dCompatibilityLevel=1.7 -dPDFA=2 -dPDFACompatibilityPolicy=1 -sOutputFile=%s -c %s -f %s',
            escapeshellcmd($gs),
            escapeshellarg($tmpPdfaPath),
            escapeshellarg($beginPageScript),
            escapeshellarg($inputPath)
        );
        $out = [];
        $code = 1;
        @exec($gsCmd . ' 2>&1', $out, $code);
        if ($code !== 0 || !is_readable($tmpPdfaPath)) {
            return null;
        }

        $qpdf = $this->getQpdfBinary();
        if ($this->commandExists($qpdf)) {
            $ownerPwd = bin2hex(random_bytes(16));
            $qpdfCmd = sprintf(
                '%s --encrypt %s %s 256 --modify=none --annotate=n --extract=n --print=full -- %s %s',
                escapeshellcmd($qpdf),
                escapeshellarg(''),
                escapeshellarg($ownerPwd),
                escapeshellarg($tmpPdfaPath),
                escapeshellarg($signedPath)
            );
            $qOut = [];
            $qCode = 1;
            @exec($qpdfCmd . ' 2>&1', $qOut, $qCode);
            if ($qCode === 0 && is_readable($signedPath)) {
                @unlink($tmpPdfaPath);
                if ($inputPath !== $signedPath && is_readable($inputPath)) {
                    @unlink($inputPath);
                }
                return $signedPath;
            }
        }

        // Fallback: se qpdf non disponibile, tieni almeno PDF/A con watermark.
        @rename($tmpPdfaPath, $signedPath);
        if (is_readable($signedPath) && $inputPath !== $signedPath && is_readable($inputPath)) {
            @unlink($inputPath);
        }
        return is_readable($signedPath) ? $signedPath : null;
    }

    /**
     * @return array<string, mixed>
     */
    public function detail(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido.', 422);
        }

        $row = $this->repository->fetchDetail($id);
        if ($row === null) {
            throw new \RuntimeException('Preventivo non trovato.', 404);
        }
        if (array_key_exists('is_acquisto', $input) && (int) ($row['is_acquisto'] ?? 0) !== (int) $input['is_acquisto']) {
            throw new \RuntimeException('Preventivo non trovato.', 404);
        }
        if (isset($input['allowed_anagrafiche']) && is_array($input['allowed_anagrafiche'])) {
            $allowed = array_map('intval', $input['allowed_anagrafiche']);
            if (!in_array((int) $row['id_anagrafica'], $allowed, true)) {
                throw new \RuntimeException('Preventivo non trovato.', 404);
            }
        }
        if (!empty($input['exclude_draft'])) {
            $statusCode = strtolower((string) ($row['stato_code'] ?? 'bozza'));
            if ($statusCode === 'bozza') {
                throw new \RuntimeException('Preventivo non trovato.', 404);
            }
        }

        $linkedDdt = isset($row['linked_ddt']) && is_array($row['linked_ddt']) ? $row['linked_ddt'] : [];
        $linkedFatture = isset($row['linked_fatture']) && is_array($row['linked_fatture']) ? $row['linked_fatture'] : [];
        unset($row['linked_ddt'], $row['linked_fatture']);

        $statusCode = strtolower((string) ($row['stato_code'] ?? 'bozza'));
        $editable = in_array($statusCode, ['bozza', 'revisionato_ced'], true);
        $righe = $this->repository->getLines($id);
        $stockAlerts = $this->repository->computeStockAlertsForPreventivo($id);
        $cedMap = $this->repository->listCedQuantitiesForPreventivo($id);
        foreach ($righe as &$riga) {
            $idRiga = isset($riga['id_riga']) ? (int) $riga['id_riga'] : 0;
            $cedQty = $idRiga > 0 && array_key_exists($idRiga, $cedMap) ? $cedMap[$idRiga] : null;
            $riga['quantita_ced'] = $cedQty;
            $warning = false;
            if ($cedQty !== null) {
                $diff = abs((float) $cedQty - (float) ($riga['quantita'] ?? 0));
                if ($diff > 0.0001) {
                    $warning = true;
                }
            } elseif (!empty($riga['created_by_ced'])) {
                $warning = true;
            }
            $riga['ced_warning'] = $warning;
        }
        unset($riga);
        $cig = $this->repository->getCigList($id);
        $determine = $this->repository->getDetermineList($id);
        $contatti = $this->repository->getContatti($id);
        // Oggetti selezionati (multi-select) e relative etichette
        $selectedOggettiRows = $this->repository->getOggettiForPreventivo($id);
        $selectedOggettiIds = [];
        $selectedOggettiDetail = [];
        foreach ($selectedOggettiRows as $item) {
            $oid = isset($item['id_oggetto']) ? (int) $item['id_oggetto'] : 0;
            if ($oid <= 0) {
                continue;
            }
            $selectedOggettiIds[] = $oid;
            $selectedOggettiDetail[] = [
                'id_oggetto' => $oid,
                'label' => isset($item['label']) && $item['label'] !== null ? (string) $item['label'] : null,
                'attivo' => isset($item['attivo']) ? (int) $item['attivo'] : 0,
                'ordering' => isset($item['ordering']) ? (int) $item['ordering'] : null,
            ];
        }
        $row['oggetti'] = $selectedOggettiIds;
        $row['oggetti_detail'] = $selectedOggettiDetail;
        $statuses = $this->repository->listStatuses();
        $currentStatus = [
            'code' => $row['stato_code'] ?? null,
            'label' => $row['stato_label'] ?? ($row['stato_code'] ?? null),
        ];
        $revisions = $this->repository->listRevisions($id);
        $acceptanceExists = false;
        try {
            $stmtAcc = $this->repository->getConnection()->prepare(
                'SELECT 1 FROM tb_preventivi_acceptance_receipts WHERE id_preventivo = :id LIMIT 1'
            );
            $stmtAcc->bindValue(':id', $id, \PDO::PARAM_INT);
            $stmtAcc->execute();
            $acceptanceExists = $stmtAcc->fetchColumn() !== false;
        } catch (\Throwable $ignored) {
            $acceptanceExists = false;
        }
        return [
            'data' => $row,
            'righe' => $righe,
            'stock_alerts' => $stockAlerts,
            'cig' => $cig,
            'determine' => $determine,
            'contatti' => $contatti,
            'linked_ddt' => $linkedDdt,
            'linked_fatture' => $linkedFatture,
            'meta' => [
                'editable' => $editable,
                'stock_alerts_count' => count($stockAlerts),
                'statuses' => $statuses,
                'current_status' => $currentStatus,
                'revisions' => $revisions,
                'acceptance_exists' => $acceptanceExists,
            ],
        ];
    }

    /**
     * @return array{data: list<array<string, mixed>>}
     */
    public function listLatest(array $input): array
    {
        $limit = isset($input['limit']) ? (int) $input['limit'] : 10;
        if ($limit > 0) {
            $limit = max(1, min($limit, 5000));
        }
        $idAnagrafica = isset($input['id_anagrafica']) ? (int) $input['id_anagrafica'] : 0;

        $allowed = isset($input['allowed_anagrafiche']) && is_array($input['allowed_anagrafiche'])
            ? $input['allowed_anagrafiche']
            : null;
        $excludeDraft = !empty($input['exclude_draft']);
        $isAcquisto = array_key_exists('is_acquisto', $input) ? (int) $input['is_acquisto'] : 0;
        $rows = $this->repository->listLatest(
            $limit,
            $allowed,
            $excludeDraft,
            $isAcquisto,
            $idAnagrafica > 0 ? $idAnagrafica : null
        );
        foreach ($rows as &$row) {
            $statusCode = strtolower((string) ($row['stato_code'] ?? ''));
            $warning = false;
            if ($statusCode === 'revisionato_ced') {
                $idPreventivo = isset($row['id_preventivo']) ? (int) $row['id_preventivo'] : 0;
                if ($idPreventivo > 0) {
                    $lines = $this->repository->getLines($idPreventivo);
                    $cedMap = $this->repository->listCedQuantitiesForPreventivo($idPreventivo);
                    foreach ($lines as $line) {
                        $cedQty = isset($line['id_riga']) ? ($cedMap[(int)$line['id_riga']] ?? null) : null;
                        if ($cedQty !== null) {
                            $diff = abs((float) $cedQty - (float) ($line['quantita'] ?? 0));
                            if ($diff > 0.0001) {
                                $warning = true;
                                break;
                            }
                        } elseif (!empty($line['created_by_ced'])) {
                            $warning = true;
                            break;
                        }
                    }
                }
            }
            $row['ced_warning'] = $warning;
        }
        unset($row);

        return [
            'data' => $rows,
        ];
    }

    /**
     * Elenco preventivi archiviati con ricerca/sort/paginazione lato server.
     *
     * @return array{data: list<array<string,mixed>>, meta: array<string,int>}
     */
    public function listArchived(array $input): array
    {
        $filters = [
            'search' => isset($input['search']) ? (string) $input['search'] : null,
            'sort_by' => isset($input['sort_by']) ? (string) $input['sort_by'] : 'data_preventivo',
            'sort_direction' => (isset($input['sort_direction']) && strtolower((string)$input['sort_direction']) === 'asc') ? 'asc' : 'desc',
            'page' => isset($input['page']) ? max(1, (int) $input['page']) : 1,
            'per_page' => isset($input['per_page']) ? max(1, (int) $input['per_page']) : 20,
        ];
        if (isset($input['allowed_anagrafiche']) && is_array($input['allowed_anagrafiche'])) {
            $filters['allowed_ids'] = $input['allowed_anagrafiche'];
        }
        if (!empty($input['exclude_draft'])) {
            $filters['exclude_draft'] = true;
        }
        if (array_key_exists('is_acquisto', $input)) {
            $filters['is_acquisto'] = (int) $input['is_acquisto'];
        }

        $result = $this->repository->searchArchived($filters);
        $total = (int) $result['total'];
        $perPage = (int) $filters['per_page'];
        $page = (int) $filters['page'];
        $pages = (int) max(1, (int) ceil($total / max($perPage, 1)));

        return [
            'data' => $result['data'],
            'meta' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'pages' => $pages,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function changeStatus(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido.', 422);
        }

        $code = isset($input['stato']) ? (string) $input['stato'] : (isset($input['code']) ? (string) $input['code'] : '');
        $code = strtolower(trim($code));
        if ($code === '') {
            throw new \RuntimeException('Codice stato mancante.', 422);
        }

        $existing = $this->repository->getById($id);
        if ($existing === null) {
            throw new \RuntimeException('Preventivo non trovato.', 404);
        }
        $previousStatusCode = strtolower((string) ($existing['stato_code'] ?? ''));

        $status = $this->repository->findStatusByCode($code);
        if ($status === null) {
            throw new \RuntimeException('Stato preventivo non valido.', 422);
        }

        $this->repository->updateStatus($id, $status['id_stato']);
        if ($code === 'confermato') {
            $this->repository->reserveStockForPreventivo($id);
        } elseif ($previousStatusCode === 'confermato' && $code !== 'confermato') {
            $this->repository->releaseStockReservationForPreventivo($id);
        }

        $detail = $this->repository->fetchDetail($id);
        if ($detail === null) {
            throw new \RuntimeException('Preventivo non trovato dopo l\'aggiornamento.', 500);
        }

        $operatorName = isset($input['operatore']) ? trim((string) $input['operatore']) : null;
        if ($operatorName === '') {
            $operatorName = null;
        }
        $revisionNote = isset($input['note']) ? trim((string) $input['note']) : null;
        if ($revisionNote === '') {
            $revisionNote = null;
        }
        if ($code === 'inviato') {
            $notePayload = $revisionNote ?? 'Stato impostato come inviato dal timeline.';
            try {
                $snapshot = $this->detail(['id' => $id]);
                $this->repository->createRevision($id, $notePayload, $operatorName, ['detail' => $snapshot]);
            } catch (\Throwable $ignored) {
                // Non bloccare l'aggiornamento dello stato se il log fallisce
            }
        }

        $statusCode = strtolower((string) ($detail['stato_code'] ?? 'bozza'));
        $editable = in_array($statusCode, ['bozza', 'revisionato_ced'], true);
        $statuses = $this->repository->listStatuses();

        return [
            'data' => $detail,
            'meta' => [
                'editable' => $editable,
                'statuses' => $statuses,
                'current_status' => [
                    'code' => $detail['stato_code'] ?? null,
                    'label' => $detail['stato_label'] ?? ($detail['stato_code'] ?? null),
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function create(array $input): array
    {
        $idPrev = isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0;
        $isAcquisto = !empty($input['is_acquisto']) ? 1 : 0;
        $idAnagrafica = isset($input['id_anagrafica']) ? (int) $input['id_anagrafica'] : 0;
        if ($idPrev <= 0 && $idAnagrafica <= 0) {
            throw new \RuntimeException('Cliente (anagrafica) mancante o non valido.', 422);
        }
        $mittenteId = isset($input['id_mittente']) ? (int) $input['id_mittente'] : 0;
        if ($mittenteId <= 0 && $idAnagrafica > 0) {
            $mittenteId = $idAnagrafica;
        }

        // Vincolo: l'anagrafica deve essere attiva per creare/aggiornare/confirmare un preventivo
        if ($idAnagrafica > 0 && !$this->repository->existsAnagrafica($idAnagrafica)) {
            throw new \RuntimeException('Anagrafica disattivata o inesistente. Operazione non consentita.', 422);
        }
        if ($mittenteId > 0 && !$this->repository->existsAnagrafica($mittenteId)) {
            throw new \RuntimeException('Mittente spedizione disattivato o inesistente. Operazione non consentita.', 422);
        }

        $dataPrev = isset($input['data_preventivo']) ? (string) $input['data_preventivo'] : null;
        $note = isset($input['note']) ? (string) $input['note'] : null;
        $noteDirty = array_key_exists('note_dirty', $input)
            ? (bool) $input['note_dirty']
            : ($note !== null && trim($note) !== '');
        $oggetto = isset($input['oggetto']) ? (string) $input['oggetto'] : null; // kept for compatibility; will be overridden by computed text
        // Multi-select oggetti + testo custom
        $oggettiIds = [];
        if (isset($input['oggetti']) && is_array($input['oggetti'])) {
            foreach ($input['oggetti'] as $oid) {
                $oid = (int) $oid;
                if ($oid > 0) { $oggettiIds[] = $oid; }
            }
        }
        // Niente testo custom: rimosso
        $rifCliente = isset($input['riferimento_cliente']) ? (string) $input['riferimento_cliente'] : null;

        $totImpon = isset($input['totale_imponibile']) ? (float) $input['totale_imponibile'] : 0.0;
        $totSconto = isset($input['totale_sconto']) ? (float) $input['totale_sconto'] : 0.0;
        $totIva = isset($input['totale_iva']) ? (float) $input['totale_iva'] : 0.0;
        $totale = isset($input['totale']) ? (float) $input['totale'] : ($totImpon + $totIva);

        $send = isset($input['send']) ? (int) $input['send'] === 1 : false;
        $lines = [];
        $hasLinesPayload = array_key_exists('righe', $input);
        if ($hasLinesPayload && is_array($input['righe'])) {
            // normalizza righe
            foreach ($input['righe'] as $r) {
                if (!is_array($r)) continue;
                $comboKeyRaw = $r['combo_key'] ?? ($r['comboKey'] ?? null);
                $comboKey = $comboKeyRaw !== null ? trim((string) $comboKeyRaw) : null;
                if ($comboKey === '') {
                    $comboKey = null;
                }
            $lineId = isset($r['id_riga']) ? (int) $r['id_riga'] : (isset($r['id_riga_preventivo']) ? (int) $r['id_riga_preventivo'] : 0);
            if ($idPrev <= 0) {
                // Nuovo preventivo (es. duplicazione): non riutilizzare PK esistenti delle righe.
                $lineId = 0;
            }
            $lines[] = [
                'descrizione' => (string) ($r['descrizione'] ?? ''),
                'quantita' => isset($r['quantita']) ? (float) $r['quantita'] : 1.0,
                'prezzo' => isset($r['prezzo']) ? (float) $r['prezzo'] : (isset($r['prezzo_unitario']) ? (float) $r['prezzo_unitario'] : 0.0),
                'sconto' => isset($r['sconto']) ? (float) $r['sconto'] : 0.0,
                'iva' => isset($r['iva']) ? (float) $r['iva'] : 22.0,
                'id_prodotto' => isset($r['id_prodotto']) ? (int) $r['id_prodotto'] : null,
                'combo_key' => $comboKey,
                'id_sdi_natura_iva' => isset($r['id_sdi_natura_iva']) ? (int) $r['id_sdi_natura_iva'] : null,
                'id_riga' => $lineId,
            ];
        }
    }

        // Normalizza CIG e Determine (opzionali)
        $cigItems = [];
        if (isset($input['cig']) && is_array($input['cig'])) {
            foreach ($input['cig'] as $c) {
                if (!is_array($c)) continue;
                $cigItems[] = [
                    'cig' => (string) ($c['cig'] ?? $c['code'] ?? ''),
                    'data_cig' => isset($c['data_cig']) ? (string) $c['data_cig'] : (isset($c['data']) ? (string) $c['data'] : null),
                    'motivazione' => isset($c['motivazione']) ? (string) $c['motivazione'] : (isset($c['note']) ? (string) $c['note'] : null),
                ];
            }
        }
        $detItems = [];
        if (isset($input['determine']) && is_array($input['determine'])) {
            foreach ($input['determine'] as $d) {
                if (!is_array($d)) continue;
                $detItems[] = [
                    'determina' => (string) ($d['determina'] ?? $d['numero'] ?? ''),
                    'data_determina' => isset($d['data_determina']) ? (string) $d['data_determina'] : (isset($d['data']) ? (string) $d['data'] : null),
                    'motivazione' => isset($d['motivazione']) ? (string) $d['motivazione'] : (isset($d['note']) ? (string) $d['note'] : null),
                ];
            }
        } elseif (isset($input['determina']) && is_array($input['determina'])) { // compat: 'determina'
            foreach ($input['determina'] as $d) {
                if (!is_array($d)) continue;
                $detItems[] = [
                    'determina' => (string) ($d['determina'] ?? $d['numero'] ?? ''),
                    'data_determina' => isset($d['data_determina']) ? (string) $d['data_determina'] : (isset($d['data']) ? (string) $d['data'] : null),
                    'motivazione' => isset($d['motivazione']) ? (string) $d['motivazione'] : (isset($d['note']) ? (string) $d['note'] : null),
                ];
            }
        }

        $contactItems = [];
        if (isset($input['contatti']) && is_array($input['contatti'])) {
            foreach ($input['contatti'] as $contatto) {
                if (!is_array($contatto)) {
                    continue;
                }
                $nome = trim((string) ($contatto['nome'] ?? ''));
                $ruolo = trim((string) ($contatto['ruolo'] ?? ''));
                $telefono = trim((string) ($contatto['telefono'] ?? ''));
                $cellulare = trim((string) ($contatto['cellulare'] ?? ''));
                $email = trim((string) ($contatto['email'] ?? ''));
                $note = trim((string) ($contatto['note'] ?? ''));
                if ($nome === '' && $ruolo === '' && $telefono === '' && $cellulare === '' && $email === '' && $note === '') {
                    continue;
                }
                $idContattoAnagrafica = isset($contatto['id_contatto_anagrafica']) ? (int) $contatto['id_contatto_anagrafica'] : null;
                $idContattoAnagrafica = ($idContattoAnagrafica !== null && $idContattoAnagrafica > 0) ? $idContattoAnagrafica : null;
                $contactAnagraficaId = isset($contatto['id_anagrafica']) ? (int) $contatto['id_anagrafica'] : null;
                if ($contactAnagraficaId === null || $contactAnagraficaId <= 0) {
                    $contactAnagraficaId = $idAnagrafica > 0 ? $idAnagrafica : null;
                }
                $origineRaw = strtolower((string) ($contatto['origine'] ?? ''));
                $origine = $origineRaw === 'anagrafica' ? 'anagrafica' : 'manuale';

                $contactItems[] = [
                    'nome' => $nome,
                    'ruolo' => $ruolo,
                    'telefono' => $telefono,
                    'cellulare' => $cellulare,
                    'email' => $email,
                    'note' => $note,
                    'origine' => $origine,
                    'id_contatto_anagrafica' => $idContattoAnagrafica,
                    'id_anagrafica' => $contactAnagraficaId,
                ];
            }
        }

        if ($idPrev > 0) {
            $existing = $this->repository->getById($idPrev);
            if ($existing === null) {
                throw new \RuntimeException('Preventivo non trovato.', 404);
            }
            $existingStatus = strtolower((string) ($existing['stato_code'] ?? ''));
            if ($existingStatus !== '' && !in_array($existingStatus, ['bozza', 'revisionato_ced'], true) && !$send) {
                throw new \RuntimeException('Il preventivo non Ã¨ in stato bozza o revisionato CED, impossibile aggiornare.', 422);
            }

            // Se non passato un id_anagrafica valido, verifica comunque che l'anagrafica legata sia attiva
            if ($idAnagrafica <= 0) {
                $curr = $this->repository->fetchDetail($idPrev);
                if ($curr && isset($curr['id_anagrafica']) && !$this->repository->existsAnagrafica((int)$curr['id_anagrafica'])) {
                    throw new \RuntimeException('Anagrafica disattivata o inesistente. Operazione non consentita.', 422);
                }
            }

            if ($existingStatus === 'revisionato_ced') {
                try {
                    $snapshot = $this->detail(['id' => $idPrev]);
                    $this->repository->createRevision($idPrev, 'Revisione automatica prima della modifica CED.', null, [
                        'detail' => $snapshot,
                    ]);
                } catch (\Throwable $ignored) {
                    // Non bloccare l'aggiornamento se la revisione fallisce.
                }
            }

            // Il documento è stato modificato: invalida firma/accettazione precedente
            // e riapre il flusso OTP per una nuova sottoscrizione.
            $this->resetAcceptanceForPreventivo($idPrev);

            $updated = $this->repository->updateDraft($idPrev, [
                'id_anagrafica' => $idAnagrafica ?: null,
                'id_mittente' => $mittenteId > 0 ? $mittenteId : null,
                'data_preventivo' => $dataPrev,
                'note' => $note,
                'note_dirty' => $noteDirty ? 1 : 0,
                'oggetto' => $oggetto, // will be recomputed from selections below
                'riferimento_cliente' => $rifCliente,
                'totale_imponibile' => $totImpon,
                'totale_sconto' => $totSconto,
                'totale_iva' => $totIva,
                'totale' => $totale,
            ]);

            // Aggiorna selezioni oggetto + testo (solo da label selezionate)
            $this->repository->replaceOggettiAndUpdateText($idPrev, $oggettiIds);

            if ($hasLinesPayload) {
                // aggiorna righe bozza (consente anche svuotamento)
                $this->repository->replaceLines($idPrev, $lines);
                $this->syncPostaliRowsForPreventivo($idPrev);
            }
            // sostituisce CIG e Determine (consente anche svuotamento)
            $this->repository->replaceCig($idPrev, $cigItems);
            $this->repository->replaceDetermine($idPrev, $detItems);
            $this->repository->replaceContatti($idPrev, $contactItems);

            if ($send) {
                $numbered = $this->repository->confirmAndNumber($idPrev);
                $stockAlerts = $this->repository->computeStockAlertsForPreventivo($idPrev);
                return [
                    'status' => 'sent',
                    'id_preventivo' => $numbered['id_preventivo'],
                    'anno_preventivo' => $numbered['anno_preventivo'],
                    'numero_documento' => $numbered['numero_documento'],
                    'stock_alerts' => $stockAlerts,
                ];
            }

            $updatedFields = [
                'id_anagrafica' => $idAnagrafica ?: null,
                'id_mittente' => $mittenteId > 0 ? $mittenteId : null,
                'data_preventivo' => $dataPrev,
                'oggetto' => $oggetto,
                'riferimento_cliente' => $rifCliente,
                'totale_imponibile' => $totImpon,
                'totale_sconto' => $totSconto,
                'totale_iva' => $totIva,
                'totale' => $totale,
            ];
            if ($noteDirty) {
                $updatedFields['note'] = $note;
            }

            $stockAlerts = $this->repository->computeStockAlertsForPreventivo($idPrev);
            return [
                'status' => 'draft',
                'id_preventivo' => $updated['id_preventivo'],
                'anno_preventivo' => $updated['anno_preventivo'] ?? null,
                'numero_documento' => $updated['numero_documento'] ?? null,
                'updated_fields' => $updatedFields,
                'stock_alerts' => $stockAlerts,
            ];
        }

        // Nuova bozza con progressivo
        $draft = $this->repository->insertDraft([
            'id_anagrafica' => $idAnagrafica,
            'id_mittente' => $mittenteId > 0 ? $mittenteId : null,
            'data_preventivo' => $dataPrev,
            'note' => $note,
            'oggetto' => $oggetto, // will be recomputed from selections
            'riferimento_cliente' => $rifCliente,
            'totale_imponibile' => $totImpon,
            'totale_sconto' => $totSconto,
            'totale_iva' => $totIva,
            'totale' => $totale,
            'is_acquisto' => $isAcquisto,
        ]);

        // Imposta selezioni multi-oggetto e aggiorna testo
        $this->repository->replaceOggettiAndUpdateText($draft['id_preventivo'], $oggettiIds);

        if ($hasLinesPayload) {
            $this->repository->replaceLines($draft['id_preventivo'], $lines);
            $this->syncPostaliRowsForPreventivo($draft['id_preventivo']);
        }
        // Inserisce CIG/Determine per la bozza
        $this->repository->replaceCig($draft['id_preventivo'], $cigItems);
        $this->repository->replaceDetermine($draft['id_preventivo'], $detItems);
        $this->repository->replaceContatti($draft['id_preventivo'], $contactItems);

        if ($send) {
            $numbered = $this->repository->confirmAndNumber($draft['id_preventivo']);
            $stockAlerts = $this->repository->computeStockAlertsForPreventivo($draft['id_preventivo']);
            return [
                'status' => 'sent',
                'id_preventivo' => $numbered['id_preventivo'],
                'anno_preventivo' => $numbered['anno_preventivo'],
                'numero_documento' => $numbered['numero_documento'],
                'stock_alerts' => $stockAlerts,
            ];
        }

        $stockAlerts = $this->repository->computeStockAlertsForPreventivo($draft['id_preventivo']);
        return [
            'status' => 'draft',
            'id_preventivo' => $draft['id_preventivo'],
            'anno_preventivo' => $draft['anno_preventivo'] ?? null,
            'numero_documento' => $draft['numero_documento'] ?? null,
            'stock_alerts' => $stockAlerts,
        ];
    }

    /**
     * Invia il preventivo via email utilizzando un template predefinito.
     *
     * @return array{ok:bool, preview:array<string,mixed>}
     */
    public function sendEmail(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido per invio email.', 422);
        }

        $detail = $this->repository->fetchDetail($id);
        if ($detail === null) {
            throw new \RuntimeException('Preventivo non trovato.', 404);
        }

        $toList = $this->normalizeEmailList($input['to'] ?? null);
        if (empty($toList)) {
            throw new \RuntimeException('Specificare almeno un destinatario email valido.', 422);
        }
        $ccList = $this->normalizeEmailList($input['cc'] ?? null);

        $cliente = $detail['cliente_ragione_sociale'] ?? 'Cliente';
        $numero = $detail['numero_documento'] ?? null;
        $anno = $detail['anno_preventivo'] ?? null;
        $totale = isset($detail['totale']) ? (float) $detail['totale'] : null;
        $subject = trim((string) ($input['subject'] ?? ''));
        if ($subject === '') {
            $subject = sprintf(
                'Preventivo %s%s - %s',
                $numero !== null ? $numero : '',
                $anno !== null ? '/' . $anno : '',
                $cliente
            );
        }
        $revisionNote = isset($input['revision_note']) ? trim((string) $input['revision_note']) : null;
        if ($revisionNote === '') {
            $revisionNote = null;
        }
        $revisionOperator = isset($input['revision_operator']) ? trim((string) $input['revision_operator']) : null;
        if ($revisionOperator === '') {
            $revisionOperator = null;
        }
        if ($revisionNote === null && $subject !== '') {
            $revisionNote = sprintf('Oggetto email: %s', $subject);
        }

        $rawMessage = trim((string) ($input['message_html'] ?? $input['message'] ?? ''));
        $introHtml = $this->normalizeHtmlMessage(
            $rawMessage !== '' ? $rawMessage : null,
            $cliente,
            $numero !== null ? (string) $numero : (string) $id,
            $anno,
            $detail['oggetto'] ?? 'la lavorazione richiesta',
            $totale
        );
        $acceptToken = $this->createAcceptanceLink($id);
        $publicBase = getenv('PUBLIC_APP_BASE_URL') ?: 'https://gestionale.mediaprint.it';
        $publicBase = rtrim((string) $publicBase, '/');
        $acceptanceUrl = $publicBase . '/#/preventivi/accetta?token=' . rawurlencode($acceptToken);

        $messageHtml = $this->renderPreventivoEmailTemplate([
            'cliente' => $cliente,
            'numero' => $numero,
            'anno' => $anno,
            'data' => $detail['data_preventivo'] ?? null,
            'oggetto' => $detail['oggetto'] ?? null,
            'riferimento' => $detail['riferimento_cliente'] ?? null,
            'totale' => $totale,
            'totale_imponibile' => $detail['totale_imponibile'] ?? null,
            'totale_iva' => $detail['totale_iva'] ?? null,
        ], $introHtml);
        $messageHtml .= sprintf(
            '<p><a href="%s" style="display:inline-block;padding:10px 14px;background:#0d6efd;color:#ffffff;text-decoration:none;border-radius:6px;">Accetta online il preventivo</a></p><p style="font-size:12px;color:#6c757d;">Se il pulsante non funziona, copia e incolla questo link: %s</p>',
            htmlspecialchars($acceptanceUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
            htmlspecialchars($acceptanceUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
        );

        $fromAddress = isset($input['from']) && filter_var($input['from'], FILTER_VALIDATE_EMAIL)
            ? $input['from']
            : (getenv('SMTP_FROM_ADDRESS') ?: 'no-reply-mail@mediaprint.it');
        $fromName = isset($input['from_name']) && trim((string) $input['from_name']) !== ''
            ? trim((string) $input['from_name'])
            : 'MediaPrint ERP';
        $mailer = new SmtpMailer();
        $smtpError = null;
        try {
            $sent = $mailer->send($toList, $ccList, $subject, $messageHtml, $fromAddress, $fromName, [
                'mediaprint-logo' => EmailTemplate::getLogoPath(),
            ]);
        } catch (\Throwable $e) {
            $sent = false;
            $smtpError = $e->getMessage();
        }

        $updatedDetail = null;
        if ($sent) {
            try {
                $inviatoStatus = $this->repository->findStatusByCode('inviato');
                if ($inviatoStatus !== null) {
                    $this->repository->updateStatus($id, (int) $inviatoStatus['id_stato']);
                }
            } catch (\Throwable $ignored) {
                // non bloccare l'invio se l'update dello stato fallisce
            }

            try {
                $updatedDetail = $this->detail(['id' => $id]);
            } catch (\Throwable $ignored) {
                $updatedDetail = null;
            }

            try {
                $this->repository->createRevision($id, $revisionNote, $revisionOperator, ['detail' => $updatedDetail]);
            } catch (\Throwable $ignored) {
                // Non bloccare l'invio se il log fallisce
            }

        }

        return [
            'ok' => $sent,
            'preview' => [
                'to' => $toList,
                'cc' => $ccList,
                'subject' => $subject,
                'message' => $messageHtml,
                'sent' => $sent,
                'error' => $smtpError,
                'acceptance_url' => $acceptanceUrl,
            ],
            'status' => $sent ? 'inviato' : 'errore',
            'preventivo' => $updatedDetail,
        ];
    }

    public function publicAcceptanceDetail(array $input): array
    {
        $token = trim((string) ($input['token'] ?? ''));
        if ($token === '') {
            throw new \RuntimeException('Token mancante.', 422);
        }
        $link = $this->getAcceptanceLinkByToken($token);
        $detail = $this->repository->fetchDetail((int) $link['id_preventivo']);
        if ($detail === null) {
            throw new \RuntimeException('Preventivo non trovato.', 404);
        }
        $idPreventivo = (int) $link['id_preventivo'];
        $pdfUrl = $this->getPublicApiBaseUrl() . '/preventiviPublicPdf.php?token=' . rawurlencode($token) . '&refresh=1';
        $jasperUrl = sprintf(
            'https://jaspersoft.mediaprint.it/jasperserver/rest_v2/reports/Mediaprint/GestionaleMP/Preventivi.pdf?id_preventivo=%d&j_username=gestionaleMp&j_password=gestionaleMp',
            $idPreventivo
        );
        return [
            'data' => $detail,
            'pdf_url' => $pdfUrl,
            'jasper_url' => $jasperUrl,
            'meta' => [
                'id_link' => (int) $link['id_link'],
                'expires_at' => $link['expires_at'],
            ],
        ];
    }

    public function streamPublicAcceptancePdf(array $input): array
    {
        $token = trim((string) ($input['token'] ?? ''));
        if ($token === '') {
            throw new \RuntimeException('Token mancante.', 422);
        }
        $link = $this->getAcceptanceLinkByToken($token);
        $forceRefresh = !empty($input['refresh']) || !empty($input['force']);
        $path = $this->getPreventivoPdfLocalPath((int) $link['id_preventivo'], $forceRefresh);
        if (!is_readable($path)) {
            throw new \RuntimeException('PDF non disponibile.', 404);
        }
        return [
            'path' => $path,
            'filename' => basename($path),
            'id_preventivo' => (int) $link['id_preventivo'],
        ];
    }

    /**
     * @return array{
     *   items:list<array<string,mixed>>,
     *   pdf_url:string
     * }
     */
    public function acceptanceArtifacts(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido.', 422);
        }
        $row = $this->repository->fetchDetail($id);
        if ($row === null) {
            throw new \RuntimeException('Preventivo non trovato.', 404);
        }

        try {
            $stmt = $this->repository->getConnection()->prepare(
                'SELECT id_receipt, id_preventivo, signer_nome, signer_cognome, signer_email, signer_cf_piva, otp_channel, otp_destination, accepted_at, ip_address, user_agent, evidence_json
                 FROM tb_preventivi_acceptance_receipts
                 WHERE id_preventivo = :id
                 ORDER BY accepted_at DESC, id_receipt DESC'
            );
            $stmt->bindValue(':id', $id, \PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $ignored) {
            $rows = [];
        }
        $items = [];
        foreach ($rows as $r) {
            $evidence = null;
            if (isset($r['evidence_json']) && is_string($r['evidence_json']) && trim($r['evidence_json']) !== '') {
                $decoded = json_decode($r['evidence_json'], true);
                if (is_array($decoded)) {
                    $evidence = $decoded;
                }
            }
            $items[] = [
                'id_receipt' => (int) ($r['id_receipt'] ?? 0),
                'id_preventivo' => (int) ($r['id_preventivo'] ?? 0),
                'signer_nome' => (string) ($r['signer_nome'] ?? ''),
                'signer_cognome' => (string) ($r['signer_cognome'] ?? ''),
                'signer_email' => (string) ($r['signer_email'] ?? ''),
                'signer_cf_piva' => isset($r['signer_cf_piva']) ? (string) $r['signer_cf_piva'] : null,
                'otp_channel' => (string) ($r['otp_channel'] ?? ''),
                'otp_destination' => (string) ($r['otp_destination'] ?? ''),
                'accepted_at' => isset($r['accepted_at']) ? (string) $r['accepted_at'] : null,
                'ip_address' => isset($r['ip_address']) ? (string) $r['ip_address'] : null,
                'user_agent' => isset($r['user_agent']) ? (string) $r['user_agent'] : null,
                'evidence' => $evidence,
            ];
        }

        return [
            'items' => $items,
            'pdf_url' => $this->getPublicApiBaseUrl() . '/preventiviAcceptancePdf.php?id=' . $id,
        ];
    }

    /**
     * @return array{path:string,filename:string,id_preventivo:int}
     */
    public function streamAcceptancePdfByPreventivo(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido.', 422);
        }
        $signedOnly = !empty($input['signed']) || !empty($input['only_signed']);
        $forceRefresh = !empty($input['refresh']) || !empty($input['force']);
        $signedPath = $this->getPreventiviPdfStorageDir() . '/preventivo_' . $id . '_signed.pdf';
        if ($signedOnly) {
            $path = $signedPath;
        } elseif ($forceRefresh || !is_readable($signedPath)) {
            $path = $this->getPreventivoPdfLocalPath($id, $forceRefresh);
        } else {
            $path = $signedPath;
        }
        if (!is_readable($path)) {
            throw new \RuntimeException('PDF non disponibile.', 404);
        }
        return [
            'path' => $path,
            'filename' => basename($path),
            'id_preventivo' => $id,
        ];
    }

    public function sendAcceptanceOtp(array $input): array
    {
        $token = trim((string) ($input['token'] ?? ''));
        $nome = trim((string) ($input['nome'] ?? ''));
        $cognome = trim((string) ($input['cognome'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $cfPiva = trim((string) ($input['cf_piva'] ?? ''));
        $consenso = !empty($input['consenso']);
        if (!$consenso) {
            throw new \RuntimeException('Devi accettare la dichiarazione per procedere.', 422);
        }
        if ($nome === '' || $cognome === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \RuntimeException('Compila nome, cognome ed email validi.', 422);
        }
        $detail = $this->publicAcceptanceDetail(['token' => $token]);
        $idLink = (int) ($detail['meta']['id_link'] ?? 0);
        if ($idLink <= 0) {
            throw new \RuntimeException('Link non valido.', 404);
        }
        $otp = (string) random_int(100000, 999999);
        $otpHash = hash('sha256', $otp);
        $expiresAt = (new \DateTimeImmutable('+10 minutes'))->format('Y-m-d H:i:s');
        $ip = substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64);
        $ua = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
        $pdo = $this->repository->getConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO tb_preventivi_acceptance_otp (id_link, channel, destination, otp_hash, expires_at, request_ip, user_agent) VALUES (:id_link, :channel, :destination, :otp_hash, :expires_at, :ip, :ua)'
        );
        $stmt->bindValue(':id_link', $idLink, \PDO::PARAM_INT);
        $stmt->bindValue(':channel', 'email', \PDO::PARAM_STR);
        $stmt->bindValue(':destination', $email, \PDO::PARAM_STR);
        $stmt->bindValue(':otp_hash', $otpHash, \PDO::PARAM_STR);
        $stmt->bindValue(':expires_at', $expiresAt, \PDO::PARAM_STR);
        $stmt->bindValue(':ip', $ip !== '' ? $ip : null, $ip !== '' ? \PDO::PARAM_STR : \PDO::PARAM_NULL);
        $stmt->bindValue(':ua', $ua !== '' ? $ua : null, $ua !== '' ? \PDO::PARAM_STR : \PDO::PARAM_NULL);
        $stmt->execute();

        $subject = 'Codice OTP accettazione preventivo';
        $body = sprintf('<p>Codice OTP: <strong>%s</strong></p><p>Scade tra 10 minuti.</p>', htmlspecialchars($otp, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
        $mailer = new SmtpMailer();
        $sent = $mailer->send([$email], [], $subject, $body, getenv('SMTP_FROM_ADDRESS') ?: 'no-reply-mail@mediaprint.it', 'MediaPrint ERP');
        if (!$sent) {
            throw new \RuntimeException('Invio OTP non riuscito.', 502);
        }

        return [
            'ok' => true,
            'channel' => 'email',
            'destination_masked' => preg_replace('/(^.).*(@.*$)/', '$1***$2', $email),
            'expires_at' => $expiresAt,
            'draft' => [
                'nome' => $nome,
                'cognome' => $cognome,
                'email' => $email,
                'cf_piva' => $cfPiva !== '' ? $cfPiva : null,
            ],
        ];
    }

    public function verifyAcceptanceOtp(array $input): array
    {
        $token = trim((string) ($input['token'] ?? ''));
        $otp = trim((string) ($input['otp'] ?? ''));
        $nome = trim((string) ($input['nome'] ?? ''));
        $cognome = trim((string) ($input['cognome'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $cfPiva = trim((string) ($input['cf_piva'] ?? ''));
        if ($otp === '' || $nome === '' || $cognome === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \RuntimeException('Dati mancanti o non validi.', 422);
        }
        $detail = $this->publicAcceptanceDetail(['token' => $token]);
        $idLink = (int) ($detail['meta']['id_link'] ?? 0);
        $idPreventivo = (int) ($detail['data']['id_preventivo'] ?? 0);
        $pdo = $this->repository->getConnection();
        $stmt = $pdo->prepare(
            'SELECT id_otp, otp_hash, attempts, expires_at FROM tb_preventivi_acceptance_otp WHERE id_link = :id_link AND destination = :destination AND verified_at IS NULL ORDER BY id_otp DESC LIMIT 1'
        );
        $stmt->bindValue(':id_link', $idLink, \PDO::PARAM_INT);
        $stmt->bindValue(':destination', $email, \PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
        if ($row === null) {
            throw new \RuntimeException('OTP non trovato. Richiedi un nuovo codice.', 404);
        }
        if ((int) ($row['attempts'] ?? 0) >= 5) {
            throw new \RuntimeException('Troppi tentativi OTP.', 429);
        }
        if (strtotime((string) $row['expires_at']) < time()) {
            throw new \RuntimeException('OTP scaduto. Richiedi un nuovo codice.', 410);
        }
        if (!hash_equals((string) $row['otp_hash'], hash('sha256', $otp))) {
            $up = $pdo->prepare('UPDATE tb_preventivi_acceptance_otp SET attempts = attempts + 1 WHERE id_otp = :id_otp');
            $up->bindValue(':id_otp', (int) $row['id_otp'], \PDO::PARAM_INT);
            $up->execute();
            throw new \RuntimeException('OTP non valido.', 422);
        }
        $startedTransaction = false;
        if (!$pdo->inTransaction()) {
            $pdo->beginTransaction();
            $startedTransaction = true;
        }
        try {
            $okOtp = $pdo->prepare('UPDATE tb_preventivi_acceptance_otp SET verified_at = NOW() WHERE id_otp = :id_otp');
            $okOtp->bindValue(':id_otp', (int) $row['id_otp'], \PDO::PARAM_INT);
            $okOtp->execute();
            $useLink = $pdo->prepare('UPDATE tb_preventivi_acceptance_links SET used_at = NOW() WHERE id_link = :id_link');
            $useLink->bindValue(':id_link', $idLink, \PDO::PARAM_INT);
            $useLink->execute();
            $evidence = json_encode(['otp_id' => (int) $row['id_otp'], 'verified_at' => (new \DateTimeImmutable('now'))->format(DATE_ATOM)], JSON_UNESCAPED_UNICODE);
            $insReceipt = $pdo->prepare(
                'INSERT INTO tb_preventivi_acceptance_receipts (id_preventivo, id_link, signer_nome, signer_cognome, signer_email, signer_cf_piva, otp_channel, otp_destination, ip_address, user_agent, evidence_json) VALUES (:id_preventivo, :id_link, :nome, :cognome, :email, :cf_piva, :channel, :destination, :ip, :ua, :evidence)'
            );
            $insReceipt->bindValue(':id_preventivo', $idPreventivo, \PDO::PARAM_INT);
            $insReceipt->bindValue(':id_link', $idLink, \PDO::PARAM_INT);
            $insReceipt->bindValue(':nome', $nome, \PDO::PARAM_STR);
            $insReceipt->bindValue(':cognome', $cognome, \PDO::PARAM_STR);
            $insReceipt->bindValue(':email', $email, \PDO::PARAM_STR);
            $insReceipt->bindValue(':cf_piva', $cfPiva !== '' ? $cfPiva : null, $cfPiva !== '' ? \PDO::PARAM_STR : \PDO::PARAM_NULL);
            $insReceipt->bindValue(':channel', 'email', \PDO::PARAM_STR);
            $insReceipt->bindValue(':destination', $email, \PDO::PARAM_STR);
            $insReceipt->bindValue(':ip', substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64) ?: null, \PDO::PARAM_STR);
            $insReceipt->bindValue(':ua', substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255) ?: null, \PDO::PARAM_STR);
            $insReceipt->bindValue(':evidence', $evidence, \PDO::PARAM_STR);
            $insReceipt->execute();
            $receiptId = (int) $pdo->lastInsertId();

            $status = $this->repository->findStatusByCode('confermato');
            if ($status !== null) {
                $this->repository->updateStatus($idPreventivo, (int) $status['id_stato']);
                $this->repository->reserveStockForPreventivo($idPreventivo);
            }
            if ($startedTransaction && $pdo->inTransaction()) {
                $pdo->commit();
            }

            // Post-process non bloccante: genera PDF/A firmato con filigrana OTP.
            $this->generateSignedAcceptancePdf($idPreventivo, [
                'id_receipt' => $receiptId,
                'nome' => $nome,
                'cognome' => $cognome,
                'email' => $email,
                'accepted_at' => (new \DateTimeImmutable('now'))->format('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            if ($startedTransaction && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        return [
            'ok' => true,
            'receipt' => [
                'id_receipt' => $receiptId,
                'id_preventivo' => $idPreventivo,
                'accepted_at' => (new \DateTimeImmutable('now'))->format('Y-m-d H:i:s'),
                'nome' => $nome,
                'cognome' => $cognome,
                'email' => $email,
                'cf_piva' => $cfPiva !== '' ? $cfPiva : null,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function addLineFromCed(array $input): array
    {
        $idPreventivo = $this->sanitizeInt($input['id_preventivo'] ?? ($input['id'] ?? 0), 1, PHP_INT_MAX);
        if ($idPreventivo <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido.', 422);
        }

        $preventivo = $this->repository->getById($idPreventivo);
        if ($preventivo === null) {
            throw new \RuntimeException('Preventivo non trovato.', 404);
        }

        $idProdotto = $this->sanitizeInt($input['id_prodotto'] ?? 0, 1, PHP_INT_MAX);
        if ($idProdotto <= 0) {
            throw new \RuntimeException('Prodotto non valido.', 422);
        }

        $prodottiRepository = new ProdottiRepository($this->repository->getConnection());
        $prodotto = $prodottiRepository->getProdottoById($idProdotto);
        $categoriaId = $prodotto['id_categoria'] ?? null;
        if ($categoriaId === null || $categoriaId <= 0) {
            throw new \RuntimeException('Categoria prodotto non valida.', 422);
        }

        $categorie = $prodottiRepository->listCategorie();
        $categoria = null;
        foreach ($categorie as $cat) {
            if ((int) $cat['id_categoria'] === (int) $categoriaId) {
                $categoria = (string) $cat['nome'];
                break;
            }
        }
        if (!$this->isStampaCategory($categoria)) {
            throw new \RuntimeException('Categoria prodotto non consentita per il CED.', 422);
        }

        $descrizione = trim((string) ($input['descrizione'] ?? ''));
        if ($descrizione === '') {
            $descrizione = (string) $prodotto['nome'];
        }
        $quantita = isset($input['quantita']) ? (float) $input['quantita'] : 1.0;
        $prezzo = isset($input['prezzo_unitario']) ? (float) $input['prezzo_unitario'] : null;
        if ($prezzo === null) {
            $prezzo = isset($input['prezzo']) ? (float) $input['prezzo'] : null;
        }
        if ($prezzo === null) {
            $prezzo = isset($prodotto['prezzo_listino']) ? (float) $prodotto['prezzo_listino'] : 0.0;
        }
        $iva = array_key_exists('iva', $input) ? (float) $input['iva'] : null;
        if ($iva === null) {
            $idIva = isset($prodotto['id_iva']) ? (int) $prodotto['id_iva'] : 0;
            if ($idIva > 0) {
                $stmt = $this->repository->getConnection()->prepare('SELECT percento FROM cfg_iva WHERE id_iva = :id LIMIT 1');
                $stmt->bindValue(':id', $idIva, \PDO::PARAM_INT);
                $stmt->execute();
                $value = $stmt->fetchColumn();
                if ($value !== false) {
                    $iva = (float) $value;
                }
            }
        }
        $idNatura = isset($input['id_sdi_natura_iva']) ? (int) $input['id_sdi_natura_iva'] : null;
        if ($idNatura === null) {
            $idNatura = isset($prodotto['id_sdi_natura_iva']) ? (int) $prodotto['id_sdi_natura_iva'] : null;
        }
        $comboKey = isset($input['combo_key']) ? trim((string) $input['combo_key']) : null;
        if ($comboKey === '') {
            $comboKey = null;
        }

        $connection = $this->repository->getConnection();
        $startedTransaction = false;
        if (!$connection->inTransaction()) {
            $startedTransaction = $connection->beginTransaction();
        }
        try {
            $idRiga = $this->repository->addLine($idPreventivo, [
                'descrizione' => $descrizione,
                'quantita' => $quantita,
                'prezzo_unitario' => $prezzo,
                'iva' => $iva,
                'id_prodotto' => $idProdotto,
                'id_sdi_natura_iva' => $idNatura,
                'combo_key' => $comboKey,
                'created_by_ced' => 1,
            ]);

            $totals = $this->repository->calculateTotals($idPreventivo);
            $this->repository->updateTotals($idPreventivo, $totals);

            $cedStatus = $this->repository->findStatusByCode('revisionato_ced');
            if ($cedStatus !== null) {
                $this->repository->updateStatus($idPreventivo, (int) $cedStatus['id_stato']);
            }
            $this->syncPostaliRowsForPreventivo($idPreventivo);
            $this->resetAcceptanceForPreventivo($idPreventivo);

            if ($startedTransaction && $connection->inTransaction()) {
                $connection->commit();
            }
        } catch (\Throwable $exception) {
            if ($startedTransaction && $connection->inTransaction()) {
                $connection->rollBack();
            }
            throw $exception;
        }

        return [
            'ok' => true,
            'id_riga' => $idRiga ?? 0,
            'totals' => $totals ?? null,
            'status' => $cedStatus ?? null,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function deleteLineFromCed(array $input): array
    {
        $idPreventivo = $this->sanitizeInt($input['id_preventivo'] ?? ($input['id'] ?? 0), 1, PHP_INT_MAX);
        if ($idPreventivo <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido.', 422);
        }

        $idRiga = $this->sanitizeInt($input['id_riga'] ?? ($input['id_riga_preventivo'] ?? 0), 1, PHP_INT_MAX);
        if ($idRiga <= 0) {
            throw new \RuntimeException('ID riga mancante o non valido.', 422);
        }

        $preventivo = $this->repository->getById($idPreventivo);
        if ($preventivo === null) {
            throw new \RuntimeException('Preventivo non trovato.', 404);
        }

        $connection = $this->repository->getConnection();
        $startedTransaction = false;
        if (!$connection->inTransaction()) {
            $startedTransaction = $connection->beginTransaction();
        }
        try {
            $deleted = $this->repository->deleteLineIfCed($idPreventivo, $idRiga);
            if (!$deleted) {
                throw new \RuntimeException('Riga non eliminabile.', 422);
            }

            try {
                $cleanup = $connection->prepare('DELETE FROM tb_lavorazioni_attivita_ced_quantita WHERE id_riga_preventivo = :id');
                $cleanup->bindValue(':id', $idRiga, \PDO::PARAM_INT);
                $cleanup->execute();
            } catch (\Throwable $ignored) {
                // ignore cleanup failures
            }

            $totals = $this->repository->calculateTotals($idPreventivo);
            $this->repository->updateTotals($idPreventivo, $totals);

            $cedStatus = $this->repository->findStatusByCode('revisionato_ced');
            if ($cedStatus !== null) {
                $this->repository->updateStatus($idPreventivo, (int) $cedStatus['id_stato']);
            }
            $this->syncPostaliRowsForPreventivo($idPreventivo);
            $this->resetAcceptanceForPreventivo($idPreventivo);

            if ($startedTransaction && $connection->inTransaction()) {
                $connection->commit();
            }
        } catch (\Throwable $exception) {
            if ($startedTransaction && $connection->inTransaction()) {
                $connection->rollBack();
            }
            throw $exception;
        }

        return [
            'ok' => true,
            'id_riga' => $idRiga,
            'totals' => $totals ?? null,
            'status' => $cedStatus ?? null,
        ];
    }

    private function isStampaCategory(?string $label): bool
    {
        $value = trim((string) ($label ?? ''));
        if ($value === '') {
            return false;
        }
        $lower = function_exists('mb_strtolower') ? mb_strtolower($value) : strtolower($value);
        $normalized = preg_replace('/[^a-z0-9]+/', '', $lower);
        if ($normalized === 'stampa') {
            return true;
        }
        return str_starts_with($normalized, 'stampa') && str_contains($normalized, 'imbustamento');
    }

    private function isTariffePostaliCategory(?string $label): bool
    {
        $value = trim((string) ($label ?? ''));
        if ($value === '') {
            return false;
        }
        $lower = function_exists('mb_strtolower') ? mb_strtolower($value) : strtolower($value);
        $normalized = preg_replace('/[^a-z0-9]+/', '', $lower);
        if ($normalized === 'tariffepostali') {
            return true;
        }
        return str_starts_with($normalized, 'tariffepostali');
    }

    private function isTariffePostaliLine(array $line): bool
    {
        $idCategoria = isset($line['id_categoria']) ? (int) $line['id_categoria'] : 0;
        if ($idCategoria === 2) {
            return true;
        }
        $category = $line['categoria'] ?? $line['categoria_nome'] ?? null;
        return $this->isTariffePostaliCategory(is_string($category) ? $category : null);
    }

    private function syncPostaliRowsForPreventivo(int $idPreventivo): void
    {
        if (!($this->lavorazioniRepository instanceof LavorazioniRepository)) {
            return;
        }
        $lavorazioniRepository = $this->lavorazioniRepository;
        $lavorazioniIds = $lavorazioniRepository->listLavorazioniIdsByPreventivo($idPreventivo);
        if ($lavorazioniIds === []) {
            return;
        }
        $lines = $this->repository->getLines($idPreventivo);
        $postaliRows = array_values(array_filter($lines, function (array $line): bool {
            return $this->isTariffePostaliLine($line);
        }));
        $keepIds = [];
        foreach ($postaliRows as $row) {
            $idRiga = isset($row['id_riga']) ? (int) $row['id_riga'] : 0;
            if ($idRiga > 0) {
                $keepIds[] = $idRiga;
            }
        }
        foreach ($lavorazioniIds as $lavorazioneId) {
            $existingPostaliRows = $lavorazioniRepository->listPostaliRowsForLavorazione($lavorazioneId);
            $rowMapping = $this->buildPostalRowIdMapping($existingPostaliRows, $postaliRows);
            $postaActivityIds = $lavorazioniRepository->listPostaActivityIdsByLavorazione($lavorazioneId);
            foreach ($postaActivityIds as $activityId) {
                if ($rowMapping !== []) {
                    $lavorazioniRepository->renameActivityCedQuantities($activityId, $rowMapping);
                }
            }
            $lavorazioniRepository->replacePostaliRowsForLavorazione($lavorazioneId, $postaliRows);
        }
    }

    /**
     * @param array<int, array<string, mixed>> $oldRows
     * @param array<int, array<string, mixed>> $newRows
     * @return array<int, int>
     */
    private function buildPostalRowIdMapping(array $oldRows, array $newRows): array
    {
        if ($oldRows === [] || $newRows === []) {
            return [];
        }
        $groupingOld = $this->groupPostalRowsByKey($oldRows);
        $groupingNew = $this->groupPostalRowsByKey($newRows);
        if ($groupingOld === [] || $groupingNew === []) {
            return [];
        }

        $mapping = [];
        foreach ($groupingOld as $key => $oldIds) {
            if (!isset($groupingNew[$key])) {
                continue;
            }
            $newIds = $groupingNew[$key];
            $count = min(count($oldIds), count($newIds));
            for ($i = 0; $i < $count; $i++) {
                $oldId = $oldIds[$i];
                $newId = $newIds[$i];
                if ($oldId > 0 && $newId > 0 && $oldId !== $newId) {
                    $mapping[$oldId] = $newId;
                }
            }
        }

        return $mapping;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<string, list<int>>
     */
    private function groupPostalRowsByKey(array $rows): array
    {
        $grouped = [];
        foreach ($rows as $row) {
            $idRiga = isset($row['id_riga_preventivo']) ? (int) $row['id_riga_preventivo'] : 0;
            $key = $this->buildPostalRowKey($row);
            if ($idRiga <= 0 || $key === '') {
                continue;
            }
            $grouped[$key][] = $idRiga;
        }
        return $grouped;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function buildPostalRowKey(array $row): string
    {
        $parts = [
            trim((string) ($row['combo_key'] ?? '')),
            trim((string) ($row['categoria'] ?? '')),
            trim((string) ($row['prodotto_codice'] ?? '')),
            trim((string) ($row['descrizione'] ?? '')),
            trim((string) ($row['prodotto_nome'] ?? '')),
        ];
        $filtered = array_filter($parts, static fn (string $part) => $part !== '');
        if ($filtered === []) {
            return '';
        }
        $normalized = implode('|', $filtered);
        $normalized = preg_replace('/\\s+/', ' ', $normalized);
        $normalized = $normalized === null ? '' : $normalized;
        $lower = function_exists('mb_strtolower') ? mb_strtolower($normalized) : strtolower($normalized);
        return trim($lower);
    }

    /**
     * Ritorna i dati di una revisione salvata.
     *
     * @return array{revision:array<string,mixed>}
     */
    public function revisionDetail(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : 0;
        if ($id <= 0) {
            throw new \RuntimeException('ID revisione mancante o non valido.', 422);
        }

        $revision = $this->repository->getRevisionById($id);
        if ($revision === null) {
            throw new \RuntimeException('Revisione non trovata.', 404);
        }

        return [
            'revision' => $revision,
        ];
    }

    /**
     * @return array{data:list<array{id_preventivo:int,revisions:list<array<string,mixed>>>}}
     */
    public function revisionsSummary(array $input): array
    {
        $idsInput = $input['ids'] ?? [];
        if (!is_array($idsInput)) {
            $idsInput = [];
        }
        $rawIds = [];
        foreach ($idsInput as $item) {
            $num = (int) $item;
            if ($num > 0) {
                $rawIds[] = $num;
            }
        }
        $uniqueIds = array_values(array_unique($rawIds));
        if (empty($uniqueIds)) {
            return ['data' => []];
        }
        $out = [];
        foreach ($uniqueIds as $id) {
            $revisions = $this->repository->listRevisions($id);
            if (empty($revisions)) {
                continue;
            }
            $summary = [];
            foreach ($revisions as $rev) {
                $data = $rev['payload']['detail']['data'] ?? [];
                $summary[] = [
                    'id_revisione' => $rev['id_revisione'],
                    'label' => $rev['label'],
                    'numero_revision' => $rev['numero_revision'],
                    'created_at' => $rev['created_at'],
                    'totale_imponibile' => $this->normalizeFloat($data['totale_imponibile'] ?? $data['totale'] ?? null),
                    'totale_iva' => $this->normalizeFloat($data['totale_iva'] ?? null),
                    'totale' => $this->normalizeFloat($data['totale'] ?? $data['totale_imponibile'] ?? null),
                ];
            }
            if (empty($summary)) {
                continue;
            }
            $out[] = [
                'id_preventivo' => $id,
                'revisions' => $summary,
            ];
        }

        return ['data' => $out];
    }

    private function normalizeFloat($value): float
    {
        if ($value === null) {
            return 0.0;
        }
        $string = (string) $value;
        $normalized = str_replace(',', '.', $string);
        return (float) $normalized;
    }

    /**
     * Genera una lavorazione collegata al preventivo confermato.
     *
     * @return array<string, mixed>
     */
    public function generateLavorazione(array $input): array
    {
        $lavorazioniRepository = $this->requireLavorazioniRepository();
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido.', 422);
        }

        $detail = $this->repository->fetchDetail($id);
        if ($detail === null) {
            throw new \RuntimeException('Preventivo non trovato.', 404);
        }

        $existingLink = $this->repository->getLavorazioneLink($id);
        if (!empty($existingLink['id_lavorazione_corrente'])) {
            throw new \RuntimeException('Il preventivo ha già una lavorazione collegata.', 422);
        }

        $statusCode = strtolower((string) ($detail['stato_code'] ?? ''));
        if ($statusCode !== 'confermato') {
            throw new \RuntimeException('Ãˆ possibile generare la lavorazione solo da preventivi confermati.', 422);
        }

        $idAnagrafica = isset($detail['id_anagrafica']) ? (int) $detail['id_anagrafica'] : 0;
        if ($idAnagrafica <= 0) {
            throw new \RuntimeException('Il preventivo non Ã¨ associato a un\'anagrafica valida.', 422);
        }

        $titolo = trim((string) ($input['titolo'] ?? $detail['oggetto'] ?? ''));
        if ($titolo === '') {
            $titolo = sprintf(
                'Lavorazione %s',
                $detail['cliente_ragione_sociale'] ?? sprintf('Preventivo #%d', $id)
            );
        }

        $descrizione = trim((string) ($input['descrizione'] ?? ''));
        if ($descrizione === '') {
            $descrizione = $detail['oggetto'] ?? $titolo;
        }

        $note = trim((string) ($input['note'] ?? ''));
        if ($note === '') {
            $note = $detail['note'] ?? null;
        }

        $workData = [
            'id_preventivo' => $detail['id_preventivo'],
            'id_anagrafica' => $idAnagrafica,
            'titolo' => $titolo,
            'descrizione' => $descrizione,
            'note' => $note,
            'priorita' => $this->normalizePriority($input['priorita'] ?? null),
            'stato' => 'aperta',
            'data_inizio_prevista' => $this->sanitizeDate($detail['data_preventivo'] ?? null),
            'data_fine_prevista' => $this->sanitizeDate($input['data_fine_prevista'] ?? null),
            'percentuale_avanzamento' => 0,
            'anno_preventivo' => $detail['anno_preventivo'] ?? null,
            'numero_preventivo' => $detail['numero_documento'] ?? null,
        ];

        $job = $lavorazioniRepository->createFromPreventivo($workData, []);
        $this->repository->linkLavorazione($id, $job['id_lavorazione']);

        return [
            'ok' => true,
            'id_lavorazione' => $job['id_lavorazione'],
            'codice' => $job['codice'],
            'attivita_create' => $job['attivita_create'],
        ];
    }

    /**
     * Emette un DDT generato dalle righe di un preventivo confermato.
     *
     * @return array<string,mixed>
     */
    public function emitDdt(array $input): array
    {
        $ddtRepository = $this->requireDdtRepository();
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido per l\'emissione del DDT.', 422);
        }

        $detail = $this->repository->fetchDetail($id);
        if ($detail === null) {
            throw new \RuntimeException('Preventivo non trovato.', 404);
        }

        $statusCode = strtolower((string) ($detail['stato_code'] ?? ''));
        if ($statusCode !== 'confermato') {
            throw new \RuntimeException('Ãˆ possibile emettere il DDT solo da preventivi confermati.', 422);
        }

        $idAnagrafica = isset($detail['id_anagrafica']) ? (int) $detail['id_anagrafica'] : 0;
        if ($idAnagrafica <= 0) {
            throw new \RuntimeException('Il preventivo non Ã¨ associato a un\'anagrafica valida.', 422);
        }

        $lines = $this->repository->getLines($id);
        if (empty($lines)) {
            throw new \RuntimeException('Il preventivo non contiene righe da trasferire nel DDT.', 422);
        }

        $idCausale = null;
        if (array_key_exists('id_causale', $input) && $input['id_causale'] !== null && $input['id_causale'] !== '') {
            $candidate = (int) $input['id_causale'];
            if ($candidate > 0) {
                $causale = $ddtRepository->findCausaleById($candidate);
                if ($causale === null) {
                    throw new \RuntimeException('Causale DDT non valida.', 422);
                }
                $idCausale = $candidate;
            }
        }

        $rawNote = isset($input['note']) ? trim((string) $input['note']) : '';
        if ($rawNote === '') {
            $numero = $detail['numero_documento'] ?? null;
            $anno = $detail['anno_preventivo'] ?? null;
            if ($numero !== null && $anno !== null) {
                $rawNote = sprintf('Documento generato dal preventivo %s/%s.', $numero, $anno);
            } elseif ($numero !== null) {
                $rawNote = sprintf('Documento generato dal preventivo n. %s.', $numero);
            } else {
                $rawNote = sprintf('Documento generato dal preventivo ID %d.', $id);
            }
        }

        $payload = [
            'id_preventivo' => $detail['id_preventivo'] ?? $id,
            'id_anagrafica' => $idAnagrafica,
            'data_ddt' => isset($input['data_ddt']) ? (string) $input['data_ddt'] : null,
            'id_causale' => $idCausale,
            'note' => $rawNote,
        ];

        if (isset($input['id_serie']) && (int) $input['id_serie'] > 0) {
            $payload['id_serie'] = (int) $input['id_serie'];
        }

        $ddt = $ddtRepository->createFromPreventivo($payload, $lines);

        return [
            'ok' => true,
            'ddt' => $ddt,
        ];
    }

    /**
     * Emette una fattura a partire da un preventivo confermato.
     *
     * @return array<string,mixed>
     */
    public function emitFattura(array $input): array
    {
        $fattureRepository = $this->requireFattureRepository();
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido per l\'emissione della fattura.', 422);
        }

        $detail = $this->repository->fetchDetail($id);
        if ($detail === null) {
            throw new \RuntimeException('Preventivo non trovato.', 404);
        }

        $statusCode = strtolower((string) ($detail['stato_code'] ?? ''));
        if ($statusCode !== 'confermato') {
            throw new \RuntimeException('Ãˆ possibile emettere la fattura solo da preventivi confermati.', 422);
        }

        $idAnagrafica = isset($detail['id_anagrafica']) ? (int) $detail['id_anagrafica'] : 0;
        if ($idAnagrafica <= 0) {
            throw new \RuntimeException('Il preventivo non Ã¨ associato a un\'anagrafica valida.', 422);
        }

        $lines = $this->repository->getLines($id);
        if (empty($lines)) {
            throw new \RuntimeException('Il preventivo non contiene righe da trasferire nella fattura.', 422);
        }

        $selectedIds = [];
        if (isset($input['righe_ids']) && is_array($input['righe_ids'])) {
            foreach ($input['righe_ids'] as $rawId) {
                $lineId = (int) $rawId;
                if ($lineId > 0) {
                    $selectedIds[$lineId] = true;
                }
            }
            if (empty($selectedIds)) {
                throw new \RuntimeException('Selezionare almeno una riga da fatturare.', 422);
            }
            $lines = array_values(array_filter($lines, static function (array $line) use ($selectedIds): bool {
                $idRiga = isset($line['id_riga']) ? (int) $line['id_riga'] : (isset($line['id_riga_preventivo']) ? (int) $line['id_riga_preventivo'] : 0);
                return $idRiga > 0 && isset($selectedIds[$idRiga]);
            }));
            if (empty($lines)) {
                throw new \RuntimeException('Nessuna riga valida selezionata per la fattura.', 422);
            }
        }

        $idSezionale = isset($input['id_sezionale']) ? (int) $input['id_sezionale'] : 0;
        if ($idSezionale <= 0) {
            throw new \RuntimeException('Selezionare un sezionale valido per la numerazione della fattura.', 422);
        }

        $isAcquisto = !empty($detail['is_acquisto']);
        $requestedTipoFatt = isset($input['id_tipo_fatt']) ? (int) $input['id_tipo_fatt'] : 0;
        $idTipoFatt = $this->resolveInvoiceTypeId($fattureRepository, $isAcquisto, $requestedTipoFatt);
        $idStatoFatt = isset($input['id_stato_fatt']) ? (int) $input['id_stato_fatt'] : 2; // default: emessa
        if ($idStatoFatt <= 0) {
            $idStatoFatt = 2;
        }

        $note = isset($input['note']) ? trim((string) $input['note']) : '';
        if ($note === '') {
            $numero = $detail['numero_documento'] ?? null;
            $anno = $detail['anno_preventivo'] ?? null;
            if ($numero && $anno) {
                $note = sprintf('Fattura generata dal preventivo %s/%s.', $numero, $anno);
            } elseif ($numero) {
                $note = sprintf('Fattura generata dal preventivo n. %s.', $numero);
            } else {
                $note = sprintf('Fattura generata dal preventivo ID %d.', $id);
            }
        }

        $totImponibile = 0.0;
        $totSconto = 0.0;
        $totIva = 0.0;
        $totale = 0.0;
        foreach ($lines as $line) {
            $qty = isset($line['quantita']) ? (float) $line['quantita'] : 0.0;
            $prezzo = isset($line['prezzo']) ? (float) $line['prezzo'] : (isset($line['prezzo_unitario']) ? (float) $line['prezzo_unitario'] : 0.0);
            $sconto = isset($line['sconto']) ? (float) $line['sconto'] : 0.0;
            $aliquota = isset($line['iva']) ? (float) $line['iva'] : (isset($line['aliquota_iva']) ? (float) $line['aliquota_iva'] : 0.0);
            $base = max(0.0, $qty * $prezzo);
            $imponibile = $base;
            if ($sconto > 0) {
                $imponibile = $imponibile * (1 - ($sconto / 100));
            }
            $imponibile = max(0.0, $imponibile);
            $iva = $aliquota !== null ? $imponibile * ($aliquota / 100) : 0.0;
            $totImponibile += $imponibile;
            $totIva += $iva;
            $totale += ($imponibile + $iva);
            $totSconto += max(0.0, $base - $imponibile);
        }

        $payload = [
            'id_preventivo' => $detail['id_preventivo'] ?? $id,
            'id_anagrafica' => $idAnagrafica,
            'data_fattura' => isset($input['data_fattura']) ? (string) $input['data_fattura'] : null,
            'id_sezionale' => $idSezionale,
            'id_tipo_fatt' => $idTipoFatt,
            'id_stato_fatt' => $idStatoFatt,
            'note' => $note,
            'totale_imponibile' => $totImponibile,
            'totale_sconto' => $totSconto,
            'totale_iva' => $totIva,
            'totale' => $totale,
            'is_acquisto' => $isAcquisto ? 1 : 0,
        ];

        $fattura = $fattureRepository->createFromPreventivo($payload, $lines);

        return [
            'ok' => true,
            'fattura' => $fattura,
        ];
    }

    /**
     * Ripristina un preventivo dall'archivio creando una nuova bozza con nuova numerazione.
     * Richiede che l'anagrafica cliente sia attiva.
     * Input: id | id_preventivo (riferito all'archivio)
     * Output: { status: 'draft', id_preventivo:int, anno_preventivo:int, numero_documento:int }
     */
    public function reactivate(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido per il ripristino.', 422);
        }

        $arch = $this->repository->getArchivedById($id);
        if ($arch === null) {
            throw new \RuntimeException('Preventivo archiviato non trovato.', 404);
        }

        $idAnag = (int) $arch['id_anagrafica'];
        if ($idAnag <= 0 || !$this->repository->existsAnagrafica($idAnag)) {
            throw new \RuntimeException('Anagrafica non attiva: ripristinare il cliente prima di ripristinare il preventivo.', 422);
        }

        // Inserisce una nuova bozza con nuova numerazione anno/corrente
        $draft = $this->repository->insertDraft([
            'id_anagrafica' => $idAnag,
            'data_preventivo' => $arch['data_preventivo'] ?? null,
            'note' => $arch['note'] ?? null,
            'oggetto' => $arch['oggetto'] ?? null,
            'riferimento_cliente' => $arch['riferimento_cliente'] ?? null,
            'totale_imponibile' => isset($arch['totale_imponibile']) ? (float) $arch['totale_imponibile'] : 0.0,
            'totale_sconto' => isset($arch['totale_sconto']) ? (float) $arch['totale_sconto'] : 0.0,
            'totale_iva' => isset($arch['totale_iva']) ? (float) $arch['totale_iva'] : 0.0,
            'totale' => isset($arch['totale']) ? (float) $arch['totale'] : 0.0,
            'is_acquisto' => !empty($arch['is_acquisto']) ? 1 : 0,
        ]);

        // Niente testo custom da archivio

        // Prova a ripristinare anche le righe dall'archivio (se presente)
        $archivedLines = $this->repository->getArchivedLines($id);
        if (!empty($archivedLines)) {
            $lines = [];
            foreach ($archivedLines as $l) {
                $lines[] = [
                    'descrizione' => (string) ($l['descrizione'] ?? ''),
                    'quantita' => isset($l['quantita']) ? (float) $l['quantita'] : 1.0,
                    'prezzo' => isset($l['prezzo_unitario']) ? (float) $l['prezzo_unitario'] : 0.0,
                    'sconto' => isset($l['sconto']) ? (float) $l['sconto'] : 0.0,
                    'iva' => isset($l['iva']) ? (float) $l['iva'] : null,
                    'id_prodotto' => isset($l['id_prodotto']) ? (int) $l['id_prodotto'] : null,
                    'id_sdi_natura_iva' => isset($l['id_sdi_natura_iva']) ? (int) $l['id_sdi_natura_iva'] : null,
                ];
            }
            if (!empty($lines)) {
                $this->repository->replaceLines($draft['id_preventivo'], $lines);
                $this->syncPostaliRowsForPreventivo($draft['id_preventivo']);
            }
        }

        $archivedContacts = $this->repository->getArchivedContacts($id);
        if (!empty($archivedContacts)) {
            $this->repository->replaceContatti($draft['id_preventivo'], $archivedContacts);
        }

        // Rimuove il preventivo dall'archivio (testata + eventuali righe archiviate)
        $this->repository->deleteFromArchive($id);

        return [
            'status' => 'draft',
            'id_preventivo' => $draft['id_preventivo'],
            'anno_preventivo' => $draft['anno_preventivo'] ?? null,
            'numero_documento' => $draft['numero_documento'] ?? null,
        ];
    }

    /**
     * Archivia un preventivo (sposta in archivio e rimuove dai tavoli attivi).
     * Input: id | id_preventivo
     * Output: { ok: true }
     */
    public function archive(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido per archiviazione.', 422);
        }

        $existing = $this->repository->getById($id);
        if ($existing === null) {
            throw new \RuntimeException('Preventivo non trovato o giÃ  archiviato.', 404);
        }

        $this->repository->archiveById($id);
        return ['ok' => true];
    }

    /**
     * @param mixed $value
     */
    private function normalizePriority($value): string
    {
        if (!is_string($value)) {
            return 'medium';
        }
        $normalized = strtolower(trim($value));
        return in_array($normalized, ['low', 'medium', 'high', 'critical'], true) ? $normalized : 'medium';
    }

    /**
     * @param mixed $value
     */
    private function sanitizeDate($value): ?string
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            $dt = new \DateTimeImmutable($value);
            return $dt->format('Y-m-d');
        } catch (\Throwable $exception) {
            return null;
        }
    }

    /**
     * @param mixed $value
     */
    private function sanitizeInt($value, int $min, int $max): int
    {
        if (is_numeric($value)) {
            $int = (int) $value;
        } else {
            $int = (int) filter_var($value, FILTER_SANITIZE_NUMBER_INT);
        }
        if ($int < $min) {
            return $min;
        }
        if ($int > $max) {
            return $max;
        }
        return $int;
    }
}
