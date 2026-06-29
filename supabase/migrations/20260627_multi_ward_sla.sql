-- Migration: Multi-ward incidents and SLA metrics
-- Description: Supports assigning a massive incident to multiple wards and tracking SLA response times.

-- 1. Add new array column for multi-ward assignment
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS ward_ids INTEGER[] DEFAULT '{}';

-- 2. Backfill ward_ids from existing ward_id (if not null)
UPDATE public.reports
SET ward_ids = ARRAY[ward_id]
WHERE ward_id IS NOT NULL;

-- 3. Add SLA tracking columns
ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS in_progress_at TIMESTAMPTZ;

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 4. Create an index for querying ward_ids array
CREATE INDEX IF NOT EXISTS idx_reports_ward_ids ON public.reports USING GIN (ward_ids);
