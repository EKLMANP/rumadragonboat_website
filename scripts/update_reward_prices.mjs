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

async function updatePrices() {
    console.log('💲 Updating M-Point Reward Prices...');

    const updates = [
        { name: '限量龍舟鑰匙圈', price: 1 },
        { name: 'RUMA 限量棒球帽', price: 2 },
        { name: 'RUMA 限量毛巾', price: 3 },
        { name: 'RUMA 限量帽T', price: 5 }
    ];

    for (const item of updates) {
        const { error } = await supabase
            .from('rewards')
            .update({ points_cost: item.price })
            .eq('reward_name', item.name);

        if (error) {
            console.error(`  ❌ Failed to update "${item.name}":`, error.message);
        } else {
            console.log(`  ✅ Updated "${item.name}" to ${item.price} M points`);
        }
    }
}

updatePrices().catch(console.error);
