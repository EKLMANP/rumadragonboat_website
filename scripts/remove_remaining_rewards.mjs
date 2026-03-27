import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tmhlxhkzmssqnptmqzhy.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function removeRemaining() {
    console.log('📉 Deactivating remaining rewards (full-width parentheses)...');

    // Exact names from the DB check
    const items = [
        '團練教練課（20人）',
        '小組教練課（10人）'
    ];

    for (const name of items) {
        const { error } = await supabase
            .from('rewards')
            .update({ is_active: false })
            .eq('reward_name', name);

        if (error) {
            console.error(`  ❌ Failed to deactivate "${name}":`, error.message);
        } else {
            console.log(`  ✅ Deactivated "${name}"`);
        }
    }
}

removeRemaining().catch(console.error);
