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
const withTimeout = async (promise, ms = 3000, fallback = null) => {
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
                supabase.from('borrow_records').select('*').order('created_at', { ascending: false })
            ]),
            8000, // 8 秒超時 (大量資料)
            null
        );

        if (!results) return defaultResult;

        const [members, dates, registrations, equipment, borrowRecords] = results;

        return {
            // 對應 Google Sheets 欄位名稱格式
            users: (members?.data || []).map(m => ({
                Name: m.name,
                Email: m.email,
                Weight: m.weight,
                Position: m.position,
                Skill_Rating: m.skill_rating
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
            3000,
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
            3000,
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
export const fetchActivities = async () => {
    try {
        const result = await withTimeout(
            supabase
                .from('activities')
                .select('*')
                .order('date', { ascending: false }),
            3000,
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
export const fetchActivityRegistrations = async () => {
    try {
        const result = await withTimeout(
            supabase
                .from('activity_registrations')
                .select(`
                    *,
                    activities (name, date, type, location, start_time)
                `),
            3000,
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
            3000,
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

            // === 裝備管理 ===
            case 'updateEquipment':
                return await updateEquipment(params.Item, params.Count);

            case 'addBorrowRecord':
                return await addBorrowRecord(params);

            case 'deleteBorrowRecord':
                return await deleteBorrowRecord(params);

            case 'deleteBorrowRecord':
                return await deleteBorrowRecord(params);

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
        // 先刪除該日期的舊紀錄
        await supabase
            .from('attendance')
            .delete()
            .eq('practice_date', date);

        // 寫入新的出席名單
        if (attendees && attendees.length > 0) {
            const inserts = attendees.map(name => ({
                member_name: name,
                practice_date: date
            }));

            const { error } = await supabase
                .from('attendance')
                .insert(inserts);

            if (error) {
                return { success: false, message: error.message };
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
            .select('id, title, title_en, slug, category, cover_image, excerpt, excerpt_en, is_pinned, published_at')
            .eq('is_published', true)
            .order('is_pinned', { ascending: false })
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

