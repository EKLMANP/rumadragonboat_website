import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const deleteLegacyRewards = async () => {
    const targets = ['造型鑰匙圈', 'RUMA 限量棒球帽'];

    console.log(`Searching for rewards to delete: ${targets.join(', ')}`);

    try {
        // 1. Fetch all rewards
        const { data: rewards, error: fetchError } = await supabase
            .from('redeemable_products')
            .select('id, name');

        if (fetchError) {
            throw new Error(`Error fetching rewards: ${fetchError.message}`);
        }

        const toDelete = rewards.filter(r => targets.includes(r.name));

        if (toDelete.length === 0) {
            console.log("No matching rewards found.");
            return;
        }

        console.log(`Found ${toDelete.length} rewards to delete:`, toDelete);

        // 2. Delete them
        for (const reward of toDelete) {
            const { error: deleteError } = await supabase
                .from('redeemable_products')
                .delete()
                .eq('id', reward.id);

            if (deleteError) {
                console.error(`Failed to delete ${reward.name} (${reward.id}): ${deleteError.message}`);
            } else {
                console.log(`Successfully deleted: ${reward.name} (${reward.id})`);
            }
        }

    } catch (error) {
        console.error("Script failed:", error.message);
    }
};

deleteLegacyRewards();
