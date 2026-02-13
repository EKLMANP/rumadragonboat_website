// run_migrations.mjs - Execute M-Point SQL migrations via Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tmhlxhkzmssqnptmqzhy.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigrations() {
    console.log('🚀 開始執行 M-Point 資料庫遷移 (修正版)...\n');

    // 1. Add total_points column to members
    console.log('📊 步驟 1/3: 新增 total_points 欄位到 members 表...');
    const { data: d1, error: e1 } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE members ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;`
    }).maybeSingle();

    if (e1) {
        // Try direct approach if RPC not available
        console.log('  ⚠️  RPC 方式失敗，改用直接操作...');
        const { data: cols } = await supabase
            .from('members')
            .select('total_points')
            .limit(1);

        if (cols !== null) {
            console.log('  ✅ total_points 欄位已存在！');
        } else {
            console.log('  ❌ 需要手動到 Supabase SQL Editor 執行 ALTER TABLE');
        }
    } else {
        console.log('  ✅ total_points 欄位新增成功！');
    }

    // 2. Check/Insert TRAINING_FITNESS rule
    // Schema: rule_code, rule_name, category, activity_type, base_points, description
    console.log('\n📋 步驟 2/3: 確認 TRAINING_FITNESS 點數規則...');
    const { data: existingRule } = await supabase
        .from('point_rules')
        .select('*')
        .eq('rule_code', 'TRAINING_FITNESS')
        .maybeSingle();

    if (existingRule) {
        console.log(`  ✅ 規則已存在: "${existingRule.rule_name}" = ${existingRule.base_points} 點`);
    } else {
        const { data: newRule, error: e2 } = await supabase
            .from('point_rules')
            .insert({
                rule_code: 'TRAINING_FITNESS',
                rule_name: '體能課出席',
                category: 'attendance',
                activity_type: 'fitness',
                base_points: 1,
                description: '每次體能課出席獲得 1 M點'
            })
            .select()
            .single();

        if (e2) {
            console.log(`  ❌ 插入失敗: ${e2.message}`);
        } else {
            console.log(`  ✅ 規則新增成功: "${newRule.rule_name}" = ${newRule.base_points} 點`);
        }
    }

    // 3. Insert sample rewards
    // Schema: reward_code, reward_name, category, pool_type, points_cost, description
    console.log('\n🎁 步驟 3/3: 新增可兌換商品...');
    const rewards = [
        {
            reward_code: 'MERCH_KEYCHAIN',
            reward_name: '槳造型鑰匙圈',
            points_cost: 5,
            description: 'RUMA 限定紀念品',
            category: 'merchandise',
            pool_type: 'general_pool',
            is_active: true
        },
        {
            reward_code: 'MERCH_HOODIE',
            reward_name: 'RUMA 限量帽T',
            points_cost: 50,
            description: '隊伍專屬設計',
            category: 'merchandise',
            pool_type: 'general_pool',
            is_active: true
        },
        {
            reward_code: 'MERCH_CAP',
            reward_name: 'RUMA 限量棒球帽',
            points_cost: 25,
            description: '隊伍專屬設計',
            category: 'merchandise',
            pool_type: 'general_pool',
            is_active: true
        },
    ];

    for (const reward of rewards) {
        const { data: existing } = await supabase
            .from('rewards')
            .select('id')
            .eq('reward_code', reward.reward_code)
            .maybeSingle();

        if (existing) {
            console.log(`  ⏭️  "${reward.reward_name}" 已存在，跳過`);
        } else {
            const { error: e3 } = await supabase
                .from('rewards')
                .insert(reward);

            if (e3) {
                console.log(`  ❌ "${reward.reward_name}" 插入失敗: ${e3.message}`);
            } else {
                console.log(`  ✅ "${reward.reward_name}" (${reward.points_cost} M點) 新增成功`);
            }
        }
    }

    console.log('\n🎉 所有遷移執行完成！');
}

runMigrations().catch(err => {
    console.error('❌ 執行失敗:', err.message);
    process.exit(1);
});
