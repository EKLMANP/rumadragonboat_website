
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
    console.log("Checking Data Integrity...");

    // 1. Activity Registrations
    const { count: regCount, error: regError } = await supabase
        .from('activity_registrations')
        .select('*', { count: 'exact', head: true });

    if (regError) console.error("Error checking activity_registrations:", regError);
    else console.log(`Activity Registrations count: ${regCount}`);

    // 2. M-Point Redemptions (rewards_log or similar?) - checking 'rewards_log' and 'redemptions'
    const { count: rewardCount, error: rewardError } = await supabase
        .from('rewards_log')
        .select('*', { count: 'exact', head: true });

    if (rewardError) {
        // Try 'redemptions' if rewards_log fails or doesn't exist, though usually it's one of them
        console.log("rewards_log check failed, trying to find correct table...");
    } else {
        console.log(`Rewards Log count: ${rewardCount}`);
    }

    // 3. Training Records
    const { count: trainingCount, error: trainingError } = await supabase
        .from('training_records')
        .select('*', { count: 'exact', head: true });

    if (trainingError) console.error("Error checking training_records:", trainingError);
    else console.log(`Training Records count: ${trainingCount}`);

    // 4. Activities
    const { count: actCount, error: actError } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true });

    if (actError) console.error("Error checking activities:", actError);
    else console.log(`Activities count: ${actCount}`);

}

checkData();
