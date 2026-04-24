<?php
declare(strict_types=1);

namespace MediaPrint\Backend\Mailer;

final class Pop3Client
{
    private string $host;
    private int $port;
    private string $username;
    private string $password;
    private string $encryption;
    private int $timeout;
    private bool $allowSelfSigned;

    public function __construct(
        string $host,
        int $port,
        string $username,
        string $password,
        string $encryption = 'ssl',
        int $timeout = 30,
        bool $allowSelfSigned = false
    ) {
        $this->host = trim($host);
        $this->port = $port;
        $this->username = trim($username);
        $this->password = $password;
        $this->encryption = strtolower(trim($encryption));
        $this->timeout = $timeout;
        $this->allowSelfSigned = $allowSelfSigned;
    }

    /**
     * @return array{message_count:int, mailbox_size:int, banner:string}
     */
    public function ping(): array
    {
        if ($this->host === '') {
            throw new \RuntimeException('Host POP non valido.');
        }
        if ($this->port <= 0 || $this->port > 65535) {
            throw new \RuntimeException('Porta POP non valida.');
        }
        if ($this->username === '') {
            throw new \RuntimeException('Username POP non valido.');
        }

        $socket = $this->openConnection();
        try {
            $banner = $this->expectOk($socket, 'Connessione POP');
            if ($this->encryption === 'tls') {
                $this->sendCommand($socket, 'STLS');
                $this->expectOk($socket, 'STLS');
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new \RuntimeException('Negoziazione TLS POP fallita.');
                }
            }

            $this->sendCommand($socket, 'USER ' . $this->username);
            $this->expectOk($socket, 'USER');
            $this->sendCommand($socket, 'PASS ' . $this->password);
            $this->expectOk($socket, 'PASS');

            $this->sendCommand($socket, 'STAT');
            $stat = $this->expectOk($socket, 'STAT');
            $parts = preg_split('/\s+/', trim($stat)) ?: [];
            $messageCount = isset($parts[1]) ? (int) $parts[1] : 0;
            $mailboxSize = isset($parts[2]) ? (int) $parts[2] : 0;

            $this->sendCommand($socket, 'QUIT');
            $this->expectOk($socket, 'QUIT');
        } finally {
            if (is_resource($socket)) {
                fclose($socket);
            }
        }

