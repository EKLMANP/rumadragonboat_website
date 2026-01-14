-- Create table for training records
CREATE TABLE IF NOT EXISTS training_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    custom_type TEXT,
    notes TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own training records" 
ON training_records FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training records" 
ON training_records FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Assume 'user_roles' links to 'roles' table
CREATE POLICY "Coaches can view all records" 
ON training_records FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('coach', 'admin', 'manager', 'management')
    )
);

CREATE POLICY "Coaches can update records" 
ON training_records FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('coach', 'admin', 'manager', 'management')
    )
);

-- Create storage bucket for training photos
-- This requires permissions on storage.buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('training-photos', 'training-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access to Training Photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'training-photos' );

CREATE POLICY "Authenticated users can upload training photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'training-photos' 
    AND auth.role() = 'authenticated'
);
