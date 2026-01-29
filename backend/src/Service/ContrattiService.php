<?php
// backend/src/Service/ContrattiService.php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Backend\Mailer\EmailTemplate;
use MediaPrint\Backend\Mailer\SmtpMailer;
use MediaPrint\Repo\ContrattiRepository;

final class ContrattiService
{
    public function __construct(private ContrattiRepository $repository) {}

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

    private function normalizeHtmlMessage(?string $rawMessage, string $cliente, string $titolo): string
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

        $safeCliente = htmlspecialchars($cliente, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeTitolo = htmlspecialchars($titolo, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        return sprintf(
            '<p>Gentile %s,</p><p>in allegato trova il contratto <strong>%s</strong>.</p><p>Restiamo a disposizione per ulteriori informazioni.</p><p>Cordiali saluti,<br />MediaPrint ERP</p>',
            $safeCliente,
            $safeTitolo
        );
    }

    private function renderContrattoEmailTemplate(array $info, string $introHtml): string
    {
        $summaryRows = [];
        if (!empty($info['cliente'])) {
            $summaryRows['Cliente'] = $info['cliente'];
        }
        if (!empty($info['titolo'])) {
            $summaryRows['Titolo contratto'] = $info['titolo'];
        }
        if (!empty($info['codice'])) {
            $summaryRows['Codice'] = $info['codice'];
        }
        if (!empty($info['data_inizio'])) {
            $summaryRows['Data inizio'] = $info['data_inizio'];
        }
        if (!empty($info['data_fine'])) {
            $summaryRows['Data fine'] = $info['data_fine'];
        }

        if (trim($introHtml) === '') {
            $introHtml = '<p>Gentile Cliente,</p><p>in allegato trova il contratto aggiornato.</p>';
        }

        $preheaderParts = [];
        if (!empty($info['titolo'])) {
            $preheaderParts[] = $info['titolo'];
        }
        if (!empty($info['codice'])) {
            $preheaderParts[] = 'Codice ' . $info['codice'];
        }
        $preheader = $preheaderParts !== [] ? implode(' · ', $preheaderParts) : 'Contratto MediaPrint ERP';

        return EmailTemplate::render(
            'Contratto',
            $introHtml,
            $summaryRows,
            $info['cliente'] ?? 'Cliente',
            null,
            null,
            (new \DateTimeImmutable('now'))->format('d/m/Y')
        );
    }

    /**
     * @return array{items:list<array<string,mixed>>}
     */
    public function list(array $input): array
    {
        $filters = [
            'q' => isset($input['q']) ? (string) $input['q'] : null,
            'id_anagrafica' => isset($input['id_anagrafica']) ? (int) $input['id_anagrafica'] : null,
            'only_active' => isset($input['only_active']) ? (int) $input['only_active'] === 1 : null,
            'exclude_draft' => !empty($input['exclude_draft']),
        ];
        $items = $this->repository->list($filters);
        return ['items' => $items];
    }

    /**
     * @return array<string,mixed>
     */
    public function detail(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_contratto']) ? (int) $input['id_contratto'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID contratto mancante o non valido.', 422);
        }

        $header = $this->repository->getById($id);
        if ($header === null) {
            throw new \RuntimeException('Contratto non trovato.', 404);
        }
        if (!empty($input['exclude_draft'])) {
            $statusCode = strtolower((string) ($header['stato_code'] ?? 'bozza'));
            if ($statusCode === 'bozza') {
                throw new \RuntimeException('Contratto non trovato.', 404);
            }
        }
        $lines = $this->repository->getLines($id);
        foreach ($lines as &$line) {
            $line['sconti'] = $this->repository->getLineDiscounts((int) $line['id_riga']);
        }
        unset($line);

