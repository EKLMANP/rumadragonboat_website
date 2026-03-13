// src/api/supabaseApi.js
// Supabase API - 取代 Google Apps Script

import { supabase } from '../lib/supabase';

// =====================================================
// 工具函數
// =====================================================

/**
 * 為 Promise 添加超時保護
 * @param {Promise} promise - 原始 Promise
 * @param {number} ms - 超時毫秒數
 * @param {*} fallback - 超時時的回傳值
 */
const withTimeout = async (promise, ms = 8000, fallback = null) => {
    let timeoutId;
    const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(() => {
            console.warn(`API 請求超時 (${ms}ms)`);
            resolve(fallback);
        }, ms);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
    } catch (err) {
        clearTimeout(timeoutId);
        console.warn('API 請求錯誤:', err.message);
        return fallback;
    }
};

// =====================================================
// 讀取資料
// =====================================================

/**
 * 一次取得所有資料（對應 fetchAllData）
 * 這是最重要的 API，用於頁面初始化
 */
export const fetchAllData = async () => {
    const defaultResult = { users: [], dates: [], registrations: [], equipment: [], borrowRecords: [] };

    try {
        const results = await withTimeout(
            Promise.all([
                supabase.from('members').select('*').order('name'),
                supabase.from('practice_dates').select('*').order('confirmed_date', { ascending: false }),
                supabase.from('practice_registrations').select('*'),
                supabase.from('equipment_inventory').select('*'),
                supabase.from('borrow_records').select('*').order('created_at', { ascending: false }),
                supabase.from('attendance').select('*')
            ]),
            8000, // 8 秒超時 (大量資料)
            null
        );

        if (!results) return defaultResult;

        const [members, dates, registrations, equipment, borrowRecords, attendance] = results;

        return {
            // 對應 Google Sheets 欄位名稱格式
            users: (members?.data || []).map(m => ({
                Name: m.name,
                Email: m.email,
                Weight: m.weight,
                Position: m.position,
                Skill_Rating: m.skill_rating,
                M_Points: m.total_points || 0
            })),
            dates: (dates?.data || []).map(d => ({
                Confirmed_date: d.display_date,
                Confirmed_Date: d.display_date,
                Place: d.place,
                Meeting_Time: d.meeting_time
            })),
            registrations: (registrations?.data || []).map(r => ({
                name: r.member_name,
                practicedates: r.practice_date
            })),
            equipment: (equipment?.data || []).map(e => ({
                Item: e.item,
                Count: e.count
            })),
            borrowRecords: (borrowRecords?.data || []).map(b => ({
                Name: b.member_name,
                Date: b.borrow_date,
                Item: b.item,
                Count: b.count
            })),
            attendance: (attendance?.data || []).map(a => ({
                Date: a.practice_date,
                Name: a.member_name
            }))
        };
    } catch (error) {
        console.error("Error fetching all data:", error);
        return defaultResult;
    }
};

/**
 * 取得使用者列表（對應 fetchUsers）
 */
export const fetchUsers = async () => {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

    if (error) {
        console.error("Error fetching users:", error);
        return [];
    }

    return data.map(m => ({
        Name: m.name,
        Email: m.email,
        Weight: m.weight,
        Position: m.position,
        Skill_Rating: m.skill_rating
    }));
};

/**
 * 取得隊員基本資料 (用於顯示頭像等) - 具備 Timeout 保護
 */
export const fetchMemberBasicInfo = async () => {
    try {
        const result = await withTimeout(
            supabase
                .from('members')
                .select('name, avatar_url')
                .order('name'),
            5000,
            { data: [], error: null }
        );

        if (result?.error) {
            console.error("Error fetching member basic info:", result.error);
            return [];
        }
        return result?.data || [];
    } catch (error) {
        console.error("Error fetching member basic info:", error);
        return [];
    }
};

/**
 * 取得練習日期（對應 fetchDates）
 */
export const fetchDates = async () => {
    const { data, error } = await supabase
        .from('practice_dates')
        .select('*')
        .order('confirmed_date', { ascending: false });

    if (error) {
        console.error("Error fetching dates:", error);
        return [];
    }

    return data.map(d => ({
        Confirmed_date: d.display_date,
        Confirmed_Date: d.display_date,
        Place: d.place,
        Meeting_Time: d.meeting_time
    }));
};

/**
 * 取得報名資料（對應 fetchRegistrations）
 */
export const fetchRegistrations = async () => {
    const { data, error } = await supabase
        .from('practice_registrations')
        .select('*');

    if (error) {
        console.error("Error fetching registrations:", error);
        return [];
    }

    return data.map(r => ({
        name: r.member_name,
        practicedates: r.practice_date
    }));
};

/**
 * 取得出席紀錄（對應 fetchAttendance）
 */
export const fetchAttendance = async () => {
    try {
        const result = await withTimeout(
            supabase.from('attendance').select('*'),
            6000,
            { data: [], error: null }
        );

        if (result?.error) {
            console.error("Error fetching attendance:", result.error);
            return [];
        }

        return (result?.data || []).map(a => ({
            Date: a.practice_date,
            Name: a.member_name
        }));
    } catch (error) {
        console.error("Error fetching attendance:", error);
        return [];
    }
};

/**
 * 取得活動列表
 */
export const fetchActivities = async (upcomingOnly = false) => {
    try {
        let query = supabase
            .from('activities')
            .select('*')
            .order('date', { ascending: false });

        if (upcomingOnly) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            query = query.gte('date', yesterday.toISOString().split('T')[0]);
        }

        const result = await withTimeout(
            query,
            5000,
            { data: [], error: null }
        );

        if (result?.error) {
            console.error("Error fetching activities:", result.error);
            return [];
        }
        return result?.data || [];
    } catch (error) {
        console.error("Error fetching activities:", error);
        return [];
    }
};

/**
 * 取得活動報名列表
 */
