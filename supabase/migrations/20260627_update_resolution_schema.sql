-- Phase 2.3.5 — Resolution Flow (stretch)
-- Add columns to reports table
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS after_image_url TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS worker_notes TEXT;

-- Drop and recreate report_status_history with additional fields
-- (Safe because this is a development/hackathon schema without production dependencies)
DROP TABLE IF EXISTS public.report_status_history;

CREATE TABLE public.report_status_history (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id            UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  from_status          TEXT NOT NULL,
  to_status            TEXT NOT NULL,
  changed_by           UUID NOT NULL REFERENCES auth.users(id),
  changed_at           TIMESTAMPTZ DEFAULT now() NOT NULL,
  action_type          TEXT NOT NULL CHECK (action_type IN ('investigate', 'resolve', 'reject')),
  after_image_url      TEXT,
  rejection_reason     TEXT,
  worker_notes         TEXT
);

-- Enable RLS on history
ALTER TABLE public.report_status_history ENABLE ROW LEVEL SECURITY;

-- Select policies: Authenticated workers can read history
CREATE POLICY "Allow authenticated workers to read history"
  ON public.report_status_history FOR SELECT
  TO authenticated
  USING (true);

-- Insert policies: Authenticated workers can insert history
CREATE POLICY "Allow authenticated workers to insert history"
  ON public.report_status_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = changed_by);

-- Create report_feedback table
CREATE TABLE IF NOT EXISTS public.report_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID NOT NULL UNIQUE REFERENCES public.reports(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on feedback
ALTER TABLE public.report_feedback ENABLE ROW LEVEL SECURITY;

-- Allow public insert of feedback (since citizens are anonymous and never authenticate)
CREATE POLICY "Allow public insert of feedback"
  ON public.report_feedback FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public read of feedback
CREATE POLICY "Allow public read of feedback"
  ON public.report_feedback FOR SELECT
  TO public
  USING (true);
