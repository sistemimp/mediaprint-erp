<?php

namespace MediaPrint\Backend\Mailer;

final class SmtpMailer
{
    private string $host;
    private int $port;
    private ?string $username;
    private ?string $password;
    private string $encryption;
    private int $timeout;
    private string $ehloDomain;
    private bool $allowSelfSigned;

    public function __construct(
        ?string $host = null,
        ?int $port = null,
        ?string $username = null,
        ?string $password = null,
        ?string $encryption = null,
        ?int $timeout = null,
        ?string $ehloDomain = null,
        ?bool $allowSelfSigned = null
    ) {
        $this->host = $host ?? (getenv('SMTP_HOST') ?: 'localhost');
        $this->port = $port ?? (int) (getenv('SMTP_PORT') ?: 587);
        $this->username = $username ?? (getenv('SMTP_USERNAME') ?: null);
        $this->password = $password ?? (getenv('SMTP_PASSWORD') ?: null);
        $this->encryption = strtolower($encryption ?? (getenv('SMTP_ENCRYPTION') ?: 'tls'));
        $this->timeout = $timeout ?? (int) (getenv('SMTP_TIMEOUT') ?: 30);
        $this->ehloDomain = $ehloDomain ?? (getenv('SMTP_EHLO_DOMAIN') ?: (gethostname() ?: 'localhost'));
        $this->allowSelfSigned = $allowSelfSigned ?? (getenv('SMTP_ALLOW_SELF_SIGNED') === '1');

        // Compatibilità provider: porta 465 richiede implicit SSL/TLS (SMTPS), non STARTTLS esplicito.
        if ($this->port === 465 && $this->encryption === 'tls') {
            $this->encryption = 'ssl';
        }
    }

    /**
     * @param list<string> $to
     * @param list<string> $cc
     */
    /**
     * @param array<string, string> $inlineImages
     */
    public function send(array $to, array $cc, string $subject, string $htmlBody, string $fromEmail, string $fromName, array $inlineImages = []): bool
    {
        $toRecipients = $this->normalizeAddresses($to);
        $ccRecipients = $this->normalizeAddresses($cc);
        $allRecipients = array_values(array_unique(array_merge($toRecipients, $ccRecipients)));
        if (empty($allRecipients)) {
            throw new \InvalidArgumentException('Nessun destinatario email valido per l\'invio SMTP.');
        }

        $fromEmail = filter_var($fromEmail, FILTER_VALIDATE_EMAIL) ? strtolower($fromEmail) : 'no-reply-mail@' . $this->ehloDomain;
        $fromName = trim(preg_replace("/[\r\n]+/", ' ', $fromName)) ?: 'MediaPrint';
        $safeSubject = trim(preg_replace("/[\r\n]+/", ' ', $subject)) ?: 'Comunicazione MediaPrint';
        $normalizedBody = preg_replace("/\r\n|\r|\n/", "\r\n", $htmlBody);
        $normalizedBody = preg_replace('/(^|\r\n)\./', '$1..', $normalizedBody);
        $messageId = '<' . bin2hex(random_bytes(8)) . '@' . $this->ehloDomain . '>';

        $boundaryAlt = 'b1_' . bin2hex(random_bytes(8));
        $boundaryMixed = 'b2_' . bin2hex(random_bytes(8));

        $headers = [];
        $headers[] = 'From: ' . sprintf('%s <%s>', $fromName, $fromEmail);
        $headers[] = 'To: ' . implode(', ', $toRecipients);
        if (!empty($ccRecipients)) {
            $headers[] = 'Cc: ' . implode(', ', $ccRecipients);
        }
        $headers[] = 'Subject: ' . $safeSubject;
        $headers[] = 'Date: ' . gmdate('D, d M Y H:i:s O');
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Message-ID: ' . $messageId;
        $headers[] = 'X-Mailer: MediaPrint ERP SMTP';
        $headers[] = 'Content-Type: multipart/mixed; charset=utf-8; boundary="' . $boundaryMixed . '"';
        $headers[] = '';

        $textBody = strip_tags(preg_replace('/<br\\s*\\/?>/i', "\n", $htmlBody));

        $altParts = [];
        $altParts[] = '--' . $boundaryAlt;
        $altParts[] = 'Content-Type: text/plain; charset=utf-8';
        $altParts[] = 'Content-Transfer-Encoding: 8bit';
        $altParts[] = '';
        $altParts[] = $textBody;
        $altParts[] = '';
        $altParts[] = '--' . $boundaryAlt;
        $altParts[] = 'Content-Type: text/html; charset=utf-8';
        $altParts[] = 'Content-Transfer-Encoding: 8bit';
        $altParts[] = '';
        $altParts[] = $normalizedBody;
        $altParts[] = '';
        $altParts[] = '--' . $boundaryAlt . '--';

        $mixedParts = [];
        $mixedParts[] = '--' . $boundaryMixed;
        $mixedParts[] = 'Content-Type: multipart/alternative; boundary="' . $boundaryAlt . '"';
        $mixedParts[] = '';
        $mixedParts[] = implode("\r\n", $altParts);

        foreach ($this->normalizeInlineImages($inlineImages) as $inline) {
            $mixedParts[] = '--' . $boundaryMixed;
            $mixedParts[] = 'Content-Type: ' . $inline['mime'] . '; name="' . $inline['name'] . '"';
            $mixedParts[] = 'Content-Transfer-Encoding: base64';
            $mixedParts[] = 'Content-ID: <' . $inline['cid'] . '>';
            $mixedParts[] = 'Content-Disposition: inline; filename="' . $inline['name'] . '"';
            $mixedParts[] = '';
            $mixedParts[] = chunk_split($inline['data']);
        }

        $mixedParts[] = '--' . $boundaryMixed . '--';

        $messageData = implode("\r\n", $headers) . implode("\r\n", $mixedParts);

        $socket = $this->openConnection();
        try {
            $this->expectResponse($socket, [220], 'Connessione SMTP');
            $this->sendCommand($socket, 'EHLO ' . $this->ehloDomain);
            $this->expectResponse($socket, [250], 'EHLO');

            if ($this->encryption === 'tls') {
                $this->sendCommand($socket, 'STARTTLS');
                $this->expectResponse($socket, [220], 'STARTTLS');
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new \RuntimeException('Negoziazione TLS fallita.');
                }
                $this->sendCommand($socket, 'EHLO ' . $this->ehloDomain);
                $this->expectResponse($socket, [250], 'EHLO dopo STARTTLS');
            }

            if ($this->username !== null && $this->password !== null) {
                $this->sendCommand($socket, 'AUTH LOGIN');
                $this->expectResponse($socket, [334], 'AUTH LOGIN');
                $this->sendCommand($socket, base64_encode($this->username));
                $this->expectResponse($socket, [334], 'Username SMTP');
                $this->sendCommand($socket, base64_encode($this->password));
                $this->expectResponse($socket, [235], 'Password SMTP');
            }

            $this->sendCommand($socket, 'MAIL FROM: <' . $fromEmail . '>');
            $this->expectResponse($socket, [250], 'MAIL FROM');

            foreach ($allRecipients as $recipient) {
                $this->sendCommand($socket, 'RCPT TO: <' . $recipient . '>');
                $this->expectResponse($socket, [250, 251], 'RCPT TO');
            }

            $this->sendCommand($socket, 'DATA');
            $this->expectResponse($socket, [354], 'DATA');

            $payload = $messageData . "\r\n.\r\n";
            fwrite($socket, $payload);
            $this->expectResponse($socket, [250], 'INVIO BODY');

            $this->sendCommand($socket, 'QUIT');
            $this->expectResponse($socket, [221], 'QUIT');
        } finally {
            if (is_resource($socket)) {
                fclose($socket);
            }
        }

