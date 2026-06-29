-- 1. Create the new dynamic categories table
CREATE TABLE IF NOT EXISTS issue_categories (
    name TEXT PRIMARY KEY,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for public read access
ALTER TABLE issue_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to issue_categories"
    ON issue_categories FOR SELECT
    USING (true);

-- 2. Seed initial categories
INSERT INTO issue_categories (name, description) VALUES
('pothole', 'Road damage, surface cracks, depressions, or scaling on public streets.'),
('garbage', 'Waste pileups, overflowing public bins, dumped trash on pavements, or litter.'),
('streetlight', 'Out-of-service street lamps, flickering lights, dark poles at night, or exposed wiring.'),
('water leakage', 'Fractured mains, leaking public pipes, bursting fire hydrants, or running street floods.'),
('drainage', 'Blocked grates, overflowing sewers, back-flooding, or stagnant pools of stagnant runoff.'),
('unknown', 'Initial placeholder state before AI classification')
ON CONFLICT (name) DO NOTHING;

-- 3. Modify reports table: Drop CHECK constraint on category, add Foreign Key
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_category_check;

ALTER TABLE reports ADD CONSTRAINT fk_reports_category 
    FOREIGN KEY (category) REFERENCES issue_categories(name) 
    ON DELETE RESTRICT;

-- 4. Modify reports table: Update severity CHECK constraint
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_severity_check;

ALTER TABLE reports ADD CONSTRAINT reports_severity_check 
    CHECK (severity IN ('low', 'medium', 'high', 'unknown'));

-- 5. Modify reports table: Update status CHECK constraint
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE reports ADD CONSTRAINT reports_status_check 
    CHECK (status IN ('pending_triage', 'open', 'in_progress', 'resolved', 'rejected'));
