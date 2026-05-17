# Real-time Messaging Setup Complete ✓

## What was implemented

### 1. Message Sending (`src/composables/useConversationMessages.ts`)
- ✅ `sendTextMessage()` - Sends text messages to Supabase
- ✅ `ensureDirectConversationRowInSupabase()` - Auto-creates conversation/participants before first message
- ✅ `reloadConversationMessages()` - Refetches messages after sending
- ✅ `useConversationMessages()` - Subscribes to Realtime `postgres_changes` for messages
- ✅ `appendLocalTextMessage()` - Fallback for offline/RLS failures

### 2. Conversation Loading (`src/composables/useConversationsList.ts`)
- ✅ `fetchConversationsFromSupabase()` - Loads all user's conversations on mount
- ✅ Realtime subscription to `conversation_participants` - Auto-detects new conversations
- ✅ Merges with local store to preserve client-only threads

### 3. UI (`src/components/views/HomeView/Chat/ChatBottom/ChatBottom.vue`)
- ✅ Fixed `Textarea` binding (was broken - typed text never reached send)
- ✅ Enter to send (Shift+Enter for new line)
- ✅ Draft auto-save to conversation store
- ✅ Send button with loading state
- ✅ Error messages with full Supabase error details
- ✅ Clears draft + reply after successful send

### 4. Database Policies (`MESSAGING_RLS.md`)
- ✅ `conversations` - SELECT by creator/participant, INSERT by creator
- ✅ `conversation_participants` - SELECT own rows, INSERT yourself or friend (if creator)
- ✅ `messages` - SELECT/INSERT only in your conversations

## How to test

### Setup (one-time)
1. **Run SQL policies** from `MESSAGING_RLS.md` in Supabase SQL Editor
2. **Enable Realtime** in Supabase Dashboard → Database → Replication:
   - `messages` ✓
   - `conversation_participants` ✓
   - `conversations` ✓ (optional)

### Test Flow
1. **User A**: Login → Compose → Search for User B → Select
2. **User A**: Type message → Press Enter or click Send
3. **User B** (different browser/incognito): Should see conversation appear in sidebar automatically
4. **User B**: Click conversation → See User A's message
5. **User B**: Reply → User A should see message appear in real-time

## What happens when you send

1. App checks if conversation exists in Supabase
2. If not, creates:
   - `conversations` row (type='direct', created_by=you)
   - `conversation_participants` rows (you + friend)
3. Inserts `messages` row (conversation_id, sender_id, content)
4. Reloads messages in sender's window
5. **Realtime triggers on receiver**:
   - `conversation_participants` INSERT → reloads conversation list
   - `messages` INSERT → reloads messages in that thread

## Troubleshooting

### "new row violates row-level security policy"
- Run the policies from `MESSAGING_RLS.md`
- Make sure you dropped any old policies with different names

### "infinite recursion detected in policy"
- Fixed in latest `MESSAGING_RLS.md` (conversation_participants SELECT)
- Re-run that policy block

### Message sends but receiver doesn't see it
- Check Realtime is enabled in Supabase Dashboard
- Check browser console for subscription errors
- Verify both users are friends (in `friendships` table)

### Conversation doesn't appear in sidebar
- Check `conversation_participants` has rows for both users
- Check RLS allows SELECT on `conversation_participants` for auth.uid()
- Refresh page to trigger initial load

## Files modified
- ✅ `src/composables/useConversationMessages.ts` - Message sending + Realtime
- ✅ `src/composables/useConversationsList.ts` - NEW: Conversation loading
- ✅ `src/components/views/HomeView/Chat/ChatBottom/ChatBottom.vue` - Send UI
- ✅ `src/components/ui/inputs/Textarea.vue` - Fixed content binding
- ✅ `src/App.vue` - Wire conversation loading
- ✅ `src/lib/openDirectConversation.ts` - DM creation logic (unchanged)
- ✅ `MESSAGING_RLS.md` - NEW: SQL policies documentation

## Next steps (from TODO.md)
- [ ] Message status indicators (delivered, read) → `message_receipts` table
- [ ] Typing indicators → Realtime `broadcast` channel
- [ ] Message timestamps (already saving `created_at`, just format in UI)
- [ ] Edit/delete messages
- [ ] Group conversations (type='group')
- [ ] Attachments (file upload + `message_attachments`)
