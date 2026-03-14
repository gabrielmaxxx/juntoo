
-- Create storage policy for moderators to read verification documents
CREATE POLICY "Moderators can read verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND (
      has_role(auth.uid(), 'moderator'::public.app_role) 
      OR has_role(auth.uid(), 'admin'::public.app_role) 
      OR has_role(auth.uid(), 'super_admin'::public.app_role)
    )
  );
