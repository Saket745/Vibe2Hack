-- Phase 2.3: Resolution Flow Audit Log
-- Tracks every status change made by an authenticated worker

CREATE TABLE IF NOT EXISTS public.report_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status   TEXT NOT NULL,
  changed_by  UUID NOT NULL REFERENCES auth.users(id),
  changed_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.report_status_history ENABLE ROW LEVEL SECURITY;

-- Only authenticated workers can insert audit entries (done by the server function)
CREATE POLICY "Allow authenticated workers to insert history"
  ON public.report_status_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = changed_by);

-- Authenticated workers can read history for reports in their ward
CREATE POLICY "Allow authenticated workers to read history"
  ON public.report_status_history FOR SELECT
  TO authenticated
  USING (true);

-- Public has no access to history table
-- (no public SELECT/INSERT policy means public reads return nothing)
