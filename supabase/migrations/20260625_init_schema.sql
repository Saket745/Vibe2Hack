-- Enable UUID generation extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Wards Table
CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    boundary_coords JSONB, -- Coordinates of bounds or polygon/center
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    reporter_id UUID NOT NULL, -- LocalStorage anonymous UUID
    image_url TEXT NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('pothole', 'garbage', 'streetlight', 'water leakage', 'drainage')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL,
    ai_analysis JSONB -- Full structured JSON analysis from Gemini
);

-- 3. Seed Wards (Initial Ward list for our city/demo)
INSERT INTO wards (name, boundary_coords) VALUES
('Ward 1 - Downtown', '{"center": {"lat": 12.9716, "lng": 77.5946}}'),
('Ward 2 - Koramangala', '{"center": {"lat": 12.9352, "lng": 77.6245}}'),
('Ward 3 - Indiranagar', '{"center": {"lat": 12.9719, "lng": 77.6412}}'),
('Ward 4 - Jayanagar', '{"center": {"lat": 12.9308, "lng": 77.5838}}'),
('Ward 5 - Whitefield', '{"center": {"lat": 12.9698, "lng": 77.7500}}')
ON CONFLICT (name) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies

-- Wards Policies
CREATE POLICY "Allow public read access to wards" 
    ON wards FOR SELECT 
    USING (true);

-- Reports Policies
CREATE POLICY "Allow public read access to reports" 
    ON reports FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert access to reports" 
    ON reports FOR INSERT 
    WITH CHECK (true);

-- Updates restricted to authenticated users (e.g. Ward Workers/Admins)
CREATE POLICY "Allow authenticated updates to reports" 
    ON reports FOR UPDATE 
    TO authenticated 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
