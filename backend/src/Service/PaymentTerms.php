<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use DateInterval;
use DateTimeImmutable;
use PDO;

final class PaymentTerms
{
    /**
     * @return list<array{
     *     id:int,
     *     code:string,
     *     label:string,
     *     description:string,
     *     installments:int,
     *     schedule:list<array{anchor:string,offset_days:int,label:string}>
     * }>
     */
    public static function all(PDO $pdo, bool $onlyActive = true): array
    {
        $sql = <<<'SQL'
            SELECT
                id_termine,
                code,
                label,
                descrizione,
                config,
                giorni,
                fine_mese,
                rate,
                attivo
            FROM cfg_termini_pagamento
        SQL;
        if ($onlyActive) {
            $sql .= ' WHERE attivo = 1';
        }
        $sql .= ' ORDER BY id_termine ASC';

        $stmt = $pdo->query($sql);
        $rows = $stmt !== false ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

        return array_values(
            array_map(
                static fn (array $row): array => self::mapRecord($row),
                $rows ?: []
            )
        );
    }

    /**
     * @param list<array<string,mixed>>|null $terms
     */
    public static function labelById(?int $id, ?array $terms = null, ?PDO $pdo = null): ?string
    {
        if ($id === null) {
            return null;
        }

        $term = self::find($id, $terms, $pdo);
        return $term['label'] ?? null;
    }

    /**
     * @param list<array<string,mixed>>|null $terms
     * @return list<array{
     *     index:int,
     *     label:string,
     *     due_date:string,
     *     amount:float,
     *     anchor:string,
     *     offset_days:int
     * }>
     */
    public static function buildSchedule(
        ?int $id,
        ?string $invoiceDate,
        ?float $total,
        ?array $terms = null,
        ?PDO $pdo = null
    ): array {
        if ($id === null) {
            return [];
        }

        $term = self::find($id, $terms, $pdo);
        if ($term === null || empty($term['schedule'])) {
            return [];
        }

        return self::buildScheduleForTerm($term, $invoiceDate, $total);
    }

    /**
     * @param list<array<string,mixed>>|null $terms
     * @return array<string,mixed>|null
     */
    private static function find(int $id, ?array $terms, ?PDO $pdo): ?array
    {
        $list = $terms;
        if ($list === null && $pdo !== null) {
            $list = self::all($pdo);
        }
        if ($list === null) {
            return null;
        }
        foreach ($list as $term) {
            if (isset($term['id']) && (int) $term['id'] === $id) {
                return $term;
            }
        }

        return null;
    }

    /**
     * @param array<string,mixed> $term
     * @return list<array{
     *     index:int,
     *     label:string,
     *     due_date:string,
     *     amount:float,
     *     anchor:string,
     *     offset_days:int
     * }>
     */
    private static function buildScheduleForTerm(array $term, ?string $invoiceDate, ?float $total): array
    {
        $schedule = isset($term['schedule']) && is_array($term['schedule']) ? $term['schedule'] : [];
        if (empty($schedule)) {
            return [];
        }

        $baseDate = self::resolveDate($invoiceDate);
        $totalAmount = is_numeric($total ?? null) ? (float) $total : 0.0;
        $installments = count($schedule);
        $baseQuota = $installments > 0 ? round($totalAmount / $installments, 2) : 0.0;
        $remaining = $totalAmount;

        $result = [];
        foreach ($schedule as $index => $item) {
            $anchor = self::sanitizeAnchor($item['anchor'] ?? null);
            $offsetDays = (int) ($item['offset_days'] ?? 0);
            $label = trim((string) ($item['label'] ?? ''));
            if ($label === '') {
                $label = self::buildRateLabel($index + 1, $anchor, $offsetDays);
            }

            $dueDate = $anchor === 'end_of_month' ? self::endOfMonth($baseDate) : $baseDate;
            if ($offsetDays !== 0) {
                $days = abs($offsetDays);
                try {
                    $interval = new DateInterval('P' . $days . 'D');
                    $dueDate = $offsetDays >= 0 ? $dueDate->add($interval) : $dueDate->sub($interval);
                } catch (\Throwable $exception) {
                    $dueDate = $dueDate->modify(sprintf('%+d days', $offsetDays));
                }
            }

            $amount = $index < $installments - 1 ? $baseQuota : round($remaining, 2);
            $remaining = round($remaining - $amount, 2);

            $result[] = [
                'index' => $index + 1,
                'label' => $label,
                'due_date' => $dueDate->format('Y-m-d'),
                'amount' => max($amount, 0.0),
                'anchor' => $anchor,
                'offset_days' => $offsetDays,
            ];
        }

        return $result;
    }

