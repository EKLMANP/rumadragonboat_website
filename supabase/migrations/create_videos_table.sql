-- create_videos_table.sql
-- Create table for Videos feature

CREATE TABLE IF NOT EXISTS public.videos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sort_order INTEGER DEFAULT 0
);

-- RLS settings
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow authenticated read videos" ON public.videos
    FOR SELECT TO authenticated USING (true);

-- Allow insert for authenticated users
CREATE POLICY "Allow authenticated insert videos" ON public.videos
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow update for authenticated users (management will use this to reorder)
CREATE POLICY "Allow authenticated update videos" ON public.videos
    FOR UPDATE TO authenticated USING (true);

-- Allow delete for authenticated users (in case management needs to delete)
CREATE POLICY "Allow authenticated delete videos" ON public.videos
    FOR DELETE TO authenticated USING (true);
