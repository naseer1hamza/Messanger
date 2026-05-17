-- Diagnostic SQL Script
-- Run this in your Supabase SQL Editor

-- Replace this with your actual user ID from the debug box
-- (the one that shows: Auth User: 059e0b4d-ef36-4d95-bae6-3fc6d3017511)
\set user_id '059e0b4d-ef36-4d95-bae6-3fc6d3017511'

-- 1. Check if user exists in profiles
SELECT 'User profile:' as check_type;
SELECT id, username, display_name, avatar_url 
FROM profiles 
WHERE id = :'user_id';

-- 2. Check conversation_participants for this user
SELECT '
Conversation participations:' as check_type;
SELECT * 
FROM conversation_participants 
WHERE user_id = :'user_id';

-- 3. Check all conversations this user is part of
SELECT '
Conversations:' as check_type;
SELECT c.* 
FROM conversations c
WHERE EXISTS (
  SELECT 1 FROM conversation_participants cp
  WHERE cp.conversation_id = c.id
    AND cp.user_id = :'user_id'
);

-- 4. Check all participants in those conversations
SELECT '
All participants in my conversations:' as check_type;
SELECT cp.*, p.username, p.display_name
FROM conversation_participants cp
JOIN profiles p ON p.id = cp.user_id
WHERE cp.conversation_id IN (
  SELECT conversation_id 
  FROM conversation_participants 
  WHERE user_id = :'user_id'
);

-- 5. Check messages in those conversations
SELECT '
Messages in my conversations:' as check_type;
SELECT m.id, m.conversation_id, m.content, m.sender_id, m.created_at, p.username as sender_username
FROM messages m
JOIN profiles p ON p.id = m.sender_id
WHERE m.conversation_id IN (
  SELECT conversation_id 
  FROM conversation_participants 
  WHERE user_id = :'user_id'
)
ORDER BY m.created_at DESC
LIMIT 10;

-- 6. Check RLS policies are enabled
SELECT '
RLS Status:' as check_type;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages');

-- 7. List all RLS policies
SELECT '
RLS Policies:' as check_type;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename, policyname;
