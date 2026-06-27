-- Seed realistic-looking demo reports across all 5 wards and all severities
-- Enable UUID generation extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Insert Seed Reports
INSERT INTO public.reports (
    id,
    created_at,
    reporter_id,
    image_url,
    description,
    latitude,
    longitude,
    category,
    severity,
    status,
    ward_id,
    ai_analysis,
    dedupe_hash,
    after_image_url,
    worker_notes
) VALUES
-- Report 1 (Ward 1, high, open)
('a3b8c2d9-1e2f-4a3b-8c2d-9e2f4a3b8c2d', now() - interval '5 days', '9c0d1e2f-3a4b-5c6d-7e8f-9a0b1c2d3e4f', 'https://picsum.photos/seed/pothole-1/800/600', 'Deep pothole in the middle of Commercial Street near the police station. It''s causing traffic slowdowns and is very dangerous for two-wheelers.', 12.9730, 77.5955, 'pothole', 'high', 'open', 1, '{"category": "pothole", "severity": "high", "explanation": "Visual evidence of a deep asphalt road failure on a high-traffic street.", "confidence": 0.94, "isValidCivicIssue": true, "isBorderline": false, "rejectionReason": "", "segmentation_mask": {"box_2d": [300, 200, 700, 800], "label": "pothole"}}'::jsonb, 'db-dedupe-1', NULL, NULL),
-- Report 2 (Ward 1, medium, in_progress)
('b4c9d3e0-2f3a-5b4c-9d3e-0f2f3a5b4c9d', now() - interval '4 days', '9c0d1e2f-3a4b-5c6d-7e8f-9a0b1c2d3e4f', 'https://picsum.photos/seed/garbage-1/800/600', 'Municipal garbage container overflowing at the corner of MG Road. Trash is spilling onto the sidewalk, creating a bad smell.', 12.9710, 77.5940, 'garbage', 'medium', 'in_progress', 1, '{"category": "garbage", "severity": "medium", "explanation": "Overflowing public waste bin causing sidewalk blockage.", "confidence": 0.88, "isValidCivicIssue": true, "isBorderline": false, "rejectionReason": "", "segmentation_mask": {"box_2d": [150, 300, 800, 700], "label": "garbage"}}'::jsonb, 'db-dedupe-2', NULL, NULL),
-- Report 3 (Ward 2, low, resolved)
('c5d0e4f1-3a4b-6c5d-0e4f-1a3b4c6c5d0e', now() - interval '3 days 12 hours', '0d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a', 'https://picsum.photos/seed/light-1/800/600', 'Streetlight opposite standard chartered bank is completely dark. It''s unsafe for pedestrians walking late at night.', 12.9355, 77.6250, 'streetlight', 'low', 'resolved', 2, '{"category": "streetlight", "severity": "low", "explanation": "A single out-of-order streetlight pole on a minor lane.", "confidence": 0.91, "isValidCivicIssue": true, "isBorderline": false, "rejectionReason": "", "segmentation_mask": {"box_2d": [50, 450, 900, 550], "label": "streetlight"}}'::jsonb, 'db-dedupe-3', 'https://picsum.photos/seed/resolve-3/800/600', 'Bulb replaced by ward maintenance team.'),
-- Report 4 (Ward 2, medium, open)
('d6e1f5a2-4b5c-7d6e-1f5a-2b4c5d7d6e1f', now() - interval '3 days', '0d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a', 'https://picsum.photos/seed/leak-1/800/600', 'Active water leakage from underground pipeline on 80 feet road. Clean water is wasting and pooling on the side of the road.', 12.9348, 77.6240, 'water leakage', 'medium', 'open', 2, '{"category": "water leakage", "severity": "medium", "explanation": "Continuous municipal water supply pipe joint leak.", "confidence": 0.85, "isValidCivicIssue": true, "isBorderline": false, "rejectionReason": "", "segmentation_mask": {"box_2d": [400, 100, 600, 900], "label": "water leakage"}}'::jsonb, 'db-dedupe-4', NULL, NULL),
-- Report 5 (Ward 3, medium, in_progress)
('e7f2a6b3-5c6d-8e7f-2a6b-3c5d6e8e7f2a', now() - interval '2 days 19 hours', '1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b', 'https://picsum.photos/seed/drain-1/800/600', 'Stormwater drain is completely clogged with leaves and plastic debris. Water is pooling on the road.', 12.9725, 77.6415, 'drainage', 'medium', 'in_progress', 3, '{"category": "drainage", "severity": "medium", "explanation": "Debris clogging a storm drain grate, preventing water runoff.", "confidence": 0.89, "isValidCivicIssue": true, "isBorderline": false, "rejectionReason": "", "segmentation_mask": {"box_2d": [200, 300, 750, 700], "label": "drainage"}}'::jsonb, 'db-dedupe-5', NULL, NULL),
-- Report 6 (Ward 3, high, open)
('f8a3b7c4-6d7e-9f8a-3b7c-4d6e7f9f8a3b', now() - interval '2 days 12 hours', '1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b', 'https://picsum.photos/seed/light-2/800/600', 'Entire block of streetlights on 100 feet road is off. Pitch black and extremely risky for drivers.', 12.9712, 77.6408, 'streetlight', 'high', 'open', 3, '{"category": "streetlight", "severity": "high", "explanation": "Multiple adjacent street lamps out of order, representing high hazard.", "confidence": 0.95, "isValidCivicIssue": true, "isBorderline": false, "rejectionReason": "", "segmentation_mask": {"box_2d": [100, 200, 950, 800], "label": "streetlight"}}'::jsonb, 'db-dedupe-6', NULL, NULL),
-- Report 7 (Ward 4, low, open)
('09b4c8d5-7e8f-0a9b-4c8d-5e7f8a0a9b4c', now() - interval '2 days 4 hours', '2f3a4b5c-6d7e-8f9a-0b1c-2d3e4f5a6b7c', 'https://picsum.photos/seed/pothole-2/800/600', 'Minor cracks developing on the road surface near 4th block bus stop. Not a deep pothole yet, but needs monitoring.', 12.9312, 77.5842, 'pothole', 'low', 'open', 4, '{"category": "pothole", "severity": "low", "explanation": "Surface cracks and early pavement distress.", "confidence": 0.81, "isValidCivicIssue": true, "isBorderline": false, "rejectionReason": "", "segmentation_mask": {"box_2d": [450, 350, 550, 650], "label": "pothole"}}'::jsonb, 'db-dedupe-7', NULL, NULL),
-- Report 8 (Ward 4, high, resolved)
('1ac5d9e6-8f0a-1b1a-5d9e-6f8f0a1b1ac5', now() - interval '2 days', '2f3a4b5c-6d7e-8f9a-0b1c-2d3e4f5a6b7c', 'https://picsum.photos/seed/leak-2/800/600', 'Major water pipe burst on 9th block main road. High-pressure water spraying out and flooding the street.', 12.9302, 77.5830, 'water leakage', 'high', 'resolved', 4, '{"category": "water leakage", "severity": "high", "explanation": "Severe high-pressure pipe burst causing street flooding.", "confidence": 0.97, "isValidCivicIssue": true, "isBorderline": false, "rejectionReason": "", "segmentation_mask": {"box_2d": [100, 100, 800, 800], "label": "water leakage"}}'::jsonb, 'db-dedupe-8', 'https://picsum.photos/seed/resolve-8/800/600', 'Water supply shut off, pipe repaired and asphalted over.'),
-- Report 9 (Ward 5, high, needs_manual_review)
('2bd6eaf7-9f1a-2c2b-6eaf-7f9f1a2c2bd6', now() - interval '1 day 19 hours', '3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d', 'https://picsum.photos/seed/drain-2/800/600', 'Sewer drain backing up and overflowing onto ITPL main road. Foul smell and hazardous conditions.', 12.9702, 77.7505, 'drainage', 'high', 'needs_manual_review', 5, '{"category": "drainage", "severity": "high", "explanation": "Severe sewer backup and street flooding.", "confidence": 0.65, "isValidCivicIssue": true, "isBorderline": true, "rejectionReason": "Low confidence score (65%)", "segmentation_mask": {"box_2d": [250, 150, 800, 850], "label": "drainage"}}'::jsonb, 'db-dedupe-9', NULL, NULL),
-- Report 10 (Ward 5, high, open)
('3ce7fbf8-0f2b-3d3c-7fbf-8f0f2b3d3ce7', now() - interval '1 day 12 hours', '3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d', 'https://picsum.photos/seed/garbage-2/800/600', 'Huge pile of construction debris and plastic garbage dumped on the roadside near hope farm junction.', 12.9692, 77.7495, 'garbage', 'high', 'open', 5, '{"category": "garbage", "severity": "high", "explanation": "Large illegal dump of commercial/construction waste.", "confidence": 0.92, "isValidCivicIssue": true, "isBorderline": false, "rejectionReason": "", "segmentation_mask": {"box_2d": [200, 100, 850, 900], "label": "garbage"}}'::jsonb, 'db-dedupe-10', NULL, NULL),
-- Report 11 (Ward 1, low, open)
('4df8ac09-1f3c-4e4d-8ac0-9f1f3c4e4df8', now() - interval '1 day 4 hours', '9c0d1e2f-3a4b-5c6d-7e8f-9a0b1c2d3e4f', 'https://picsum.photos/seed/light-3/800/600', 'Streetlight flickering continuously, disturbing nearby residential apartments.', 12.9722, 77.5952, 'streetlight', 'low', 'open', 1, '{"category": "streetlight", "severity": "low", "explanation": "Unstable bulb fixture or wiring issue.", "confidence": 0.83, "isValidCivicIssue": true, "isBorderline": false, "rejectionReason": "", "segmentation_mask": {"box_2d": [50, 400, 200, 600], "label": "streetlight"}}'::jsonb, 'db-dedupe-11', NULL, NULL),
-- Report 12 (Ward 3, low, resolved)
('5ea9bd1a-2f4d-5f5e-9bd1-af2f4d5f5ea9', now() - interval '1 day', '1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b', 'https://picsum.photos/seed/leak-3/800/600', 'Water dripping from a municipal control valve valve on 12th main road.', 12.9715, 77.6410, 'water leakage', 'low', 'resolved', 3, '{"category": "water leakage", "severity": "low", "explanation": "Minor water drip around valve cap.", "confidence": 0.89, "isValidCivicIssue": true, "isBorderline": false, "rejectionReason": "", "segmentation_mask": {"box_2d": [300, 400, 500, 600], "label": "water leakage"}}'::jsonb, 'db-dedupe-12', 'https://picsum.photos/seed/resolve-12/800/600', 'Valve tightened and sealed.'),
-- Report 13 (Ward 2, low, open)
('6fbace2b-3f5e-6a6f-bace-bf3f5e6a6fba', now() - interval '18 hours', '0d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a', 'https://picsum.photos/seed/drain-3/800/600', 'Drainage inlet covered in plastic wrappers and leaves near the supermarket entrance.', 12.9358, 77.6248, 'drainage', 'low', 'open', 2, '{"category": "drainage", "severity": "low", "explanation": "Surface litter blocking a drain grate.", "confidence": 0.87, "isValidCivicIssue": true, "isBorderline": false, "rejectionReason": "", "segmentation_mask": {"box_2d": [400, 300, 800, 700], "label": "drainage"}}'::jsonb, 'db-dedupe-13', NULL, NULL),
-- Report 14 (Ward 5, medium, needs_manual_review)
('7acbdf3c-4f6f-7b7a-cbdf-cf4f6f7b7acb', now() - interval '12 hours', '3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d', 'https://picsum.photos/seed/pothole-3/800/600', 'Deep pothole near the railway overbridge. Vehicles are forced to brake suddenly to avoid it.', 12.9695, 77.7502, 'pothole', 'medium', 'needs_manual_review', 5, '{"category": "pothole", "severity": "medium", "explanation": "Pavement crater on a fast-moving traffic lane.", "confidence": 0.68, "isValidCivicIssue": true, "isBorderline": true, "rejectionReason": "Low confidence score (68%)", "segmentation_mask": {"box_2d": [350, 400, 600, 700], "label": "pothole"}}'::jsonb, 'db-dedupe-14', NULL, NULL),
-- Report 15 (Ward 4, medium, rejected)
('8bdcfa4d-5f7a-8c8b-dcfa-df5f7a8c8bdc', now() - interval '6 hours', '2f3a4b5c-6d7e-8f9a-0b1c-2d3e4f5a6b7c', 'https://picsum.photos/seed/bottle-1/800/600', 'Just a test picture of a water bottle.', 12.9305, 77.5835, 'pothole', 'medium', 'rejected', 4, '{"category": "pothole", "severity": "medium", "explanation": "Image does not contain a valid public infrastructure issue.", "confidence": 0.95, "isValidCivicIssue": false, "isBorderline": false, "rejectionReason": "The photo is invalid or does not contain a public space civic issue.", "segmentation_mask": {"box_2d": [0, 0, 0, 0], "label": "invalid"}}'::jsonb, 'db-dedupe-15', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Seed Feedbacks for Resolved Reports
INSERT INTO public.report_feedback (
    id,
    report_id,
    rating,
    comment,
    created_at
) VALUES
('b3d6eaf7-9f1a-2c2b-6eaf-7f9f1a2c2bd6', 'c5d0e4f1-3a4b-6c5d-0e4f-1a3b4c6c5d0e', 5, 'Very fast resolution! The street is bright and safe again. Thank you!', now() - interval '3 days 2 hours'),
('c4e7fbf8-0f2b-3d3c-7fbf-8f0f2b3d3ce7', '5ea9bd1a-2f4d-5f5e-9bd1-af2f4d5f5ea9', 4, 'Water leak stopped. Glad it was handled within a day.', now() - interval '18 hours')
ON CONFLICT (id) DO NOTHING;

-- 3. Add Worker Profile INSERT Policy
CREATE POLICY "Allow workers to insert their own profile"
    ON public.worker_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
