CREATE POLICY "Autenticados enviam evidencias fiscalizacao"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fiscalizacao');

CREATE POLICY "Autenticados leem evidencias fiscalizacao"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fiscalizacao');

CREATE POLICY "Autenticados atualizam evidencias fiscalizacao"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fiscalizacao');