# Fix Row Level Security Policy

The issue is that the INSERT policy needs to allow authenticated users to insert their own profile during signup.

## QUICK FIX (Try this first):

Run this SQL in your Supabase SQL Editor:

```sql
-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
```

## Alternative: If the above doesn't work:

```sql
-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON profiles;

-- Allow authenticated users to insert their profile
CREATE POLICY "Enable insert for authenticated users only"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

## Even Better: Use a Database Function (Recommended)

The most reliable way is to use a database function that runs with elevated privileges:

```sql
-- Create a function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text from 1 for 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that automatically creates a profile when a user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Now you can simplify the RLS policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Users don't need to insert manually anymore, the trigger handles it
-- But if you want to allow manual inserts (for admin purposes), keep this:
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);
```

## Which Solution to Use?

**Option 1 (Quick Fix)**: Use the "Enable insert for authenticated users only" policy - Simple and works immediately.

**Option 2 (Best Practice)**: Use the database function with trigger - Automatically creates profiles, more reliable, and you don't need to handle it in your frontend code.

If you use Option 2, you'll also need to update the frontend code to pass the username and display_name in the signup metadata.
