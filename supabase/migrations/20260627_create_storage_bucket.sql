-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('report-photos', 'report-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable public uploads (INSERT) for anonymous users
CREATE POLICY "Allow public insert to report-photos" 
ON storage.objects FOR INSERT 
TO public
WITH CHECK (bucket_id = 'report-photos');

-- Enable public reads (SELECT) for anonymous users
CREATE POLICY "Allow public read to report-photos" 
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'report-photos');
