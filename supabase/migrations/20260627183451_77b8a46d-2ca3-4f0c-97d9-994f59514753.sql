DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'cover-photos: users insert own folder'
  ) THEN
    CREATE POLICY "cover-photos: users insert own folder"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'cover-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;