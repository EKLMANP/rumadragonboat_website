// src/api/googleSheets.js

// Google Apps Script URL - 從環境變數讀取，請在 Vercel 環境變數設定 VITE_GOOGLE_SCRIPT_URL
const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

if (!SCRIPT_URL) {
    console.warn(
        '⚠️ VITE_GOOGLE_SCRIPT_URL 環境變數未設定。\n' +
        '請在 Vercel Dashboard → Settings → Environment Variables 新增此變數。'
    );
}

// 1. 取得使用者
export const fetchUsers = async () => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getUsers`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

// 2. 取得日期
export const fetchDates = async () => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getDates`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching dates:", error);
    return [];
  }
};

// 3. 取得報名資料 (❌ 你的 AdminPage 和 CoachPage 就是因為少了這個才壞掉)
export const fetchRegistrations = async () => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getRegistrations`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return [];
  }
};

// 4. 一次抓取所有資料 (效能優化用)
export const fetchAllData = async () => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=fetchAllData`);
    const data = await response.json();
    return data; 
  } catch (error) {
    console.error("Error fetching all data:", error);
    return { users: [], dates: [], registrations: [], equipment: [], borrowRecords: [] };
  }
};

// 5. 寫入資料 (POST 通用函式)
export const postData = async (action, data) => {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action, ...data }),
    });
    return await response.json();
  } catch (error) {
    console.error(`Error posting data (${action}):`, error);
    return { success: false, message: error.toString() };
  }
};

// ✨✨✨ 6. 儲存出席名單 (點名用) ✨✨✨
export const saveAttendance = async (date, attendees) => {
  try {
    // attendees 是一個包含名字的陣列，例如 ['Eric', 'Kenny']
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'saveAttendance',
        Date: date,
        Attendees: attendees
      })
    });
    return await response.json();
  } catch (error) {
    console.error("Error saving attendance:", error);
    return { success: false, message: error.toString() };
  }
};

// ✨✨✨ 7. 取得歷史出席紀錄 (排行榜用) ✨✨✨
export const fetchAttendance = async () => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getAttendance`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return [];
  }
};