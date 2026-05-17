-- Diagnostic SQL Script for Supabase SQL Editor
-- Replace YOUR_USER_ID with: 059e0b4d-ef36-4d95-bae6-3fc6d3017511

-- 1. Check if user exists in profiles
SELECT '=== 1. User Profile ===' as section;
SELECT id, username, display_name, avatar_url 
FROM profiles 
WHERE id = '059e0b4d-ef36-4d95-bae6-3fc6d3017511';

-- 2. Check conversation_participants for this user (what YOU can see)
SELECT '=== 2. My Conversation Participations ===' as section;
SELECT * 
FROM conversation_participants 
WHERE user_id = '059e0b4d-ef36-4d95-bae6-3fc6d3017511';

-- 3. Check if there are ANY conversation_participants (bypassing RLS to see the truth)
-- This will fail if you run it as the user, but works as postgres admin
SELECT '=== 3. ALL Conversation Participations (Admin View) ===' as section;
-- You need to be postgres/admin to see this
-- SELECT * FROM conversation_participants;

-- 4. Check conversations table
SELECT '=== 4. Conversations I Can See ===' as section;
SELECT * FROM conversations;

-- 5. Check messages table
SELECT '=== 5. Messages I Can See ===' as section;
SELECT * FROM messages;

-- 6. Try the exact query the app uses for participations
SELECT '=== 6. App Query - Get My Conversation IDs ===' as section;
SELECT conversation_id
FROM conversation_participants
WHERE user_id = '059e0b4d-ef36-4d95-bae6-3fc6d3017511';

-- 7. Try to get conversation details
SELECT '=== 7. App Query - Get Conversation Details ===' as section;
-- First get the IDs
WITH my_conversations AS (
  SELECT conversation_id
  FROM conversation_participants
  WHERE user_id = '059e0b4d-ef36-4d95-bae6-3fc6d3017511'
)
SELECT c.id, c.type, c.name, c.avatar_url, c.created_at
FROM conversations c
WHERE c.id IN (SELECT conversation_id FROM my_conversations);

-- 8. Try to get participants with profiles
SELECT '=== 8. App Query - Get Participants with Profiles ===' as section;
WITH my_conversations AS (
  SELECT conversation_id
  FROM conversation_participants
  WHERE user_id = '059e0b4d-ef36-4d95-bae6-3fc6d3017511'
)
SELECT 
  cp.user_id,
  cp.conversation_id,
  p.id,
  p.username,
  p.display_name,
  p.avatar_url
FROM conversation_participants cp
LEFT JOIN profiles p ON p.id = cp.user_id
WHERE cp.conversation_id IN (SELECT conversation_id FROM my_conversations);

-- 9. Try to get messages
SELECT '=== 9. App Query - Get Last Messages ===' as section;
WITH my_conversations AS (
  SELECT conversation_id
  FROM conversation_participants
  WHERE user_id = '059e0b4d-ef36-4d95-bae6-3fc6d3017511'
)
SELECT 
  m.id,
  m.conversation_id,
  m.sender_id,
  m.content,
  m.type,
  m.created_at,
  p.username,
  p.display_name
FROM messages m
LEFT JOIN profiles p ON p.id = m.sender_id
WHERE m.conversation_id IN (SELECT conversation_id FROM my_conversations)
ORDER BY m.created_at DESC;

-- 10. Check RLS is enabled
SELECT '=== 10. RLS Status ===' as section;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
  AND schemaname = 'public';

-- 11. Check RLS policies
SELECT '=== 11. RLS Policies ===' as section;
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
  AND schemaname = 'public'
ORDER BY tablename, policyname;
