# Setup Instructions

## 1. Supabase Setup

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Once your project is created, go to Project Settings > API
3. Copy your project URL and anon/public key

## 2. Environment Variables

1. Open the `.env` file in the root of the project
2. Replace the placeholder values with your actual Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Create Database Tables

Go to your Supabase project SQL Editor and run the following SQL to create your tables:

### Profiles Table
```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  status TEXT DEFAULT 'offline',
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### Other Tables
See `TODO.md` for the complete database schema including conversations, messages, etc.

## 4. Install Dependencies

```bash
yarn install
```

## 5. Run the Development Server

```bash
yarn dev
```

## 6. Test Authentication

1. Navigate to `http://localhost:5173` (or whatever port Vite uses)
2. You should be automatically redirected to `/access/sign-in` if not logged in
3. The auth system is now connected to Supabase!

## Next Steps

- Integrate the Login form with Supabase authentication
- Integrate the Register form with Supabase authentication
- Create the remaining database tables
- Connect messaging features to Supabase
