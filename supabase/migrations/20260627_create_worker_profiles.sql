-- Create Worker Profiles Table
CREATE TABLE IF NOT EXISTS public.worker_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ward_id INTEGER REFERENCES public.wards(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;

-- Select Policies: Workers can view their own profile
CREATE POLICY "Allow workers to view their own profile"
    ON public.worker_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Update Policies: Workers can update their own profile
CREATE POLICY "Allow workers to update their own profile"
    ON public.worker_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Setup automatic profile creation trigger on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.worker_profiles (id, ward_id)
  VALUES (new.id, 1); -- Default newly registered workers to Ward 1 - Downtown for easy demoing/testing
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
