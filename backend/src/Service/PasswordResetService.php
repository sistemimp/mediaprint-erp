<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use DateTimeImmutable;
use MediaPrint\Backend\Mailer\EmailTemplate;
use MediaPrint\Backend\Mailer\SmtpMailer;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Repo\AuthRepository;
use RuntimeException;

final class PasswordResetService
{
    private readonly AuthService $authService;
    private readonly array $allowedAccountTypes;

    public function __construct(
        private readonly AuthRepository $authRepository,
        private readonly AccountsRepository $accountsRepository,
    ) {
        $this->authService = new AuthService($authRepository);
        $allowed = getenv('ALLOW_ACCOUNT_TYPES') ?: 'admin,operatore,cliente';
        $parts = array_map(static fn (string $value): string => strtolower(trim($value)), explode(',', $allowed));
        $this->allowedAccountTypes = array_values(array_filter($parts));
    }

    public function requestReset(string $identifier): array
    {
        $identifier = trim($identifier);
        if ($identifier === '') {
            throw new RuntimeException('Email o username obbligatori.');
        }

        $account = $this->authRepository->findActiveAccount($identifier);
        if ($account === null) {
            throw new RuntimeException('Account non trovato.', 404);
        }

        $this->ensureAccountTypeAllowed($account);

        $email = trim((string) ($account['email'] ?? ''));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Email account non valida.', 422);
        }

        $tempPassword = $this->generateTemporaryPassword();
        $hash = password_hash($tempPassword, PASSWORD_DEFAULT);
        if ($hash === false) {
            throw new RuntimeException('Impossibile generare la password.', 500);
        }

        $accountId = (int) $account['id_account'];
        $this->accountsRepository->updatePassword($accountId, $hash, 1);

        $expiresAt = (new DateTimeImmutable('now'))->modify('+1 day');
        if ($expiresAt === false) {
            throw new RuntimeException('Impossibile calcolare la scadenza della password.', 500);
        }

        $tempId = $this->accountsRepository->createTempPassword(
            $accountId,
            $tempPassword,
            $expiresAt->format('Y-m-d H:i:s'),
        );

        $this->sendResetEmail(
            (string) ($account['username'] ?? ''),
            $email,
            $tempPassword,
            $expiresAt,
        );

        $this->accountsRepository->logAccountEmail($accountId, $email, 'password-reset', $tempId);

        return ['ok' => true];
    }

    public function changePassword(int $accountId, string $password): array
    {
        if ($accountId <= 0) {
            throw new RuntimeException('Account non valido.', 422);
        }

        $password = trim($password);
        if ($password === '') {
            throw new RuntimeException('Password obbligatoria.', 422);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($hash === false) {
            throw new RuntimeException('Impossibile generare la password.', 500);
        }

        $this->accountsRepository->updatePassword($accountId, $hash, 0);
        $this->accountsRepository->markTempPasswordsUsed($accountId);

        $user = $this->authService->getUserSnapshot($accountId);

        return [
            'ok' => true,
            'user' => $user,
        ];
    }

    /**
     * @param array<string, mixed> $account
     */
    private function ensureAccountTypeAllowed(array $account): void
    {
        if ($this->allowedAccountTypes === []) {
            return;
        }
        $accountType = strtolower((string) ($account['account_type'] ?? ''));
        if ($accountType === '') {
            throw new RuntimeException('Tipo account non valido.', 403);
        }
        if (!in_array($accountType, $this->allowedAccountTypes, true)) {
            throw new RuntimeException('Accesso non autorizzato per il tipo di account.', 403);
        }
    }

    private function generateTemporaryPassword(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
        $length = 12;
        $max = strlen($alphabet) - 1;
        $out = '';
        for ($i = 0; $i < $length; $i += 1) {
            $out .= $alphabet[random_int(0, $max)];
        }
        return $out;
    }

    private function sendResetEmail(string $username, string $email, string $password, DateTimeImmutable $expiresAt): void
    {
        $safeName = htmlspecialchars($username !== '' ? $username : 'utente', ENT_QUOTES, 'UTF-8');
        $safePassword = htmlspecialchars($password, ENT_QUOTES, 'UTF-8');
        $appUrl = $this->resolveAppUrl();
        $safeUrl = htmlspecialchars($appUrl, ENT_QUOTES, 'UTF-8');
        $formattedExpires = $expiresAt->format('d/m/Y H:i');
        $safeFormattedExpires = htmlspecialchars($formattedExpires, ENT_QUOTES, 'UTF-8');

        $subject = 'Ripristino password Gestionale MediaPrint';
        $body = <<<HTML
        <p>Abbiamo ricevuto una richiesta di ripristino password.</p>
        <div class="highlight">
          {$safePassword}
        </div>
        <p>Usa la password temporanea entro il {$safeFormattedExpires} per accedere e impostare una nuova password personale.</p>
        <p>Puoi anche visitare direttamente <a href="{$safeUrl}">gestionale.mediaprint.it</a> per continuare.</p>
        HTML;

        $messageHtml = EmailTemplate::render(
            $subject,
            $body,
            [
                'Riferimento' => 'Ripristino password',
                'Username' => $username !== '' ? $username : 'utente',
                'Scadenza' => $formattedExpires,
            ],
            $safeName,
            'Accedi ora',
            $appUrl,
            (new DateTimeImmutable('now'))->format('d/m/Y')
        );

        $fromAddress = getenv('SMTP_FROM_ADDRESS') ?: 'no-reply-mail@mediaprint.it';
        $fromName = getenv('SMTP_FROM_NAME') ?: 'MediaPrint ERP';

        $mailer = new SmtpMailer();
        $mailer->send([$email], [], $subject, $messageHtml, $fromAddress, $fromName, [
            'mediaprint-logo' => EmailTemplate::getLogoPath(),
        ]);
    }

    private function resolveAppUrl(): string
    {
        return getenv('FRONTEND_URL') ?: (getenv('APP_URL') ?: 'https://gestionale.mediaprint.it');
    }

    private function getMailerDomain(): string
    {
        $host = getenv('MAILER_DOMAIN') ?: '';
        if ($host !== '') {
            return $host;
        }
        $default = getenv('SMTP_EHLO_DOMAIN') ?: '';
        if ($default !== '') {
            return $default;
        }
        return (string) (gethostname() ?: 'mediaprint.it');
    }
}
