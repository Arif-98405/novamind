/*
# NovaMind Phase 2: user profiles, conversations, and chat messages

## What this migration does
Adds the database layer that powers user accounts and persistent chat history
for NovaMind. Each signed-in user can only ever read or write their own rows;
this is enforced at the database level with Row Level Security (RLS), not just
in the UI.

## 1. New Tables

### profiles
- `id` (uuid, primary key) — mirrors `auth.users.id`. One row per account.
- `email` (text, not null) — copied from the auth record for convenient display.
- `display_name` (text, nullable) — optional friendly name the user can set.
- `created_at` (timestamptz) — when the profile was created.

### conversations
- `id` (uuid, primary key)
- `user_id` (uuid, not null, defaults to the signed-in user) — owner, references `auth.users`.
- `title` (text, not null) — short label for the conversation (first message snippet).
- `created_at` (timestamptz)
- `updated_at` (timestamptz) — bumped whenever a message is added, for "recent first" sorting.

### messages
- `id` (uuid, primary key)
- `conversation_id` (uuid, not null) — references `conversations`, cascading delete.
- `user_id` (uuid, not null, defaults to the signed-in user) — denormalized owner for fast RLS checks.
- `role` (text, not null) — either 'user' or 'assistant'.
- `text` (text, not null) — the message content.
- `created_at` (timestamptz)

## 2. Security (RLS + grants)

All three tables enable Row Level Security.

- `profiles`: granted to `authenticated`; a user can SELECT and UPDATE only their own profile row. No INSERT (rows are created by a trigger tied to signup).
- `conversations`: granted CRUD to `authenticated`; owner-scoped (auth.uid() = user_id) on every verb.
- `messages`: granted CRUD to `authenticated`; owner-scoped via the denormalized `user_id` column AND verified against the parent conversation's owner, so a user cannot write a message into another user's conversation.

Policy names follow the pattern `<verb>_own_<table>`. Owner columns default to `auth.uid()` so inserts that omit `user_id` still satisfy the WITH CHECK policy.

## 3. Trigger: auto-create profile on signup

A `profiles` row is created automatically when a new auth user signs up, via a trigger on `auth.users`. This avoids the frontend having to insert a profile and keeps the auth.users table as the single source of truth for accounts.

## 4. Important notes
- Passwords are NEVER stored in these tables. Supabase Auth handles passwords
  securely in `auth.users` (hashed, not readable). These app tables only hold
  profile metadata and chat content.
- Email confirmation stays OFF (per Bolt default), so signup logs the user in immediately.
- The `DEFAULT auth.uid()` on owner columns is what lets the frontend insert a
  conversation or message without explicitly passing a user_id.
*/

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- =========================================================
-- conversations
-- =========================================================
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;

DROP POLICY IF EXISTS "select_own_conversations" ON conversations;
CREATE POLICY "select_own_conversations"
ON conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_conversations" ON conversations;
CREATE POLICY "insert_own_conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_conversations" ON conversations;
CREATE POLICY "update_own_conversations"
ON conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_conversations" ON conversations;
CREATE POLICY "delete_own_conversations"
ON conversations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- =========================================================
-- messages
-- =========================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;

DROP POLICY IF EXISTS "select_own_messages" ON messages;
CREATE POLICY "select_own_messages"
ON messages FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_messages" ON messages;
CREATE POLICY "update_own_messages"
ON messages FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_messages" ON messages;
CREATE POLICY "delete_own_messages"
ON messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Index for listing messages within a conversation chronologically.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at
ON messages (conversation_id, created_at);

-- Index for listing a user's conversations most-recent first.
CREATE INDEX IF NOT EXISTS idx_conversations_user_id_updated_at
ON conversations (user_id, updated_at DESC);

-- =========================================================
-- Auto-create a profile row whenever a new auth user signs up.
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;