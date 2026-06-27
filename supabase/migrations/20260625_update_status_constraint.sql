-- 1. Drop the existing status check constraint if it exists
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;

-- 2. Add the expanded status check constraint supporting rejected and needs_manual_review
ALTER TABLE reports ADD CONSTRAINT reports_status_check 
CHECK (status IN ('open', 'in_progress', 'resolved', 'rejected', 'needs_manual_review'));
