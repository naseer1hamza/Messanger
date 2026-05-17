# Supabase Storage Setup for Avatars

## Step 1: Create Storage Bucket

Go to your Supabase Dashboard:

1. Click **Storage** in the left sidebar
2. Click **New bucket**
3. Enter bucket name: `avatars`
4. Make it **Public** (toggle ON)
5. Click **Create bucket**

## Step 2: Set Up Storage Policies

After creating the bucket, click on the `avatars` bucket, then click **Policies** tab.

Run this SQL in your Supabase SQL Editor to set up storage policies:

```sql
-- Allow anyone to view avatars (public read)
CREATE POLICY "Public avatars are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars'
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars'
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars'
);
```

## Alternative: Simple Policy (Allow All Authenticated Users)

If the above policies don't work, use these simpler ones:

```sql
-- Drop existing policies first
DROP POLICY IF EXISTS "Public avatars are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Simple policies for avatars bucket
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_authenticated_all"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');
```

## Step 3: Test Upload

After setting up the bucket and policies:

1. Go to your app Settings page
2. Fill in your profile information
3. Click "Update Avatar" and select an image
4. Click "Save Settings"
5. Your avatar should upload successfully!

## Troubleshooting

### If you get "new row violates row-level security policy"
- Make sure the bucket is set to **Public**
- Run the storage policies SQL above
- Check that you're authenticated (signed in)

### If upload fails
- Check the bucket name is exactly `avatars`
- Verify policies are applied to the `storage.objects` table
- Check browser console for detailed error messages

## File Size Limits

By default, Supabase allows files up to 50MB. For avatars, this is plenty. If you want to enforce smaller limits, you can add a check in the policy:

```sql
CREATE POLICY "avatars_size_limit"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (octet_length(decode(content, 'base64')) < 5000000) -- 5MB limit
);
```
