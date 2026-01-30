<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\MfaRepository;
use MediaPrint\Repo\PasskeyChallengeRepository;
use MediaPrint\Repo\PasskeyRepository;
use DateTimeImmutable;
use Webauthn\AttestationStatement\AttestationStatementSupportManager;
use Webauthn\AttestationStatement\NoneAttestationStatementSupport;
use Webauthn\AttestationStatement\AttestationObjectLoader;
use Webauthn\AuthenticatorAttestationResponse;
use Webauthn\AuthenticatorAttestationResponseValidator;
use Webauthn\AuthenticatorAssertionResponseValidator;
use Webauthn\PublicKeyCredentialCreationOptions;
use Webauthn\PublicKeyCredentialDescriptor;
use Webauthn\PublicKeyCredentialRequestOptions;
use Webauthn\PublicKeyCredentialParameters;
use Webauthn\PublicKeyCredentialRpEntity;
use Webauthn\PublicKeyCredentialLoader;
use Webauthn\PublicKeyCredentialSource;
use Webauthn\PublicKeyCredentialUserEntity;
use Webauthn\TrustPath\EmptyTrustPath;
use Symfony\Component\Uid\Uuid;

final class PasskeyService
{
    private readonly PublicKeyCredentialLoader $credentialLoader;
    private readonly AuthenticatorAssertionResponseValidator $assertionValidator;
    private readonly AuthenticatorAttestationResponseValidator $attestationValidator;

    public function __construct(
        private readonly PasskeyRepository $passkeyRepository,
        private readonly PasskeyChallengeRepository $challengeRepository,
        private readonly MfaRepository $mfaRepository,
        private readonly string $rpId,
        private readonly string $origin,
        private readonly int $timeout = 60000
    ) {
        $attestationManager = new AttestationStatementSupportManager([
            new NoneAttestationStatementSupport(),
        ]);
        $loader = new AttestationObjectLoader($attestationManager);
        $this->credentialLoader = new PublicKeyCredentialLoader($loader);
        $this->assertionValidator = AuthenticatorAssertionResponseValidator::create();
        $this->attestationValidator = AuthenticatorAttestationResponseValidator::create();
    }

    public function createAttestationOptions(int $accountId, string $username, string $displayName): array
    {
        $challenge = random_bytes(32);
        $rpName = getenv('WEB_AUTHN_RP_NAME') ?: 'MediaPrint ERP';
        $rp = PublicKeyCredentialRpEntity::create($rpName, $this->rpId);

        $safeUsername = $username !== '' ? $username : $displayName;
        $safeDisplayName = $displayName !== '' ? $displayName : $safeUsername;
        $user = PublicKeyCredentialUserEntity::create($safeUsername, (string) $accountId, $safeDisplayName);

        $params = [
            PublicKeyCredentialParameters::create('public-key', -7),
            PublicKeyCredentialParameters::create('public-key', -257),
        ];

        $exclude = [];
        $rows = $this->passkeyRepository->listForAccount($accountId);
        foreach ($rows as $row) {
            $transports = [];
            if (!empty($row['transports'])) {
                $transports = array_filter(explode(',', $row['transports']), static fn ($v) => $v !== '');
            }
            $exclude[] = PublicKeyCredentialDescriptor::create('public-key', $row['credential_id'], $transports);
        }

        $options = PublicKeyCredentialCreationOptions::create(
            $rp,
            $user,
            $challenge,
            $params,
            timeout: $this->timeout,
            excludeCredentials: $exclude,
            attestation: PublicKeyCredentialCreationOptions::ATTESTATION_CONVEYANCE_PREFERENCE_NONE
        );

        $token = bin2hex(random_bytes(32));
        $expires = (new DateTimeImmutable('now'))->modify('+1 minute');
        $this->challengeRepository->storeChallenge(
            $accountId,
            $token,
            $challenge,
            'attestation',
            $expires
        );

        return [
            'challenge_token' => $token,
            'publicKey' => $options->jsonSerialize(),
        ];
    }

    public function createAssertionOptions(string $mfaToken): array
    {
        $session = $this->mfaRepository->getSession($mfaToken);
        if ($session === null) {
            throw new \RuntimeException('Token MFA non valido.', 401);
        }

        return $this->createAssertionOptionsForAccount((int) $session['id_account']);
    }

    public function createAssertionOptionsForAccount(int $accountId): array
    {
        $challenge = random_bytes(32);
        $allow = [];
        $rows = $this->passkeyRepository->listForAccount($accountId);
        foreach ($rows as $row) {
            $transports = [];
            if (!empty($row['transports'])) {
                $transports = array_filter(explode(',', $row['transports']), static fn ($v) => $v !== '');
            }
            $allow[] = PublicKeyCredentialDescriptor::create('public-key', $row['credential_id'], $transports);
        }

        $options = PublicKeyCredentialRequestOptions::create(
            $challenge,
            $this->rpId,
            $allow,
            PublicKeyCredentialRequestOptions::USER_VERIFICATION_REQUIREMENT_PREFERRED,
            $this->timeout
        );

        $token = bin2hex(random_bytes(32));
        $expires = (new DateTimeImmutable('now'))->modify('+1 minute');
        $this->challengeRepository->storeChallenge(
            $accountId,
            $token,
            $challenge,
            'assertion',
            $expires
        );

        return [
            'challenge_token' => $token,
            'publicKey' => $options->jsonSerialize(),
        ];
    }

