-- Direct messaging: conversations + messages tables
-- Idempotent — safe to run when objects already exist (shared Supabase project)

-- Conversations: one row per pair of users
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count_user1 INTEGER NOT NULL DEFAULT 0,
  unread_count_user2 INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT conversations_unique_pair UNIQUE (user1_id, user2_id),
  CONSTRAINT conversations_ordered_pair CHECK (user1_id < user2_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id, last_message_at DESC);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent — skip if already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='Users can view own conversations') THEN
    CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='Users can update own conversations') THEN
    CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='Users can create conversations') THEN
    CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='Users can view messages in own conversations') THEN
    CREATE POLICY "Users can view messages in own conversations" ON messages FOR SELECT USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='Users can send messages in own conversations') THEN
    CREATE POLICY "Users can send messages in own conversations" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())));
  END IF;
END $$;

-- Atomic unread increment function
CREATE OR REPLACE FUNCTION increment_unread(
  p_conversation_id UUID,
  p_column TEXT
) RETURNS VOID AS $$
BEGIN
  IF p_column = 'unread_count_user1' THEN
    UPDATE conversations
    SET unread_count_user1 = unread_count_user1 + 1
    WHERE id = p_conversation_id;
  ELSIF p_column = 'unread_count_user2' THEN
    UPDATE conversations
    SET unread_count_user2 = unread_count_user2 + 1
    WHERE id = p_conversation_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime (ignore if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
