<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use DateTimeImmutable;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Repo\AuthRepository;
use MediaPrint\Repo\MfaRepository;
use RuntimeException;

final class MfaService
{
    private const SESSION_TTL_SECONDS = 300;
    private const OATH_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    private const OTP_DIGITS = 6;
    private const OTP_PERIOD = 30;

    private $accountsRepository;
    private $authRepository;
    private $mfaRepository;

    public function __construct(
        AccountsRepository $accountsRepository,
        AuthRepository $authRepository,
        MfaRepository $mfaRepository
    ) {
        $this->accountsRepository = $accountsRepository;
        $this->authRepository = $authRepository;
        $this->mfaRepository = $mfaRepository;
    }

    public function createSessionToken(int $accountId): string
    {
        $token = bin2hex(random_bytes(32));
        $expires = (new DateTimeImmutable('now'))->modify('+' . self::SESSION_TTL_SECONDS . ' seconds');
        $this->mfaRepository->createSession($accountId, $token, $expires);
        return $token;
    }

    public function consumeSessionToken(string $token): ?int
    {
        $session = $this->mfaRepository->consumeSession($token);
        return $session['id_account'] ?? null;
    }

    public function setupOtp(int $accountId): array
    {
        $account = $this->authRepository->findActiveAccountById($accountId);
        if ($account === null) {
            throw new RuntimeException('Account non valido.', 404);
        }
        $secret = $this->generateSecret();
        $method = $this->resolveMethod($account['mfa_method'] ?? 'none', 'otp');
        $this->accountsRepository->updateAccount($accountId, [
            'mfa_secret' => $secret,
            'mfa_method' => $method,
            'has_mfa' => 0,
        ]);

        $label = urlencode("MediaPrint ERP:{$account['username']}");
        $issuer = urlencode(getenv('MFA_ISSUER') ?: 'MediaPrint ERP');
        $uri = sprintf(
            'otpauth://totp/%s?secret=%s&issuer=%s&algorithm=SHA1&digits=%d&period=%d',
            $label,
            $secret,
            $issuer,
            self::OTP_DIGITS,
            self::OTP_PERIOD
        );

        return [
            'secret' => $secret,
            'otpauth_uri' => $uri,
        ];
    }

    public function confirmOtpSetup(int $accountId, string $code): void
    {
        if (!$this->verifyOtpCode($accountId, $code)) {
            throw new RuntimeException('Codice OTP non valido.', 422);
        }
        $account = $this->authRepository->findActiveAccountById($accountId);
        if ($account === null) {
            throw new RuntimeException('Account non valido.', 404);
        }
        $method = $this->resolveMethod($account['mfa_method'] ?? 'none', 'otp');
        $this->accountsRepository->updateAccount($accountId, [
            'has_mfa' => 1,
            'mfa_method' => $method,
        ]);
    }

    public function verifyOtpForAccount(int $accountId, string $code): bool
    {
        return $this->verifyOtpCode($accountId, $code);
    }

    private function verifyOtpCode(int $accountId, string $code): bool
    {
        $account = $this->authRepository->findActiveAccountById($accountId);
        if ($account === null) {
            return false;
        }
        $secret = (string) ($account['mfa_secret'] ?? '');
        if ($secret === '') {
            return false;
        }
        return $this->verifyTotpCode($secret, $code);
    }

    private function resolveMethod(string $current, string $requested): string
    {
        $current = strtolower($current);
        $requested = strtolower($requested);
        if ($current === 'both' || $current === $requested) {
            return $current === '' ? 'none' : $current;
        }
        if ($current === 'none' || $current === '') {
            return $requested;
        }
        return 'both';
    }

    private function generateSecret(int $length = 32): string
    {
        $alphabet = self::OATH_ALPHABET;
        $max = strlen($alphabet) - 1;
        $secret = '';
        for ($i = 0; $i < $length; $i += 1) {
            $secret .= $alphabet[random_int(0, $max)];
        }
        return $secret;
    }

    private function verifyTotpCode(string $secret, string $code, int $window = 1): bool
    {
        $cleanCode = trim((string) $code);
        if ($cleanCode === '' || !ctype_digit($cleanCode)) {
            return false;
        }
        $secret = strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret));
        if ($secret === '') {
            return false;
        }
        $decoded = $this->base32Decode($secret);
        $timestamp = (int) floor(time() / self::OTP_PERIOD);
        for ($offset = -$window; $offset <= $window; $offset += 1) {
            $value = $this->hotp($decoded, $timestamp + $offset);
            if (str_pad((string) $value, self::OTP_DIGITS, '0', STR_PAD_LEFT) === $cleanCode) {
                return true;
            }
        }
        return false;
    }

    private function hotp(string $secret, int $counter): int
    {
        $counterBytes = pack('N2', ($counter >> 32) & 0xffffffff, $counter & 0xffffffff);
        $hash = hash_hmac('sha1', $counterBytes, $secret, true);
        $offset = ord($hash[19]) & 0x0f;
        $binary = ((ord($hash[$offset]) & 0x7f) << 24)
            | ((ord($hash[$offset + 1]) & 0xff) << 16)
            | ((ord($hash[$offset + 2]) & 0xff) << 8)
            | (ord($hash[$offset + 3]) & 0xff);
        return $binary % (int) (10 ** self::OTP_DIGITS);
    }

    private function base32Decode(string $input): string
    {
        $alphabet = self::OATH_ALPHABET;
        $input = preg_replace('/[^A-Z2-7]/', '', strtoupper($input));
        $output = '';
        $buffer = 0;
        $bitsLeft = 0;
        foreach (str_split($input) as $char) {
            $value = strpos($alphabet, $char);
            if ($value === false) {
                continue;
            }
            $buffer = ($buffer << 5) | $value;
            $bitsLeft += 5;
            if ($bitsLeft >= 8) {
                $bitsLeft -= 8;
                $output .= chr(($buffer >> $bitsLeft) & 0xff);
            }
        }
        return $output;
    }
}
