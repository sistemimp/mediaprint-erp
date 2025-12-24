<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\InstantMessagingRepository;
use RuntimeException;

final class InstantMessagingService
{
    public function __construct(private readonly InstantMessagingRepository $repository)
    {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listAccounts(int $accountId): array
    {
        $self = $this->requireActiveAccount($accountId);
        $selfCategory = $this->classifyAccount($self);
        $targets = $this->repository->listActiveAccountsExcept($accountId);

        $allowed = [];
        foreach ($targets as $candidate) {
            $candidateCategory = $this->classifyAccount($candidate);
            if ($this->isAllowedPair($selfCategory, $candidateCategory)) {
                $allowed[] = $this->normalizeAccount($candidate);
            }
        }
        return $allowed;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listThreads(int $accountId): array
    {
        $this->requireActiveAccount($accountId);
        $threads = $this->repository->listThreadsForAccount($accountId);
        $output = [];
        foreach ($threads as $thread) {
            $output[] = [
                'id' => (int) $thread['id_thread'],
                'createdAt' => (string) ($thread['created_at'] ?? ''),
                'lastMessageAt' => $thread['last_message_at'] ?? null,
                'unreadCount' => (int) ($thread['unread_count'] ?? 0),
                'participant' => [
                    'id' => (int) ($thread['other_account_id'] ?? 0),
                    'username' => (string) ($thread['other_username'] ?? ''),
                    'accountType' => (string) ($thread['other_account_type'] ?? ''),
                    'roleCode' => (string) ($thread['other_role_code'] ?? ''),
                    'roleLabel' => (string) ($thread['other_role_label'] ?? ''),
                ],
                'lastMessage' => [
                    'id' => isset($thread['last_message_id']) ? (int) $thread['last_message_id'] : null,
                    'body' => $thread['last_message_body'] ?? null,
                    'createdAt' => $thread['last_message_created_at'] ?? null,
                ],
            ];
        }
        return $output;
    }

    /**
     * @return array<string, mixed>
     */
    public function createThread(int $accountId, int $otherAccountId): array
    {
        if ($accountId === $otherAccountId) {
            throw new RuntimeException('Impossibile creare chat con lo stesso account.', 422);
        }

        $self = $this->requireActiveAccount($accountId);
        $other = $this->requireActiveAccount($otherAccountId);
        $selfCategory = $this->classifyAccount($self);
        $otherCategory = $this->classifyAccount($other);

        if (!$this->isAllowedPair($selfCategory, $otherCategory)) {
            throw new RuntimeException('La chat tra questi account non e\' consentita.', 403);
        }

        $pairKey = $this->buildPairKey($accountId, $otherAccountId);
        $existing = $this->repository->findThreadByPairKey($pairKey);
        if ($existing !== null) {
            return [
                'id' => $existing,
                'participant' => $this->normalizeAccount($other),
                'existing' => true,
            ];
        }

        $threadId = $this->repository->createThread($pairKey, $accountId);
        $this->repository->addParticipants($threadId, [$accountId, $otherAccountId]);

        return [
            'id' => $threadId,
            'participant' => $this->normalizeAccount($other),
            'existing' => false,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listMessages(int $accountId, int $threadId, int $limit = 200, ?int $beforeId = null): array
    {
        if (!$this->repository->isParticipant($threadId, $accountId)) {
            throw new RuntimeException('Accesso non consentito alla conversazione.', 403);
        }

        $rows = $this->repository->listMessages($threadId, $limit, $beforeId);
        $messages = [];
        foreach ($rows as $row) {
            $messages[] = $this->normalizeMessage($row);
        }
        return $messages;
    }

    /**
     * @return array<string, mixed>
     */
    public function sendMessage(int $accountId, int $threadId, string $body): array
    {
        $trimmed = trim($body);
        if ($trimmed === '') {
            throw new RuntimeException('Messaggio vuoto.', 422);
        }

        if (!$this->repository->isParticipant($threadId, $accountId)) {
            throw new RuntimeException('Accesso non consentito alla conversazione.', 403);
        }

        $participants = $this->repository->listThreadParticipants($threadId);
        if (count($participants) !== 2) {
            throw new RuntimeException('Conversazione non valida.', 422);
        }

        $self = $this->requireActiveAccount($accountId);
        $otherId = $participants[0] === $accountId ? $participants[1] : $participants[0];
        $other = $this->requireActiveAccount($otherId);
        if (!$this->isAllowedPair($this->classifyAccount($self), $this->classifyAccount($other))) {
            throw new RuntimeException('La chat tra questi account non e\' consentita.', 403);
        }

        $messageId = $this->repository->insertMessage($threadId, $accountId, $trimmed);
        $this->repository->updateThreadLastMessageAt($threadId);
        $this->repository->markThreadRead($threadId, $accountId);

        $messageRow = $this->repository->getMessage($messageId);
        $message = $messageRow ? $this->normalizeMessage($messageRow) : null;

        return [
            'message_id' => $messageId,
            'thread_id' => $threadId,
            'participants' => $participants,
            'message' => $message,
        ];
    }

    public function markRead(int $accountId, int $threadId): void
    {
        if (!$this->repository->isParticipant($threadId, $accountId)) {
            throw new RuntimeException('Accesso non consentito alla conversazione.', 403);
        }
        $this->repository->markThreadRead($threadId, $accountId);
    }

    private function buildPairKey(int $accountId, int $otherAccountId): string
    {
        $a = min($accountId, $otherAccountId);
        $b = max($accountId, $otherAccountId);
        return $a . '-' . $b;
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeAccount(array $account): array
    {
        return [
            'id' => (int) ($account['id_account'] ?? 0),
            'username' => (string) ($account['username'] ?? ''),
            'email' => $account['email'] ?? null,
            'accountType' => (string) ($account['account_type'] ?? ''),
            'roleCode' => (string) ($account['role_code'] ?? ''),
            'roleLabel' => (string) ($account['role_label'] ?? ''),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeMessage(array $row): array
    {
        return [
            'id' => (int) ($row['id_message'] ?? 0),
            'threadId' => (int) ($row['id_thread'] ?? 0),
            'sender' => [
                'id' => (int) ($row['id_account'] ?? 0),
                'username' => (string) ($row['sender_username'] ?? ''),
                'accountType' => (string) ($row['sender_account_type'] ?? ''),
                'roleCode' => (string) ($row['sender_role_code'] ?? ''),
                'roleLabel' => (string) ($row['sender_role_label'] ?? ''),
            ],
            'body' => (string) ($row['body'] ?? ''),
            'createdAt' => (string) ($row['created_at'] ?? ''),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function requireActiveAccount(int $accountId): array
    {
        $account = $this->repository->getAccountSummary($accountId);
        if (!$account || (int) ($account['is_active'] ?? 0) !== 1) {
            throw new RuntimeException('Account non valido o disattivato.', 404);
        }
        return $account;
    }

    private function classifyAccount(array $account): string
    {
        $role = strtolower((string) ($account['role_code'] ?? ''));
        $type = strtolower((string) ($account['account_type'] ?? ''));

        if ($role === 'cliente' || $type === 'cliente') {
            return 'cliente';
        }
        if ($role === 'admin') {
            return 'admin';
        }
        if (in_array($role, ['operatore', 'commerciale'], true)) {
            return 'operatore';
        }
        if ($type === 'operatore') {
            return 'operatore';
        }
        return 'operatore';
    }

    private function isAllowedPair(string $leftCategory, string $rightCategory): bool
    {
        if ($leftCategory === 'operatore' && in_array($rightCategory, ['operatore', 'admin', 'cliente'], true)) {
            return true;
        }
        if ($rightCategory === 'operatore' && in_array($leftCategory, ['operatore', 'admin', 'cliente'], true)) {
            return true;
        }
        return false;
    }
}
