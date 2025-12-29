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
        $threadIds = [];
        foreach ($threads as $thread) {
            $threadIds[] = (int) ($thread['id_thread'] ?? 0);
        }
        $participantsByThread = $this->repository->listParticipantsForThreads(
            array_values(array_filter($threadIds, static fn(int $id): bool => $id > 0)),
            $accountId
        );
        $output = [];
        foreach ($threads as $thread) {
            $threadId = (int) ($thread['id_thread'] ?? 0);
            $participantRows = $participantsByThread[$threadId] ?? [];
            $participants = [];
            foreach ($participantRows as $row) {
                $participants[] = $this->normalizeAccount($row);
            }
            $primaryParticipant = count($participants) === 1 ? $participants[0] : null;
            $output[] = [
                'id' => $threadId,
                'createdAt' => (string) ($thread['created_at'] ?? ''),
                'lastMessageAt' => $thread['last_message_at'] ?? null,
                'unreadCount' => (int) ($thread['unread_count'] ?? 0),
                'participants' => $participants,
                'participant' => $primaryParticipant,
                'isGroup' => count($participants) > 1,
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
    public function createThread(int $accountId, array $otherAccountIds): array
    {
        $otherIds = $this->normalizeParticipantIds($accountId, $otherAccountIds);
        if ($otherIds === []) {
            throw new RuntimeException('Seleziona almeno un account valido.', 422);
        }

        $allIds = array_values(array_unique(array_merge([$accountId], $otherIds)));
        $accounts = [];
        foreach ($allIds as $id) {
            $accounts[$id] = $this->requireActiveAccount($id);
        }

        $this->assertAllowedParticipants($accounts);

        $pairKey = count($allIds) === 2
            ? $this->buildPairKey($allIds[0], $allIds[1])
            : $this->buildGroupKey($allIds);

        $existing = $this->repository->findThreadByPairKey($pairKey);
        $participants = [];
        foreach ($otherIds as $id) {
            $participants[] = $this->normalizeAccount($accounts[$id]);
        }

        if ($existing !== null) {
            return [
                'id' => $existing,
                'participants' => $participants,
                'participant' => count($participants) === 1 ? $participants[0] : null,
                'isGroup' => count($participants) > 1,
                'existing' => true,
            ];
        }

        $threadId = $this->repository->createThread($pairKey, $accountId);
        $this->repository->addParticipants($threadId, $allIds);

        return [
            'id' => $threadId,
            'participants' => $participants,
            'participant' => count($participants) === 1 ? $participants[0] : null,
            'isGroup' => count($participants) > 1,
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

        $otherReadAt = $this->repository->getOtherParticipantsReadAt($threadId, $accountId);
        $rows = $this->repository->listMessages($threadId, $limit, $beforeId);
        $messages = [];
        foreach ($rows as $row) {
            $messages[] = $this->normalizeMessage($row, $accountId, $otherReadAt);
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
        if (count($participants) < 2) {
            throw new RuntimeException('Conversazione non valida.', 422);
        }

        $accounts = [];
        foreach ($participants as $participantId) {
            $accounts[$participantId] = $this->requireActiveAccount($participantId);
        }
        $this->assertAllowedParticipants($accounts);

        if (!isset($accounts[$accountId])) {
            throw new RuntimeException('Account non valido o disattivato.', 404);
        }

        $messageId = $this->repository->insertMessage($threadId, $accountId, $trimmed);
        $this->repository->updateThreadLastMessageAt($threadId);
        $this->repository->markThreadRead($threadId, $accountId);

        $messageRow = $this->repository->getMessage($messageId);
        $otherReadAt = $this->repository->getOtherParticipantsReadAt($threadId, $accountId);
        $message = $messageRow ? $this->normalizeMessage($messageRow, $accountId, $otherReadAt) : null;

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
     * @param list<int> $accountIds
     */
    private function buildGroupKey(array $accountIds): string
    {
        $ids = array_values(array_unique(array_filter($accountIds, static fn(int $id): bool => $id > 0)));
        sort($ids, SORT_NUMERIC);
        return 'g:' . implode('-', $ids);
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
    private function normalizeMessage(array $row, ?int $viewerAccountId = null, ?string $otherReadAt = null): array
    {
        $senderId = (int) ($row['id_account'] ?? 0);
        $isOwn = $viewerAccountId !== null && $senderId === $viewerAccountId;
        $isRead = false;
        if ($isOwn && $otherReadAt) {
            $messageTime = strtotime((string) ($row['created_at'] ?? ''));
            $readTime = strtotime($otherReadAt);
            if ($messageTime !== false && $readTime !== false) {
                $isRead = $messageTime <= $readTime;
            }
        }
        return [
            'id' => (int) ($row['id_message'] ?? 0),
            'threadId' => (int) ($row['id_thread'] ?? 0),
            'sender' => [
                'id' => $senderId,
                'username' => (string) ($row['sender_username'] ?? ''),
                'accountType' => (string) ($row['sender_account_type'] ?? ''),
                'roleCode' => (string) ($row['sender_role_code'] ?? ''),
                'roleLabel' => (string) ($row['sender_role_label'] ?? ''),
            ],
            'body' => (string) ($row['body'] ?? ''),
            'createdAt' => (string) ($row['created_at'] ?? ''),
            'isRead' => $isRead,
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
        $roleLabel = strtolower((string) ($account['role_label'] ?? ''));
        $type = strtolower((string) ($account['account_type'] ?? ''));

        if ($role === 'cliente' || $type === 'cliente') {
            return 'cliente';
        }
        if ($role === 'admin' || $role === 'amministratore' || str_contains($roleLabel, 'admin')) {
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
        if ($leftCategory === 'admin' || $rightCategory === 'admin') {
            return true;
        }
        if ($leftCategory === 'operatore' && in_array($rightCategory, ['operatore', 'admin', 'cliente'], true)) {
            return true;
        }
        if ($rightCategory === 'operatore' && in_array($leftCategory, ['operatore', 'admin', 'cliente'], true)) {
            return true;
        }
        return false;
    }

    /**
     * @param array<int, array<string, mixed>> $accounts
     */
    private function assertAllowedParticipants(array $accounts): void
    {
        $ids = array_keys($accounts);
        $count = count($ids);
        for ($i = 0; $i < $count; $i++) {
            $left = $accounts[$ids[$i]];
            $leftCategory = $this->classifyAccount($left);
            for ($j = $i + 1; $j < $count; $j++) {
                $right = $accounts[$ids[$j]];
                $rightCategory = $this->classifyAccount($right);
                if (!$this->isAllowedPair($leftCategory, $rightCategory)) {
                    throw new RuntimeException('La chat tra questi account non e\' consentita.', 403);
                }
            }
        }
    }

    /**
     * @param list<int|string> $participantIds
     * @return list<int>
     */
    private function normalizeParticipantIds(int $accountId, array $participantIds): array
    {
        $ids = [];
        foreach ($participantIds as $id) {
            $value = (int) $id;
            if ($value > 0 && $value !== $accountId) {
                $ids[] = $value;
            }
        }
        return array_values(array_unique($ids));
    }
}