export const fetchActivityRegistrations = async (userOnly = false, upcomingOnly = false) => {
    try {
        let query = supabase
            .from('activity_registrations')
            .select(`
                *,
                activities!inner (name, date, type, location, start_time)
            `);

        // 如果 userOnly 為 true，僅撈當前使用者的報名紀錄
        if (userOnly) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            query = query.eq('user_id', user.id);
        }

        if (upcomingOnly) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            query = query.gte('activities.date', yesterday.toISOString().split('T')[0]);
        }

        const result = await withTimeout(
            query,
            6000,
            { data: [], error: null }
        );

        if (result?.error) {
            console.error("Error fetching activity registrations:", result.error);
            return [];
        }
        return result?.data || [];
    } catch (error) {
        console.error("Error fetching activity registrations:", error);
        return [];
    }
};

/**
 * 取得公告列表
 */
export const fetchAnnouncements = async () => {
    try {
        const result = await withTimeout(
            supabase
                .from('announcements')
                .select('*')
                .order('pinned', { ascending: false })
                .order('created_at', { ascending: false }),
            5000,
            { data: [], error: null }
        );

        if (result?.error) {
            console.error("Error fetching announcements:", result.error);
            return [];
        }
        return result?.data || [];
    } catch (error) {
        console.error("Error fetching announcements:", error);
        return [];
    }
};

// =====================================================
// 影片管理 (Videos)
// =====================================================

/**
 * 取得各式影片列表 (輕量查詢，不需 timeout wrapper)
 */
export const fetchVideos = async () => {
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching videos:", error);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error("Error fetching videos:", error);
        return [];
    }
};

/**
 * 新增影片
 */
