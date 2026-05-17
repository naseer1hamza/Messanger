# Debug Script - Run in Browser Console

Open your browser console (F12) and paste this entire script:

```javascript
(async () => {
  console.log("=== DIAGNOSTIC START ===");
  
  // Get supabase from window (if available from your app)
  const { supabase } = await import('/src/lib/supabase.ts');
  
  // Get current user
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  
  console.log("1. Auth User ID:", uid);
  
  if (!uid) {
    console.error("NOT LOGGED IN!");
    return;
  }
  
  // Check conversation_participants
  console.log("\n2. Checking conversation_participants...");
  const { data: myParticipations, error: partError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', uid);
  
  console.log("Participations:", myParticipations);
  console.log("Participations Error:", partError);
  
  if (!myParticipations?.length) {
    console.error("No participations found! User is not in any conversations.");
    return;
  }
  
  const conversationIds = myParticipations.map(p => p.conversation_id);
  console.log("Conversation IDs:", conversationIds);
  
  // Check conversations
  console.log("\n3. Checking conversations...");
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, type, name, avatar_url, created_at')
    .in('id', conversationIds);
  
  console.log("Conversations:", conversations);
  console.log("Conversations Error:", convError);
  
  // Check participants for each conversation
  console.log("\n4. Checking participants for each conversation...");
  for (const conv of conversations || []) {
    console.log(`\nConversation ${conv.id}:`);
    
    const { data: participants, error: pError } = await supabase
      .from('conversation_participants')
      .select(`
        user_id,
        profiles!conversation_participants_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conv.id);
    
    console.log(`  Participants (${participants?.length || 0}):`, participants);
    console.log(`  Participants Error:`, pError);
  }
  
  // Check messages
  console.log("\n5. Checking messages for each conversation...");
  for (const conv of conversations || []) {
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        type,
        created_at,
        profiles!messages_sender_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    console.log(`Conversation ${conv.id} last message:`, messages);
    console.log(`Message Error:`, msgError);
  }
  
  console.log("\n=== DIAGNOSTIC END ===");
})();
```

## Simpler Version (if the above doesn't work):

```javascript
// Just check the raw tables
const uid = '059e0b4d-ef36-4d95-bae6-3fc6d3017511'; // Your user ID

// Import supabase
import { supabase } from '/src/lib/supabase.ts';

// Check participations
const result1 = await supabase.from('conversation_participants').select('*').eq('user_id', uid);
console.log('My participations:', result1);

// Check all participations (to see RLS in action)
const result2 = await supabase.from('conversation_participants').select('*');
console.log('All visible participations:', result2);

// Check messages
const result3 = await supabase.from('messages').select('*');
console.log('All visible messages:', result3);
```
