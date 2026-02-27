// run_video_migration.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log('Running videos migration...');
    const sql = fs.readFileSync('./supabase/migrations/create_videos_table.sql', 'utf8');

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error('Error running migration via RPC:', error.message);
        // Sometimes exec_sql RPC is not created, fall back to suggesting manual run
        console.log('Please copy and paste the SQL in supabase/migrations/create_videos_table.sql into the Supabase SQL Editor manually.');
    } else {
        console.log('Migration successful.');
    }
}

run();
