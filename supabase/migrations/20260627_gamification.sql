-- Migration: Gamification (worker_thanked_at and worker_thanked_by)

ALTER TABLE reports
ADD COLUMN worker_thanked_at TIMESTAMPTZ,
ADD COLUMN worker_thanked_by UUID REFERENCES worker_profiles(id) ON DELETE SET NULL;