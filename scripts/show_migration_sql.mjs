import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must use Service Role Key for RLS changes

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Role Key in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    const sqlPath = path.resolve(__dirname, '../supabase/migrations/fix_activities_rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration: fix_activities_rls.sql');

    // Splitting by statement to execute one by one (simplified)
    // Note: Supabase JS client doesn't support raw SQL execution directly on public schema easily without an RPC or specific setup.
    // However, we can try to use the `pg` driver if available, or just instruct the user.
    // BUT, since we are an agent, we should try to be helpful. 
    // If we can't run SQL, we'll log it.

    // Actually, for this environment, we might not have direct SQL access.
    // Let's try to use a postgres connection if available, or just output the instruction.

    console.log('----------------------------------------------------------------');
    console.log('PLEASE RUN THE FOLLOWING SQL IN SUPABASE DASHBOARD -> SQL EDITOR:');
    console.log('----------------------------------------------------------------');
    console.log(sql);
    console.log('----------------------------------------------------------------');
}

runMigration();
