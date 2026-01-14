#!/usr/bin/env node
/**
 * RUMA Dragon Boat - 資料遷移腳本
 * 從 Google Apps Script 遷移資料至 Supabase
 * 
 * 使用方式：
 * 1. 確保已安裝依賴：npm install @supabase/supabase-js dotenv
 * 2. 確保 .env 中有 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY
 * 3. 執行：node scripts/migrate-data.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// 載入環境變數
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx7---INM12kQvRJ7n3xEbN2M_RKmyEInqIqlO9pOIZ2guMui0TStaAOIBdm7Hhr4w3/exec';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ 請確保 .env 中有設定 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 顏色輸出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

const log = {
    info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
};

/**
 * 從 Google Apps Script 取得所有資料
 */
async function fetchFromGAS() {
    log.info('正在從 Google Apps Script 取得資料...');

    try {
        const response = await fetch(`${GAS_URL}?action=fetchAllData`);
        const data = await response.json();

        log.success(`取得 ${data.users?.length || 0} 位隊員`);
        log.success(`取得 ${data.dates?.length || 0} 個練習日期`);
        log.success(`取得 ${data.registrations?.length || 0} 筆報名紀錄`);
        log.success(`取得 ${data.equipment?.length || 0} 項裝備`);
        log.success(`取得 ${data.borrowRecords?.length || 0} 筆借用紀錄`);

        // 另外取得出席紀錄
        const attResponse = await fetch(`${GAS_URL}?action=getAttendance`);
        const attendance = await attResponse.json();
        log.success(`取得 ${attendance?.length || 0} 筆出席紀錄`);

        return { ...data, attendance };
    } catch (error) {
        log.error(`從 GAS 取得資料失敗: ${error.message}`);
        throw error;
    }
}

/**
 * 遷移隊員資料
 */
async function migrateMembers(users) {
    if (!users || users.length === 0) {
        log.warn('沒有隊員資料需要遷移');
        return;
    }

    log.info(`正在遷移 ${users.length} 位隊員...`);

    const records = users.map(u => ({
        name: u.Name,
        weight: u.Weight ? parseFloat(u.Weight) : null,
        position: u.Position || '可以划左右槳及擔任舵手',
        skill_rating: parseInt(u.Skill_Rating) || 1
    }));

    const { error } = await supabase
        .from('members')
        .upsert(records, { onConflict: 'name' });

    if (error) {
        log.error(`隊員資料遷移失敗: ${error.message}`);
    } else {
        log.success(`隊員資料遷移完成`);
    }
}

/**
 * 遷移練習日期
 */
async function migratePracticeDates(dates) {
    if (!dates || dates.length === 0) {
        log.warn('沒有練習日期需要遷移');
        return;
    }

    log.info(`正在遷移 ${dates.length} 個練習日期...`);

    const records = dates.map(d => {
        const displayDate = d.Confirmed_date || d.Confirmed_Date;
        // 從 "2026/01/11(Sat)" 取出 "2026-01-11"
        const datePart = displayDate.split('(')[0].replace(/\//g, '-');

        return {
            confirmed_date: datePart,
            display_date: displayDate,
            place: d.Place || '碧潭 Bitan',
            meeting_time: d.Meeting_Time || '07:30'
        };
    });

    const { error } = await supabase
        .from('practice_dates')
        .upsert(records, { onConflict: 'confirmed_date' });

    if (error) {
        log.error(`練習日期遷移失敗: ${error.message}`);
    } else {
        log.success(`練習日期遷移完成`);
    }
}

/**
 * 遷移報名紀錄
 */
async function migrateRegistrations(registrations) {
    if (!registrations || registrations.length === 0) {
        log.warn('沒有報名紀錄需要遷移');
        return;
    }

    log.info(`正在遷移 ${registrations.length} 筆報名紀錄...`);

    const records = registrations.map(r => ({
        member_name: r.name,
        practice_date: r.practicedates
    }));

    const { error } = await supabase
        .from('practice_registrations')
        .upsert(records, { onConflict: 'member_name,practice_date' });

    if (error) {
        log.error(`報名紀錄遷移失敗: ${error.message}`);
    } else {
        log.success(`報名紀錄遷移完成`);
    }
}

/**
 * 遷移出席紀錄
 */
async function migrateAttendance(attendance) {
    if (!attendance || attendance.length === 0) {
        log.warn('沒有出席紀錄需要遷移');
        return;
    }

    log.info(`正在遷移 ${attendance.length} 筆出席紀錄...`);

    const records = attendance.map(a => ({
        member_name: a.Name,
        practice_date: a.Date
    }));

    const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'member_name,practice_date' });

    if (error) {
        log.error(`出席紀錄遷移失敗: ${error.message}`);
    } else {
        log.success(`出席紀錄遷移完成`);
    }
}

/**
 * 遷移裝備庫存
 */
async function migrateEquipment(equipment) {
    if (!equipment || equipment.length === 0) {
        log.warn('沒有裝備資料需要遷移');
        return;
    }

    log.info(`正在遷移 ${equipment.length} 項裝備...`);

    const records = equipment.map(e => ({
        item: e.Item,
        count: parseInt(e.Count) || 0
    }));

    const { error } = await supabase
        .from('equipment_inventory')
        .upsert(records, { onConflict: 'item' });

    if (error) {
        log.error(`裝備資料遷移失敗: ${error.message}`);
    } else {
        log.success(`裝備資料遷移完成`);
    }
}

/**
 * 遷移借用紀錄
 */
async function migrateBorrowRecords(borrowRecords) {
    if (!borrowRecords || borrowRecords.length === 0) {
        log.warn('沒有借用紀錄需要遷移');
        return;
    }

    log.info(`正在遷移 ${borrowRecords.length} 筆借用紀錄...`);

    const records = borrowRecords.map(b => ({
        member_name: b.Name,
        borrow_date: b.Date,
        item: b.Item,
        count: parseInt(b.Count) || 1
    }));

    const { error } = await supabase
        .from('borrow_records')
        .insert(records);

    if (error) {
        log.error(`借用紀錄遷移失敗: ${error.message}`);
    } else {
        log.success(`借用紀錄遷移完成`);
    }
}

/**
 * 主程式
 */
async function main() {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('   RUMA Dragon Boat - 資料遷移工具');
    console.log('   Google Apps Script → Supabase');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n');

    try {
        // 1. 從 GAS 取得資料
        const data = await fetchFromGAS();

        console.log('\n');
        log.info('開始遷移資料至 Supabase...');
        console.log('');

        // 2. 依序遷移各資料表
        await migrateMembers(data.users);
        await migratePracticeDates(data.dates);
        await migrateRegistrations(data.registrations);
        await migrateAttendance(data.attendance);
        await migrateEquipment(data.equipment);
        await migrateBorrowRecords(data.borrowRecords);

        console.log('\n');
        console.log('═══════════════════════════════════════════════════');
        log.success('所有資料遷移完成！');
        console.log('═══════════════════════════════════════════════════');
        console.log('\n');

    } catch (error) {
        console.log('\n');
        log.error(`遷移失敗: ${error.message}`);
        process.exit(1);
    }
}

main();
