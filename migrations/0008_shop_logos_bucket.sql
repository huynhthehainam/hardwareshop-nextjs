-- Create a public bucket for shop logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-logos', 'shop-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up access policies for the shop-logos bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'shop-logos' );

CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'shop-logos' );

CREATE POLICY "Authenticated users can update their logos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'shop-logos' );

CREATE POLICY "Authenticated users can delete their logos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'shop-logos' );