        $editable = ($header['stato_code'] ?? 'bozza') === 'bozza';
        $statuses = $this->repository->listStatuses();
        $currentStatus = [
            'code' => $header['stato_code'] ?? null,
            'label' => $header['stato_label'] ?? ($header['stato_code'] ?? null),
        ];
        $revisions = $this->repository->listRevisions($id);

        return [
            'contratto' => $header,
            'righe' => $lines,
            'meta' => [
                'editable' => $editable,
                'statuses' => $statuses,
                'current_status' => $currentStatus,
                'revisions' => $revisions,
            ],
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function active(array $input): array
    {
        $idAnag = isset($input['id_anagrafica']) ? (int) $input['id_anagrafica'] : 0;
        if ($idAnag <= 0) {
            throw new \RuntimeException('Anagrafica mancante o non valida.', 422);
        }
        $ref = isset($input['date']) ? (string) $input['date'] : null;
        $excludeDraft = !empty($input['exclude_draft']);
        $header = $this->repository->findActiveContract($idAnag, $ref, $excludeDraft);
        if ($header === null) {
            return ['contratto' => null, 'righe' => []];
        }
        $lines = $this->repository->getLines((int) $header['id_contratto']);
        foreach ($lines as &$line) {
            $line['sconti'] = $this->repository->getLineDiscounts((int) $line['id_riga']);
        }
        unset($line);

        return [
            'contratto' => $header,
            'righe' => $lines,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function save(array $input): array
    {
        $id = isset($input['id_contratto']) ? (int) $input['id_contratto'] : (isset($input['id']) ? (int) $input['id'] : 0);
        $idAnag = isset($input['id_anagrafica']) ? (int) $input['id_anagrafica'] : 0;
        if ($idAnag <= 0) {
            throw new \RuntimeException('Anagrafica mancante o non valida.', 422);
        }
        $titolo = isset($input['titolo']) ? trim((string) $input['titolo']) : '';
        if ($titolo === '') {
            throw new \RuntimeException('Titolo contratto mancante.', 422);
        }
        $dataInizio = isset($input['data_inizio']) ? (string) $input['data_inizio'] : '';
        if (trim($dataInizio) === '') {
            throw new \RuntimeException('Data inizio mancante.', 422);
        }
        $dataFine = isset($input['data_fine']) ? (string) $input['data_fine'] : null;
        if ($dataFine !== null && trim($dataFine) === '') {
            $dataFine = null;
        }
        if ($dataFine !== null && strtotime($dataFine) !== false && strtotime($dataInizio) !== false) {
            if (strtotime($dataFine) < strtotime($dataInizio)) {
                throw new \RuntimeException('La data fine non pu\u00f2 essere precedente alla data inizio.', 422);
            }
        }
        $codice = isset($input['codice']) ? trim((string) $input['codice']) : null;
        if ($codice === '') { $codice = null; }
        $testo = isset($input['testo_legale']) ? (string) $input['testo_legale'] : null;
        if ($testo !== null && trim($testo) === '') { $testo = null; }
        $rinnovo = isset($input['rinnovo_automatico']) ? (int) $input['rinnovo_automatico'] : 0;
        $attivo = isset($input['attivo']) ? (int) $input['attivo'] : 1;

        $lines = isset($input['righe']) && is_array($input['righe']) ? $input['righe'] : [];
        $normalizedLines = [];
        foreach ($lines as $line) {
            if (!is_array($line)) { continue; }
            $tipo = ($line['tipo_item'] ?? $line['tipo'] ?? 'prodotto') === 'pacchetto' ? 'pacchetto' : 'prodotto';
            $idProd = isset($line['id_prodotto']) ? (int) $line['id_prodotto'] : null;
            $idPkg = isset($line['id_pacchetto']) ? (int) $line['id_pacchetto'] : null;
            if ($tipo === 'prodotto' && ($idProd === null || $idProd <= 0)) {
                throw new \RuntimeException('Riga contratto prodotto senza prodotto valido.', 422);
            }
            if ($tipo === 'pacchetto' && ($idPkg === null || $idPkg <= 0)) {
                throw new \RuntimeException('Riga contratto pacchetto senza pacchetto valido.', 422);
            }
            $comboKey = isset($line['combo_key']) ? trim((string) $line['combo_key']) : null;
            if ($comboKey === '') { $comboKey = null; }
            if ($tipo !== 'prodotto') { $comboKey = null; }
            $prezzo = $line['prezzo_unitario'] ?? $line['prezzo'] ?? null;
            if ($prezzo === null || $prezzo === '' || !is_numeric($prezzo)) {
                throw new \RuntimeException('Prezzo unitario non valido nelle righe contratto.', 422);
            }
            $iva = array_key_exists('iva', $line) ? $line['iva'] : null;
            $ivaVal = $iva !== null && $iva !== '' ? (float) $iva : null;
            $scontoBase = isset($line['sconto_base']) ? (float) $line['sconto_base'] : (isset($line['sconto']) ? (float) $line['sconto'] : 0.0);
            if ($scontoBase < 0 || $scontoBase > 100) {
                throw new \RuntimeException('Sconto base non valido nelle righe contratto.', 422);
            }
            $idNatura = isset($line['id_sdi_natura_iva']) ? (int) $line['id_sdi_natura_iva'] : null;
            if ($idNatura !== null && $idNatura <= 0) { $idNatura = null; }
            $descr = isset($line['descrizione']) ? trim((string) $line['descrizione']) : '';

            $sconti = isset($line['sconti']) && is_array($line['sconti']) ? $line['sconti'] : [];
            $tiers = [];
            foreach ($sconti as $sc) {
                if (!is_array($sc)) { continue; }
                $min = isset($sc['quantita_min']) ? (float) $sc['quantita_min'] : 0.0;
                $max = isset($sc['quantita_max']) && $sc['quantita_max'] !== '' ? (float) $sc['quantita_max'] : null;
                $perc = isset($sc['sconto']) ? (float) $sc['sconto'] : (isset($sc['sconto_percent']) ? (float) $sc['sconto_percent'] : 0.0);
                if ($min < 0 || $perc < 0 || $perc > 100) {
                    continue;
                }
                if ($max !== null && $max < $min) {
                    continue;
                }
                $tiers[] = [
                    'quantita_min' => $min,
                    'quantita_max' => $max,
                    'sconto' => $perc,
                ];
            }

            $normalizedLines[] = [
                'tipo_item' => $tipo,
                'id_prodotto' => $idProd,
                'id_pacchetto' => $idPkg,
                'combo_key' => $comboKey,
                'descrizione' => $descr !== '' ? $descr : null,
                'prezzo_unitario' => (float) $prezzo,
                'iva' => $ivaVal,
                'id_sdi_natura_iva' => $idNatura,
                'sconto_base' => $scontoBase,
                'sconti' => $tiers,
            ];
        }

        if ($id > 0) {
            $existing = $this->repository->getById($id);
            if ($existing === null) {
                throw new \RuntimeException('Contratto non trovato.', 404);
            }
            if (($existing['stato_code'] ?? null) !== null && ($existing['stato_code'] ?? null) !== 'bozza') {
                throw new \RuntimeException('Il contratto non ÃƒÂ¨ in stato bozza, impossibile aggiornare.', 422);
            }
            $this->repository->update($id, [
                'id_anagrafica' => $idAnag,
                'codice' => $codice,
                'titolo' => $titolo,
                'testo_legale' => $testo,
                'data_inizio' => $dataInizio,
                'data_fine' => $dataFine,
                'rinnovo_automatico' => $rinnovo,
                'attivo' => $attivo,
            ]);
            if (array_key_exists('righe', $input)) {
                $this->repository->replaceLines($id, $normalizedLines);
            }
            return ['id_contratto' => $id];
        }

        $newId = $this->repository->create([
            'id_anagrafica' => $idAnag,
            'codice' => $codice,
            'titolo' => $titolo,
            'testo_legale' => $testo,
            'data_inizio' => $dataInizio,
            'data_fine' => $dataFine,
            'rinnovo_automatico' => $rinnovo,
            'attivo' => $attivo,
        ]);
        if (!empty($normalizedLines)) {
            $this->repository->replaceLines($newId, $normalizedLines);
        }
        return ['id_contratto' => $newId];
    }

    public function delete(array $input): array
    {
        $id = isset($input['id_contratto']) ? (int) $input['id_contratto'] : (isset($input['id']) ? (int) $input['id'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID contratto mancante o non valido.', 422);
        }
        $this->repository->delete($id);
        return ['ok' => true];
    }

    /**
     * @return array{ok:bool, preview:array<string,mixed>, status:string, contratto:?array<string,mixed>}
     */
    public function sendEmail(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_contratto']) ? (int) $input['id_contratto'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID contratto mancante o non valido per invio email.', 422);
        }

        $detail = $this->detail(['id' => $id]);
        $header = $detail['contratto'] ?? null;
        if ($header === null) {
            throw new \RuntimeException('Contratto non trovato.', 404);
        }

        $toList = $this->normalizeEmailList($input['to'] ?? null);
        if (empty($toList)) {
            throw new \RuntimeException('Specificare almeno un destinatario email valido.', 422);
        }
        $ccList = $this->normalizeEmailList($input['cc'] ?? null);

        $cliente = $header['ragione_sociale'] ?? 'Cliente';
        $titolo = $header['titolo'] ?? ('Contratto #' . $id);
        $subject = trim((string) ($input['subject'] ?? ''));
        if ($subject === '') {
            $subject = sprintf('Contratto %s', $titolo);
        }
        $messageHtml = $this->normalizeHtmlMessage($input['message'] ?? null, (string) $cliente, (string) $titolo);
        $messageHtml = $this->renderContrattoEmailTemplate([
            'cliente' => $cliente,
            'titolo' => $titolo,
            'codice' => $header['codice'] ?? null,
            'data_inizio' => $header['data_inizio'] ?? null,
            'data_fine' => $header['data_fine'] ?? null,
        ], $messageHtml);

        $fromAddress = (isset($input['from']) && filter_var((string) $input['from'], FILTER_VALIDATE_EMAIL))
            ? $input['from']
            : (getenv('SMTP_FROM_ADDRESS') ?: 'no-reply-mail@' . $this->getMailerDomain());
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

            $revisionNote = isset($input['revisionNote']) ? trim((string) $input['revisionNote']) : null;
            if ($revisionNote === '') {
                $revisionNote = null;
            }
            $revisionOperator = isset($input['revisionOperator']) ? trim((string) $input['revisionOperator']) : null;
            if ($revisionOperator === '') {
                $revisionOperator = null;
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
            ],
            'status' => $sent ? 'inviato' : 'errore',
            'contratto' => $updatedDetail,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function changeStatus(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_contratto']) ? (int) $input['id_contratto'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID contratto mancante o non valido.', 422);
        }

        $code = isset($input['stato']) ? (string) $input['stato'] : (isset($input['code']) ? (string) $input['code'] : '');
        $code = strtolower(trim($code));
        if ($code === '') {
            throw new \RuntimeException('Codice stato mancante.', 422);
        }

        $existing = $this->repository->getById($id);
        if ($existing === null) {
            throw new \RuntimeException('Contratto non trovato.', 404);
        }

        $status = $this->repository->findStatusByCode($code);
        if ($status === null) {
            throw new \RuntimeException('Stato contratto non valido.', 422);
        }

        $this->repository->updateStatus($id, $status['id_stato']);

        $detail = $this->detail(['id' => $id]);
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
                $this->repository->createRevision($id, $notePayload, $operatorName, ['detail' => $detail]);
            } catch (\Throwable $ignored) {
                // Non bloccare l'aggiornamento dello stato se il log fallisce.
            }
        }

