
-- Storage policies for cover-photos bucket
CREATE POLICY "cover-photos: public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'cover-photos');

CREATE POLICY "cover-photos: users insert own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cover-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "cover-photos: users update own folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cover-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'cover-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "cover-photos: users delete own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cover-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
