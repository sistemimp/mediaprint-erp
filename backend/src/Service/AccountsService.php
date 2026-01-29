<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use DateTimeImmutable;
use MediaPrint\Backend\Mailer\EmailTemplate;
use MediaPrint\Backend\Mailer\SmtpMailer;
use MediaPrint\Repo\AccountsRepository;
use RuntimeException;

final class AccountsService
{
    public function __construct(private readonly AccountsRepository $repository)
    {
    }

    /**
     * @return array{data: list<array<string,mixed>>, meta: array<string,int>}
     */
    public function list(array $input): array
    {
        $filters = [
            'search' => isset($input['search']) ? (string) $input['search'] : null,
            'account_type' => isset($input['account_type']) ? (string) $input['account_type'] : null,
            'is_active' => array_key_exists('is_active', $input) ? (int) $input['is_active'] : null,
            'sort_by' => isset($input['sort_by']) ? (string) $input['sort_by'] : 'username',
            'sort_direction' => (isset($input['sort_direction']) && strtolower((string) $input['sort_direction']) === 'desc') ? 'desc' : 'asc',
            'page' => isset($input['page']) ? max(1, (int) $input['page']) : 1,
            'per_page' => isset($input['per_page']) ? max(1, (int) $input['per_page']) : 20,
        ];

        $result = $this->repository->search($filters);
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
     * @return list<array<string, mixed>>
     */
    public function listRoles(): array
    {
        return $this->repository->listRoles();
    }

    /**
     * @return array<string, mixed>
     */
    public function detail(int $accountId): array
    {
        if ($accountId <= 0) {
            throw new RuntimeException('ID account non valido.', 422);
        }

        $account = $this->repository->getAccountDetail($accountId);
        if ($account === null) {
            throw new RuntimeException('Account non trovato.', 404);
        }

        $catalog = $this->repository->listPermissionsCatalog();
        $catalogIds = array_map(static fn(array $row): int => (int) $row['id_permesso'], $catalog);

        $overrides = $this->repository->listAccountPermissions($accountId);
        $hasCustom = $overrides !== [];

        $accountAllowed = [];
        foreach ($overrides as $row) {
            if ((int) ($row['is_allowed'] ?? 0) === 1) {
                $accountAllowed[] = (int) $row['id_permesso'];
            }
        }

        $roleId = isset($account['id_ruolo']) ? (int) $account['id_ruolo'] : 0;
        $roleIds = $roleId > 0 ? [$roleId] : [];
        $rolePermissions = $this->repository->listPermissionsForRoles($roleIds);
        $roleAllowed = array_map(static fn(array $row): int => (int) $row['id_permesso'], $rolePermissions);

        $effective = $hasCustom ? $accountAllowed : $roleAllowed;

        return [
            'account' => $account,
            'permissions_catalog' => $catalog,
            'account_permissions' => array_values(array_unique($accountAllowed)),
            'role_permissions' => array_values(array_unique($roleAllowed)),
            'effective_permissions' => array_values(array_unique(array_intersect($effective, $catalogIds))),
            'has_custom_permissions' => $hasCustom,
        ];
    }

    /**
     * @return array{ok: bool}
     */
    public function updatePermissions(array $input): array
    {
        $accountId = isset($input['id_account']) ? (int) $input['id_account'] : (isset($input['id']) ? (int) $input['id'] : 0);
        if ($accountId <= 0) {
            throw new RuntimeException('ID account non valido.', 422);
        }
        if (!$this->repository->accountExists($accountId)) {
            throw new RuntimeException('Account non trovato.', 404);
        }

        $allowed = $this->sanitizeIdList($input['permissions'] ?? []);
        $catalog = $this->repository->listPermissionsCatalog();
        $catalogIds = array_map(static fn(array $row): int => (int) $row['id_permesso'], $catalog);

        $validAllowed = array_values(array_intersect($allowed, $catalogIds));
        $this->repository->replaceAccountPermissions($accountId, $catalogIds, $validAllowed);

        return ['ok' => true];
    }

    /**
     * @return array{items: list<array<string,mixed>>, selected: list<int>, default_id:?int}
     */
    public function listAnagrafiche(array $input): array
    {
        $accountId = isset($input['id_account']) ? (int) $input['id_account'] : (isset($input['id']) ? (int) $input['id'] : 0);
        $items = $this->repository->listActiveAnagrafiche();
        $selected = [];
        $defaultId = null;

        if ($accountId > 0) {
            $rows = $this->repository->listAccountAnagrafiche($accountId);
            foreach ($rows as $row) {
                $id = isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : 0;
                if ($id > 0) {
                    $selected[] = $id;
                    if ((int) ($row['is_predefinita'] ?? 0) === 1) {
                        $defaultId = $id;
                    }
                }
            }
        }

        return [
            'items' => $items,
            'selected' => array_values(array_unique($selected)),
            'default_id' => $defaultId,
        ];
    }

    /**
     * @return array{items: list<array<string,mixed>>}
     */
    public function listContatti(array $input): array
    {
        $ids = $input['anagrafiche'] ?? $input['id_anagrafica'] ?? null;
        if (is_string($ids)) {
            $ids = array_filter(array_map('trim', explode(',', $ids)));
        }
        $anagraficaIds = $this->sanitizeIdList($ids);
        $items = $this->repository->listContattiForAnagrafiche($anagraficaIds);
        $selected = [];
        $primaryId = null;
        $accountId = isset($input['id_account']) ? (int) $input['id_account'] : 0;
        if ($accountId > 0) {
            $rows = $this->repository->listAccountContatti($accountId);
            foreach ($rows as $row) {
                $id = isset($row['id_contatto']) ? (int) $row['id_contatto'] : 0;
                if ($id > 0) {
                    $selected[] = $id;
                    if ((int) ($row['is_primary'] ?? 0) === 1) {
                        $primaryId = $id;
                    }
                }
            }
        }
        $availableIds = array_map(static fn(array $item): int => (int) $item['id_contatto'], $items);
        $selected = array_values(array_intersect($selected, $availableIds));
        if ($primaryId !== null && !in_array($primaryId, $selected, true)) {
            $primaryId = null;
        }
        return ['items' => $items, 'selected' => $selected, 'primary_id' => $primaryId];
    }

    /**
     * @return array{id_account:int, generated_password:?string}
     */
    public function create(array $input): array
    {
        $username = isset($input['username']) ? trim((string) $input['username']) : '';
        if ($username === '') {
            throw new RuntimeException('Username obbligatorio.', 422);
        }
        if ($this->repository->usernameExists($username)) {
            throw new RuntimeException("Username gia utilizzato.", 409);
        }

        $accountType = strtolower((string) ($input['account_type'] ?? 'operatore'));
        if (!in_array($accountType, ['operatore', 'cliente'], true)) {
            throw new RuntimeException('Tipo account non valido.', 422);
        }

        $roleId = isset($input['id_ruolo']) ? (int) $input['id_ruolo'] : 0;
        if ($roleId <= 0 || !$this->repository->roleExists($roleId)) {
            throw new RuntimeException('Ruolo non valido.', 422);
        }

        $contattoId = isset($input['id_contatto']) && $input['id_contatto'] !== '' ? (int) $input['id_contatto'] : null;

        $anagrafiche = $this->sanitizeIdList($input['anagrafiche'] ?? null);
        $defaultAnagrafica = isset($input['anagrafica_predefinita']) ? (int) $input['anagrafica_predefinita'] : null;
        $contatti = $this->sanitizeIdList($input['contatti'] ?? null);
        $primaryContatto = isset($input['contatto_predefinito']) ? (int) $input['contatto_predefinito'] : null;
        if ($contatti !== [] && $primaryContatto !== null && !in_array($primaryContatto, $contatti, true)) {
            throw new RuntimeException('Contatto predefinito non valido.', 422);
        }
        if ($contatti !== [] && $primaryContatto === null) {
            $primaryContatto = $contatti[0];
        }
        if ($accountType === 'cliente' && $anagrafiche === []) {
            throw new RuntimeException("Selezionare almeno un'anagrafica per account cliente.", 422);
        }
        if ($anagrafiche !== []) {
            $valid = $this->repository->listValidAnagrafiche($anagrafiche);
            if (count($valid) !== count($anagrafiche)) {
                throw new RuntimeException('Anagrafiche non valide o non attive.', 422);
            }
            $anagrafiche = $valid;
        }

        $password = isset($input['password']) ? (string) $input['password'] : '';
        $generatedPassword = null;
        if (trim($password) === '') {
            $generatedPassword = $this->generatePassword();
            $password = $generatedPassword;
        }

        $mustChange = array_key_exists('must_change_pwd', $input)
            ? ((int) $input['must_change_pwd'] === 1 ? 1 : 0)
            : ($generatedPassword !== null ? 1 : 0);

        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($hash === false) {
            throw new RuntimeException('Impossibile generare la password.', 500);
        }

        $id = $this->repository->createAccount([
            'account_type' => $accountType,
            'username' => $username,
            'email' => isset($input['email']) && trim((string) $input['email']) !== '' ? (string) $input['email'] : null,
            'password_hash' => $hash,
            'id_ruolo' => $roleId,
            'id_contatto' => $accountType === 'cliente' ? $contattoId : null,
            'is_active' => array_key_exists('is_active', $input) ? ((int) $input['is_active'] === 1 ? 1 : 0) : 1,
            'must_change_pwd' => $mustChange,
            'has_mfa' => 0,
            'mfa_secret' => null,
        ]);

        if ($accountType === 'cliente' && $anagrafiche !== []) {
            $effectiveContatto = $primaryContatto ?? $contattoId;
            if ($effectiveContatto === null || $effectiveContatto <= 0) {
                throw new RuntimeException("Per associare anagrafiche e' necessario selezionare un contatto.", 422);
            }
            $defaultId = $this->resolveDefaultAnagrafica($anagrafiche, $defaultAnagrafica);
            $this->syncAccountAnagraficheForContatto((int) $effectiveContatto, $anagrafiche, $defaultId);
        }

        if ($contatti !== []) {
            $this->repository->replaceAccountContatti($id, $contatti, $primaryContatto);
            $this->repository->updateAccount($id, ['id_contatto' => $primaryContatto]);
        }

        return [
            'id_account' => $id,
            'generated_password' => $generatedPassword,
        ];
    }

    /**
     * @return array{ok: bool}
     */
    public function update(array $input): array
    {
        $accountId = isset($input['id_account']) ? (int) $input['id_account'] : (isset($input['id']) ? (int) $input['id'] : 0);
        if ($accountId <= 0) {
            throw new RuntimeException('ID account non valido.', 422);
        }
        if (!$this->repository->accountExists($accountId)) {
            throw new RuntimeException('Account non trovato.', 404);
        }

        $payload = [];
        $meta = $this->repository->getAccountMeta($accountId);
        if ($meta === null) {
            throw new RuntimeException('Account non trovato.', 404);
        }

        if (array_key_exists('username', $input)) {
            $username = trim((string) $input['username']);
            if ($username === '') {
                throw new RuntimeException('Username obbligatorio.', 422);
            }
            if ($this->repository->usernameExists($username, $accountId)) {
                throw new RuntimeException("Username gia utilizzato.", 409);
            }
            $payload['username'] = $username;
        }

        if (array_key_exists('email', $input)) {
            $payload['email'] = trim((string) $input['email']) !== '' ? (string) $input['email'] : null;
        }

        if (array_key_exists('account_type', $input)) {
            $accountType = strtolower((string) $input['account_type']);
            if (!in_array($accountType, ['operatore', 'cliente'], true)) {
                throw new RuntimeException('Tipo account non valido.', 422);
            }
            $payload['account_type'] = $accountType;
        }

        if (array_key_exists('id_ruolo', $input)) {
            $roleId = (int) $input['id_ruolo'];
            if ($roleId <= 0 || !$this->repository->roleExists($roleId)) {
                throw new RuntimeException('Ruolo non valido.', 422);
            }
            $payload['id_ruolo'] = $roleId;
        }

        if (array_key_exists('id_contatto', $input)) {
            $contatto = $input['id_contatto'];
            $payload['id_contatto'] = $contatto === null || $contatto === '' ? null : (int) $contatto;
        }

        if (array_key_exists('is_active', $input)) {
            $payload['is_active'] = (int) $input['is_active'] === 1 ? 1 : 0;
        }

        if (array_key_exists('must_change_pwd', $input)) {
            $payload['must_change_pwd'] = (int) $input['must_change_pwd'] === 1 ? 1 : 0;
        }

        if (array_key_exists('has_mfa', $input)) {
            $payload['has_mfa'] = (int) $input['has_mfa'] === 1 ? 1 : 0;
        }

        $accountType = $payload['account_type'] ?? (string) ($meta['account_type'] ?? '');
        if ($accountType === 'cliente') {
            $contatto = array_key_exists('id_contatto', $payload) ? $payload['id_contatto'] : ($meta['id_contatto'] ?? null);
            if ($contatto !== null && $contatto <= 0) {
                throw new RuntimeException("ID contatto non valido.", 422);
            }
        }

        $this->repository->updateAccount($accountId, $payload);

        $contatti = $this->sanitizeIdList($input['contatti'] ?? null);
        $primaryContatto = isset($input['contatto_predefinito']) ? (int) $input['contatto_predefinito'] : null;
        if ($contatti !== [] && $primaryContatto !== null && !in_array($primaryContatto, $contatti, true)) {
            throw new RuntimeException('Contatto predefinito non valido.', 422);
        }
        if ($contatti !== [] && $primaryContatto === null) {
            $primaryContatto = $contatti[0];
        }
        if (array_key_exists('contatti', $input)) {
            $this->repository->replaceAccountContatti($accountId, $contatti, $primaryContatto);
            $this->repository->updateAccount($accountId, ['id_contatto' => $primaryContatto]);
        }

        $hasAnagrafichePayload = array_key_exists('anagrafiche', $input) || array_key_exists('anagrafica_predefinita', $input);
        if ($accountType === 'cliente' && $hasAnagrafichePayload) {
            $anagrafiche = $this->sanitizeIdList($input['anagrafiche'] ?? []);
            if ($anagrafiche === []) {
                throw new RuntimeException("Selezionare almeno un'anagrafica per account cliente.", 422);
            }
            $valid = $this->repository->listValidAnagrafiche($anagrafiche);
            if (count($valid) !== count($anagrafiche)) {
                throw new RuntimeException('Anagrafiche non valide o non attive.', 422);
            }
            $defaultAnagrafica = isset($input['anagrafica_predefinita']) ? (int) $input['anagrafica_predefinita'] : null;
            $defaultId = $this->resolveDefaultAnagrafica($valid, $defaultAnagrafica);
            $effectiveContatto = $primaryContatto ?? (array_key_exists('id_contatto', $payload) ? $payload['id_contatto'] : ($meta['id_contatto'] ?? null));
            if ($effectiveContatto === null || $effectiveContatto <= 0) {
                throw new RuntimeException("Per associare anagrafiche e' necessario selezionare un contatto.", 422);
            }
            $this->syncAccountAnagraficheForContatto((int) $effectiveContatto, $valid, $defaultId);
        }

        return ['ok' => true];
    }

    /**
     * @return array{ok: bool}
     */
    public function delete(array $input): array
    {
        $accountId = isset($input['id_account']) ? (int) $input['id_account'] : (isset($input['id']) ? (int) $input['id'] : 0);
        if ($accountId <= 0) {
            throw new RuntimeException('ID account non valido.', 422);
        }
        if (!$this->repository->accountExists($accountId)) {
            throw new RuntimeException('Account non trovato.', 404);
        }

        $this->repository->setAccountActive($accountId, 0);

        return ['ok' => true];
    }

    /**
     * @return array{ok: bool, password: string}
     */
    public function resetPassword(array $input): array
    {
        $accountId = isset($input['id_account']) ? (int) $input['id_account'] : (isset($input['id']) ? (int) $input['id'] : 0);
        if ($accountId <= 0) {
            throw new RuntimeException('ID account non valido.', 422);
        }
        if (!$this->repository->accountExists($accountId)) {
            throw new RuntimeException('Account non trovato.', 404);
        }

        $password = isset($input['password']) ? trim((string) $input['password']) : '';
        if ($password === '') {
            $password = $this->generatePassword();
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($hash === false) {
            throw new RuntimeException('Impossibile generare la password.', 500);
        }

        $this->repository->updatePassword($accountId, $hash, 1);

        return [
            'ok' => true,
            'password' => $password,
        ];
    }

    /**
     * @return array{ok: bool}
     */
    public function sendWelcomeEmail(array $input): array
    {
        $accountId = isset($input['id_account']) ? (int) $input['id_account'] : (isset($input['id']) ? (int) $input['id'] : 0);
        if ($accountId <= 0) {
            throw new RuntimeException('ID account non valido.', 422);
        }

        $account = $this->repository->getAccountEmail($accountId);
        if ($account === null) {
            throw new RuntimeException('Account non trovato.', 404);
        }

        $email = isset($account['email']) ? trim((string) $account['email']) : '';
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Email account non valida.', 422);
        }

        $password = null;
        $tempId = null;
        $expiresAt = null;
        if ((int) ($account['must_change_pwd'] ?? 0) === 1) {
            $existing = $this->repository->getActiveTempPassword($accountId);
            if ($existing !== null) {
                $password = $existing['temp_password'];
                $tempId = (int) $existing['id_temp'];
                $parsed = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', (string) ($existing['expires_at'] ?? ''));
                if ($parsed !== false) {
                    $expiresAt = $parsed;
                }
            }
        }

        if ($password === null) {
            $password = $this->generatePassword();
            $hash = password_hash($password, PASSWORD_DEFAULT);
            if ($hash === false) {
                throw new RuntimeException('Impossibile generare la password.', 500);
            }

            $this->repository->updatePassword($accountId, $hash, 1);

            $expiresHours = (int) (getenv('WELCOME_TEMP_PWD_TTL_HOURS') ?: 48);
            if ($expiresHours <= 0) {
                $expiresHours = 48;
            }
            $expiresAt = (new DateTimeImmutable('now'))->modify('+' . $expiresHours . ' hours');
            if ($expiresAt === false) {
                throw new RuntimeException('Impossibile calcolare la scadenza password.', 500);
            }
            $tempId = $this->repository->createTempPassword($accountId, $password, $expiresAt->format('Y-m-d H:i:s'));
        }

        $username = trim((string) ($account['username'] ?? ''));
        if ($username === '') {
            $username = 'utente';
        }

        $appUrl = getenv('FRONTEND_URL') ?: (getenv('APP_URL') ?: 'https://gestionale.mediaprint.it');
        $subject = 'Benvenuto in MediaPrint ERP';
        $safeUsername = htmlspecialchars($username, ENT_QUOTES, 'UTF-8');
        $safePassword = htmlspecialchars((string) $password, ENT_QUOTES, 'UTF-8');
        $safeUrl = htmlspecialchars($appUrl, ENT_QUOTES, 'UTF-8');
        if ($expiresAt === null) {
            $expiresAt = new DateTimeImmutable('now');
        }
        $formattedExpires = $expiresAt->format('d/m/Y H:i');
        $safeFormattedExpires = htmlspecialchars($formattedExpires, ENT_QUOTES, 'UTF-8');
        $body = <<<HTML
        <p>Ciao {$safeUsername},</p>
        <p>Il tuo account è pronto. Usa la password temporanea qui sotto per il primo accesso.</p>
        <div class="highlight">
          {$safePassword}
        </div>
        <p>La password è valida fino al {$safeFormattedExpires}. Al primo accesso ti verrà richiesto di impostare una nuova password personale.</p>
        <p>Puoi anche visitare direttamente <a href="{$safeUrl}">MediaPrint ERP</a> per continuare.</p>
        HTML;

        $messageHtml = EmailTemplate::render(
            $subject,
            $body,
            [
                'Riferimento' => 'Benvenuto / password temporanea',
                'Username' => $username,
                'Scadenza' => $formattedExpires,
            ],
            $username,
            'Accedi a MediaPrint ERP',
            $appUrl,
            (new DateTimeImmutable('now'))->format('d/m/Y')
        );

        $fromAddress = getenv('SMTP_FROM_ADDRESS') ?: 'no-reply-mail@' . $this->getMailerDomain();
        $fromName = getenv('SMTP_FROM_NAME') ?: 'MediaPrint ERP';

        $mailer = new SmtpMailer();
        $mailer->send([$email], [], $subject, $messageHtml, $fromAddress, $fromName, [
            'mediaprint-logo' => EmailTemplate::getLogoPath(),
        ]);

        $this->repository->logAccountEmail($accountId, $email, 'welcome', $tempId);

        return ['ok' => true];
    }

    /**
     * @return array{avatar_path:string}
     */
    public function uploadAvatar(int $accountId, array $file): array
    {
        if ($accountId <= 0) {
            throw new RuntimeException('ID account non valido.', 422);
        }
        if (!$this->repository->accountExists($accountId)) {
            throw new RuntimeException('Account non trovato.', 404);
        }
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            throw new RuntimeException('File mancante o non valido.', 422);
        }
        if (isset($file['error']) && (int) $file['error'] !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Errore durante il caricamento del file.', 422);
        }

        $maxBytes = (int) (getenv('ACCOUNT_AVATAR_MAX_BYTES') ?: (2 * 1024 * 1024));
        if (isset($file['size']) && (int) $file['size'] > $maxBytes) {
            throw new RuntimeException('Il file supera la dimensione massima consentita.', 422);
        }

        $imageInfo = @getimagesize((string) $file['tmp_name']);
        if (!$imageInfo || empty($imageInfo['mime'])) {
            throw new RuntimeException('Immagine non valida.', 422);
        }

        $allowed = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];
        $mime = (string) $imageInfo['mime'];
        if (!isset($allowed[$mime])) {
            throw new RuntimeException('Formato immagine non supportato.', 422);
        }

