-- Update storage policies to allow direct file uploads in avatars bucket root
-- This fixes the issue where uploads were failing due to folder structure requirements

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create new policies that allow users to upload files with their user ID in the filename
CREATE POLICY "Users can upload avatar files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.filename(name) LIKE auth.uid()::text || '%' OR name LIKE '%' || auth.uid()::text || '%')
);

CREATE POLICY "Users can update avatar files"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'avatars'
  AND (storage.filename(name) LIKE auth.uid()::text || '%' OR name LIKE '%' || auth.uid()::text || '%')
);

CREATE POLICY "Users can delete avatar files"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'avatars'
  AND (storage.filename(name) LIKE auth.uid()::text || '%' OR name LIKE '%' || auth.uid()::text || '%')
);