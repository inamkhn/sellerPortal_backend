-- Add indexes for chat performance optimization

-- Index for chat room queries by type and lastMessageAt
CREATE INDEX IF NOT EXISTS "idx_chat_room_type_last_message" ON "ChatRoom"("type", "lastMessageAt" DESC);

-- Index for chat participants by userId and chatRoomId
CREATE INDEX IF NOT EXISTS "idx_chat_participant_user_room" ON "ChatParticipant"("userId", "chatRoomId");

-- Index for chat participants by chatRoomId (for room access checks)
CREATE INDEX IF NOT EXISTS "idx_chat_participant_room" ON "ChatParticipant"("chatRoomId");

-- Index for chat messages by chatRoomId and createdAt
CREATE INDEX IF NOT EXISTS "idx_chat_message_room_created" ON "ChatMessage"("chatRoomId", "createdAt" DESC) WHERE "isDeleted" = false;

-- Index for chat messages by senderId
CREATE INDEX IF NOT EXISTS "idx_chat_message_sender" ON "ChatMessage"("senderId");

-- Index for chat messages content search
CREATE INDEX IF NOT EXISTS "idx_chat_message_content" ON "ChatMessage" USING gin(to_tsvector('english', "content")) WHERE "isDeleted" = false;

-- Index for referrals by referrerId and refereeId
CREATE INDEX IF NOT EXISTS "idx_referral_referrer_referee" ON "Referral"("referrerId", "refereeId");

-- Index for chat room by referralId
CREATE INDEX IF NOT EXISTS "idx_chat_room_referral" ON "ChatRoom"("referralId") WHERE "referralId" IS NOT NULL;

-- Index for user search fields
CREATE INDEX IF NOT EXISTS "idx_user_search" ON "User"("firstName", "lastName", "email");

-- Index for user by role and lastLogin
CREATE INDEX IF NOT EXISTS "idx_user_role_login" ON "User"("role", "lastLogin" DESC NULLS LAST);

-- Composite index for chat participant unread count queries
CREATE INDEX IF NOT EXISTS "idx_chat_participant_unread" ON "ChatParticipant"("chatRoomId", "userId", "unreadCount") WHERE "unreadCount" > 0;