        return [
            'message_count' => $messageCount,
            'mailbox_size' => $mailboxSize,
            'banner' => $banner,
        ];
    }

    /**
     * @return list<array{
     *   index:int,
     *   from:string,
     *   sender_emails:list<string>,
     *   recipients:string,
     *   recipient_emails:list<string>,
     *   subject:string,
     *   message_text:string,
     *   message_html:string,
     *   attachments:list<string>,
     *   date:string,
     *   date_iso:?string,
     *   message_id:string,
     *   in_reply_to:string,
     *   references:string,
     *   conversation_key:string,
     *   size_bytes:?int
     * }>
     */
    public function listToday(int $limit = 50, ?\DateTimeZone $timezone = null): array
    {
        if ($this->host === '') {
            throw new \RuntimeException('Host POP non valido.');
        }
        if ($this->port <= 0 || $this->port > 65535) {
            throw new \RuntimeException('Porta POP non valida.');
        }
        if ($this->username === '') {
            throw new \RuntimeException('Username POP non valido.');
        }

        $tz = $timezone ?? new \DateTimeZone('Europe/Rome');
        $todayStart = new \DateTimeImmutable('today', $tz);
        $todayEnd = $todayStart->setTime(23, 59, 59);
        $maxItems = $limit > 0 ? min($limit, 200) : 50;

        $socket = $this->openConnection();
        $items = [];
        try {
            $this->expectOk($socket, 'Connessione POP');
            if ($this->encryption === 'tls') {
                $this->sendCommand($socket, 'STLS');
                $this->expectOk($socket, 'STLS');
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new \RuntimeException('Negoziazione TLS POP fallita.');
                }
            }

            $this->sendCommand($socket, 'USER ' . $this->username);
            $this->expectOk($socket, 'USER');
            $this->sendCommand($socket, 'PASS ' . $this->password);
            $this->expectOk($socket, 'PASS');

            $this->sendCommand($socket, 'STAT');
            $stat = $this->expectOk($socket, 'STAT');
            $parts = preg_split('/\s+/', trim($stat)) ?: [];
            $messageCount = isset($parts[1]) ? (int) $parts[1] : 0;
            $maxHeaderScans = max($maxItems * 30, 800);
            $scannedHeaders = 0;

            for ($index = $messageCount; $index >= 1; $index--) {
                if (count($items) >= $maxItems) {
                    break;
                }
                if ($scannedHeaders >= $maxHeaderScans) {
                    break;
                }
                $scannedHeaders++;

                $this->sendCommand($socket, 'TOP ' . $index . ' 0');
                $headerResponse = $this->expectOk($socket, 'TOP');
                if ($headerResponse === '') {
                    continue;
                }
                $headerLines = $this->readMultiline($socket);
                $headers = $this->parseHeaders($headerLines);
                $rawDate = $headers['date'] ?? '';
                $parsedDate = $this->parseHeaderDate($rawDate, $tz);
                if ($parsedDate === null) {
                    continue;
                }

                if ($parsedDate > $todayEnd) {
                    continue;
                }
                if ($parsedDate < $todayStart) {
                    // POP indexes are processed newest -> oldest: once we are before today's start,
                    // older messages will not match either, so we can stop scanning.
                    break;
                }

                $sizeBytes = $this->fetchMessageSize($socket, $index);
                $recipients = $this->buildRecipients($headers);
                $from = $this->decodeHeaderValue($headers['from'] ?? '');
                $messageId = $this->decodeHeaderValue($headers['message-id'] ?? '');
                $inReplyTo = $this->decodeHeaderValue($headers['in-reply-to'] ?? '');
                $references = $this->decodeHeaderValue($headers['references'] ?? '');
                $conversationKey = $this->buildConversationKeyFromHeaders(
                    $messageId,
                    $inReplyTo,
                    $references,
                    $headers['subject'] ?? ''
                );
                $messageBodies = $this->fetchMessageBodies($socket, $index);
                $attachments = $this->fetchAttachmentNames($socket, $index);
                $items[] = [
                    'index' => $index,
                    'from' => $from,
                    'sender_emails' => $this->extractEmails($from),
                    'recipients' => $recipients,
                    'recipient_emails' => $this->extractEmails($recipients),
                    'subject' => $this->decodeHeaderValue($headers['subject'] ?? ''),
                    'message_text' => $messageBodies['message_text'],
                    'message_html' => $messageBodies['message_html'],
                    'attachments' => $attachments,
                    'date' => $parsedDate->format('d/m/Y H:i'),
                    'date_iso' => $parsedDate->format(\DateTimeInterface::ATOM),
                    'message_id' => $messageId,
                    'in_reply_to' => $inReplyTo,
                    'references' => $references,
                    'conversation_key' => $conversationKey,
                    'size_bytes' => $sizeBytes,
                ];
            }

            $this->sendCommand($socket, 'QUIT');
            $this->expectOk($socket, 'QUIT');
        } finally {
            if (is_resource($socket)) {
                fclose($socket);
            }
        }

        return $items;
    }

    /**
     * @return array{filename:string,mime_type:string,content:string}
     */
    public function downloadAttachmentByIndex(int $index, string $attachmentName, ?string $expectedMessageId = null): array
    {
        if ($this->host === '') {
            throw new \RuntimeException('Host POP non valido.');
        }
        if ($this->port <= 0 || $this->port > 65535) {
            throw new \RuntimeException('Porta POP non valida.');
        }
        if ($this->username === '') {
            throw new \RuntimeException('Username POP non valido.');
        }
        if ($index <= 0) {
            throw new \RuntimeException('Indice messaggio POP non valido.');
        }

        $targetName = $this->sanitizeAttachmentName($attachmentName);
        if ($targetName === '') {
            throw new \RuntimeException('Nome allegato non valido.');
        }

        $socket = $this->openConnection();
        try {
            $this->expectOk($socket, 'Connessione POP');
            if ($this->encryption === 'tls') {
                $this->sendCommand($socket, 'STLS');
                $this->expectOk($socket, 'STLS');
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new \RuntimeException('Negoziazione TLS POP fallita.');
                }
            }

            $this->sendCommand($socket, 'USER ' . $this->username);
            $this->expectOk($socket, 'USER');
            $this->sendCommand($socket, 'PASS ' . $this->password);
            $this->expectOk($socket, 'PASS');

            $this->sendCommand($socket, 'RETR ' . $index);
            $this->expectOk($socket, 'RETR');
            $messageLines = $this->readMultiline($socket);
            $attachment = $this->extractAttachmentFromMessage($messageLines, $targetName, $expectedMessageId);

            $this->sendCommand($socket, 'QUIT');
            $this->expectOk($socket, 'QUIT');
        } finally {
            if (is_resource($socket)) {
                fclose($socket);
            }
        }

        return $attachment;
    }

    /**
     * @param list<string> $attachmentNames
     * @return list<array{filename:string,mime_type:string,content:string}>
     */
    public function downloadAttachmentsByIndex(int $index, array $attachmentNames, ?string $expectedMessageId = null): array
    {
        if ($this->host === '') {
            throw new \RuntimeException('Host POP non valido.');
        }
        if ($this->port <= 0 || $this->port > 65535) {
            throw new \RuntimeException('Porta POP non valida.');
        }
        if ($this->username === '') {
            throw new \RuntimeException('Username POP non valido.');
        }
        if ($index <= 0) {
            throw new \RuntimeException('Indice messaggio POP non valido.');
        }

        $targets = [];
        foreach ($attachmentNames as $name) {
            $sanitized = $this->sanitizeAttachmentName((string) $name);
            if ($sanitized !== '') {
                $targets[strtolower($sanitized)] = $sanitized;
            }
        }
        if ($targets === []) {
            throw new \RuntimeException('Nessun allegato valido richiesto.');
        }

        $socket = $this->openConnection();
        try {
            $this->expectOk($socket, 'Connessione POP');
            if ($this->encryption === 'tls') {
                $this->sendCommand($socket, 'STLS');
                $this->expectOk($socket, 'STLS');
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new \RuntimeException('Negoziazione TLS POP fallita.');
                }
            }

            $this->sendCommand($socket, 'USER ' . $this->username);
            $this->expectOk($socket, 'USER');
            $this->sendCommand($socket, 'PASS ' . $this->password);
            $this->expectOk($socket, 'PASS');

            $this->sendCommand($socket, 'RETR ' . $index);
            $this->expectOk($socket, 'RETR');
            $messageLines = $this->readMultiline($socket);
            $allAttachments = $this->extractAttachmentsFromMessage($messageLines, $expectedMessageId);

            $selected = [];
            foreach ($allAttachments as $attachment) {
                $filename = $this->sanitizeAttachmentName((string) ($attachment['filename'] ?? ''));
                if ($filename === '') {
                    continue;
                }
                if (isset($targets[strtolower($filename)])) {
                    $selected[] = [
                        'filename' => $filename,
                        'mime_type' => (string) ($attachment['mime_type'] ?? 'application/octet-stream'),
                        'content' => (string) ($attachment['content'] ?? ''),
                    ];
                }
            }

            $this->sendCommand($socket, 'QUIT');
            $this->expectOk($socket, 'QUIT');
        } finally {
            if (is_resource($socket)) {
                fclose($socket);
            }
        }

        if ($selected === []) {
            throw new \RuntimeException('Allegati richiesti non trovati nel messaggio POP.');
        }

        return $selected;
    }

    /**
     * @return resource
     */
    private function openConnection()
    {
        $transport = $this->encryption === 'ssl' ? 'ssl://' . $this->host : $this->host;
        $contextOptions = [];
        if ($this->allowSelfSigned) {
            $contextOptions['ssl'] = [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true,
            ];
        }
        $context = stream_context_create($contextOptions);

        $socket = @stream_socket_client(
            $transport . ':' . $this->port,
            $errno,
            $errstr,
            $this->timeout,
            STREAM_CLIENT_CONNECT,
            $context
        );
        if (!is_resource($socket)) {
            throw new \RuntimeException(sprintf('Connessione POP fallita (%s:%d): %s', $this->host, $this->port, $errstr));
        }
        stream_set_timeout($socket, $this->timeout);
        return $socket;
    }

    /**
     * @param resource $socket
     */
    private function sendCommand($socket, string $command): void
    {
        fwrite($socket, $command . "\r\n");
    }

    /**
     * @param resource $socket
     */
    private function readLine($socket): string
    {
        $line = fgets($socket, 1024);
        if ($line === false) {
            throw new \RuntimeException('Server POP non ha risposto.');
        }
        return trim($line);
    }

    /**
     * @param resource $socket
     */
    private function expectOk($socket, string $context): string
    {
        $line = $this->readLine($socket);
        if (strpos($line, '+OK') !== 0) {
            throw new \RuntimeException(sprintf('%s: %s', $context, $line));
        }
        return $line;
    }

    /**
     * @param resource $socket
     * @return list<string>
     */
    private function readMultiline($socket): array
    {
        $lines = [];
        while (($line = fgets($socket, 2048)) !== false) {
            $line = rtrim($line, "\r\n");
            if ($line === '.') {
                break;
            }
            if (str_starts_with($line, '..')) {
                $line = substr($line, 1);
            }
            $lines[] = $line;
        }
        return $lines;
    }

    /**
     * @param list<string> $lines
     * @return array<string,string>
     */
    private function parseHeaders(array $lines): array
    {
        $headers = [];
        $current = null;
        foreach ($lines as $line) {
            if ($line === '') {
                break;
            }
            if (($line[0] ?? '') === ' ' || ($line[0] ?? '') === "\t") {
                if ($current !== null) {
                    $headers[$current] .= ' ' . trim($line);
                }
                continue;
            }
            $separatorPos = strpos($line, ':');
            if ($separatorPos === false) {
                continue;
            }
            $name = strtolower(trim(substr($line, 0, $separatorPos)));
            $value = trim(substr($line, $separatorPos + 1));
            if ($name === '') {
                continue;
            }
            $headers[$name] = $value;
            $current = $name;
        }
        return $headers;
    }

    private function parseHeaderDate(string $rawDate, \DateTimeZone $timezone): ?\DateTimeImmutable
    {
        $candidate = trim($rawDate);
        if ($candidate === '') {
            return null;
        }
        try {
            $parsed = new \DateTimeImmutable($candidate);
            return $parsed->setTimezone($timezone);
        } catch (\Throwable $ignored) {
            return null;
        }
    }

    /**
     * @param resource $socket
     */
    private function fetchMessageSize($socket, int $index): ?int
    {
        $this->sendCommand($socket, 'LIST ' . $index);
        $list = $this->expectOk($socket, 'LIST');
        $parts = preg_split('/\s+/', trim($list)) ?: [];
        if (isset($parts[2]) && is_numeric($parts[2])) {
            return (int) $parts[2];
        }
        return null;
    }

    /**
     * @param resource $socket
     * @return array{message_text:string,message_html:string}
     */
    private function fetchMessageBodies($socket, int $index): array
    {
        $topLines = $this->fetchMessageLinesTop($socket, $index, 320, 'TOP BODIES');
        $extracted = $this->extractBodiesFromMessageLines($topLines);

        $messageText = trim((string) ($extracted['plain'] ?? ''));
        $messageHtml = trim((string) ($extracted['html'] ?? ''));

        // Fallback: full RETR for complex/multipart messages where TOP preview is insufficient.
        if ($messageText === '' && $messageHtml === '') {
            $fullLines = $this->fetchMessageLinesRetr($socket, $index, 'RETR BODIES');
            $fallback = $this->extractBodiesFromMessageLines($fullLines);
            $messageText = trim((string) ($fallback['plain'] ?? ''));
            $messageHtml = trim((string) ($fallback['html'] ?? ''));
        }

        if ($messageText === '' && $messageHtml !== '') {
            $messageText = html_entity_decode(strip_tags($messageHtml), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        $messageText = $this->cleanDisplayText($this->stripMimeTechnicalLines($messageText));
        if ($messageText !== '' && mb_strlen($messageText) > 4000) {
            $messageText = mb_substr($messageText, 0, 4000) . '...';
        }

        $messageHtml = $this->sanitizeHtmlForDisplay($messageHtml);
        if ($messageHtml !== '' && mb_strlen($messageHtml) > 20000) {
            $messageHtml = mb_substr($messageHtml, 0, 20000);
        }

        return [
            'message_text' => $messageText,
            'message_html' => $messageHtml,
        ];
    }

    /**
     * @param resource $socket
     * @return list<string>
     */
    private function fetchMessageLinesTop($socket, int $index, int $lineCount, string $context): array
    {
        $linesToRead = max(40, min($lineCount, 400));
        $this->sendCommand($socket, 'TOP ' . $index . ' ' . $linesToRead);
        $this->expectOk($socket, $context);
        return $this->readMultiline($socket);
    }

    /**
     * @param resource $socket
     * @return list<string>
     */
    private function fetchMessageLinesRetr($socket, int $index, string $context): array
    {
        $this->sendCommand($socket, 'RETR ' . $index);
        $this->expectOk($socket, $context);
        return $this->readMultiline($socket);
    }

    /**
     * @param list<string> $messageLines
     * @return array{plain:string,html:string}
     */
    private function extractBodiesFromMessageLines(array $messageLines): array
    {
        if ($messageLines === []) {
            return ['plain' => '', 'html' => ''];
        }
        [$headerLines, $bodyLines] = $this->splitHeaderAndBody($messageLines);
        $rootPart = [
            'headers' => $this->parseHeaders($headerLines),
            'body' => $bodyLines,
        ];
        $bodies = $this->collectTextBodiesFromPart($rootPart);
        $html = (string) ($bodies['html'][0] ?? '');
        $html = $this->embedInlineImagesInHtml($html, $bodies['images'] ?? []);
        return [
            'plain' => $bodies['plain'][0] ?? '',
            'html' => $html,
        ];
    }

    /**
     * @param array{headers:array<string,string>,body:list<string>} $part
     * @return array{plain:list<string>,html:list<string>,images:array<string,string>}
     */
    private function collectTextBodiesFromPart(array $part): array
    {
        $headers = $part['headers'];
        $contentTypeHeader = (string) ($headers['content-type'] ?? 'text/plain');
        $contentType = strtolower($this->extractMimeType($contentTypeHeader));
        $boundary = $this->extractHeaderParameter($contentTypeHeader, 'boundary');

        if ($boundary !== null && str_starts_with($contentType, 'multipart/')) {
            $plain = [];
            $html = [];
            $images = [];
            foreach ($this->splitMultipartBody($part['body'], $boundary) as $subPartLines) {
                [$subHeadersLines, $subBodyLines] = $this->splitHeaderAndBody($subPartLines);
                $subPart = [
                    'headers' => $this->parseHeaders($subHeadersLines),
                    'body' => $subBodyLines,
                ];
                $nested = $this->collectTextBodiesFromPart($subPart);
                foreach ($nested['plain'] as $entry) {
                    $plain[] = $entry;
                }
                foreach ($nested['html'] as $entry) {
                    $html[] = $entry;
                }
                foreach (($nested['images'] ?? []) as $cid => $dataUri) {
                    $images[$cid] = $dataUri;
                }
            }
            return ['plain' => $plain, 'html' => $html, 'images' => $images];
        }

        $rawBody = implode("\n", $part['body']);
        $encoding = strtolower(trim((string) ($headers['content-transfer-encoding'] ?? '')));

        if (str_starts_with($contentType, 'image/')) {
            $contentId = $this->normalizeContentId((string) ($headers['content-id'] ?? ''));
            if ($contentId !== '') {
                $binary = $this->decodeBodyByEncoding($rawBody, $encoding);
                if ($binary !== '') {
                    $dataUri = 'data:' . $contentType . ';base64,' . base64_encode($binary);
                    return ['plain' => [], 'html' => [], 'images' => [$contentId => $dataUri]];
                }
            }
            return ['plain' => [], 'html' => [], 'images' => []];
        }

        $decoded = $this->decodeTextBodyByHeaders($rawBody, $headers);
        $decoded = trim($decoded);
        if ($decoded === '') {
            return ['plain' => [], 'html' => [], 'images' => []];
        }

        if (str_starts_with($contentType, 'text/html')) {
            return ['plain' => [], 'html' => [$decoded], 'images' => []];
        }
        if (str_starts_with($contentType, 'text/plain')) {
            return ['plain' => [$decoded], 'html' => [], 'images' => []];
        }

        return ['plain' => [], 'html' => [], 'images' => []];
    }

    /**
     * @param array<string,string> $headers
     */
    private function decodeTextBodyByHeaders(string $rawBody, array $headers): string
    {
        $encoding = strtolower(trim((string) ($headers['content-transfer-encoding'] ?? '')));
        $decoded = $this->decodeBodyByEncoding($rawBody, $encoding);
        $charset = $this->extractHeaderParameter((string) ($headers['content-type'] ?? ''), 'charset');
        if ($charset !== null) {
            $candidate = trim(strtolower($charset));
            if ($candidate !== '' && $candidate !== 'utf-8' && $candidate !== 'utf8') {
                if (function_exists('mb_convert_encoding')) {
                    $converted = @mb_convert_encoding($decoded, 'UTF-8', $candidate);
                    if (is_string($converted) && $converted !== '') {
                        $decoded = $converted;
                    }
                } elseif (function_exists('iconv')) {
                    $converted = @iconv($candidate, 'UTF-8//IGNORE', $decoded);
                    if (is_string($converted) && $converted !== '') {
                        $decoded = $converted;
                    }
                }
            }
        }
        return $decoded;
    }

    private function sanitizeHtmlForDisplay(string $html): string
    {
        $value = trim($html);
        if ($value === '') {
            return '';
        }
        $value = preg_replace('/<script\b[^>]*>[\s\S]*?<\/script>/i', '', $value) ?? $value;
        $value = preg_replace('/<iframe\b[^>]*>[\s\S]*?<\/iframe>/i', '', $value) ?? $value;
        $value = preg_replace('/\son[a-z]+\s*=\s*(".*?"|\'.*?\'|[^\s>]+)/i', '', $value) ?? $value;
        $value = trim($value);
        if ($value === '') {
            return '';
        }
        if (preg_match('/<html[\s\S]*<\/html>/i', $value, $match) === 1) {
            return (string) ($match[0] ?? '');
        }
        if (preg_match('/<body[^>]*>[\s\S]*<\/body>/i', $value, $match) === 1) {
            return '<html>' . (string) ($match[0] ?? '') . '</html>';
        }
        if (preg_match('/<[^>]+>/', $value) === 1) {
            return '<html><body>' . $value . '</body></html>';
        }
        return '';
    }

    /**
     * @param array<string,string> $imagesByCid
     */
    private function embedInlineImagesInHtml(string $html, array $imagesByCid): string
    {
        if ($html === '' || $imagesByCid === []) {
            return $html;
        }

        return preg_replace_callback(
            '/(<img\b[^>]*\bsrc\s*=\s*)(["\'])cid:([^"\'>\s]+)\2/i',
            static function (array $matches) use ($imagesByCid): string {
                $prefix = (string) ($matches[1] ?? '');
                $quote = (string) ($matches[2] ?? '"');
                $rawCid = (string) ($matches[3] ?? '');
                $cid = strtolower(trim($rawCid, " <>"));
                if ($cid === '' || !isset($imagesByCid[$cid])) {
                    return (string) ($matches[0] ?? '');
                }
                $src = $imagesByCid[$cid];
                return $prefix . $quote . $src . $quote;
            },
            $html
        ) ?? $html;
    }

    private function normalizeContentId(string $value): string
    {
        $candidate = strtolower(trim($value));
        if ($candidate === '') {
            return '';
        }
        $candidate = trim($candidate, "<> \t\n\r\0\x0B");
        return $candidate;
    }

    private function stripMimeTechnicalLines(string $text): string
    {
        if ($text === '') {
            return '';
        }

        $lines = preg_split("/\r\n|\r|\n/u", $text) ?: [];
        $clean = [];
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '') {
                $clean[] = '';
                continue;
            }

            // MIME boundaries, often starting with --=...
            if (preg_match('/^--[A-Za-z0-9=+\/._-]+$/', $trimmed) === 1) {
                continue;
            }

            // Typical MIME technical headers not useful to end users.
            if (preg_match('/^(content-type|content-transfer-encoding|content-disposition|mime-version|x-[a-z0-9-]+)\s*:/i', $trimmed) === 1) {
                continue;
            }

            $clean[] = $line;
        }

        return implode("\n", $clean);
    }

    private function cleanDisplayText(string $text): string
    {
        if ($text === '') {
            return '';
        }

        $value = preg_replace("/\r\n|\r/u", "\n", $text) ?? $text;
        $value = str_replace("\0", '', $value);

        // Remove typical MIME intro and inline boundary declarations.
        $value = preg_replace('/^\s*This is a multi-part message in MIME format\.\s*$/mi', '', $value) ?? $value;
        $value = preg_replace('/\bboundary\s*=\s*"[^"]*"/i', '', $value) ?? $value;
        $value = preg_replace('/\bboundary\s*=\s*[-A-Za-z0-9=+\/._]+/i', '', $value) ?? $value;

        // Cut quoted previous thread from common markers.
        $quotePatterns = [
            '/^\s*Il\s+\d{1,2}\/\d{1,2}\/\d{4}.*ha scritto\s*:/mi',
            '/^\s*On .+wrote\s*:\s*$/mi',
            '/^\s*-{2,}\s*Original Message\s*-{2,}\s*$/mi',
            '/^\s*Da:\s.*$/mi',
        ];
        $quoteCutPos = null;
        foreach ($quotePatterns as $pattern) {
            if (preg_match($pattern, $value, $match, PREG_OFFSET_CAPTURE) === 1) {
                $offset = isset($match[0][1]) ? (int) $match[0][1] : null;
                if ($offset !== null && ($quoteCutPos === null || $offset < $quoteCutPos)) {
                    $quoteCutPos = $offset;
                }
            }
        }
        if ($quoteCutPos !== null && $quoteCutPos > 0) {
            $value = substr($value, 0, $quoteCutPos);
        }

        // Remove legal disclaimer blocks when present.
        $disclaimerMarkers = [
            'il messaggio e gli eventuali allegati trasmessi',
            'the message and any attachments transmitted by the undersigned',
            'qualora il/i destinatario/i abbia/abbiano ricevuto il presente messaggio',
        ];
        $lower = mb_strtolower($value);
        foreach ($disclaimerMarkers as $marker) {
            $pos = mb_stripos($lower, $marker);
            if ($pos !== false && $pos > 80) {
                $value = mb_substr($value, 0, (int) $pos);
                $lower = mb_strtolower($value);
            }
        }

        // Drop visual quote-prefix lines.
        $lines = preg_split("/\n/u", $value) ?: [];
        $filtered = [];
        foreach ($lines as $line) {
            if (preg_match('/^\s*>+/', $line) === 1) {
                continue;
            }
            $trimmed = trim($line);
            if ($trimmed === '/*' || $trimmed === '*/' || $trimmed === '//' || $trimmed === '/') {
                continue;
            }
            $filtered[] = $line;
        }

        $value = implode("\n", $filtered);
        $value = preg_replace("/\n{3,}/u", "\n\n", $value) ?? $value;
        return trim($value);
    }

    /**
     * @param list<string> $messageLines
     * @return array{filename:string,mime_type:string,content:string}
     */
    private function extractAttachmentFromMessage(array $messageLines, string $attachmentName, ?string $expectedMessageId): array
    {
        $attachments = $this->extractAttachmentsFromMessage($messageLines, $expectedMessageId);
        if ($attachments === []) {
            throw new \RuntimeException('Nessun allegato trovato nel messaggio.');
        }

        foreach ($attachments as $attachment) {
            $current = $this->sanitizeAttachmentName((string) ($attachment['filename'] ?? ''));
            if ($current === '') {
                continue;
            }
            if (strcasecmp($current, $attachmentName) === 0) {
                return [
                    'filename' => $current,
                    'mime_type' => (string) ($attachment['mime_type'] ?? 'application/octet-stream'),
                    'content' => (string) ($attachment['content'] ?? ''),
                ];
            }
        }

        throw new \RuntimeException('Allegato non trovato nel messaggio POP.');
    }

    /**
     * @param list<string> $messageLines
     * @return list<array{filename:string,mime_type:string,content:string}>
     */
    private function extractAttachmentsFromMessage(array $messageLines, ?string $expectedMessageId): array
    {
        [$headerLines, $bodyLines] = $this->splitHeaderAndBody($messageLines);
        $headers = $this->parseHeaders($headerLines);
        if ($expectedMessageId !== null && trim($expectedMessageId) !== '') {
            $actualMessageId = trim((string) ($headers['message-id'] ?? ''));
            if ($actualMessageId !== '' && strcasecmp($actualMessageId, trim($expectedMessageId)) !== 0) {
                throw new \RuntimeException('Messaggio POP non allineato. Aggiorna la lista email e riprova.');
            }
        }

        $part = [
            'headers' => $headers,
            'body' => $bodyLines,
        ];
        return $this->collectAttachmentsFromPart($part);
    }

    /**
     * @param array{headers:array<string,string>,body:list<string>} $part
     * @return list<array{filename:string,mime_type:string,content:string}>
     */
    private function collectAttachmentsFromPart(array $part): array
    {
        $headers = $part['headers'];
        $contentType = strtolower((string) ($headers['content-type'] ?? 'text/plain'));
        $boundary = $this->extractHeaderParameter((string) ($headers['content-type'] ?? ''), 'boundary');
        if ($boundary !== null && str_starts_with($contentType, 'multipart/')) {
            $attachments = [];
            foreach ($this->splitMultipartBody($part['body'], $boundary) as $subPartLines) {
                [$subHeadersLines, $subBodyLines] = $this->splitHeaderAndBody($subPartLines);
                $subPart = [
                    'headers' => $this->parseHeaders($subHeadersLines),
                    'body' => $subBodyLines,
                ];
                foreach ($this->collectAttachmentsFromPart($subPart) as $entry) {
                    $attachments[] = $entry;
                }
            }
            return $attachments;
        }

        $filename = $this->extractAttachmentFilename($headers);
        if ($filename === '') {
            return [];
        }
        $mimeType = $this->extractMimeType((string) ($headers['content-type'] ?? 'application/octet-stream'));
        $contentTransferEncoding = strtolower(trim((string) ($headers['content-transfer-encoding'] ?? '')));
        $rawBody = implode("\n", $part['body']);
        $decoded = $this->decodeBodyByEncoding($rawBody, $contentTransferEncoding);

        return [[
            'filename' => $filename,
            'mime_type' => $mimeType,
            'content' => $decoded,
        ]];
    }

    /**
     * @param list<string> $lines
     * @return array{0:list<string>,1:list<string>}
     */
    private function splitHeaderAndBody(array $lines): array
    {
        $headers = [];
        $body = [];
        $inBody = false;
        foreach ($lines as $line) {
            if ($inBody) {
                $body[] = $line;
                continue;
            }
            if ($line === '') {
                $inBody = true;
                continue;
            }
            $headers[] = $line;
        }
        return [$headers, $body];
    }

    /**
     * @param list<string> $bodyLines
     * @return list<list<string>>
     */
    private function splitMultipartBody(array $bodyLines, string $boundary): array
    {
        $delimiter = '--' . $boundary;
        $endDelimiter = '--' . $boundary . '--';
        $parts = [];
        $current = [];
        $collecting = false;

        foreach ($bodyLines as $line) {
            if ($line === $delimiter || $line === $endDelimiter) {
                if ($collecting && $current !== []) {
                    $parts[] = $current;
                    $current = [];
                }
                if ($line === $endDelimiter) {
                    break;
                }
                $collecting = true;
                continue;
            }
            if ($collecting) {
                $current[] = $line;
            }
        }

        if ($collecting && $current !== []) {
            $parts[] = $current;
        }

        return $parts;
    }

    private function extractAttachmentFilename(array $headers): string
    {
        $contentDisposition = (string) ($headers['content-disposition'] ?? '');
        foreach (['filename*', 'filename'] as $parameter) {
            $value = $this->extractHeaderParameter($contentDisposition, $parameter);
            if ($value !== null && $value !== '') {
                return $this->sanitizeAttachmentName($value);
            }
        }

        $contentType = (string) ($headers['content-type'] ?? '');
        foreach (['name*', 'name'] as $parameter) {
            $value = $this->extractHeaderParameter($contentType, $parameter);
            if ($value !== null && $value !== '') {
                return $this->sanitizeAttachmentName($value);
            }
        }

        return '';
    }

    private function extractMimeType(string $contentType): string
    {
        $candidate = trim(strtolower($contentType));
        if ($candidate === '') {
            return 'application/octet-stream';
        }
        $parts = explode(';', $candidate);
        $mime = trim((string) ($parts[0] ?? ''));
        if ($mime === '' || !str_contains($mime, '/')) {
            return 'application/octet-stream';
        }
        return $mime;
    }

    private function extractHeaderParameter(string $headerValue, string $parameter): ?string
    {
        if ($headerValue === '') {
            return null;
        }
        $pattern = "/(?:^|;)\\s*" . preg_quote($parameter, '/') . "\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^;]+))/i";
        if (preg_match($pattern, $headerValue, $matches) !== 1) {
            return null;
        }
        $raw = (string) ($matches[2] ?? $matches[3] ?? $matches[4] ?? '');
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }
        if (str_ends_with($parameter, '*') && preg_match("/^[A-Za-z0-9_-]+'[^']*'(.*)$/", $raw, $parts) === 1) {
            $raw = rawurldecode((string) ($parts[1] ?? ''));
        }
        return $this->decodeHeaderValue($raw);
    }

    private function decodeBodyByEncoding(string $rawBody, string $encoding): string
    {
        $normalized = strtolower(trim($encoding));
        if ($normalized === 'base64') {
            $stripped = preg_replace('/\s+/', '', $rawBody) ?? '';
            $decoded = base64_decode($stripped, true);
            return $decoded !== false ? $decoded : '';
        }
        if ($normalized === 'quoted-printable') {
            return quoted_printable_decode($rawBody);
        }
        return $rawBody;
    }

    private function sanitizeAttachmentName(string $value): string
    {
        $candidate = trim($value);
        if ($candidate === '') {
            return '';
        }
        $candidate = preg_replace('/[\x00-\x1F\x7F]/u', '', $candidate) ?? '';
        $candidate = trim($candidate, "\"' ");
        return $candidate;
    }

    /**
     * @param resource $socket
     * @return list<string>
     */
    private function fetchAttachmentNames($socket, int $index, int $lineCount = 250): array
    {
        $linesToRead = max(50, min($lineCount, 400));
        $this->sendCommand($socket, 'TOP ' . $index . ' ' . $linesToRead);
        $this->expectOk($socket, 'TOP ATTACHMENTS');
        $lines = $this->readMultiline($socket);
        if ($lines === []) {
            return [];
        }
        return $this->extractAttachmentNamesFromLines($lines);
    }

    /**
     * @param list<string> $lines
     * @return list<string>
     */
    private function extractAttachmentNamesFromLines(array $lines): array
    {
        $unfolded = [];
        foreach ($lines as $line) {
            if ($unfolded !== [] && (($line[0] ?? '') === ' ' || ($line[0] ?? '') === "\t")) {
                $last = array_key_last($unfolded);
                if ($last !== null) {
                    $unfolded[$last] .= ' ' . trim($line);
                    continue;
                }
            }
            $unfolded[] = $line;
        }

        $attachments = [];
        foreach ($unfolded as $line) {
            if (stripos($line, 'filename') === false && stripos($line, 'name=') === false) {
                continue;
            }
            if (preg_match_all('/\b(?:filename|name)\*?=\s*([^;]+)/i', $line, $matches) !== 1) {
                continue;
            }
            foreach (($matches[1] ?? []) as $rawPart) {
                $name = $this->decodeMimeParameter((string) $rawPart);
                if ($name === '') {
                    continue;
                }
                $attachments[] = $name;
            }
        }

        return array_values(array_unique($attachments));
    }

    private function decodeMimeParameter(string $value): string
    {
        $candidate = trim($value);
        if ($candidate === '') {
            return '';
        }
        $candidate = trim($candidate, "\"' ");

        if (preg_match("/^[A-Za-z0-9_-]+'[^']*'(.*)$/", $candidate, $parts) === 1) {
            $candidate = rawurldecode((string) ($parts[1] ?? ''));
        }

        $decoded = $this->decodeHeaderValue($candidate);
        $decoded = preg_replace('/[\x00-\x1F\x7F]/u', '', $decoded) ?? $decoded;
        $decoded = trim($decoded);
        return $decoded;
    }

    private function decodeHeaderValue(string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }
        if (function_exists('iconv_mime_decode')) {
            $decoded = @iconv_mime_decode($trimmed, ICONV_MIME_DECODE_CONTINUE_ON_ERROR, 'UTF-8');
            if (is_string($decoded) && $decoded !== '') {
                return $decoded;
            }
        }
        return $trimmed;
    }

    private function buildConversationKeyFromHeaders(
        string $messageId,
        string $inReplyTo,
        string $references,
        string $subject
    ): string {
        $referenceTokens = $this->extractMessageIdTokens($references);
        if ($referenceTokens !== []) {
            return 'ref:' . $referenceTokens[0];
        }

        $inReplyToTokens = $this->extractMessageIdTokens($inReplyTo);
        if ($inReplyToTokens !== []) {
            return 'irt:' . $inReplyToTokens[0];
        }

        $messageIdTokens = $this->extractMessageIdTokens($messageId);
        if ($messageIdTokens !== []) {
            return 'mid:' . $messageIdTokens[0];
        }

        $normalizedSubject = $this->normalizeConversationSubject($subject);
        if ($normalizedSubject !== '') {
            return 'sub:' . hash('sha1', $normalizedSubject);
        }

        return '';
    }

    /**
     * @return list<string>
     */
    private function extractMessageIdTokens(string $value): array
    {
        $candidate = trim($value);
        if ($candidate === '') {
            return [];
        }

        $tokens = [];
        if (preg_match_all('/<([^>]+)>/', $candidate, $matches) > 0) {
            foreach (($matches[1] ?? []) as $match) {
                $normalized = $this->normalizeMessageIdToken((string) $match);
                if ($normalized !== '') {
                    $tokens[] = $normalized;
                }
            }
        } else {
            $parts = preg_split('/\s+/', $candidate) ?: [];
            foreach ($parts as $part) {
                $normalized = $this->normalizeMessageIdToken((string) $part);
                if ($normalized !== '') {
                    $tokens[] = $normalized;
                }
            }
        }

        return array_values(array_unique($tokens));
    }

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

    private function normalizeConversationSubject(string $value): string
    {
        $subject = strtolower(trim($this->decodeHeaderValue($value)));
        if ($subject === '') {
            return '';
        }
        do {
            $updated = $subject;
            $subject = preg_replace('/^(re|fw|fwd|rv|aw|rif)\s*:\s*/i', '', $subject) ?? $subject;
            $subject = trim($subject);
        } while ($subject !== '' && $subject !== $updated);
        return $subject;
    }

    /**
     * @param array<string,string> $headers
     */
    private function buildRecipients(array $headers): string
    {
        $parts = [];
        foreach (['to', 'cc', 'delivered-to'] as $key) {
            if (!isset($headers[$key])) {
                continue;
            }
            $decoded = $this->decodeHeaderValue($headers[$key]);
            if ($decoded !== '') {
                $parts[] = $decoded;
            }
        }
        return implode(' | ', $parts);
    }

    /**
     * @return list<string>
     */
    private function extractEmails(string $text): array
    {
        if ($text === '') {
            return [];
        }
        preg_match_all("/[A-Z0-9._%+\-']+@[A-Z0-9.\-]+\.[A-Z]{2,}/i", $text, $matches);
        $emails = isset($matches[0]) && is_array($matches[0]) ? $matches[0] : [];
        $normalized = [];
        foreach ($emails as $value) {
            $clean = $this->sanitizeEmailAddress((string) $value);
            if ($clean !== null) {
                $normalized[] = $clean;
            }
        }
        return array_values(array_unique($normalized));
    }

    private function sanitizeEmailAddress(string $value): ?string
    {
        $candidate = trim($value);
        if ($candidate === '') {
            return null;
        }
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
}
