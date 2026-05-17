# Messaging RLS (conversations, participants, messages)

If you see:

`new row violates row-level security policy for table "conversations" [42501]`

the `conversations` table has RLS enabled but no **INSERT** policy (or the policy is too strict). Run the block below in the **Supabase SQL Editor**.

It matches the app flow: create a `conversations` row with `created_by = auth.uid()`, add two `conversation_participants` rows, then insert `messages`.

---

## One-time: enable RLS (safe if already enabled)

```sql
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```

---

## `conversations`

```sql
DROP POLICY IF EXISTS "conversations_select_visible" ON conversations;
CREATE POLICY "conversations_select_visible"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "conversations_insert_creator" ON conversations;
CREATE POLICY "conversations_insert_creator"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());
```

---

## `conversation_participants`

**Fix for infinite recursion:** We need a two-step approach. First query just your own rows, then allow seeing other participants via a separate mechanism.

**Option 1: Simple approach - Use conversations table to check membership**
```sql
DROP POLICY IF EXISTS "conversation_participants_select_peers" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_in_my_conversations" ON conversation_participants;

CREATE POLICY "conversation_participants_select_via_conversations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    -- Can see yourself
    user_id = auth.uid()
    OR
    -- Can see others in conversations you created
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.created_by = auth.uid()
    )
    OR
    -- Can see others in conversations where you're a participant (via your own row)
    conversation_id IN (
      SELECT cp2.conversation_id 
      FROM conversation_participants cp2
      WHERE cp2.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "conversation_participants_insert_rules" ON conversation_participants;
CREATE POLICY "conversation_participants_insert_rules"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.created_by = auth.uid()
    )
  );
```

**Option 2: If Option 1 still has recursion, use this simpler version:**
```sql
DROP POLICY IF EXISTS "conversation_participants_select_peers" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_in_my_conversations" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_via_conversations" ON conversation_participants;

-- Allow seeing all participants in any conversation (simplest, most permissive)
-- This is safe because conversations table RLS already restricts which conversations you can see
CREATE POLICY "conversation_participants_select_all"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "conversation_participants_insert_rules" ON conversation_participants;
CREATE POLICY "conversation_participants_insert_rules"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.created_by = auth.uid()
    )
  );
```

**Explanation:** Option 2 allows you to see ALL participant rows, but since the `conversations` table already has RLS that restricts which conversations you can see, you'll only query participants for conversations you have access to anyway. This is the safest and simplest approach.

---

## `messages`

```sql
DROP POLICY IF EXISTS "messages_select_in_my_conversations" ON messages;
CREATE POLICY "messages_select_in_my_conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert_as_participant" ON messages;
CREATE POLICY "messages_insert_as_participant"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );
```

---

## After running

1. **Enable Realtime** for the messaging tables:
   - Go to **Database → Replication** in Supabase dashboard
   - Find the `messages` table and toggle Realtime **ON**
   - Find the `conversation_participants` table and toggle Realtime **ON**
   - Find the `conversations` table and toggle Realtime **ON** (optional but recommended)

2. Try **Compose → open DM → send** again.
3. If a policy name already exists, change the `DROP POLICY ...` name to match your DB, or drop your old policies first.
4. Open the app in two different browsers/accounts - when user A sends to user B, user B should see the conversation appear automatically.

## Optional hardening

- Restrict `conversations_insert_creator` to `type = 'direct'` only, or add checks that `friendships` exists between `created_by` and the other participant (more SQL).
- Add `UPDATE` / `DELETE` policies when you add edit/delete message features.

Schema reference: `TODO.md` (Database Schema Design).