const createVideo = async (params) => {
    const { error } = await supabase
        .from('videos')
        .insert({
            title: params.title,
            category: params.category,
            url: params.url,
            sort_order: 0 // 新影片預設在最上面
        });

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

/**
 * 更新多個影片的排序
 */
export const updateVideoOrder = async (updates) => {
    // updates should be an array of { id, sort_order }
    // Supabase JS doesn't have a direct upsert for bulk without full rows easily,
    // but we can loop or use a custom RPC. For simplicity and small numbers, we can loop updating.
    try {
        const promises = updates.map(update =>
            supabase
                .from('videos')
                .update({ sort_order: update.sort_order })
                .eq('id', update.id)
        );

        await Promise.all(promises);
        return { success: true };
    } catch (error) {
        console.error("Error updating video order:", error);
        return { success: false, message: error.message };
    }
};

/**
 * 更新單一影片資料
 */
export const updateVideo = async (id, updates) => {
    const { error } = await supabase
        .from('videos')
        .update(updates)
        .eq('id', id);

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

/**
 * 刪除影片
 */
export const deleteVideo = async (id) => {
    const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

// =====================================================
// 寫入資料 (POST 操作)
// =====================================================

/**
 * 通用 POST 資料函式（對應 postData）
 */
export const postData = async (action, params) => {
    try {
        switch (action) {
            // === 報名相關 ===
            case 'register':
                return await registerForPractice(params.Name, params.Dates);

            case 'unregister':
                return await unregisterFromPractice(params.Name, params.Date);

            case 'unregisterActivity':
                return await unregisterFromActivity(params.registrationId);

            // === 活動管理 ===
            case 'addActivity':
                return await createActivity(params);

            case 'deleteActivity':
                return await deleteActivity(params.id);

            // === 公告管理 ===
            case 'addAnnouncement':
                return await createAnnouncement(params);

            case 'deleteAnnouncement':
                return await deleteAnnouncement(params.id);

            case 'updateAnnouncement':
                return await updateAnnouncement(params);

            // === 舊版日期管理 (逐步棄用) ===
            case 'addDate':
                return await addPracticeDate(params.Confirmed_date, params.Place, params.Meeting_Time);

            case 'deleteDate':
                return await deletePracticeDate(params.Confirmed_date);

            case 'clearPastData':
                return await clearPastData();

            // === 隊員管理 ===
            case 'addUser':
                return await addMember(params);

            case 'updateUser':
                return await updateMember(params);

            case 'deleteUser':
                return await deleteMember(params.Name);

            // === 影片管理 ===
            case 'addVideo':
                return await createVideo(params);

            case 'updateVideoOrder':
                return await updateVideoOrder(params.updates);

            // === 裝備管理 ===
            case 'updateEquipment':
                return await updateEquipment(params.Item, params.Count);

            case 'addBorrowRecord':
                return await addBorrowRecord(params);

            case 'deleteBorrowRecord':
                return await deleteBorrowRecord(params);

            case 'deleteBorrowRecord':
                return await deleteBorrowRecord(params);

            // === 獎勵管理 ===
            case 'addReward':
                return await addReward(params);

            case 'deleteReward':
                return await deleteReward(params.id);

            case 'updateReward':
                return await updateReward(params);

            // === 自主訓練紀錄 ===
            case 'addTrainingRecord':
                return await addTrainingRecord(params);

            default:
                return { success: false, message: `Unknown action: ${action}` };
        }
    } catch (error) {
        console.error(`Error posting data (${action}):`, error);
        return { success: false, message: error.message };
    }
};

// =====================================================
// 報名功能
// =====================================================

/**
 * 報名練習
 */
const registerForPractice = async (name, dates) => {
    const dateArray = Array.isArray(dates) ? dates : [dates];

    const inserts = dateArray.map(date => ({
        member_name: name,
        practice_date: date
    }));

    const { error } = await supabase
        .from('practice_registrations')
        .upsert(inserts, { onConflict: 'member_name,practice_date' });

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

/**
 * 取消報名
 */
const unregisterFromPractice = async (name, date) => {
    const { error } = await supabase
        .from('practice_registrations')
        .delete()
        .eq('member_name', name)
        .eq('practice_date', date);

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

// =====================================================
// 活動管理 (Activities)
// =====================================================

const createActivity = async (params) => {
    const { data, error } = await supabase
        .from('activities')
        .insert({
            name: params.name,
            type: params.type,
            date: params.date,
            start_time: params.start_time || null,
            end_time: params.end_time || null,
            location: params.location,
            deadline: params.deadline || null,
            description: params.description || ''
        })
        .select()
        .single();

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true, data: data };
};

const deleteActivity = async (id) => {
    const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

const unregisterFromActivity = async (registrationId) => {
    const { error } = await supabase
        .from('activity_registrations')
        .delete()
        .eq('id', registrationId);

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

// =====================================================
// 公告管理
// =====================================================

const createAnnouncement = async (params) => {
    const { error } = await supabase
        .from('announcements')
        .insert({
            title: params.title,
            content: params.content,
            category: params.category,
            date: params.date,
            pinned: params.pinned || false
        });

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

const deleteAnnouncement = async (id) => {
    const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

const updateAnnouncement = async (params) => {
    const { error } = await supabase
        .from('announcements')
        .update({
            title: params.title,
            content: params.content,
            category: params.category,
            date: params.date,
            pinned: params.pinned || false,
            updated_at: new Date().toISOString()
        })
        .eq('id', params.id);

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

// =====================================================
// 日期管理 (Legacy)
// =====================================================

/**
 * 新增練習日期
 */
const addPracticeDate = async (displayDate, place, meetingTime) => {
    // 從 display_date 解析出實際日期
    // 例如 "2026/01/11(Sat)" -> "2026-01-11"
    const datePart = displayDate.split('(')[0].replace(/\//g, '-');

    const { error } = await supabase
        .from('practice_dates')
        .insert({
            confirmed_date: datePart,
            display_date: displayDate,
            place: place,
            meeting_time: meetingTime
        });

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

/**
 * 刪除練習日期
 */
const deletePracticeDate = async (displayDate) => {
    const { error } = await supabase
        .from('practice_dates')
        .delete()
        .eq('display_date', displayDate);

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

/**
 * 清除過期資料
 */
const clearPastData = async () => {
    const today = new Date().toISOString().split('T')[0];

    // 刪除過期的練習日期
    await supabase
        .from('practice_dates')
        .delete()
        .lt('confirmed_date', today);

    // 刪除對應的報名紀錄（需要先找出過期的 display_date）
    const { data: pastDates } = await supabase
        .from('practice_dates')
        .select('display_date')
        .lt('confirmed_date', today);

    if (pastDates && pastDates.length > 0) {
        const pastDisplayDates = pastDates.map(d => d.display_date);
        await supabase
            .from('practice_registrations')
            .delete()
            .in('practice_date', pastDisplayDates);
    }

    return { success: true };
};

// =====================================================
// 隊員管理
// =====================================================

/**
 * 新增隊員
 */
const addMember = async (params) => {
    const { error } = await supabase
        .from('members')
        .insert({
            name: params.Name,
            email: params.Email || null,
            weight: params.Weight || null,
            position: params.Position,
            skill_rating: parseInt(params.Skill_Rating) || 1
        });

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

/**
 * 更新隊員
 */
const updateMember = async (params) => {
    const { error } = await supabase
        .from('members')
        .update({
            email: params.Email || null,
            weight: params.Weight,
            position: params.Position,
            skill_rating: parseInt(params.Skill_Rating) || 1,
            updated_at: new Date().toISOString()
        })
        .eq('name', params.Name);

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

/**
 * 刪除隊員
 */
const deleteMember = async (name) => {
    const { error } = await supabase
        .from('members')
        .delete()
        .eq('name', name);

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

// =====================================================
// 裝備管理
// =====================================================

/**
 * 更新裝備庫存
 */
const updateEquipment = async (item, count) => {
    const { error } = await supabase
        .from('equipment_inventory')
        .upsert({
            item: item,
            count: count,
            updated_at: new Date().toISOString()
        }, { onConflict: 'item' });

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

/**
 * 新增借用紀錄
 */
const addBorrowRecord = async (params) => {
    const { error } = await supabase
        .from('borrow_records')
        .insert({
            member_name: params.Name,
            borrow_date: params.Date,
            item: params.Item,
            count: params.Count
        });

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

/**
 * 刪除借用紀錄
 */
const deleteBorrowRecord = async (params) => {
    const { error } = await supabase
        .from('borrow_records')
        .delete()
        .eq('member_name', params.Name)
        .eq('borrow_date', params.Date)
        .eq('item', params.Item);

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
};

// =====================================================
// 自主訓練紀錄
// =====================================================

/**
 * 取得自主訓練紀錄
 */
export const fetchTrainingRecords = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('training_records')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching training records:", error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error("Error fetching training records:", error);
        return [];
    }
};

/**
 * 新增自主訓練紀錄
 */
const addTrainingRecord = async (params) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, message: '尚未登入' };

        let fileUrl = null;

        // 1. 上傳檔案 (如果有)
        if (params.file) {
            const fileExt = params.file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('training-photos')
                .upload(filePath, params.file);

            if (uploadError) {
                console.error("Upload error:", uploadError);
                return { success: false, message: '圖片上傳失敗' };
            }

            // 取得 Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('training-photos')
                .getPublicUrl(filePath);

            fileUrl = publicUrl;
        }

        // 2. 插入紀錄
        const { error } = await supabase
            .from('training_records')
            .insert({
                user_id: user.id,
                date: params.date,
                type: params.type,
                custom_type: params.customType,
                notes: params.notes,
                file_url: fileUrl,
                status: 'pending' // 預設審核中
            });

        if (error) {
            return { success: false, message: error.message };
        }

        // 3. 自動獎勵 M 點 (自主訓練上傳即得 1 M 點)
        try {
            // 嘗試取得 TRAINING_SELF 規則
            let pointsToAward = 1; // 預設 1 點
            let ruleId = null;
            const { data: rule } = await supabase
                .from('point_rules')
                .select('id, base_points')
                .eq('rule_code', 'TRAINING_SELF')
                .maybeSingle();

            if (rule) {
                pointsToAward = rule.base_points || 1;
                ruleId = rule.id;
            }

            // 讀取目前點數
            const { data: member } = await supabase
                .from('members')
                .select('total_points')
                .eq('email', user.email)
                .maybeSingle();

            const currentPoints = member?.total_points || 0;
            const newPoints = currentPoints + pointsToAward;

            // 更新 members 表的 total_points
            await supabase
                .from('members')
                .update({ total_points: newPoints })
                .eq('email', user.email);

            // 寫入 point_events 歷史紀錄
            const trainingLabel = params.type === '其他' && params.customType
                ? `${params.type} (${params.customType})`
                : params.type;

            await supabase.from('point_events').insert({
                user_id: user.id,
                event_type: 'earned',
                points_change: pointsToAward,
                balance_after: newPoints,
                source_type: 'self_training',
                source_id: params.date,
                rule_id: ruleId,
                description: `自主訓練: ${trainingLabel} (${params.date})`
            });

            console.log(`自主訓練上傳成功，獎勵 ${pointsToAward} M 點`);
        } catch (pointError) {
            // M 點獎勵失敗不影響訓練紀錄的成功
            console.warn('自主訓練 M 點獎勵失敗:', pointError.message);
        }

        return { success: true };
    } catch (error) {
        console.error("Error adding training record:", error);
        return { success: false, message: error.message };
    }
};

// =====================================================
// 點名系統
// =====================================================

/**
 * 儲存出席名單（對應 saveAttendance）
 */
export const saveAttendance = async (date, attendees) => {
    try {
        // 1. 先執行原本的點名儲存邏輯 (重置當日出席)
        await supabase
            .from('attendance')
            .delete()
            .eq('practice_date', date);

        if (attendees && attendees.length > 0) {
            // 去除重複名單，避免 Unique Constraint Error
            const uniqueAttendees = [...new Set(attendees)];

            const inserts = uniqueAttendees.map(name => ({
                member_name: name,
                practice_date: date
            }));

            const { error } = await supabase
                .from('attendance')
                .insert(inserts);

            if (error) {
                return { success: false, message: error.message };
            }

            // 2. M 點自動發放邏輯 (Server-side simulation)
            // 策略：找出「本次點名單中」且「尚未獲得該日練船點數」的人，發放點數
            // 注意：目前只發放，不扣回 (若被取消點名，暫不自動扣點，由管理員手動調整或未來實作)

            try {
                // (a) 取得練船點數規則 (PRACTICE_REGULAR)
                let pointsToAward = 1;
                let ruleId = null;
                const { data: rule } = await supabase
                    .from('point_rules')
                    .select('id, base_points')
                    .eq('rule_code', 'PRACTICE_REGULAR') // 假設一般練船
                    .maybeSingle();

                if (rule) {
                    pointsToAward = rule.base_points || 1;
                    ruleId = rule.id;
                }

                // (b) 取得出席成員的詳細資訊 (需要 user_id 和目前點數)
                // attendees 是名字陣列 ['Eric', 'Pennee', ...]
                const { data: members, error: memberError } = await supabase
                    .from('members')
                    .select('name, user_id, total_points, email')
                    .in('name', attendees);

                if (memberError) throw memberError;

                if (members && members.length > 0) {
                    // (c) 檢查這些人當天是否已經拿過 "PRACTICE_%" 類型的點數
                    // source_id 紀錄為日期字串 "YYYY-MM-DD"
                    // 為了避免重複發放，我們檢查 point_events
                    const userIds = members.map(m => m.user_id).filter(id => id); // 過濾掉沒有 user_id 的 (未綁定)

                    if (userIds.length > 0) {
                        const { data: existingEvents } = await supabase
                            .from('point_events')
                            .select('user_id')
                            .eq('source_type', 'practice')
                            .eq('source_id', date) // 確保同一天不重複發
                            .in('user_id', userIds);

                        const existingUserIds = new Set((existingEvents || []).map(e => e.user_id));

                        // (d) 針對「未領過」的成員發放點數
                        for (const member of members) {
                            // 跳過無 user_id 的成員 (無法發點)
                            if (!member.user_id) continue;

                            // 跳過已領過的成員
                            if (existingUserIds.has(member.user_id)) continue;

                            // -- 發放點數 --
                            const newTotal = (member.total_points || 0) + pointsToAward;

                            // 1. 更新 members 表
                            await supabase
                                .from('members')
                                .update({ total_points: newTotal })
                                .eq('user_id', member.user_id);

                            // 2. 寫入 point_events 表
                            await supabase.from('point_events').insert({
                                user_id: member.user_id,
                                event_type: 'earned',
                                points_change: pointsToAward,
                                balance_after: newTotal,
                                source_type: 'practice',
                                source_id: date,
                                rule_id: ruleId,
                                description: `出席練習 (${date})`
                            });

                            console.log(`已發放點數給 ${member.name}: +${pointsToAward}`);
                        }
                    }
                }

            } catch (pointError) {
                console.error("Auto-award points failed:", pointError);
                // 點名本身成功，但發點失敗，僅 log 不阻擋流程
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Error saving attendance:", error);
        return { success: false, message: error.message };
    }
};

// =====================================================
// Admin Functions (Database RPC 方式)
// =====================================================

/**
 * 透過 RPC 呼叫資料庫函式指派角色
 */
export const adminUpdateUserRole = async (userId, newRole) => {
    try {
        const { data, error } = await supabase.rpc('admin_assign_role', {
            target_user_id: userId,
            new_role: newRole
        });

        if (error) throw error;

        // 檢查回傳結果
        if (data && data.success === false) {
            return { success: false, message: data.error || '操作失敗' };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Admin assign role failed:', error);
        return { success: false, message: error.message || '操作失敗' };
    }
};

/**
 * 透過 RPC 取得所有用戶及其角色
 */
export const adminListUsers = async () => {
    try {
        const result = await withTimeout(
            supabase.rpc('admin_list_users_with_roles'),
            5000, // RPC 可以稍長一點
            null
        );

        if (!result || result.error) {
            console.warn('adminListUsers timeout or error');
            return { success: true, data: { users: [] } }; // 返回空但成功，避免阻塞 UI
        }

        // 轉換為前端期望的格式
        const users = (result.data || []).map(u => ({
            id: u.user_id,
            email: u.email,
            memberName: u.member_name,
            role: u.role_name || 'member',
            created_at: u.created_at
        }));

        return { success: true, data: { users } };
    } catch (error) {
        console.error('Admin list users failed:', error);
        return { success: true, data: { users: [] } }; // 返回空但成功，避免阻塞 UI
    }
};

/**
 * 建立新用戶 - 透過 Edge Function 使用 Admin SDK
 */
export const adminCreateUser = async (email, password, name, role) => {
    try {
        const { data, error } = await supabase.functions.invoke('admin-actions', {
            body: {
                action: 'create_user',
                email,
                password: password || '000000',
                name,
                role
            }
        });

        if (error) throw error;

        // 檢查回傳的錯誤
        if (data && data.error) {
            return { success: false, message: data.error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Admin create user failed:', error);
        return { success: false, message: error.message || '建立帳號失敗' };
    }
};

/**
 * 刪除用戶 (Admin 使用 - 透過 Edge Function)
 */
export const adminDeleteUser = async (userId) => {
    try {
        const { data, error } = await supabase.functions.invoke('admin-actions', {
            body: { action: 'delete_user', userId }
        });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Error deleting user:", error);
        return { success: false, message: error.message };
    }
};

// =====================================================
// 槳位同步 (Seating Sync)
// =====================================================

/**
 * 儲存/更新槳位表 (Coach/Admin)
 * @param {string} date - 日期 (YYYY-MM-DD or Display Date)
 * @param {object} boatData - 座位資料 JSON
 */
export const saveSeatingArrangement = async (date, boatData) => {
    try {
        // 標準化日期: 移除括號與星期，並將 / 轉為 -
        // Input: "2026/01/18(Sun)" -> "2026-01-18"
        const cleanDate = date.split('(')[0].replace(/\//g, '-').trim();

        console.log('Saving seating for:', cleanDate);

        const { error } = await supabase
            .from('seating_arrangements')
            .upsert({
                practice_date: cleanDate,
                boat_data: boatData,
                updated_at: new Date().toISOString()
            }, { onConflict: 'practice_date' });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Error saving seating chart:", error);
        return { success: false, message: error.message };
    }
};

/**
 * 讀取槳位表 (All Users)
 * @param {string} date - 日期 (YYYY-MM-DD or Display Date)
 */
export const fetchSeatingArrangement = async (date) => {
    try {
        const cleanDate = date.split('(')[0].replace(/\//g, '-').trim();

        const { data, error } = await supabase
            .from('seating_arrangements')
            .select('boat_data')
            .eq('practice_date', cleanDate)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found is fine
            throw error;
        }
        return data?.boat_data || null;
    } catch (error) {
        console.error("Error fetching seating chart:", error);
        return null;
    }
};

/**
 * 批次讀取槳位表 (All Users) - 用於列表頁
 * @param {string[]} dates - 日期陣列
 */
export const fetchSeatingArrangements = async (dates) => {
    try {
        if (!dates || dates.length === 0) return {};

        const cleanDates = dates.map(d => d.split('(')[0].replace(/\//g, '-').trim());

        // map clean date back to original display date for easy lookup
        const dateMap = {};
        dates.forEach(d => {
            dateMap[d.split('(')[0].replace(/\//g, '-').trim()] = d;
        });

        const { data, error } = await supabase
            .from('seating_arrangements')
            .select('practice_date, boat_data')
            .in('practice_date', cleanDates);

        if (error) throw error;

        // Convert to map: { "2026/01/18(Sun)": data }
        const result = {};
        data.forEach(item => {
            const displayDate = dateMap[item.practice_date];
            if (displayDate) {
                result[displayDate] = item.boat_data;
            }
        });
        return result;
    } catch (error) {
        console.error("Error fetching seating charts:", error);
        return {};
    }
};

// =====================================================
// Bug 回報系統
// =====================================================

/**
 * 提交 Bug 回報
 */
export const submitBugReport = async ({ description, screenshotFile }) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, message: '請先登入' };

        // 1. 上傳截圖 (如果有的話)
        let screenshotUrl = null;
        if (screenshotFile) {
            const fileExt = screenshotFile.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}_bug.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('bug-reports')
                .upload(fileName, screenshotFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('bug-reports')
                .getPublicUrl(fileName);
            screenshotUrl = publicUrl;
        }

        // 2. 寫入資料庫
        const { error } = await supabase
            .from('bug_reports')
            .insert({
                reporter_id: user.id,
                reporter_name: user.user_metadata?.name || user.email,
                reporter_email: user.email,
                description,
                screenshot_url: screenshotUrl
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Error submitting bug report:", error);
        return { success: false, message: error.message };
    }
};

/**
 * 取得 Bug 回報列表 (Admin)
 */
export const fetchBugReports = async () => {
    try {
        const { data, error } = await supabase
            .from('bug_reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching bug reports:", error);
        return [];
    }
};

/**
 * 更新 Bug 狀態 (Admin)
 */
export const updateBugReportStatus = async (id, isFixed) => {
    try {
        const updates = {
            is_fixed: isFixed,
            fixed_at: isFixed ? new Date().toISOString() : null
        };

        const { error } = await supabase
            .from('bug_reports')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Error updating bug report:", error);
        return { success: false, message: error.message };
    }
};

// =====================================================
// 最新消息 (News) API
// =====================================================

/**
 * 取得最新消息列表（前台）
 * @param {Object} options - 篩選選項
 * @param {string} options.category - 分類篩選
 * @param {string} options.search - 搜尋關鍵字
 * @param {number} options.limit - 數量限制
 */
export const fetchNews = async ({ category, search, limit = 20 } = {}) => {
    try {
        let query = supabase
            .from('news')
            .select('id, title, title_en, slug, category, cover_image, excerpt, excerpt_en, is_pinned, pinned_order, published_at')
            .eq('is_published', true)
            .order('is_pinned', { ascending: false })
            .order('pinned_order', { ascending: true })
            .order('published_at', { ascending: false });

        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,title_en.ilike.%${search}%,excerpt_en.ilike.%${search}%`);
        }

        if (limit) {
            query = query.limit(limit);
        }

        const result = await withTimeout(
            query,
            5000,
            { data: [], error: null }
        );

        if (result?.error) {
            console.error('Error fetching news:', result.error);
            return [];
        }
        return result?.data || [];
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
};

/**
 * 取得單篇最新消息詳情
 * @param {string} slug - 文章 slug
 */
export const fetchNewsDetail = async (slug) => {
    try {
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .eq('slug', slug)
            .eq('is_published', true)
            .single();

        if (error) {
            console.error('Error fetching news detail:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Error fetching news detail:', error);
        return null;
    }
};

/**
 * 取得草稿文章預覽（透過 preview-article Edge Function）
 * 需要有效的 HMAC preview token，不需要登入
 * @param {string} slug - 文章 slug
 * @param {string} token - HMAC-SHA256 preview token（前 32 字元）
 */
export const fetchNewsPreview = async (slug, token) => {
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const url = `${supabaseUrl}/functions/v1/preview-article?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}`;

        const resp = await fetch(url, {
            headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`,
            },
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            console.error('Preview fetch failed:', resp.status, err);
            return null;
        }

        const { data } = await resp.json();
        return data || null;
    } catch (error) {
        console.error('Error fetching news preview:', error);
        return null;
    }
};



/**
 * 取得所有最新消息（後台管理用，含草稿）
 */
export const fetchAllNews = async () => {
    try {
        const result = await withTimeout(
            supabase
                .from('news')
                .select('*')
                .order('created_at', { ascending: false }),
            5000,
            { data: [], error: null }
        );

        if (result?.error) {
            console.error('Error fetching all news:', result.error);
            return [];
        }
        return result?.data || [];
    } catch (error) {
        console.error('Error fetching all news:', error);
        return [];
    }
};

/**
 * 建立最新消息
 */
export const createNews = async (newsData) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const insertData = {
            title: newsData.title,
            title_en: newsData.title_en || '',
            slug: newsData.slug || generateSlug(newsData.title),
            category: newsData.category || '隊伍活動',
            cover_image: newsData.cover_image || null,
            excerpt: newsData.excerpt || '',
            excerpt_en: newsData.excerpt_en || '',
            content: newsData.content || [],
            content_en: newsData.content_en || [],
            is_pinned: newsData.is_pinned || false,
            pinned_order: newsData.pinned_order || 100, // Default to 100
            is_published: newsData.is_published || false,
            published_at: newsData.is_published ? new Date().toISOString() : null,
            author_id: user?.id || null
        };

        const { data, error } = await supabase
            .from('news')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            return { success: false, message: error.message };
        }
        return { success: true, data };
    } catch (error) {
        console.error('Error creating news:', error);
        return { success: false, message: error.message };
    }
};

/**
 * 更新最新消息
 */
export const updateNews = async (id, newsData) => {
    try {
        const updateData = {
            title: newsData.title,
            title_en: newsData.title_en,
            category: newsData.category,
            cover_image: newsData.cover_image,
            excerpt: newsData.excerpt,
            excerpt_en: newsData.excerpt_en,
            content: newsData.content,
            content_en: newsData.content_en,
            is_pinned: newsData.is_pinned,
            pinned_order: newsData.pinned_order,
            is_published: newsData.is_published
        };

        // 如果從草稿變為發布，設定發布時間
        if (newsData.is_published && !newsData.published_at) {
            updateData.published_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('news')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return { success: false, message: error.message };
        }
        return { success: true, data };
    } catch (error) {
        console.error('Error updating news:', error);
        return { success: false, message: error.message };
    }
};

/**
 * 刪除最新消息
 */
export const deleteNews = async (id) => {
    try {
        const { error } = await supabase
            .from('news')
            .delete()
            .eq('id', id);

        if (error) {
            return { success: false, message: error.message };
        }
        return { success: true };
    } catch (error) {
        console.error('Error deleting news:', error);
        return { success: false, message: error.message };
    }
};

// =====================================================
// M 點積分系統 (M-Point Reward System)
// =====================================================

/**
 * 取得使用者 M 點餘額
 * 從 members 表讀取 total_points
 */
export const fetchUserPoints = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { totalPoints: 0, currentYearPoints: 0 };

        const { data, error } = await supabase
            .from('members')
            .select('total_points')
            .eq('email', user.email)
            .maybeSingle();

        if (error) {
            console.error('Error fetching user points:', error);
            return { totalPoints: 0, currentYearPoints: 0 };
        }

        return {
            totalPoints: data?.total_points || 0,
            currentYearPoints: data?.total_points || 0
        };
    } catch (error) {
        console.error('Error fetching user points:', error);
        return { totalPoints: 0, currentYearPoints: 0 };
    }
};

/**
 * 取得使用者的 M 點歷史紀錄
 * 從 point_events 表讀取
 */
export const fetchPointEvents = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('point_events')
            .select('*, point_rules(rule_name, rule_code)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching point events:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching point events:', error);
        return [];
    }
};

/**
 * [Management] 體能課點名 - 批次加點
 * @param {string} date - 體能課日期 (YYYY-MM-DD)
 * @param {string[]} memberNames - 出席隊員的名稱列表
 * @param {string} awardedByEmail - 操作者 email
 */
export const awardFitnessAttendance = async (date, memberNames, awardedByEmail) => {
    try {
        if (!memberNames || memberNames.length === 0) {
            return { success: false, message: '請選擇至少一位隊員' };
        }

        // 取得 TRAINING_FITNESS 規則
        const { data: rule, error: ruleError } = await supabase
            .from('point_rules')
            .select('id, base_points')
            .eq('rule_code', 'TRAINING_FITNESS')
            .single();

        if (ruleError || !rule) {
            console.error('Cannot find TRAINING_FITNESS rule:', ruleError);
            return { success: false, message: '找不到體能課積點規則' };
        }

        const pointsToAward = rule.base_points; // 1 point

        // 取得這些隊員的 user_id (透過 members 表的 email -> users 表的 id)
        const { data: members, error: memberError } = await supabase
            .from('members')
            .select('name, email')
            .in('name', memberNames);

        if (memberError) {
            console.error('Error fetching members:', memberError);
            return { success: false, message: '查詢隊員資料失敗' };
        }

        // 更新 members 表的 total_points
        let successCount = 0;
        const errors = [];

        for (const member of members) {
            try {
                // 更新 members 表的 total_points
                const { error: updateError } = await supabase
                    .from('members')
                    .update({
                        total_points: supabase.rpc ? undefined : undefined // placeholder
                    })
                    .eq('name', member.name);

                // 由於 Supabase JS 不支援直接的 increment，用 RPC 或 read-then-write
                const { data: currentMember } = await supabase
                    .from('members')
                    .select('total_points')
                    .eq('name', member.name)
                    .single();

                const newPoints = (currentMember?.total_points || 0) + pointsToAward;

                const { error: pointUpdateError } = await supabase
                    .from('members')
                    .update({ total_points: newPoints })
                    .eq('name', member.name);

                if (pointUpdateError) {
                    errors.push(`${member.name}: ${pointUpdateError.message}`);
                } else {
                    successCount++;
                }

                // 如果有 email，嘗試寫入 point_events (找到對應的 auth user)
                if (member.email) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('id, total_points')
                        .eq('email', member.email)
                        .maybeSingle();

                    if (userData) {
                        // 寫入 point_events
                        await supabase.from('point_events').insert({
                            user_id: userData.id,
                            event_type: 'earned',
                            points_change: pointsToAward,
                            balance_after: (userData.total_points || 0) + pointsToAward,
                            source_type: 'fitness_attendance',
                            source_id: date,
                            rule_id: rule.id,
                            description: `體能訓練課出席 (${date})`,
                            metadata: { date, awarded_by: awardedByEmail }
                        });

                        // 同步更新 users 表
                        await supabase
                            .from('users')
                            .update({
                                total_points: (userData.total_points || 0) + pointsToAward,
                                current_year_points: (userData.total_points || 0) + pointsToAward
                            })
                            .eq('id', userData.id);
                    }
                }
            } catch (err) {
                errors.push(`${member.name}: ${err.message}`);
            }
        }

        if (errors.length > 0) {
            console.warn('Some fitness attendance awards failed:', errors);
        }

        return {
            success: true,
            message: `已為 ${successCount} 位隊員加上 ${pointsToAward} M 點`,
            successCount,
            errors
        };
    } catch (error) {
        console.error('Error awarding fitness attendance:', error);
        return { success: false, message: error.message };
    }
};

/**
 * [Management] 取得體能課點名歷史
 * 讀取 point_events 中 source_type = 'fitness_attendance' 的紀錄
 * @param {string} date - 可選，篩選特定日期
 */
export const fetchFitnessHistory = async (date = null) => {
    try {
        let query = supabase
            .from('point_events')
            .select('*, users(name, email)')
            .eq('source_type', 'fitness_attendance')
            .order('created_at', { ascending: false })
            .limit(100);

        if (date) {
            query = query.eq('source_id', date);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching fitness history:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching fitness history:', error);
        return [];
    }
};

/**
 * 新增兌換商品
 * @param {Object} params - { name, points_cost, description, imageFile }
 */
export const addReward = async (params) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, message: '請先登入' };

        let imageUrl = null;

        // 1. 上傳圖片 (如果有)
        if (params.imageFile) {
            const fileExt = params.imageFile.name.split('.').pop();
            const fileName = `rewards/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            // 嘗試上傳到 'public-images' bucket (假設有這個通用 bucket，或使用 'training-photos' 如果沒有別的)
            // 為了保險，我們先試試 'training-photos' 因為確定它存在，或者 'avatars'?
            // 最好是使用一個通用的。
            // 根據過往經驗，通常會有 'images' 或類似的。
            // 但為了不賭博，我會先用 'training-photos' 暫代，或者建立一個。
            // 其實可以在 Supabase Dashboard 建立，但我無法存取。
            // 讓我們假設 'training-photos' 可以用，因為它是公開讀取的。
            // 或者更好的是，如果失敗，就...
            // 其實 User 沒有說要新建 Bucket。
            // 讓我們用 'training-photos' 並加個 prefix 'rewards/'

            const { error: uploadError } = await supabase.storage
                .from('training-photos')
                .upload(fileName, params.imageFile);

            if (uploadError) {
                console.error("Upload reward image error:", uploadError);
                return { success: false, message: '圖片上傳失敗' };
            }

            const { data: { publicUrl } } = supabase.storage
                .from('training-photos')
                .getPublicUrl(fileName);

            imageUrl = publicUrl;
        }

        // 2. 寫入資料庫
        const { error } = await supabase
            .from('redeemable_products')
            .insert({
                name: params.name,
                u_coins_price: params.points_cost,
                description: params.description || '',
                image_url: imageUrl,
                is_active: true,
                stock: params.stock || 0
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Error adding reward:", error);
        return { success: false, message: error.message };
    }
};

/**
 * 刪除兌換商品
 * @param {string} id - 商品 ID
 */
/**
 * 刪除兌換商品
 * @param {string} id - 商品 ID
 */
export const deleteReward = async (id) => {
    try {
        const { error } = await supabase
            .from('redeemable_products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting reward:', error);
        return { success: false, message: error.message };
    }
};

/**
 * 更新兌換商品
 */
/**
 * 更新兌換商品
 */
export const updateReward = async (params) => {
    try {
        let imageUrl = params.image_url;

        // 1. 上傳新圖片 (如果有)
        if (params.imageFile) {
            const fileExt = params.imageFile.name.split('.').pop();
            const fileName = `rewards/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('training-photos')
                .upload(fileName, params.imageFile);

            if (uploadError) {
                console.error("Upload reward image error:", uploadError);
                return { success: false, message: '圖片上傳失敗' };
            }

            const { data: { publicUrl } } = supabase.storage
                .from('training-photos')
                .getPublicUrl(fileName);

            imageUrl = publicUrl;
        }

        // 2. 更新資料庫
        const { error } = await supabase
            .from('redeemable_products')
            .update({
                name: params.name,
                u_coins_price: params.points_cost,
                stock: params.stock || 0, // Update stock
                description: params.description || '',
                image_url: imageUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', params.id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Error updating reward:", error);
        return { success: false, message: error.message };
    }
};

/**
 * 取得可兌換商品列表
 */
export const fetchRewards = async () => {
    try {
        const { data, error } = await supabase
            .from('redeemable_products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map u_coins_price back to points_cost for frontend compatibility
        return (data || []).map(item => ({
            ...item,
            points_cost: item.u_coins_price
        }));
    } catch (error) {
        console.error("Error fetching rewards:", error);
        return [];
    }
};

/**
 * 兌換商品
 * @param {number} rewardId - 商品 ID
 */
export const redeemReward = async (rewardId) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, message: '請先登入' };

        // 取得商品資訊
        const { data: reward, error: rewardError } = await supabase
            .from('redeemable_products')
            .select('*')
            .eq('id', rewardId)
            .single();

        if (rewardError || !reward) {
            return { success: false, message: '找不到此商品' };
        }

        // 檢查庫存
        if (reward.stock <= 0) {
            return { success: false, message: '此商品已兌換完畢' };
        }

        // 檢查用戶點數
        const { data: member } = await supabase
            .from('members')
            .select('total_points')
            .eq('email', user.email)
            .maybeSingle();

        const currentPoints = member?.total_points || 0;
        const cost = reward.u_coins_price;
        if (currentPoints < cost) {
            return { success: false, message: `M點不足（需 ${cost}，目前 ${currentPoints}）` };
        }

        // 建立兌換紀錄
        const { error: redeemError } = await supabase
            .from('redemption_records')
            .insert({
                user_id: user.id,
                product_id: rewardId,   // New UUID field
                points_spent: cost,
                status: 'pending'
            });

        if (redeemError) {
            return { success: false, message: redeemError.message };
        }

        // Update Stock
        await supabase
            .from('redeemable_products')
            .update({ stock: reward.stock - 1 })
            .eq('id', rewardId);

        // 扣除 M 點
        const newPoints = currentPoints - cost;
        await supabase
            .from('members')
            .update({ total_points: newPoints })
            .eq('email', user.email);

        // 同步更新 users 表
        await supabase
            .from('users')
            .update({ total_points: newPoints })
            .eq('email', user.email);

        // 寫入 point_events (消耗)
        await supabase.from('point_events').insert({
            user_id: user.id,
            event_type: 'spent',
            points_change: -cost,
            balance_after: newPoints,
            source_type: 'reward_redemption',
            source_id: String(rewardId),
            description: `兌換商品: ${reward.name}`
        });

        return { success: true, message: `成功兌換「${reward.name}」！` };
    } catch (error) {
        console.error('Error redeeming reward:', error);
        return { success: false, message: error.message };
    }
};

/**
 * 取得所有兌換紀錄（含商品名稱與用戶名稱）
 */
export const fetchRedemptionRecords = async () => {
    try {
        const { data, error } = await supabase
            .from('redemption_records')
            .select(`
                *,
                redeemable_products (name)
            `)
            .order('redeemed_at', { ascending: false });

        if (error) throw error;

        // Fetch user details from members table using user_id
        const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))];
        let memberMap = {};

        if (userIds.length > 0) {
            const { data: members } = await supabase
                .from('members')
                .select('user_id, name, email')
                .in('user_id', userIds);

            if (members) {
                members.forEach(m => {
                    memberMap[m.user_id] = m;
                });
            }
        }

        return data.map(record => {
            const member = memberMap[record.user_id];
            // Name priority: Member Name > Email > User ID
            const displayName = member?.name || member?.email || 'Unknown Member';

            return {
                id: record.id,
                product_name: record.redeemable_products?.name || 'Deleted Product',
                product_id: record.product_id,
                user_name: displayName,
                redeemed_at: record.redeemed_at,
                status: record.status,
                points_spent: record.points_spent,
                delivered_by: record.delivered_by
            };
        });

    } catch (error) {
        console.error('Error fetching redemption records:', error);
        return [];
    }
};

/**
 * 更新兌換紀錄狀態 (例如：已交付)
 */
export const updateRedemptionStatus = async (recordId, status, deliveredBy = null) => {
    try {
        const updateData = { status };
        if (deliveredBy) {
            updateData.delivered_by = deliveredBy;
        }

        const { error } = await supabase
            .from('redemption_records')
            .update(updateData)
            .eq('id', recordId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating redemption status:', error);
        return { success: false, message: error.message };
    }
};

/**
 * 取得 M 點排行榜
 * 從 members 表讀取有 total_points 的隊員
 */
export const fetchMPointLeaderboard = async () => {
    try {
        const { data, error } = await supabase
            .from('members')
            .select('name, total_points, avatar_url')
            .gt('total_points', 0)
            .order('total_points', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching M-point leaderboard:', error);
            return [];
        }

        return (data || []).map((member, index) => ({
            name: member.name,
            points: member.total_points || 0,
            avatar: member.avatar_url || null,
            rank: index + 1
        }));
    } catch (error) {
        console.error('Error fetching M-point leaderboard:', error);
        return [];
    }
};

/**
 * 生成 slug
 */
const generateSlug = (title) => {
    const timestamp = Date.now();
    const cleanTitle = title
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
    return `${cleanTitle}-${timestamp}`;
};

