-- Create constrained role type
CREATE TYPE user_role AS ENUM ('worker', 'admin');

-- Add role to worker_profiles
ALTER TABLE public.worker_profiles
ADD COLUMN role user_role NOT NULL DEFAULT 'worker';

-- Update RLS for worker_profiles to allow admins to manage all workers
DROP POLICY IF EXISTS "Allow workers to view their own profile" ON public.worker_profiles;
DROP POLICY IF EXISTS "Allow workers to update their own profile" ON public.worker_profiles;

-- Admins can read all profiles, workers can only read their own
CREATE POLICY "Profiles read policy"
    ON public.worker_profiles FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id OR
        (SELECT role FROM public.worker_profiles WHERE id = auth.uid()) = 'admin'
    );

-- Admins can update any profile, workers can only update their own (and only certain fields, though enforced via API)
CREATE POLICY "Profiles update policy"
    ON public.worker_profiles FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id OR
        (SELECT role FROM public.worker_profiles WHERE id = auth.uid()) = 'admin'
    );

-- Create Admin Audit Logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    action VARCHAR(255) NOT NULL,
    target_id UUID, -- Optional ID of the user/entity affected
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for Audit Logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON public.admin_audit_logs FOR SELECT
    TO authenticated
    USING (
        (SELECT role FROM public.worker_profiles WHERE id = auth.uid()) = 'admin'
    );

-- Anyone authenticated (specifically admins, but technically app logic controls inserts) can insert
CREATE POLICY "Admins can insert audit logs"
    ON public.admin_audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT role FROM public.worker_profiles WHERE id = auth.uid()) = 'admin'
    );

-- NO UPDATE OR DELETE policies. Audit logs are immutable.
