-- Manual migration to safely remove old chat tables and add new group chat tables
-- This will preserve ALL your data (users, orders, products, settlements, etc.)
-- Only chat data will be removed

-- Step 1: Drop old chat tables (this only affects chat data)
DROP TABLE IF EXISTS "chat_messages" CASCADE;
DROP TABLE IF EXISTS "chat_participants" CASCADE;
DROP TABLE IF EXISTS "chat_rooms" CASCADE;

-- Step 2: Drop old chat enums
DROP TYPE IF EXISTS "chat_room_type";
DROP TYPE IF EXISTS "message_status";

-- Step 3: Update message_type enum (remove AUDIO and VOICE_NOTE)
-- First, check if any messages use these types (there shouldn't be any since we dropped the table)
-- Then recreate the enum with only the values we need
DROP TYPE IF EXISTS "message_type";
CREATE TYPE "message_type" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'FILE');

-- Step 4: Create new group chat tables
CREATE TABLE "group_chat" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Global Chat',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_message_at" TIMESTAMP(3),

    CONSTRAINT "group_chat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "group_participants" (
    "id" SERIAL NOT NULL,
    "group_chat_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "last_read_at" TIMESTAMP(3),
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "group_messages" (
    "id" SERIAL NOT NULL,
    "group_chat_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "content" TEXT,
    "message_type" "message_type" NOT NULL DEFAULT 'TEXT',
    "file_url" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinned_by" INTEGER,
    "pinned_at" TIMESTAMP(3),
    "reactions" JSONB,
    "reply_to_id" INTEGER,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_messages_pkey" PRIMARY KEY ("id")
);

-- Step 5: Create unique constraints
CREATE UNIQUE INDEX "group_participants_group_chat_id_user_id_key" ON "group_participants"("group_chat_id", "user_id");

-- Step 6: Create indexes for performance
CREATE INDEX "group_participants_user_id_idx" ON "group_participants"("user_id");
CREATE INDEX "group_participants_group_chat_id_idx" ON "group_participants"("group_chat_id");
CREATE INDEX "group_messages_group_chat_id_created_at_idx" ON "group_messages"("group_chat_id", "created_at");
CREATE INDEX "group_messages_sender_id_idx" ON "group_messages"("sender_id");
CREATE INDEX "group_messages_is_deleted_idx" ON "group_messages"("is_deleted");
CREATE INDEX "group_messages_is_pinned_idx" ON "group_messages"("is_pinned");

-- Step 7: Add foreign key constraints
ALTER TABLE "group_participants" ADD CONSTRAINT "group_participants_group_chat_id_fkey" FOREIGN KEY ("group_chat_id") REFERENCES "group_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_participants" ADD CONSTRAINT "group_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_group_chat_id_fkey" FOREIGN KEY ("group_chat_id") REFERENCES "group_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_pinned_by_fkey" FOREIGN KEY ("pinned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "group_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Verification: Check that all important tables still exist
SELECT 'Users table exists' as check, COUNT(*) as count FROM users
UNION ALL
SELECT 'Products table exists', COUNT(*) FROM products
UNION ALL
SELECT 'Order requests table exists', COUNT(*) FROM order_requests
UNION ALL
SELECT 'Settlements table exists', COUNT(*) FROM settlements
UNION ALL
SELECT 'Group chat table created', COUNT(*) FROM group_chat;
