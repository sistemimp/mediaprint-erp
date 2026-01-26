<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use DateTimeImmutable;
use PDO;
use RuntimeException;

final class DdtRepository
{
    private ?bool $comboKeySupported = null;
    private ?bool $anagraficheCodiceClienteSupported = null;

    public function __construct(private PDO $pdo) {}

    /**
     * @return list<array{id_causale:int,code:string,label:string}>
     */
    public function listCausali(): array
    {
        $stmt = $this->pdo->query(
            'SELECT id_causale, code, label FROM cfg_causali_ddt WHERE attivo = 1 ORDER BY label ASC'
        );
        if ($stmt === false) {
            return [];
        }
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_causale' => (int) $row['id_causale'],
                'code' => (string) $row['code'],
                'label' => (string) $row['label'],
            ];
        }
        return $items;
    }

    /**
     * @return array{id_causale:int,code:string,label:string}|null
     */
    public function findCausaleById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $stmt = $this->pdo->prepare(
            'SELECT id_causale, code, label FROM cfg_causali_ddt WHERE id_causale = :id AND attivo = 1 LIMIT 1'
        );
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        return [
            'id_causale' => (int) $row['id_causale'],
            'code' => (string) $row['code'],
            'label' => (string) $row['label'],
        ];
    }

    private function normalizeDate(?string $raw): DateTimeImmutable
    {
        if ($raw !== null && trim($raw) !== '') {
            try {
                return new DateTimeImmutable($raw);
            } catch (\Throwable $exception) {
                throw new RuntimeException('Data DDT non valida.', 422);
            }
        }

        return new DateTimeImmutable('today');
    }

    private function nextNumero(int $anno): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT numero_documento FROM tb_ddt WHERE anno = :anno ORDER BY numero_documento DESC LIMIT 1 FOR UPDATE'
        );
        $stmt->bindValue(':anno', $anno, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $last = $row !== false ? (int) ($row['numero_documento'] ?? 0) : 0;
        return $last + 1;
    }

    private function ensureComboKeyColumn(): bool
    {
        if ($this->comboKeySupported !== null) {
            return $this->comboKeySupported;
        }

        $exists = false;
        try {
            $stmt = $this->pdo->query("SHOW COLUMNS FROM tb_ddt_righe LIKE 'combo_key'");
            $exists = $stmt && $stmt->fetch(PDO::FETCH_ASSOC) !== false;
            if (!$exists) {
                $this->pdo->exec("ALTER TABLE tb_ddt_righe ADD COLUMN combo_key VARCHAR(255) NULL AFTER id_prodotto");
                $stmt = $this->pdo->query("SHOW COLUMNS FROM tb_ddt_righe LIKE 'combo_key'");
                $exists = $stmt && $stmt->fetch(PDO::FETCH_ASSOC) !== false;
            }
        } catch (\Throwable $ignored) {
            $exists = false;
        }

        $this->comboKeySupported = $exists;
        return $this->comboKeySupported;
    }

    private function hasAnagraficheCodiceCliente(): bool
    {
        if ($this->anagraficheCodiceClienteSupported !== null) {
            return $this->anagraficheCodiceClienteSupported;
        }

        $exists = false;
        try {
            $stmt = $this->pdo->query("SHOW COLUMNS FROM tb_anagrafiche LIKE 'codice_cliente'");
            $exists = $stmt && $stmt->fetch(PDO::FETCH_ASSOC) !== false;
        } catch (\Throwable $ignored) {
            $exists = false;
        }

        $this->anagraficheCodiceClienteSupported = $exists;
        return $this->anagraficheCodiceClienteSupported;
    }

    /**
     * @param array<string,mixed> $data
     * @param list<array<string,mixed>> $righe
     * @return array<string,mixed>
     */
    public function createFromPreventivo(array $data, array $righe): array
    {
        $idAnagrafica = isset($data['id_anagrafica']) ? (int) $data['id_anagrafica'] : 0;
        if ($idAnagrafica <= 0) {
            throw new RuntimeException('Anagrafica non valida per il DDT.', 422);
        }

        if (empty($righe)) {
            throw new RuntimeException('Non ci sono righe da importare nel DDT.', 422);
        }

        $date = $this->normalizeDate(isset($data['data_ddt']) ? (string) $data['data_ddt'] : null);
        $anno = (int) $date->format('Y');
        $dateValue = $date->format('Y-m-d');
        $idCausale = isset($data['id_causale']) ? (int) $data['id_causale'] : null;
        $idSerie = isset($data['id_serie']) ? (int) $data['id_serie'] : null;
        $note = isset($data['note']) ? trim((string) $data['note']) : '';
        $destinazioneMerce = isset($data['destinazione_merce']) ? trim((string) $data['destinazione_merce']) : '';
        $idPreventivo = isset($data['id_preventivo']) ? (int) $data['id_preventivo'] : 0;
        $defaultSedeId = $this->pickDefaultSedeId($idAnagrafica);
        $statoDocumento = isset($data['stato_documento']) && (int) $data['stato_documento'] === 2 ? 2 : 1;

        $this->pdo->beginTransaction();
        try {
            $numero = $this->nextNumero($anno);
            $stmt = $this->pdo->prepare(
                'INSERT INTO tb_ddt (
                    id_serie, id_anagrafica, anno, numero_documento, data_ddt, id_causale, note, destinazione_merce, id_sede_destinazione, id_destinazione_predefinita, stato_documento, created_at, updated_at
                ) VALUES (
                    :id_serie, :id_anagrafica, :anno, :numero, :data_ddt, :id_causale, :note, :destinazione_merce, :id_sede_destinazione, NULL, :stato_documento, NOW(), NOW()
                )'
            );
            $stmt->bindValue(':id_serie', $idSerie && $idSerie > 0 ? $idSerie : null, $idSerie && $idSerie > 0 ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $stmt->bindValue(':id_anagrafica', $idAnagrafica, PDO::PARAM_INT);
            $stmt->bindValue(':anno', $anno, PDO::PARAM_INT);
            $stmt->bindValue(':numero', $numero, PDO::PARAM_INT);
            $stmt->bindValue(':data_ddt', $dateValue, PDO::PARAM_STR);
            $stmt->bindValue(':id_causale', $idCausale && $idCausale > 0 ? $idCausale : null, $idCausale && $idCausale > 0 ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $stmt->bindValue(':note', $note !== '' ? $note : null, $note !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(':destinazione_merce', $destinazioneMerce !== '' ? $destinazioneMerce : null, $destinazioneMerce !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(':id_sede_destinazione', $defaultSedeId, $defaultSedeId ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $stmt->bindValue(':stato_documento', $statoDocumento, PDO::PARAM_INT);
            $stmt->execute();
            $idDdt = (int) $this->pdo->lastInsertId();

            if ($idPreventivo > 0) {
                $linkStmt = $this->pdo->prepare(
                    'INSERT INTO appoggio_preventivo_ddt (id_preventivo, id_ddt) VALUES (:id_preventivo, :id_ddt)'
                );
                $linkStmt->bindValue(':id_preventivo', $idPreventivo, PDO::PARAM_INT);
                $linkStmt->bindValue(':id_ddt', $idDdt, PDO::PARAM_INT);
                $linkStmt->execute();
            }

            $hasComboKey = $this->ensureComboKeyColumn();
            $comboColumn = $hasComboKey ? ', combo_key' : '';
            $comboValue = $hasComboKey ? ', :combo_key' : '';
            $righeStmt = $this->pdo->prepare(
                'INSERT INTO tb_ddt_righe (
                    id_ddt, id_prodotto' . $comboColumn . ', descrizione, quantita, peso_unitario_kg, unita_misura, note, posizione
                ) VALUES (
                    :id_ddt, :id_prodotto' . $comboValue . ', :descrizione, :quantita, :peso_unitario_kg, :unita_misura, :note, :posizione
                )'
            );
            $posizione = 1;
            foreach ($righe as $line) {
                $descrizione = trim((string) ($line['descrizione'] ?? ''));
                if ($descrizione === '') {
                    continue;
                }
                $quantita = isset($line['quantita']) ? (float) $line['quantita'] : 1.0;
                if ($quantita <= 0) {
                    $quantita = 1.0;
                }
                $idProdotto = isset($line['id_prodotto']) ? (int) $line['id_prodotto'] : null;
                $comboKey = isset($line['combo_key']) ? trim((string) $line['combo_key']) : null;
                if ($comboKey === '') {
                    $comboKey = null;
                }
                $pesoUnit = isset($line['peso_unitario_kg']) ? (float) $line['peso_unitario_kg'] : null;
                $unitaMisura = isset($line['unita_misura']) && trim((string) $line['unita_misura']) !== ''
                    ? strtoupper(trim((string) $line['unita_misura']))
                    : null;

                $righeStmt->bindValue(':id_ddt', $idDdt, PDO::PARAM_INT);
                $righeStmt->bindValue(':id_prodotto', $idProdotto, $idProdotto ? PDO::PARAM_INT : PDO::PARAM_NULL);
                if ($hasComboKey) {
                    $righeStmt->bindValue(':combo_key', $comboKey, $comboKey ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                $righeStmt->bindValue(':descrizione', $descrizione, PDO::PARAM_STR);
                $righeStmt->bindValue(':quantita', $quantita, PDO::PARAM_STR);
                $righeStmt->bindValue(':peso_unitario_kg', $pesoUnit, $pesoUnit !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $righeStmt->bindValue(':unita_misura', $unitaMisura, $unitaMisura !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $righeStmt->bindValue(':note', null, PDO::PARAM_NULL);
                $righeStmt->bindValue(':posizione', $posizione, PDO::PARAM_INT);
                $righeStmt->execute();
                $posizione++;
            }

            $this->pdo->commit();
        } catch (\Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }

        $summary = $this->fetchById($idDdt);
        if ($summary !== null) {
            return $summary;
        }

            return [
                'id_ddt' => $idDdt,
                'id_anagrafica' => $idAnagrafica,
                'anno' => $anno,
                'numero_documento' => $numero,
                'data_ddt' => $dateValue,
                'id_causale' => $idCausale,
                'note' => $note !== '' ? $note : null,
                'destinazione_merce' => $destinazioneMerce !== '' ? $destinazioneMerce : null,
                'id_sede_destinazione' => $defaultSedeId,
                'id_destinazione_predefinita' => null,
                'stato_documento' => $statoDocumento,
                'righe' => $this->getLines($idDdt),
            ];
        }

    /**
     * @return array<string,mixed>|null
     */
    public function fetchById(int $id): ?array
    {
        $codiceClienteSelect = $this->hasAnagraficheCodiceCliente()
            ? 'a.codice_cliente AS cliente_codice_cliente,'
            : 'NULL AS cliente_codice_cliente,';

        $stmt = $this->pdo->prepare(
            'SELECT
                d.id_ddt,
                d.id_anagrafica,
                d.anno,
                d.numero_documento,
                d.data_ddt,
                d.id_causale,
                c.label AS causale_label,
                d.totale_pezzi,
                d.totale_peso_kg,
                d.note,
                d.destinazione_merce,
                d.aspetto,
                d.numero_colli,
                d.cura_trasporto,
                d.data_trasporto,
                d.vettore,
                d.created_at,
                d.updated_at,
                d.id_sede_destinazione,
                d.id_destinazione_predefinita,
                d.stato_documento,
                a.ragione_sociale AS cliente_ragione_sociale,
                ' . $codiceClienteSelect . '
                a.piva AS cliente_piva,
                a.codice_fiscale AS cliente_codice_fiscale,
                a.email AS cliente_email,
                a.telefono AS cliente_telefono,
                a.pec AS cliente_pec,
                a.indirizzo AS cliente_indirizzo,
                a.cap AS cliente_cap,
                a.comune AS cliente_comune,
                a.provincia AS cliente_provincia,
                a.nazione_iso2 AS cliente_nazione,
                dm.label AS destinazione_label,
                dm.indirizzo AS destinazione_indirizzo,
                dm.cap AS destinazione_cap,
                dm.comune AS destinazione_comune,
                dm.provincia AS destinazione_provincia,
                dm.nazione_iso2 AS destinazione_nazione,
                dm.note AS destinazione_note
            FROM tb_ddt d
            LEFT JOIN cfg_causali_ddt c ON c.id_causale = d.id_causale
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = d.id_anagrafica
            LEFT JOIN cfg_destinazioni_merce dm ON dm.id_destinazione = d.id_destinazione_predefinita
            WHERE d.id_ddt = :id
            LIMIT 1'
        );
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        $sedi = $this->fetchSediForAnagrafica((int) $row['id_anagrafica']);
        $selectedSede = $this->resolvePreferredSede(
            $sedi,
            isset($row['id_sede_destinazione']) ? (int) $row['id_sede_destinazione'] : null,
            $row
        );

        return [
            'id_ddt' => (int) $row['id_ddt'],
            'id_anagrafica' => (int) $row['id_anagrafica'],
            'anno' => (int) $row['anno'],
            'numero_documento' => (int) $row['numero_documento'],
            'data_ddt' => $row['data_ddt'] ?? null,
            'id_causale' => isset($row['id_causale']) ? (int) $row['id_causale'] : null,
            'causale_label' => $row['causale_label'] ?? null,
            'totale_pezzi' => isset($row['totale_pezzi']) ? (int) $row['totale_pezzi'] : null,
            'totale_peso_kg' => isset($row['totale_peso_kg']) ? (float) $row['totale_peso_kg'] : null,
            'note' => $row['note'] ?? null,
            'destinazione_merce' => $row['destinazione_merce'] ?? null,
            'aspetto' => $row['aspetto'] ?? null,
            'numero_colli' => isset($row['numero_colli']) ? (int) $row['numero_colli'] : null,
            'cura_trasporto' => $row['cura_trasporto'] ?? null,
            'data_trasporto' => $row['data_trasporto'] ?? null,
            'vettore' => $row['vettore'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
            'stato_documento' => isset($row['stato_documento']) ? (int) $row['stato_documento'] : 1,
            'cliente_ragione_sociale' => $row['cliente_ragione_sociale'] ?? null,
            'cliente_codice_cliente' => $row['cliente_codice_cliente'] ?? null,
            'cliente_piva' => $row['cliente_piva'] ?? null,
            'cliente_codice_fiscale' => $row['cliente_codice_fiscale'] ?? null,
            'cliente_email' => $row['cliente_email'] ?? null,
            'cliente_telefono' => $row['cliente_telefono'] ?? null,
            'cliente_pec' => $row['cliente_pec'] ?? null,
            'cliente_indirizzo' => $row['cliente_indirizzo'] ?? null,
            'cliente_cap' => $row['cliente_cap'] ?? null,
            'cliente_comune' => $row['cliente_comune'] ?? null,
            'cliente_provincia' => $row['cliente_provincia'] ?? null,
            'cliente_nazione' => $row['cliente_nazione'] ?? null,
            'id_sede_destinazione' => $selectedSede['id_sede'] ?? null,
            'cliente_sede' => $selectedSede,
            'cliente_sedi' => $sedi,
            'id_destinazione_predefinita' => isset($row['id_destinazione_predefinita']) ? (int) $row['id_destinazione_predefinita'] : null,
            'destinazione_predefinita' => $this->formatDestinazionePredefinitaRow($row),
            'righe' => $this->getLines($id),
        ];
    }

    /**
     * @param array<string,mixed> $data
     * @return array<string,mixed>
     */
    public function updateDetail(int $id, array $data): array
    {
        if ($id <= 0) {
            throw new RuntimeException('ID DDT non valido.', 422);
        }

        $existing = $this->fetchById($id);
        if ($existing === null) {
            throw new RuntimeException('DDT non trovato.', 404);
        }
        $existingStatus = isset($existing['stato_documento']) ? (int) $existing['stato_documento'] : 1;
        $lockedPayloadKeys = array_filter(
            array_keys($data),
            fn ($key) => $key !== 'stato_documento'
        );
        if ($existingStatus === 2 && !empty($lockedPayloadKeys)) {
            throw new RuntimeException("Il DDT risulta emesso; torna prima allo stato bozza per modificarlo.", 409);
        }

        $setClauses = [];
        $params = [':id' => $id];
        $types = [':id' => PDO::PARAM_INT];
        $hasChanges = false;

        if (array_key_exists('id_anagrafica', $data)) {
            $idAnagrafica = (int) $data['id_anagrafica'];
            if ($idAnagrafica <= 0) {
                throw new RuntimeException('Selezionare un\'anagrafica valida per il DDT.', 422);
            }
            $setClauses[] = 'id_anagrafica = :id_anagrafica';
            $params[':id_anagrafica'] = $idAnagrafica;
            $types[':id_anagrafica'] = PDO::PARAM_INT;
        }

        if (array_key_exists('data_ddt', $data)) {
            $rawDate = $data['data_ddt'];
            if ($rawDate === null || trim((string) $rawDate) === '') {
                throw new RuntimeException('Specificare una data per il DDT.', 422);
            }
            $date = $this->normalizeDate((string) $rawDate);
            $setClauses[] = 'data_ddt = :data_ddt';
            $params[':data_ddt'] = $date->format('Y-m-d');
            $types[':data_ddt'] = PDO::PARAM_STR;
        }

        if (array_key_exists('id_causale', $data)) {
            $idCausale = (int) $data['id_causale'];
            if ($idCausale > 0) {
                $setClauses[] = 'id_causale = :id_causale';
                $params[':id_causale'] = $idCausale;
                $types[':id_causale'] = PDO::PARAM_INT;
            } else {
                $setClauses[] = 'id_causale = NULL';
            }
        }

        if (array_key_exists('note', $data)) {
            $note = $data['note'] !== null ? trim((string) $data['note']) : '';
            if ($note === '') {
                $setClauses[] = 'note = NULL';
            } else {
                $setClauses[] = 'note = :note';
                $params[':note'] = $note;
                $types[':note'] = PDO::PARAM_STR;
            }
        }

        if (array_key_exists('destinazione_merce', $data)) {
            $dest = $data['destinazione_merce'] !== null ? trim((string) $data['destinazione_merce']) : '';
            if ($dest === '') {
                $setClauses[] = 'destinazione_merce = NULL';
            } else {
                $setClauses[] = 'destinazione_merce = :destinazione_merce';
                $params[':destinazione_merce'] = $dest;
                $types[':destinazione_merce'] = PDO::PARAM_STR;
            }
        }

        if (array_key_exists('aspetto', $data)) {
            $aspetto = $data['aspetto'] !== null ? trim((string) $data['aspetto']) : '';
            if ($aspetto === '') {
                $setClauses[] = 'aspetto = NULL';
            } else {
                $setClauses[] = 'aspetto = :aspetto';
                $params[':aspetto'] = $aspetto;
                $types[':aspetto'] = PDO::PARAM_STR;
            }
        }

        if (array_key_exists('numero_colli', $data)) {
            $rawColli = $data['numero_colli'];
            if ($rawColli === null || $rawColli === '') {
                $setClauses[] = 'numero_colli = NULL';
            } else {
                if (!is_numeric($rawColli)) {
                    throw new RuntimeException('Il numero di colli non e\' valido.', 422);
                }
                $numeroColli = (int) $rawColli;
                if ($numeroColli < 0) {
                    throw new RuntimeException('Il numero di colli deve essere maggiore o uguale a zero.', 422);
                }
                $setClauses[] = 'numero_colli = :numero_colli';
                $params[':numero_colli'] = $numeroColli;
                $types[':numero_colli'] = PDO::PARAM_INT;
            }
        }

        if (array_key_exists('cura_trasporto', $data)) {
            $cura = $data['cura_trasporto'] !== null ? trim((string) $data['cura_trasporto']) : '';
            if ($cura === '') {
                $setClauses[] = 'cura_trasporto = NULL';
            } else {
                $setClauses[] = 'cura_trasporto = :cura_trasporto';
                $params[':cura_trasporto'] = $cura;
                $types[':cura_trasporto'] = PDO::PARAM_STR;
            }
        }

        if (array_key_exists('data_trasporto', $data)) {
            $rawDate = $data['data_trasporto'];
            if ($rawDate === null || trim((string) $rawDate) === '') {
                $setClauses[] = 'data_trasporto = NULL';
            } else {
                try {
                    $dateTrasporto = new DateTimeImmutable((string) $rawDate);
                } catch (\Throwable) {
                    throw new RuntimeException('La data di trasporto non e\' valida.', 422);
                }
                $setClauses[] = 'data_trasporto = :data_trasporto';
                $params[':data_trasporto'] = $dateTrasporto->format('Y-m-d');
                $types[':data_trasporto'] = PDO::PARAM_STR;
            }
        }

        if (array_key_exists('vettore', $data)) {
            $vettore = $data['vettore'] !== null ? trim((string) $data['vettore']) : '';
            if ($vettore === '') {
                $setClauses[] = 'vettore = NULL';
            } else {
                $setClauses[] = 'vettore = :vettore';
                $params[':vettore'] = $vettore;
                $types[':vettore'] = PDO::PARAM_STR;
            }
        }

        if (array_key_exists('id_sede_destinazione', $data)) {
            $rawSede = $data['id_sede_destinazione'];
            $idSede = $rawSede !== null && $rawSede !== '' ? (int) $rawSede : 0;
            if ($idSede > 0) {
                $idAnagraficaTarget = isset($params[':id_anagrafica'])
                    ? (int) $params[':id_anagrafica']
                    : (int) $existing['id_anagrafica'];
                if (!$this->sedeBelongsToAnagrafica($idAnagraficaTarget, $idSede)) {
                    throw new RuntimeException('La sede selezionata non appartiene al cliente del DDT.', 422);
                }
                $setClauses[] = 'id_sede_destinazione = :id_sede_destinazione';
                $params[':id_sede_destinazione'] = $idSede;
                $types[':id_sede_destinazione'] = PDO::PARAM_INT;
            } else {
                $setClauses[] = 'id_sede_destinazione = NULL';
            }
        }

        if (array_key_exists('id_destinazione_predefinita', $data)) {
            $rawDest = $data['id_destinazione_predefinita'];
            $idDest = $rawDest !== null && $rawDest !== '' ? (int) $rawDest : 0;
            if ($idDest > 0) {
                if (!$this->destinazionePredefinitaExists($idDest)) {
                    throw new RuntimeException('Destinazione predefinita non valida.', 422);
                }
                $setClauses[] = 'id_destinazione_predefinita = :id_destinazione_predefinita';
                $params[':id_destinazione_predefinita'] = $idDest;
                $types[':id_destinazione_predefinita'] = PDO::PARAM_INT;
            } else {
                $setClauses[] = 'id_destinazione_predefinita = NULL';
            }
        }

        if (array_key_exists('stato_documento', $data)) {
            $status = (int) $data['stato_documento'] === 2 ? 2 : 1;
            $setClauses[] = 'stato_documento = :stato_documento';
            $params[':stato_documento'] = $status;
            $types[':stato_documento'] = PDO::PARAM_INT;
        }

        if (!empty($setClauses)) {
            $setClauses[] = 'updated_at = NOW()';
            $sql = 'UPDATE tb_ddt SET ' . implode(', ', $setClauses) . ' WHERE id_ddt = :id LIMIT 1';
            $stmt = $this->pdo->prepare($sql);
            foreach ($params as $placeholder => $value) {
                $type = $types[$placeholder] ?? PDO::PARAM_STR;
                if ($value === null) {
                    $stmt->bindValue($placeholder, null, PDO::PARAM_NULL);
                } else {
                    $stmt->bindValue($placeholder, $value, $type);
                }
            }
            $stmt->execute();
            $hasChanges = true;
        }

        if (array_key_exists('righe', $data)) {
            $lines = is_array($data['righe']) ? $data['righe'] : [];
            $this->replaceLines($id, $lines);
            $hasChanges = true;
        }

        if (!$hasChanges) {
            return $existing;
        }

        $updated = $this->fetchById($id);
        if ($updated === null) {
            throw new RuntimeException('Impossibile ricaricare il DDT aggiornato.', 500);
        }
        return $updated;
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function getLines(int $id): array
    {
        $hasComboKey = $this->ensureComboKeyColumn();
        $comboSelect = $hasComboKey ? ",\n                combo_key" : '';
        $stmt = $this->pdo->prepare(
            'SELECT
                id_riga,
                id_prodotto,
                descrizione,
                quantita,
                peso_unitario_kg,
                peso_totale_kg,
                unita_misura,
                note,
                posizione' . $comboSelect . '
            FROM tb_ddt_righe
            WHERE id_ddt = :id
            ORDER BY COALESCE(posizione, id_riga) ASC'
        );
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $lines = [];
        foreach ($rows as $row) {
            $lines[] = [
                'id_riga' => (int) $row['id_riga'],
                'id_prodotto' => isset($row['id_prodotto']) ? (int) $row['id_prodotto'] : null,
                'descrizione' => (string) $row['descrizione'],
                'quantita' => isset($row['quantita']) ? (float) $row['quantita'] : 0.0,
                'peso_unitario_kg' => isset($row['peso_unitario_kg']) ? (float) $row['peso_unitario_kg'] : null,
                'peso_totale_kg' => isset($row['peso_totale_kg']) ? (float) $row['peso_totale_kg'] : null,
                'unita_misura' => $row['unita_misura'] ?? null,
                'note' => $row['note'] ?? null,
                'posizione' => isset($row['posizione']) ? (int) $row['posizione'] : null,
                'combo_key' => $hasComboKey ? ($row['combo_key'] ?? null) : null,
            ];
        }
        return $lines;
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listDestinazioniPredefinite(): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id_destinazione, label, indirizzo, cap, comune, provincia, nazione_iso2, note
            FROM cfg_destinazioni_merce
            WHERE attivo = 1
            ORDER BY label ASC'
        );
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_destinazione' => isset($row['id_destinazione']) ? (int) $row['id_destinazione'] : null,
                'label' => $row['label'] ?? null,
                'indirizzo' => $row['indirizzo'] ?? null,
                'cap' => $row['cap'] ?? null,
                'comune' => $row['comune'] ?? null,
                'provincia' => $row['provincia'] ?? null,
                'nazione_iso2' => $row['nazione_iso2'] ?? null,
                'note' => $row['note'] ?? null,
            ];
        }
        return $items;
    }

    /**
     * @param list<array<string,mixed>> $lines
     */
    public function replaceLines(int $id, array $lines): void
    {
        if ($id <= 0) {
            throw new RuntimeException('ID DDT non valido per l\'aggiornamento righe.', 422);
        }

        $normalized = [];
        foreach ($lines as $line) {
            if (!is_array($line)) {
                continue;
            }
            $descrizione = isset($line['descrizione']) ? trim((string) $line['descrizione']) : '';
            if ($descrizione === '') {
                continue;
            }
            $quantitaRaw = $line['quantita'] ?? $line['qty'] ?? null;
            $quantita = is_numeric($quantitaRaw) ? (float) $quantitaRaw : null;
            if ($quantita === null || $quantita <= 0) {
                throw new RuntimeException('La quantità delle righe DDT deve essere maggiore di zero.', 422);
            }
            $pesoRaw = $line['peso_unitario_kg'] ?? $line['peso_unitario'] ?? $line['peso'] ?? null;
            $pesoUnitario = null;
            if ($pesoRaw !== null && $pesoRaw !== '') {
                $pesoValue = (float) $pesoRaw;
                if (!is_finite($pesoValue) || $pesoValue < 0) {
                    throw new RuntimeException('Il peso unitario delle righe DDT non è valido.', 422);
                }
                $pesoUnitario = $pesoValue;
            }
            $unita = isset($line['unita_misura']) ? strtoupper(trim((string) $line['unita_misura'])) : null;
            if ($unita === '') {
                $unita = null;
            }
            $idProdotto = isset($line['id_prodotto']) ? (int) $line['id_prodotto'] : null;
            $comboKey = isset($line['combo_key']) ? trim((string) $line['combo_key']) : null;
            if ($comboKey === '') {
                $comboKey = null;
            }

            $normalized[] = [
                'id_prodotto' => $idProdotto,
                'descrizione' => $descrizione,
                'quantita' => $quantita,
                'peso_unitario_kg' => $pesoUnitario,
                'unita_misura' => $unita,
                'combo_key' => $comboKey,
            ];
        }

        if (empty($normalized)) {
            throw new RuntimeException('Inserire almeno una riga valida per il DDT.', 422);
        }

        $this->pdo->beginTransaction();
        try {
            $del = $this->pdo->prepare('DELETE FROM tb_ddt_righe WHERE id_ddt = :id');
            $del->bindValue(':id', $id, PDO::PARAM_INT);
            $del->execute();

            $hasComboKey = $this->ensureComboKeyColumn();
            $comboColumn = $hasComboKey ? ', combo_key' : '';
            $comboValue = $hasComboKey ? ', :combo_key' : '';
            $stmt = $this->pdo->prepare(
                'INSERT INTO tb_ddt_righe (
                    id_ddt, id_prodotto' . $comboColumn . ', descrizione, quantita, peso_unitario_kg, unita_misura, note, posizione
                ) VALUES (
                    :id_ddt, :id_prodotto' . $comboValue . ', :descrizione, :quantita, :peso_unitario_kg, :unita_misura, NULL, :posizione
                )'
            );

            $totalePezzi = 0.0;
            $totalePeso = 0.0;
            $hasPeso = false;

            $posizione = 1;
            foreach ($normalized as $line) {
                $stmt->bindValue(':id_ddt', $id, PDO::PARAM_INT);
                $stmt->bindValue(':id_prodotto', $line['id_prodotto'], $line['id_prodotto'] ? PDO::PARAM_INT : PDO::PARAM_NULL);
                if ($hasComboKey) {
                    $stmt->bindValue(':combo_key', $line['combo_key'], $line['combo_key'] ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                $stmt->bindValue(':descrizione', $line['descrizione'], PDO::PARAM_STR);
                $stmt->bindValue(':quantita', $line['quantita'], PDO::PARAM_STR);
                if ($line['peso_unitario_kg'] !== null) {
                    $stmt->bindValue(':peso_unitario_kg', $line['peso_unitario_kg'], PDO::PARAM_STR);
                } else {
                    $stmt->bindValue(':peso_unitario_kg', null, PDO::PARAM_NULL);
                }
                if ($line['unita_misura'] !== null) {
                    $stmt->bindValue(':unita_misura', $line['unita_misura'], PDO::PARAM_STR);
                } else {
                    $stmt->bindValue(':unita_misura', null, PDO::PARAM_NULL);
                }
                $stmt->bindValue(':posizione', $posizione, PDO::PARAM_INT);
                $stmt->execute();
                $posizione++;

                $totalePezzi += $line['quantita'];
                if ($line['peso_unitario_kg'] !== null) {
                    $totalePeso += $line['quantita'] * $line['peso_unitario_kg'];
                    $hasPeso = true;
                }
            }

            $updateTotals = $this->pdo->prepare(
                'UPDATE tb_ddt SET totale_pezzi = :totale_pezzi, totale_peso_kg = :totale_peso, updated_at = NOW() WHERE id_ddt = :id LIMIT 1'
            );
            $updateTotals->bindValue(':totale_pezzi', $totalePezzi, PDO::PARAM_STR);
            if ($hasPeso) {
                $updateTotals->bindValue(':totale_peso', $totalePeso, PDO::PARAM_STR);
            } else {
                $updateTotals->bindValue(':totale_peso', null, PDO::PARAM_NULL);
            }
            $updateTotals->bindValue(':id', $id, PDO::PARAM_INT);
            $updateTotals->execute();

            $this->pdo->commit();
        } catch (\Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function fetchSediForAnagrafica(int $idAnagrafica): array
    {
        if ($idAnagrafica <= 0) {
            return [];
        }
        $stmt = $this->pdo->prepare(
            'SELECT
                id_sede,
                id_tipo,
                denominazione,
                indirizzo,
                civico,
                cap,
                comune,
                provincia,
                nazione_iso2,
                telefono,
                email,
                note,
                is_legale,
                is_predefinita
            FROM tb_sedi
            WHERE id_anagrafica = :id
            ORDER BY is_legale DESC, is_predefinita DESC, denominazione ASC, id_sede ASC'
        );
        $stmt->bindValue(':id', $idAnagrafica, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_sede' => isset($row['id_sede']) ? (int) $row['id_sede'] : null,
                'id_tipo' => isset($row['id_tipo']) ? (int) $row['id_tipo'] : null,
                'denominazione' => $row['denominazione'] ?? null,
                'indirizzo' => $row['indirizzo'] ?? null,
                'civico' => $row['civico'] ?? null,
                'cap' => $row['cap'] ?? null,
                'comune' => $row['comune'] ?? null,
                'provincia' => $row['provincia'] ?? null,
                'nazione_iso2' => $row['nazione_iso2'] ?? null,
                'telefono' => $row['telefono'] ?? null,
                'email' => $row['email'] ?? null,
                'note' => $row['note'] ?? null,
                'is_legale' => isset($row['is_legale']) ? (int) $row['is_legale'] : 0,
                'is_predefinita' => isset($row['is_predefinita']) ? (int) $row['is_predefinita'] : 0,
            ];
        }
        return $items;
    }

    /**
     * @param list<array<string,mixed>> $sedi
     * @param array<string,mixed> $fallback
     * @return array<string,mixed>
     */
    private function resolvePreferredSede(array $sedi, ?int $preferredId, array $fallback): array
    {
        if ($preferredId !== null) {
            foreach ($sedi as $sede) {
                if (isset($sede['id_sede']) && (int) $sede['id_sede'] === $preferredId) {
                    return $sede;
                }
            }
        }
        if (!empty($sedi)) {
            return $sedi[0];
        }

        return [
            'id_sede' => null,
            'id_tipo' => null,
            'denominazione' => $fallback['cliente_ragione_sociale'] ?? null,
            'indirizzo' => $fallback['cliente_indirizzo'] ?? null,
            'civico' => null,
            'cap' => $fallback['cliente_cap'] ?? null,
            'comune' => $fallback['cliente_comune'] ?? null,
            'provincia' => $fallback['cliente_provincia'] ?? null,
            'nazione_iso2' => $fallback['cliente_nazione'] ?? null,
            'telefono' => $fallback['cliente_telefono'] ?? null,
            'email' => $fallback['cliente_email'] ?? null,
            'note' => null,
            'is_legale' => null,
            'is_predefinita' => null,
        ];
    }

    private function pickDefaultSedeId(int $idAnagrafica): ?int
    {
        $sedi = $this->fetchSediForAnagrafica($idAnagrafica);
        if (empty($sedi)) {
            return null;
        }
        $first = $sedi[0];
        return isset($first['id_sede']) ? (int) $first['id_sede'] : null;
    }

    private function sedeBelongsToAnagrafica(int $idAnagrafica, int $idSede): bool
    {
        if ($idAnagrafica <= 0 || $idSede <= 0) {
            return false;
        }
        $stmt = $this->pdo->prepare('SELECT 1 FROM tb_sedi WHERE id_sede = :sede AND id_anagrafica = :anag LIMIT 1');
        $stmt->bindValue(':sede', $idSede, PDO::PARAM_INT);
        $stmt->bindValue(':anag', $idAnagrafica, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchColumn() !== false;
    }

    private function destinazionePredefinitaExists(int $id): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM cfg_destinazioni_merce WHERE id_destinazione = :id AND attivo = 1 LIMIT 1');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchColumn() !== false;
    }

    private function formatDestinazionePredefinitaRow(?array $row): ?array
    {
        if (!$row || empty($row['destinazione_label'])) {
            return null;
        }
        return [
            'id_destinazione' => isset($row['id_destinazione_predefinita']) ? (int) $row['id_destinazione_predefinita'] : null,
            'label' => $row['destinazione_label'] ?? null,
            'indirizzo' => $row['destinazione_indirizzo'] ?? null,
            'cap' => $row['destinazione_cap'] ?? null,
            'comune' => $row['destinazione_comune'] ?? null,
            'provincia' => $row['destinazione_provincia'] ?? null,
            'nazione_iso2' => $row['destinazione_nazione'] ?? null,
            'note' => $row['destinazione_note'] ?? null,
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listLatest(int $limit = 200, ?array $allowedAnagrafiche = null, bool $excludeDraft = false): array
    {
        $limit = max(1, min($limit, 500));
        $sql = <<<'SQL'
            SELECT
                d.id_ddt,
                d.id_anagrafica,
                d.anno,
                d.numero_documento,
                d.data_ddt,
                d.stato_documento,
                d.totale_pezzi,
                d.totale_peso_kg,
                d.note,
                d.id_causale,
                c.label AS causale_label,
                a.ragione_sociale AS cliente_ragione_sociale,
                d.created_at,
                d.updated_at
            FROM tb_ddt d
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = d.id_anagrafica
            LEFT JOIN cfg_causali_ddt c ON c.id_causale = d.id_causale
            /*FILTERS*/
            ORDER BY COALESCE(d.data_ddt, d.created_at) DESC, d.id_ddt DESC
            LIMIT :limit
        SQL;

        $allowed = null;
        if (is_array($allowedAnagrafiche)) {
            $allowed = array_values(array_filter(array_map('intval', $allowedAnagrafiche), static fn($id) => $id > 0));
            if ($allowed === []) {
                return [];
            }
        }
        $whereParts = [];
        if ($allowed !== null) {
            $placeholders = implode(',', array_fill(0, count($allowed), '?'));
            $whereParts[] = "d.id_anagrafica IN ({$placeholders})";
        }
        if ($excludeDraft) {
            $whereParts[] = 'd.stato_documento <> 1';
        }
        $where = $whereParts ? ('WHERE ' . implode(' AND ', $whereParts)) : '';

        $sql = str_replace('/*FILTERS*/', $where, $sql);
        $sql = str_replace(':limit', (string) $limit, $sql);
        $stmt = $this->pdo->prepare($sql);
        if ($allowed !== null) {
            foreach ($allowed as $index => $id) {
                $stmt->bindValue($index + 1, $id, PDO::PARAM_INT);
            }
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_ddt' => (int) $row['id_ddt'],
                'id_anagrafica' => isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : null,
                'anno' => isset($row['anno']) ? (int) $row['anno'] : null,
                'numero_documento' => isset($row['numero_documento']) ? (int) $row['numero_documento'] : null,
                'data_ddt' => $row['data_ddt'] ?? null,
                'stato_documento' => isset($row['stato_documento']) ? (int) $row['stato_documento'] : 1,
                'totale_pezzi' => isset($row['totale_pezzi']) ? (int) $row['totale_pezzi'] : null,
                'totale_peso_kg' => isset($row['totale_peso_kg']) ? (float) $row['totale_peso_kg'] : null,
                'note' => $row['note'] ?? null,
                'id_causale' => isset($row['id_causale']) ? (int) $row['id_causale'] : null,
                'causale_label' => $row['causale_label'] ?? null,
                'cliente_ragione_sociale' => $row['cliente_ragione_sociale'] ?? null,
                'created_at' => $row['created_at'] ?? null,
                'updated_at' => $row['updated_at'] ?? null,
            ];
        }

        return $items;
    }
}