        $extension = $allowed[$mime];
        $fileName = sprintf('avatar_%s.%s', uniqid('', true), $extension);
        $uploadsBase = $this->resolveUploadsBasePath();
        $baseDir = $uploadsBase . '/avatars/' . $accountId;
        if (!is_dir($baseDir) && !mkdir($baseDir, 0775, true) && !is_dir($baseDir)) {
            throw new RuntimeException('Impossibile creare la cartella di upload.', 500);
        }

        $destination = $baseDir . '/' . $fileName;
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new RuntimeException('Impossibile salvare il file caricato.', 500);
        }

        $relativePath = 'avatars/' . $accountId . '/' . $fileName;
        $previous = $this->repository->getAccountAvatarPath($accountId);
        if ($previous) {
            $previousSafe = ltrim($previous, '/');
            if (strpos($previousSafe, '..') === false) {
                $previousPath = $uploadsBase . '/' . $previousSafe;
                if (is_file($previousPath)) {
                    @unlink($previousPath);
                }
            }
        }

        $this->repository->updateAccount($accountId, ['avatar_path' => $relativePath]);

        return ['avatar_path' => $relativePath];
    }

    private function generatePassword(): string
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

    private function resolveUploadsBasePath(): string
    {
        $envPath = getenv('UPLOADS_DIR') ?: (getenv('UPLOADS_BASE_PATH') ?: '');
        if (is_string($envPath) && $envPath !== '') {
            return rtrim($envPath, '/');
        }

        $backendBase = dirname(__DIR__, 2) . '/uploads';
        if (is_dir($backendBase)) {
            return $backendBase;
        }

        $rootBase = dirname(__DIR__, 3) . '/uploads';
        if (is_dir($rootBase)) {
            return $rootBase;
        }

        return $backendBase;
    }

    /**
     * @param mixed $value
     * @return list<int>
     */
    private function sanitizeIdList($value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $ids = [];
        foreach ($value as $item) {
            $id = (int) $item;
            if ($id > 0) {
                $ids[] = $id;
            }
        }
        return array_values(array_unique($ids));
    }

    /**
     * @param list<int> $ids
     */
    private function resolveDefaultAnagrafica(array $ids, ?int $defaultId): int
    {
        if ($defaultId !== null && in_array($defaultId, $ids, true)) {
            return $defaultId;
        }
        return $ids[0];
    }

    /**
     * @param list<int> $targetIds
     */
    private function syncAccountAnagraficheForContatto(int $contattoId, array $targetIds, int $defaultId): void
    {
        $this->repository->replaceContattoAnagrafiche($contattoId, $targetIds, $defaultId);
    }
}
