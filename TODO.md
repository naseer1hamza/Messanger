# Messenger App - TODO List

## Phase 1: Authentication & Backend Setup ✅

### Frontend Auth Pages
- [x] Login page (integrated with Supabase)
- [ ] Password reset page (already exists, needs Supabase wiring)
- [x] Register/Sign up page (integrated with Supabase)
- [x] Auth route guard (redirect to login if not signed in)

### Database / Backend
- [x] Set up Supabase project + get API keys
- [x] Install Supabase SDK (`@supabase/supabase-js`)
- [x] Create Supabase client config file
- [x] Design database schema (see Schema Design section below)
- [x] Create profiles table in Supabase
- [x] Set up Row Level Security (RLS) policies
- [x] Set up database trigger for auto-creating profiles

## Phase 2: Core Messaging Features

### Real-time Messaging
- [ ] Connect existing message components to Supabase
- [ ] Send message functionality
- [ ] Receive messages (real-time subscriptions)
- [ ] Message status indicators (sent, delivered, read)
- [ ] Message timestamps
- [ ] Typing indicators

### Conversations
- [ ] Create new conversation
- [ ] List all conversations
- [ ] Conversation preview (last message, unread count)
- [ ] Mark conversation as read
- [ ] Archive/unarchive conversations
- [ ] Delete conversations

### Attachments & Media
- [ ] Image attachments
- [ ] Video attachments
- [ ] Audio/voice recordings
- [ ] File attachments
- [ ] Set up Supabase Storage for media files
- [ ] Image/video preview in chat
- [ ] Attachment modal integration

### Message Features
- [ ] Reply to messages
- [ ] Pin messages
- [ ] Delete messages
- [ ] Edit messages
- [ ] Message reactions/emojis
- [ ] Forward messages

## Phase 3: Additional Features

### Contacts & Friends
- [x] Search users by username
- [x] Send friend requests
- [x] View friends list (loaded from database)
- [x] Alphabetically grouped contacts
- [x] Search/filter friends
- [ ] Accept/reject friend requests
- [ ] View pending friend requests
- [ ] Remove friends
- [ ] Contact profiles

### Group Chats
- [ ] Create group conversations
- [ ] Add/remove group members
- [ ] Group info/settings
- [ ] Group admin permissions
- [ ] Group avatar

### User Profile
- [x] View profile (in Settings > Account)
- [x] Edit profile (username, display name, bio, avatar)
- [x] Profile avatar upload (with Supabase Storage)
- [x] Sign out functionality
- [ ] Online/offline status
- [ ] Last seen timestamp

### Notifications
- [ ] New message notifications
- [ ] Push notifications (web push API)
- [ ] Notification preferences/settings
- [ ] Mute conversations

### Voice/Video Calls
- [ ] Integrate WebRTC or calling service
- [ ] Voice call UI (already exists)
- [ ] Video call support
- [ ] Call history
- [ ] Missed call notifications

### Settings
- [ ] App settings UI (already exists)
- [ ] Dark/light mode persistence
- [ ] Privacy settings
- [ ] Notification settings
- [ ] Account settings

## Database Schema Design

### Proposed Schema

```sql
-- Users/Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  status TEXT DEFAULT 'offline', -- online, offline, away
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'direct' or 'group'
  name TEXT, -- for group chats
  avatar_url TEXT, -- for group chats
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversation participants/members
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- member, admin
  joined_at TIMESTAMP DEFAULT NOW(),
  last_read_at TIMESTAMP,
  is_archived BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  content TEXT,
  type TEXT DEFAULT 'text', -- text, image, video, audio, file
  reply_to UUID REFERENCES messages(id),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Message attachments
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Message read receipts
CREATE TABLE message_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Contacts/Friends
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

-- Call history (optional)
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  caller_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL, -- voice, video
  status TEXT, -- completed, missed, rejected
  duration INTEGER, -- in seconds
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Technical Infrastructure

- [ ] Set up environment variables (.env file)
- [ ] Add TypeScript types/interfaces for database models
- [ ] Create Supabase client utility
- [ ] Set up API error handling
- [ ] Add loading states for async operations
- [ ] Set up toast notifications
- [ ] Real-time subscriptions setup
- [ ] File upload utilities
- [ ] Image optimization/compression

## Questions to Answer

1. **Authentication flow:**
   - Email/password only?
   - Social login (Google, GitHub, etc.)?
   - Phone number authentication?

2. **Real-time features:**
   - Online/offline status tracking?
   - Typing indicators?
   - Read receipts?

3. **Privacy settings:**
   - Who can message you (everyone, contacts only)?
   - Last seen visibility?
   - Read receipt visibility?

4. **File uploads:**
   - Maximum file size limits?
   - Allowed file types?
   - Image/video compression?

5. **Group chat limits:**
   - Maximum number of participants?
   - Admin-only settings?

---

## Progress Tracker

**Phase 1**: ⬜ Not Started  
**Phase 2**: ⬜ Not Started  
**Phase 3**: ⬜ Not Started  

**Last Updated**: 2026-05-15