    /**
     * @param array<string,mixed> $row
     * @return array{
     *     id:int,
     *     code:string,
     *     label:string,
     *     description:string,
     *     installments:int,
     *     schedule:list<array{anchor:string,offset_days:int,label:string}>
     * }
     */
    private static function mapRecord(array $row): array
    {
        $schedule = self::extractSchedule($row);
        $description = trim((string) ($row['descrizione'] ?? ''));

        return [
            'id' => (int) $row['id_termine'],
            'code' => (string) $row['code'],
            'label' => (string) $row['label'],
            'description' => $description !== '' ? $description : (string) $row['label'],
            'installments' => count($schedule),
            'schedule' => $schedule,
        ];
    }

    /**
     * @param array<string,mixed> $row
     * @return list<array{anchor:string,offset_days:int,label:string}>
     */
    private static function extractSchedule(array $row): array
    {
        $config = self::parseConfig($row['config'] ?? null);
        $schedule = [];
        if (isset($config['schedule']) && is_array($config['schedule'])) {
            foreach ($config['schedule'] as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $anchor = self::sanitizeAnchor($item['anchor'] ?? null);
                $offsetDays = (int) ($item['offset_days'] ?? 0);
                $label = trim((string) ($item['label'] ?? ''));
                $schedule[] = [
                    'anchor' => $anchor,
                    'offset_days' => $offsetDays,
                    'label' => $label !== '' ? $label : self::buildRateLabel(count($schedule) + 1, $anchor, $offsetDays),
                ];
            }
        }

        if (!empty($schedule)) {
            return $schedule;
        }

        $anchor = ((int) ($row['fine_mese'] ?? 0) === 1) ? 'end_of_month' : 'invoice_date';
        $offset = (int) ($row['giorni'] ?? 0);

        return [[
            'anchor' => $anchor,
            'offset_days' => $offset,
            'label' => self::buildRateLabel(1, $anchor, $offset),
        ]];
    }

    /**
     * @return array<string,mixed>
     */
    private static function parseConfig(mixed $raw): array
    {
        if (is_string($raw) && trim($raw) !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    private static function sanitizeAnchor(mixed $anchor): string
    {
        $value = is_string($anchor) ? strtolower(trim($anchor)) : '';
        return in_array($value, ['end_of_month', 'invoice_date'], true) ? $value : 'invoice_date';
    }

    private static function resolveDate(?string $raw): DateTimeImmutable
    {
        if ($raw !== null && trim($raw) !== '') {
            try {
                return new DateTimeImmutable($raw);
            } catch (\Throwable $exception) {
                // fall through
            }
        }

        return new DateTimeImmutable('today');
    }

    private static function endOfMonth(DateTimeImmutable $date): DateTimeImmutable
    {
        return $date->modify('last day of this month');
    }

    private static function buildRateLabel(int $index, string $anchor, int $offsetDays): string
    {
        $anchorLabel = $anchor === 'end_of_month' ? 'fine mese' : 'data fattura';
        if ($offsetDays <= 0) {
            return sprintf('Rata %d (%s)', $index, $anchorLabel);
        }

        return sprintf('Rata %d (%d gg %s)', $index, $offsetDays, $anchorLabel);
    }
}
