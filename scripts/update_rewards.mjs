import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tmhlxhkzmssqnptmqzhy.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is missing in environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function updateRewards() {
    console.log('🚀 Starting M-Point Rewards Update...\n');

    // 1. Deactivate items
    const itemsToDeactivate = [
        '團練教練課 (20人)',
        '教練影片回饋',
        '小組教練課 (10人)',
        '比賽前加強課優先'
    ];

    console.log('📉 Deactivating items...');
    for (const name of itemsToDeactivate) {
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

    // 2. Rename items
    const itemsToRename = [
        { oldName: '限量鑰匙圈', newName: '限量龍舟鑰匙圈' },
        { oldName: '限量毛巾', newName: 'RUMA 限量毛巾' }
    ];

    console.log('\n✏️  Renaming items...');
    for (const item of itemsToRename) {
        const { error } = await supabase
            .from('rewards')
            .update({ reward_name: item.newName })
            .eq('reward_name', item.oldName);

        if (error) {
            console.error(`  ❌ Failed to rename "${item.oldName}":`, error.message);
        } else {
            console.log(`  ✅ Renamed "${item.oldName}" to "${item.newName}"`);
        }
    }

    console.log('\n🎉 Update Complete!');
}

updateRewards().catch(err => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
});
