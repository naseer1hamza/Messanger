# Friends System Database Setup

## Step 1: Create Database Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- Friendships table (accepted friend connections)
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Friend requests table (pending requests)
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendships
CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- INSERT: either side may appear as user_id or friend_id so both users can create the pair when accepting a request from the app
CREATE POLICY "Users can create friendships involving self"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete friendships involving self"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for friend_requests
CREATE POLICY "Users can view requests they sent or received"
  ON friend_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update requests they received"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete requests they sent"
  ON friend_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);
```

### If you already created the old friendship policies

Run this once to replace the stricter `INSERT` / `DELETE` policies so the app can insert **both** friendship rows when you accept a request from the **Requests** tab:

```sql
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships involving self" ON friendships;
DROP POLICY IF EXISTS "Users can delete their own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete friendships involving self" ON friendships;

CREATE POLICY "Users can create friendships involving self"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete friendships involving self"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
```

### Accept shows `42501` / "new row violates row-level security" on `friendships`

The app calls **`accept_friend_request(request_id)`** first (recommended). Run **Step 2** in this file, including **`GRANT EXECUTE ... TO authenticated`**.

If you prefer **not** using the RPC, keep the client insert path by applying the **“If you already created the old friendship policies”** block above so `INSERT` allows `auth.uid()` as either `user_id` or `friend_id`.

### Error: `function public.accept_friend_request(uuid) does not exist` when running `GRANT`

**`GRANT` only works after the function exists.** You ran `GRANT` without creating the function first.

Run the **`CREATE OR REPLACE FUNCTION accept_friend_request`** block from **Step 2** below (from `CREATE` through `$$;`), **then** run:

```sql
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;
```

Note: PostgreSQL stores the type as **`uuid`** (lowercase). If `GRANT ... (UUID)` fails, use **`(uuid)`** as above.

**Minimal copy-paste (create + grant only):**

```sql
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req FROM public.friend_requests
  WHERE id = request_id AND receiver_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or unauthorized';
  END IF;

  UPDATE public.friend_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;

  INSERT INTO public.friendships (user_id, friend_id)
  VALUES (req.sender_id, req.receiver_id), (req.receiver_id, req.sender_id)
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;
```

## Step 2: Create Helper Functions

```sql
-- Function to accept a friend request (runs as definer — bypasses RLS on friendships)
CREATE OR REPLACE FUNCTION accept_friend_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
BEGIN
  -- Get the friend request
  SELECT * INTO req FROM friend_requests WHERE id = request_id AND receiver_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or unauthorized';
  END IF;
  
  -- Update request status
  UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = request_id;
  
  -- Create friendships in both directions
  INSERT INTO friendships (user_id, friend_id)
  VALUES (req.sender_id, req.receiver_id), (req.receiver_id, req.sender_id)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Allow logged-in users to call RPC from the app
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;

-- Function to reject a friend request
CREATE OR REPLACE FUNCTION reject_friend_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE friend_requests 
  SET status = 'rejected', updated_at = NOW() 
  WHERE id = request_id AND receiver_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or unauthorized';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_friend_request(uuid) TO authenticated;

-- Function to remove a friend
CREATE OR REPLACE FUNCTION remove_friend(friend_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete both directions of the friendship
  DELETE FROM friendships 
  WHERE (user_id = auth.uid() AND friend_id = friend_user_id)
     OR (user_id = friend_user_id AND friend_id = auth.uid());
     
  -- Also delete any friend requests between these users
  DELETE FROM friend_requests
  WHERE (sender_id = auth.uid() AND receiver_id = friend_user_id)
     OR (sender_id = friend_user_id AND receiver_id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;
```

## Step 3: Create Indexes for Performance

```sql
-- Indexes for faster queries
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver_id ON friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);
CREATE INDEX idx_profiles_username ON profiles(username);
```

## How It Works

### Friend Request Flow:
1. User A searches for User B by username
2. User A sends friend request → creates row in `friend_requests` with status 'pending'
3. User B sees the request in their notifications/requests list
4. User B accepts → calls `accept_friend_request()` function which:
   - Updates request status to 'accepted'
   - Creates two rows in `friendships` (bidirectional)
5. Both users now see each other in their contacts

### Friendship Structure:
- `friendships` table stores BIDIRECTIONAL relationships
- When A and B are friends, there are 2 rows:
  - `{user_id: A, friend_id: B}`
  - `{user_id: B, friend_id: A}`
- This makes queries simple: just `WHERE user_id = current_user`

### Privacy:
- Users can only send requests as themselves
- Users can only accept/reject requests sent to them
- Users can only view their own friendships
- All protected by Row Level Security (RLS)

## Testing

After running the SQL, test in Supabase SQL Editor:

```sql
-- View your friends
SELECT p.* FROM friendships f
JOIN profiles p ON p.id = f.friend_id
WHERE f.user_id = auth.uid();

-- View pending friend requests you received
SELECT p.*, fr.id as request_id, fr.created_at
FROM friend_requests fr
JOIN profiles p ON p.id = fr.sender_id
WHERE fr.receiver_id = auth.uid() AND fr.status = 'pending';

-- View friend requests you sent
SELECT p.*, fr.status, fr.created_at
FROM friend_requests fr
JOIN profiles p ON p.id = fr.receiver_id
WHERE fr.sender_id = auth.uid();
```