        $meta = $detail['meta'] ?? [];
        $meta['revisions'] = $this->repository->listRevisions($id);

        return [
            'data' => $detail['contratto'] ?? null,
            'meta' => $meta,
        ];
    }

    /**
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
     * @return array{items:list<array<string,mixed>>}
     */
    public function filesList(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_contratto']) ? (int) $input['id_contratto'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID contratto mancante o non valido.', 422);
        }
        $contratto = $this->repository->getById($id);
        if ($contratto === null) {
            throw new \RuntimeException('Contratto non trovato.', 404);
        }
        $items = $this->repository->listFiles($id);
        return ['items' => $items];
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $file
     * @return array<string, int>
     */
    public function uploadFile(array $input, array $file): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_contratto']) ? (int) $input['id_contratto'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID contratto mancante o non valido.', 422);
        }
        $contratto = $this->repository->getById($id);
        if ($contratto === null) {
            throw new \RuntimeException('Contratto non trovato.', 404);
        }

        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            throw new \RuntimeException('File mancante o non valido.', 422);
        }
        if (isset($file['error']) && (int) $file['error'] !== UPLOAD_ERR_OK) {
            throw new \RuntimeException('Errore durante il caricamento del file.', 422);
        }

        $originalName = isset($file['name']) ? basename((string) $file['name']) : 'contratto.pdf';
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        if ($extension !== 'pdf') {
            throw new \RuntimeException('ÃƒË† possibile caricare solo file PDF firmati.', 422);
        }

        $signature = file_get_contents($file['tmp_name'], false, null, 0, 4);
        if (!is_string($signature) || strpos($signature, '%PDF') !== 0) {
            throw new \RuntimeException('Il file caricato non sembra essere un PDF valido.', 422);
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $detectedMime = $finfo->file($file['tmp_name']);
        $mimeType = is_string($detectedMime) && $detectedMime !== '' ? $detectedMime : 'application/pdf';

        $safeName = sprintf('%s.pdf', uniqid('ctr_', true));
        $baseDir = dirname(__DIR__, 2) . '/uploads/contratti/' . $id;
        if (!is_dir($baseDir) && !mkdir($baseDir, 0775, true) && !is_dir($baseDir)) {
            throw new \RuntimeException('Impossibile creare la cartella di upload.', 500);
        }

        $destination = $baseDir . '/' . $safeName;
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new \RuntimeException('Impossibile salvare il file caricato.', 500);
        }

        $createdBy = isset($input['created_by']) ? (int) $input['created_by'] : null;
        if ($createdBy <= 0) {
            $createdBy = null;
        }

        $fileId = $this->repository->createFile($id, [
            'file_name' => $safeName,
            'original_name' => $originalName,
            'mime_type' => $mimeType,
            'size_bytes' => isset($file['size']) ? (int) $file['size'] : 0,
            'created_by' => $createdBy,
        ]);

        return ['id_file' => $fileId];
    }

    public function deleteFile(array $input): array
    {
        $fileId = isset($input['id']) ? (int) $input['id'] : 0;
        if ($fileId <= 0) {
            throw new \RuntimeException('File mancante o non valido.', 422);
        }

        $file = $this->repository->findFile($fileId);
        if ($file === null) {
            throw new \RuntimeException('File non trovato.', 404);
        }

        $contrattoId = isset($file['id_contratto']) ? (int) $file['id_contratto'] : 0;
        if ($contrattoId <= 0) {
            throw new \RuntimeException('File non valido.', 422);
        }

        $contratto = $this->repository->getById($contrattoId);
        if ($contratto === null) {
            throw new \RuntimeException('Contratto non trovato.', 404);
        }

        $this->repository->deleteFile($fileId);
        return ['ok' => true];
    }
}
