<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use PDO;
use Webauthn\PublicKeyCredentialDescriptor;
use Webauthn\PublicKeyCredentialSource;
use Webauthn\PublicKeyCredentialSourceRepository;
use Webauthn\TrustPath\EmptyTrustPath;
use Webauthn\PublicKeyCredentialUserEntity;
use Symfony\Component\Uid\Uuid;

final class PasskeyRepository implements PublicKeyCredentialSourceRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function findOneByCredentialId(string $publicKeyCredentialId): ?PublicKeyCredentialSource
    {
        $stmt = $this->pdo->prepare('
            SELECT *
            FROM auth_account_passkeys
            WHERE credential_id = :credential_id
            LIMIT 1
        ');
        $stmt->execute([
            'credential_id' => $publicKeyCredentialId,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        return $this->createSourceFromRow($row);
    }

    /**
     * @param array<string, mixed> $row
     */
    private function createSourceFromRow(array $row): PublicKeyCredentialSource
    {
        $transports = [];
        if (!empty($row['transports'])) {
            $transports = array_filter(explode(',', $row['transports']), static fn ($v) => $v !== '');
        }
        $aaguid = isset($row['aaguid']) && $row['aaguid'] !== ''
            ? Uuid::fromString($row['aaguid'])
            : Uuid::fromString('00000000-0000-0000-0000-000000000000');
        $attestationType = $row['attestation_type'] ?? 'none';
        $userHandle = $row['user_handle'] ?? (string) ($row['id_account'] ?? '');
        return new PublicKeyCredentialSource(
            $row['credential_id'],
            'public-key',
            $transports,
            $attestationType,
            EmptyTrustPath::create(),
            $aaguid,
            $row['public_key'],
            $userHandle,
            (int) ($row['sign_count'] ?? 0)
        );
    }

    /**
     * @return PublicKeyCredentialSource[]
     */
    public function findAllForUserEntity(PublicKeyCredentialUserEntity $publicKeyCredentialUserEntity): array
    {
        $stmt = $this->pdo->prepare('
            SELECT *
            FROM auth_account_passkeys
            WHERE user_handle = :user_handle
        ');
        $stmt->execute(['user_handle' => $publicKeyCredentialUserEntity->id]);
        $result = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $result[] = $this->createSourceFromRow($row);
        }
        return $result;
    }

    public function saveCredentialSource(PublicKeyCredentialSource $publicKeyCredentialSource): void
    {
        $stmt = $this->pdo->prepare('
            UPDATE auth_account_passkeys
            SET sign_count = :sign_count
            WHERE credential_id = :credential_id
        ');
        $stmt->execute([
            'credential_id' => $publicKeyCredentialSource->publicKeyCredentialId,
            'sign_count' => $publicKeyCredentialSource->counter,
        ]);
    }

    /**
     * @return array<array<string, mixed>>
     */
    public function listForAccount(int $accountId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT *
            FROM auth_account_passkeys
            WHERE id_account = :id_account
        ');
        $stmt->execute(['id_account' => $accountId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function deleteByCredentialId(string $credentialId): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM auth_account_passkeys WHERE credential_id = :credential_id');
        $stmt->execute(['credential_id' => $credentialId]);
        return $stmt->rowCount() > 0;
    }

    public function deleteAllForAccount(int $accountId): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM auth_account_passkeys WHERE id_account = :id_account');
        $stmt->execute(['id_account' => $accountId]);
    }

    public function insertCredentialSource(int $accountId, PublicKeyCredentialSource $source, ?string $label = null): void
    {
        $transports = [];
        if (is_array($source->transports ?? null)) {
            $transports = array_filter($source->transports, static fn ($value): bool => is_string($value) && $value !== '');
        }
        $transportsValue = $transports ? implode(',', $transports) : null;
        $aaguid = $source->aaguid ?? null;
        $aaguidValue = '00000000-0000-0000-0000-000000000000';
        if ($aaguid instanceof Uuid) {
            $aaguidValue = $aaguid->toRfc4122();
        } elseif (is_string($aaguid) && $aaguid !== '') {
            $aaguidValue = $aaguid;
        }
        $stmt = $this->pdo->prepare('
            INSERT INTO auth_account_passkeys (
                id_account,
                credential_id,
                public_key,
                transports,
                label,
                sign_count,
                attestation_type,
                aaguid,
                user_handle
            ) VALUES (
                :id_account,
                :credential_id,
                :public_key,
                :transports,
                :label,
                :sign_count,
                :attestation_type,
                :aaguid,
                :user_handle
            )
        ');
        $stmt->execute([
            'id_account' => $accountId,
            'credential_id' => $source->publicKeyCredentialId,
            'public_key' => $source->credentialPublicKey,
            'transports' => $transportsValue,
            'label' => $label === null || trim($label) === '' ? 'Passkey' : trim($label),
            'sign_count' => (int) ($source->counter ?? 0),
            'attestation_type' => $source->attestationType ?? 'none',
            'aaguid' => $aaguidValue,
            'user_handle' => $source->userHandle ?? null,
        ]);
    }
}
