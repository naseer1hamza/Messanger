-- Add tables to realtime publication
-- This enables Realtime broadcasts for these tables

-- Add messages table to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Optional: Also add these for conversation list updates
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;

-- Verify it worked
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('messages', 'conversations', 'conversation_participants')
ORDER BY tablename;
