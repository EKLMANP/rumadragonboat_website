-- Fix user relationship for activity_registrations
-- We want to reference the public.users table so we can join it in queries

ALTER TABLE activity_registrations
DROP CONSTRAINT IF EXISTS activity_registrations_user_id_fkey;

ALTER TABLE activity_registrations
ADD CONSTRAINT activity_registrations_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id)
ON DELETE CASCADE;

-- Ensure users table has all auth users
INSERT INTO public.users (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;
