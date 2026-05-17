-- SQL Script to Clean Up All Chat Data
-- WARNING: This will DELETE ALL your conversations, messages, and participants!
-- Use this to start fresh with a clean slate.

-- Run this in your Supabase SQL Editor

-- 1. Delete all messages (must delete first due to foreign key constraints)
DELETE FROM messages;

-- 2. Delete all conversation participants
DELETE FROM conversation_participants;

-- 3. Delete all conversations
DELETE FROM conversations;

-- 4. Optional: Reset any other chat-related tables if they exist
-- Uncomment these if you have these tables and want to clean them too:
-- DELETE FROM friendships;
-- DELETE FROM friend_requests;

-- Verify cleanup (should return 0 for all)
SELECT 'Messages remaining:' as check_type, COUNT(*) as count FROM messages
UNION ALL
SELECT 'Participants remaining:', COUNT(*) FROM conversation_participants
UNION ALL
SELECT 'Conversations remaining:', COUNT(*) FROM conversations;

-- Note: This does NOT delete user profiles or authentication data
-- Your user account remains intact, just all chat data is removed
