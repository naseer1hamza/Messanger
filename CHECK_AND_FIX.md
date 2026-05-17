# Check and Fix Profile Creation Issue

## Step 1: Check Current Policies

Run this in Supabase SQL Editor to see your current policies:

```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

## Step 2: Fix the RLS Policy

Run this SQL to drop ALL existing policies and create the correct ones:

```sql
-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Recreate the correct policies
-- 1. Allow everyone to view profiles
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  USING (true);

-- 2. Allow users to update their own profile
CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 3. Allow users to insert their own profile (CRITICAL FOR SIGNUP)
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
```

## Step 3: Clean Up Failed Account (Optional)

If you created test accounts that don't have profiles, you can delete them from Supabase Dashboard:
- Go to Authentication > Users
- Find the user with no profile
- Delete them
- Then try signing up again

## Step 4: Verify RLS is Enabled

Make sure RLS is enabled on the profiles table:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

## Step 5: Test the Insert Manually

After applying the policies, test if insert works:

```sql
-- This should work if you're authenticated
INSERT INTO profiles (id, username, display_name)
VALUES (auth.uid(), 'testuser', 'Test User');
```

## Alternative: Use Database Trigger (Recommended)

If RLS continues to be problematic, use a database trigger that runs with elevated privileges:

```sql
-- Create a function to automatically create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text from 1 for 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- If using trigger, you can remove the INSERT policy since profiles are created automatically
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
```

If you use the trigger approach, you need to update the frontend to NOT manually insert the profile.
