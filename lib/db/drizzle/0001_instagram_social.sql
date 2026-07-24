-- Migration: 0001 - Instagram social features
-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY NOT NULL,
  "username" text NOT NULL UNIQUE,
  "display_name" text NOT NULL,
  "bio" text,
  "avatar_url" text,
  "followers_count" integer NOT NULL DEFAULT 0,
  "following_count" integer NOT NULL DEFAULT 0,
  "is_private" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Add user_id to reels
ALTER TABLE "reels" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;

-- Follows table
CREATE TABLE IF NOT EXISTS "follows" (
  "follower_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "following_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("follower_id", "following_id")
);

-- Reel likes (per-user)
CREATE TABLE IF NOT EXISTS "reel_likes" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reel_id" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "reel_id")
);

-- Comments
CREATE TABLE IF NOT EXISTS "comments" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reel_id" integer NOT NULL,
  "text" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Conversations (DMs)
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_a_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "user_b_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "last_message_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "conversation_id" integer NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "read_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "actor_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "reel_id" integer,
  "text" text,
  "is_read" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Enable Realtime for messages table (run in Supabase dashboard if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
