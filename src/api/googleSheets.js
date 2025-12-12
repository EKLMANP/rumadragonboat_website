// src/api/googleSheets.js

// ⚠️⚠️⚠️ 請確認這串 URL 是你最新的 Google Script 部署網址 ⚠️⚠️⚠️
// (去 Google Apps Script -> 部署 -> 管理部署 -> 複製網頁應用程式網址)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx7---INM12kQvRJ7n3xEbN2M_RKmyEInqIqlO9pOIZ2guMui0TStaAOIBdm7Hhr4w3/exec';

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
    return { users: [], dates: [], registrations: [] };
  }
};

// 5. 寫入資料 (POST)
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