    public function verifyAttestation(int $accountId, string $challengeToken, array $credential, string $username, string $displayName): PublicKeyCredentialSource
    {
        $challenge = $this->challengeRepository->consumeChallenge($challengeToken, 'attestation');
        if ($challenge === null) {
            throw new \RuntimeException('Challenge WebAuthn scaduto o non valido.', 401);
        }
        if ((int) $challenge['id_account'] !== $accountId) {
            throw new \RuntimeException('Challenge non valido per account.', 403);
        }

        $publicKeyCredential = $this->credentialLoader->loadArray($credential);
        if (!($publicKeyCredential->response instanceof AuthenticatorAttestationResponse)) {
            throw new \RuntimeException('Risposta attestation non valida.', 422);
        }

        $rpName = getenv('WEB_AUTHN_RP_NAME') ?: 'MediaPrint ERP';
        $rp = PublicKeyCredentialRpEntity::create($rpName, $this->rpId);
        $safeUsername = $username !== '' ? $username : $displayName;
        $safeDisplayName = $displayName !== '' ? $displayName : $safeUsername;
        $user = PublicKeyCredentialUserEntity::create($safeUsername, (string) $accountId, $safeDisplayName);
        $params = [
            PublicKeyCredentialParameters::create('public-key', -7),
            PublicKeyCredentialParameters::create('public-key', -257),
        ];
        $options = PublicKeyCredentialCreationOptions::create(
            $rp,
            $user,
            $challenge['challenge'],
            $params,
            timeout: $this->timeout,
            attestation: PublicKeyCredentialCreationOptions::ATTESTATION_CONVEYANCE_PREFERENCE_NONE
        );

        return $this->attestationValidator->check($publicKeyCredential->response, $options, $this->rpId);
    }

    public function verifyAssertion(string $mfaToken, string $challengeToken, array $credential): int
    {
        $session = $this->mfaRepository->getSession($mfaToken);
        if ($session === null) {
            throw new \RuntimeException('Token MFA non valido.', 401);
        }

        $challenge = $this->challengeRepository->consumeChallenge($challengeToken, 'assertion');
        if ($challenge === null) {
            throw new \RuntimeException('Challenge WebAuthn scaduto o non valido.', 401);
        }
        $publicKeyCredential = $this->credentialLoader->loadArray($credential);
        $descriptor = $publicKeyCredential->getPublicKeyCredentialDescriptor();
        $source = $this->passkeyRepository->findOneByCredentialId($descriptor->id);
        if ($source === null) {
            throw new \RuntimeException('Credenziale passkey non riconosciuta.', 401);
        }

        $options = PublicKeyCredentialRequestOptions::create(
            $challenge['challenge'],
            $this->rpId,
            [$descriptor],
            PublicKeyCredentialRequestOptions::USER_VERIFICATION_REQUIREMENT_PREFERRED,
            $this->timeout
        );

        $this->assertionValidator->check(
            $source,
            $publicKeyCredential->response,
            $options,
            $this->origin,
            $source->userHandle
        );

        $this->passkeyRepository->saveCredentialSource($source);

        $accountId = (int) $session['id_account'];
        $this->mfaRepository->consumeSession($mfaToken);

        return $accountId;
    }

    public function verifyAssertionForAccount(int $accountId, string $challengeToken, array $credential): void
    {
        $challenge = $this->challengeRepository->consumeChallenge($challengeToken, 'assertion');
        if ($challenge === null) {
            throw new \RuntimeException('Challenge WebAuthn scaduto o non valido.', 401);
        }
        if ((int) $challenge['id_account'] !== $accountId) {
            throw new \RuntimeException('Challenge non valido per account.', 403);
        }
        $publicKeyCredential = $this->credentialLoader->loadArray($credential);
        $descriptor = $publicKeyCredential->getPublicKeyCredentialDescriptor();
        $source = $this->passkeyRepository->findOneByCredentialId($descriptor->id);
        if ($source === null) {
            throw new \RuntimeException('Credenziale passkey non riconosciuta.', 401);
        }

        $options = PublicKeyCredentialRequestOptions::create(
            $challenge['challenge'],
            $this->rpId,
            [$descriptor],
            PublicKeyCredentialRequestOptions::USER_VERIFICATION_REQUIREMENT_PREFERRED,
            $this->timeout
        );

        $this->assertionValidator->check(
            $source,
            $publicKeyCredential->response,
            $options,
            $this->origin,
            $source->userHandle
        );

        $this->passkeyRepository->saveCredentialSource($source);
    }
}
