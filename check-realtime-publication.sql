-- Check if messages table is in the realtime publication
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('messages', 'conversations', 'conversation_participants')
ORDER BY tablename;
