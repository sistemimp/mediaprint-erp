<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use RuntimeException;
use ZipArchive;

final class PagamentiImportService
{
    /**
     * @param array<string,mixed> $file
     * @return array{items:list<array<string,mixed>>,headers:list<string>}
     */
    public function parseUploadedFile(array $file): array
    {
        if (!isset($file['tmp_name']) || !is_file($file['tmp_name'])) {
            throw new RuntimeException('File di input non valido.', 422);
        }

        $originalName = isset($file['name']) ? (string) $file['name'] : 'file';
        $extension = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));

        if (!in_array($extension, ['csv', 'xlsx', 'xlsm', 'xls'])) {
            throw new RuntimeException('Formato file non supportato. Utilizzare Excel (.xlsx) o CSV.', 422);
        }

        if (($file['size'] ?? 0) > 5 * 1024 * 1024) {
            throw new RuntimeException('Il file supera i 5MB consentiti.', 422);
        }

        if ($extension === 'csv') {
            $rows = $this->parseCsv($file['tmp_name']);
        } elseif (in_array($extension, ['xlsx', 'xlsm', 'xls'], true)) {
            if ($this->isZipArchive($file['tmp_name'])) {
                $rows = $this->parseXlsx($file['tmp_name']);
            } else {
                $rows = $this->parseCsv($file['tmp_name']);
            }
        } else {
            $rows = $this->parseCsv($file['tmp_name']);
        }

        if (empty($rows)) {
            throw new RuntimeException('Il file non contiene righe valide.', 422);
        }

        return $rows;
    }

    /**
     * @return array{items:list<array<string,mixed>>,headers:list<string>}
     */
    private function parseCsv(string $path): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new RuntimeException('Impossibile leggere il file CSV.', 422);
        }

        $headers = null;
        $rows = [];
        $delimiter = null;

        while (($line = fgets($handle)) !== false) {
            $raw = rtrim($line, "\r\n");
            if ($raw === '') {
                continue;
            }
            $normalizedLine = $this->normalizeEncoding($raw);
            $trimmed = trim($normalizedLine);
            if ($trimmed === '') {
                continue;
            }
            $currentDelimiter = $delimiter ?? $this->detectDelimiter($normalizedLine);
            $values = str_getcsv($normalizedLine, $currentDelimiter);
            $values = array_map(fn ($value) => $this->normalizeCellValue($value), $values);
            if ($headers === null) {
                if ($this->shouldSkipHeaderRow($values)) {
                    continue;
                }
                $delimiter = $currentDelimiter;
                $headers = $this->normalizeHeaders($values);
                continue;
            }
            $row = $this->mapRow($headers, $values);
            if (!empty($row)) {
                $rows[] = $row;
            }
        }

        fclose($handle);

        $rows = $this->composeVerticalRows($rows);

        return [
            'headers' => array_values($headers ?? []),
            'items' => $rows,
        ];
    }

    /**
     * @return array{items:list<array<string,mixed>>,headers:list<string>}
     */
    private function parseXlsx(string $path): array
    {
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw new RuntimeException('Impossibile aprire il file Excel.', 422);
        }

        $sheetPath = null;
        foreach (['xl/worksheets/sheet1.xml', 'xl/worksheets/sheet0.xml'] as $candidate) {
            if ($zip->locateName($candidate) !== false) {
                $sheetPath = $candidate;
                break;
            }
        }
        if ($sheetPath === null) {
            $zip->close();
            throw new RuntimeException('Il file Excel non contiene dati nella prima scheda.', 422);
        }

        $sheetXml = $zip->getFromName($sheetPath);
        if ($sheetXml === false) {
            $zip->close();
            throw new RuntimeException('Impossibile leggere i dati dal file Excel.', 422);
        }

        $sharedStringsMap = [];
        $stringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($stringsXml !== false) {
            $sharedStringsMap = $this->parseSharedStrings($stringsXml);
        }
        $zip->close();

        $xml = new \SimpleXMLElement($sheetXml);
        $rowsNodes = $xml->sheetData->row ?? [];
        $headers = null;
        $maxColumns = 0;
        $rows = [];

        foreach ($rowsNodes as $rowNode) {
            $cells = [];
            foreach ($rowNode->c as $cell) {
                $ref = (string) $cell['r'];
                $column = $this->columnIndexFromReference($ref);
                $value = $this->extractCellValue($cell, $sharedStringsMap);
                $cells[$column] = $value;
                if ($column > $maxColumns) {
                    $maxColumns = $column;
                }
            }

            if ($headers === null) {
                $headerValues = [];
                for ($i = 0; $i <= $maxColumns; $i++) {
                    $headerValues[] = $this->normalizeCellValue($cells[$i] ?? '');
                }
                if ($this->shouldSkipHeaderRow($headerValues)) {
                    continue;
                }
                $headers = $this->normalizeHeaders($headerValues);
                continue;
            }

            $rowValues = [];
            for ($i = 0; $i <= $maxColumns; $i++) {
                $rowValues[] = $this->normalizeCellValue($cells[$i] ?? '');
            }
            $row = $this->mapRow($headers, $rowValues);
            if (!empty($row)) {
                $rows[] = $row;
            }
        }

        if ($headers === null) {
            throw new RuntimeException('Il file Excel non contiene intestazioni valide.', 422);
        }

        $rows = $this->composeVerticalRows($rows);

        return [
            'headers' => array_values($headers),
            'items' => $rows,
        ];
    }

    /**
     * @param list<string> $headers
     * @param list<string> $values
     * @return array<string,mixed>
     */
    private function mapRow(array $headers, array $values): array
    {
        $normalized = [];
        foreach ($headers as $index => $field) {
            if ($field === '') {
                continue;
            }
            $value = $values[$index] ?? '';
            $value = is_string($value) ? trim($value) : $value;
            if ($value === '') {
                continue;
            }
            $normalized[$field] = $value;
        }
        if (!empty($normalized)) {
            return $normalized;
        }

        $fallbackFields = ['data', 'valuta', 'note', 'importo'];
        $fallbackRow = [];
        $max = min(count($fallbackFields), count($values));
        for ($i = 0; $i < $max; $i++) {
            $trimmed = is_string($values[$i]) ? trim($values[$i]) : $values[$i];
            if ($trimmed === '' || $trimmed === null) {
                continue;
            }
            $fallbackRow[$fallbackFields[$i]] = $trimmed;
        }

        return $fallbackRow;
    }

    /**
     * @param list<string> $headers
     * @return list<string>
     */
    private function normalizeHeaders(array $headers): array
    {
        $normalized = [];
        foreach ($headers as $header) {
            $label = strtolower(trim((string) $header));
            $label = preg_replace('/[^a-z0-9]+/i', '_', $label);
            $label = trim($label, '_');
            if ($label === '') {
                $normalized[] = '';
                continue;
            }
            $aliases = [
                'operaz' => 'operaz',
                'operazione' => 'operaz',
                'operaz_' => 'operaz',
                'data' => 'data',
                'valuta' => 'valuta',
                'descrizione' => 'descrizione',
                'eur' => 'importo',
                'importo' => 'importo',
                'caus' => 'causale',
                'caus_' => 'causale',
                'causale' => 'causale',
            ];
            if (isset($aliases[$label])) {
                $label = $aliases[$label];
            }
            $normalized[] = $label;
        }

        $recognized = array_intersect($normalized, ['operaz', 'data', 'valuta', 'descrizione', 'importo', 'causale']);
        if ((count($recognized) === 0 || (count($recognized) === 1 && in_array('data', $recognized, true))) && count($normalized) >= 2) {
            $normalized = [];
            $normalized[] = 'data';
            $normalized[] = count($headers) >= 2 ? 'valuta' : '';
            $normalized[] = count($headers) >= 3 ? 'note' : '';
            $normalized[] = count($headers) >= 4 ? 'importo' : '';
            for ($i = count($normalized); $i < count($headers); $i++) {
                $normalized[] = '';
            }
        }
        return $normalized;
    }

    /**
     * @param \SimpleXMLElement $cell
     * @param list<string> $sharedStrings
     */
    private function extractCellValue(\SimpleXMLElement $cell, array $sharedStrings): string
    {
        $type = (string) $cell['t'];
        $value = (string) ($cell->v ?? '');
        if ($type === 's') {
            $index = (int) $value;
            $value = $sharedStrings[$index] ?? '';
        } elseif ($type === 'b') {
            $value = $value === '1' ? '1' : '0';
        }
        return $this->normalizeEncoding($value);
    }

    /**
     * @param string $reference
     */
    private function columnIndexFromReference(string $reference): int
    {
        $letters = preg_replace('/[^A-Z]/i', '', strtoupper($reference));
        $index = 0;
        $len = strlen($letters);
        for ($i = 0; $i < $len; $i++) {
            $index *= 26;
            $index += ord($letters[$i]) - 64;
        }
        return max(0, $index - 1);
    }

    /**
     * @return list<string>
     */
    private function parseSharedStrings(string $xml): array
    {
        $strings = [];
        $doc = new \SimpleXMLElement($xml);
        foreach ($doc->si as $si) {
            $text = '';
            if (isset($si->t)) {
                $text = (string) $si->t;
            } elseif (isset($si->r)) {
                foreach ($si->r as $run) {
                    $text .= (string) ($run->t ?? '');
                }
            }
            $strings[] = $this->normalizeEncoding((string) $text);
        }
        return $strings;
    }

    private function detectDelimiter(string $line): string
    {
        $tab = substr_count($line, "\t");
        $semicolon = substr_count($line, ';');
        $comma = substr_count($line, ',');

        if ($tab > max($semicolon, $comma)) {
            return "\t";
        }
        if ($semicolon >= $comma) {
            return ';';
        }
        return ',';
    }

    /**
     * @param list<string> $values
     */
    private function shouldSkipHeaderRow(array $values): bool
    {
        $nonEmpty = [];
        foreach ($values as $value) {
            $trimmed = trim((string) $value);
            if ($trimmed !== '') {
                $nonEmpty[] = strtolower($trimmed);
            }
        }
        if (empty($nonEmpty)) {
            return true;
        }
        $joined = implode(' ', $nonEmpty);
        if (str_contains($joined, 'rapporto') && str_contains($joined, 'mediaprint')) {
            return true;
        }
        return false;
    }

    private function isZipArchive(string $path): bool
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            return false;
        }
        $signature = fread($handle, 4);
        fclose($handle);
        if ($signature === false) {
            return false;
        }
        return strncmp($signature, "PK\x03\x04", 4) === 0;
    }

    private function normalizeCellValue(?string $value): string
    {
        if ($value === null) {
            return '';
        }
        return $this->normalizeEncoding((string) $value);
    }

    private function normalizeEncoding(string $value): string
    {
        if ($value === '') {
            return '';
        }
        if (!$this->isUtf8($value)) {
            if (function_exists('mb_convert_encoding')) {
                $converted = @mb_convert_encoding($value, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');
                if ($converted !== false) {
                    $value = $converted;
                }
            } elseif (function_exists('iconv')) {
                $converted = @iconv('Windows-1252', 'UTF-8//IGNORE', $value);
                if ($converted !== false) {
                    $value = $converted;
                }
            } else {
                $value = function_exists('utf8_encode') ? utf8_encode($value) : $value;
            }
        }
        $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $value);
        return $clean ?? '';
    }

    private function isUtf8(string $value): bool
    {
        return preg_match('//u', $value) === 1;
    }

    /**
     * @param list<array<string,mixed>> $rows
     * @return list<array<string,mixed>>
     */
    private function composeVerticalRows(array $rows): array
    {
        $result = [];
        $buffer = [];
        $fieldsOrder = ['data', 'valuta', 'descrizione', 'importo', 'causale'];

        foreach ($rows as $row) {
            $cleanRow = [];
            foreach ($row as $key => $value) {
                $trimmed = is_string($value) ? trim($value) : $value;
                if ($trimmed === '' || $trimmed === null) {
                    continue;
                }
                $cleanRow[$key] = $trimmed;
            }

            if (empty($cleanRow)) {
                continue;
            }

            if (count($cleanRow) === 1) {
                $key = array_key_first($row);
                $value = array_values($cleanRow)[0];

                if ($key === null || $key === '' || !in_array($key, $fieldsOrder, true)) {
                    $remaining = array_values(array_diff($fieldsOrder, array_keys($buffer)));
                    $key = $remaining[0] ?? 'descrizione';
                }

                if (!empty($buffer) && ($key === 'data' || isset($buffer[$key]))) {
                    $result[] = $buffer;
                    $buffer = [];
                }

                $buffer[$key] = $value;
                continue;
            }

            if (!empty($buffer)) {
                $result[] = $buffer;
                $buffer = [];
            }

            $result[] = $row;
        }

        if (!empty($buffer)) {
            $result[] = $buffer;
        }

        return $result;
    }
}
