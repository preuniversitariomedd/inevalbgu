
CREATE POLICY "branding_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'branding');
CREATE POLICY "branding_insert_admin" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "branding_update_admin" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "branding_delete_admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'administrador'));
