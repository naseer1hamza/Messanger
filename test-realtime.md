# Testing Real-time Chat

## Prerequisites - Enable Realtime in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Replication**
3. Find the `messages` table in the list
4. Make sure the toggle for `messages` is **enabled** (green)
5. Do the same for `conversations` and `conversation_participants` tables

## How the Real-time System Works

Your app already has real-time subscriptions set up:

### For Messages (Already Implemented ✅)
- Location: `src/composables/useConversationMessages.ts` lines 199-215
- Subscribes to changes on the `messages` table filtered by conversation ID
- When any INSERT/UPDATE/DELETE happens, it automatically reloads all messages

### For Conversations List (Already Implemented ✅)
- Location: `src/composables/useConversationsList.ts`
- Subscribes to new conversation participants and new messages
- Updates the conversation list when new chats appear

## Testing Steps

### Test 1: Same Browser, Different Tabs
1. Open your app in two browser tabs
2. Log in as User A in tab 1
3. Open an incognito window and log in as User B in tab 2
4. Send a message from User A
5. User B should see it appear **without refreshing**

### Test 2: Check Console Logs
When you send a message, you should see in the console:
```
[useConversationMessages] Realtime event received, reloading messages
[useConversationMessages] Fetched X messages
```

If you see the realtime event log, the subscription is working!

### Test 3: Network Tab
1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. You should see a connection to `wss://...supabase.co/realtime/v1/websocket`
4. If this WebSocket connection exists and shows "101 Switching Protocols", realtime is connected

## Common Issues

### Issue 1: Messages Don't Appear for Other User
- **Cause**: Realtime not enabled in Supabase dashboard
- **Fix**: Enable replication for `messages` table (see Prerequisites)

### Issue 2: "Failed to connect to Realtime" in Console
- **Cause**: WebSocket blocked or Supabase URL incorrect
- **Fix**: Check `.env` file has correct `VITE_SUPABASE_URL`

### Issue 3: Messages Appear for Sender but Not Receiver
- **Cause**: RLS policies blocking SELECT on messages
- **Fix**: Verify your `messages` SELECT policy allows conversation participants to read

## Verify RLS Policy for Messages

Run this in Supabase SQL Editor:

```sql
-- Check if user can see messages in a conversation they're part of
SELECT EXISTS (
  SELECT 1 FROM messages m
  JOIN conversation_participants cp 
    ON cp.conversation_id = m.conversation_id
  WHERE cp.user_id = auth.uid()
) as can_see_messages;
```

This should return `true` when logged in.

## Current Status
✅ Real-time subscription code is implemented
✅ Message sending works
✅ Automatic reload on events is configured

**Next Step**: Enable Realtime replication in Supabase dashboard for the `messages` table, then test!
