# Removed defaults.ts - Migration Complete ✓

## What was deleted
- ❌ `src/store/defaults.ts` (1102 lines of mock data)
  - Mock user with 10 contacts
  - Mock conversations (6+ threads with messages)
  - Mock archived conversations (2 threads)
  - Mock notifications (5 items)
  - Mock calls history (6 calls)
  - Mock active call
  - Mock attachments array

## What was refactored

### 1. `src/store/store.ts`
**Before:**
```ts
import defaults from "@src/store/defaults";
const user = ref(defaults.user);
const conversations = ref(defaults.conversations || []);
const notifications = ref(defaults.notifications || []);
// etc...
```

**After:**
```ts
const defaultSettings: ISettings = { /* inline */ };
const user = ref(undefined);
const conversations = ref([]);
const notifications = ref([]);
// etc... all start empty
```

### 2. `src/App.vue`
**Before:**
```ts
import { fetchData } from "@src/store/defaults";
const request = await fetchData(); // 2s fake delay
store.$patch({ user, conversations, notifications, ... });
```

**After:**
```ts
// Removed fetchData import
// Conversations load from Supabase via useConversationsList
setTimeout(() => {
  store.delayLoading = false;
  store.status = "success";
}, 500);
```

### 3. `src/components/views/HomeView/Chat/ChatTop/ConversationInfoSection.vue`
**Before:**
```ts
import { activeCall } from "@src/store/defaults";
store.activeCall = activeCall; // Voice call feature
```

**After:**
```ts
// Removed import
console.log("Voice call feature coming soon");
// Commented out voice call modal logic (TODO)
```

### 4. `src/components/shared/modals/AttachmentsModal/AttachmentsModal.vue`
**Before:**
```ts
import { attachments } from "@src/store/defaults";
// Used 10 mock attachments
```

**After:**
```ts
const attachments = ref<IAttachment[]>([]);
// Shows "No attachments selected" empty state
```

## Data sources now

| Data | Source | Loaded by |
|------|--------|-----------|
| **Conversations** | Supabase `conversations` + `conversation_participants` | `useConversationsList()` |
| **Messages** | Supabase `messages` | `useConversationMessages()` |
| **Friends** | Supabase `friendships` + `profiles` | `useFriendsList()` |
| **Friend Requests** | Supabase `friend_requests` | `usePendingFriendRequests()` |
| **Profile** | Supabase `profiles` (auth.uid()) | Loaded on mount in AccountSettings |
| **User** | Undefined (not used - replaced by profile system) | N/A |
| **Notifications** | Empty array (TODO: implement) | N/A |
| **Calls** | Empty array (TODO: implement) | N/A |
| **Attachments** | Empty array (TODO: implement file picker) | N/A |

## Why this matters

1. **No more fake data** - App starts clean, only shows real Supabase data
2. **Smaller bundle** - Removed ~12KB of mock data
3. **Clearer architecture** - Each feature loads its own data from Supabase
4. **Easier testing** - Can test with real accounts instead of navigating mock data

## What still needs implementation

These features were stubbed out:
- [ ] Notifications system (no DB schema yet)
- [ ] Call history (schema exists in TODO.md)
- [ ] Voice/video calling (activeCall modal)
- [ ] File attachments (upload + storage)

Refer to `TODO.md` for the full list of features.