        return true;
    }

    /**
     * @param resource $socket
     */
    private function openConnection()
    {
        $transportHost = $this->encryption === 'ssl' ? 'ssl://' . $this->host : $this->host;
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
            $transportHost . ':' . $this->port,
            $errno,
            $errstr,
            $this->timeout,
            STREAM_CLIENT_CONNECT,
            $context
        );
        if (!is_resource($socket)) {
            throw new \RuntimeException(sprintf('Connessione SMTP fallita (%s:%d): %s', $this->host, $this->port, $errstr));
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
     * @return array{0:int,1:string}
     */
    private function readResponse($socket): array
    {
        $data = '';
        while (($line = fgets($socket, 515)) !== false) {
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        if ($data === '') {
            throw new \RuntimeException('Risposta SMTP vuota o connessione chiusa inaspettatamente.');
        }
        $code = (int) substr($data, 0, 3);
        return [$code, trim($data)];
    }

    /**
     * @param resource $socket
     */
    private function expectResponse($socket, array $expectedCodes, string $context): array
    {
        [$code, $message] = $this->readResponse($socket);
        if (!in_array($code, $expectedCodes, true)) {
            throw new \RuntimeException(sprintf('%s: %s', $context, $message));
        }
        return [$code, $message];
    }

    /**
     * @param list<string> $addresses
     * @return list<string>
     */
    private function normalizeAddresses(array $addresses): array
    {
        $valid = [];
        foreach ($addresses as $address) {
            $candidate = trim((string) $address);
            if ($candidate === '') {
                continue;
            }
            if (strpos($candidate, '<') !== false && preg_match('/<([^>]+)>/', $candidate, $matches)) {
                $candidate = $matches[1];
            }
            if (filter_var($candidate, FILTER_VALIDATE_EMAIL)) {
                $valid[] = strtolower($candidate);
            }
        }
        return array_values(array_unique($valid));
    }

    /**
     * @param array<string, string> $inlineImages
     * @return list<array{cid:string,name:string,mime:string,data:string}>
     */
    private function normalizeInlineImages(array $inlineImages): array
    {
        $result = [];
        foreach ($inlineImages as $cid => $path) {
            $cidCandidate = trim((string) $cid);
            $filePath = trim((string) $path);
            if ($cidCandidate === '' || $filePath === '') {
                continue;
            }
            if (!is_file($filePath) || !is_readable($filePath)) {
                continue;
            }
            $content = file_get_contents($filePath);
            if ($content === false) {
                continue;
            }
            $mimeType = $this->detectMimeType($filePath);
            $result[] = [
                'cid' => $cidCandidate,
                'name' => basename($filePath),
                'mime' => $mimeType,
                'data' => base64_encode($content),
            ];
        }
        return $result;
    }

    private function detectMimeType(string $path): string
    {
        if (function_exists('finfo_open')) {
            /** @noinspection PhpUnhandledExceptionInspection */
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo !== false) {
                $mime = finfo_file($finfo, $path);
                finfo_close($finfo);
                if (is_string($mime)) {
                    return $mime;
                }
            }
        }
        if (function_exists('mime_content_type')) {
            $mime = mime_content_type($path);
            if ($mime !== false) {
                return $mime;
            }
        }
        return 'application/octet-stream';
    }
}
