-- Migration: aggiunge il supporto per WebAuthn/passkey
ALTER TABLE auth_account_passkeys
    ADD COLUMN `attestation_type` VARCHAR(64) NOT NULL DEFAULT 'none',
    ADD COLUMN `aaguid` VARCHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ADD COLUMN `user_handle` VARBINARY(64) NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS auth_mfa_passkey_challenges (
    id_challenge BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    id_account BIGINT(20) UNSIGNED NOT NULL,
    token VARBINARY(64) NOT NULL,
    challenge VARBINARY(64) NOT NULL,
    type ENUM('assertion','attestation') NOT NULL DEFAULT 'assertion',
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_challenge),
    UNIQUE KEY idx_passkey_challenge_token (token),
    KEY idx_passkey_challenge_account (id_account),
    CONSTRAINT fk_passkey_challenge_account FOREIGN KEY (id_account) REFERENCES auth_accounts(id_account) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
