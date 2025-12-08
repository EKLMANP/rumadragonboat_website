// src/api/googleSheets.js

// ▼▼▼ 請將引號內的網址換成您的 Google Apps Script 部署網址 ▼▼▼
const API_URL = "https://script.google.com/macros/s/AKfycbx7---INM12kQvRJ7n3xEbN2M_RKmyEInqIqlO9pOIZ2guMui0TStaAOIBdm7Hhr4w3/exec";

// 取得所有隊員資料
export const fetchUsers = async () => {
  try {
    const res = await fetch(`${API_URL}?action=getUsers`);
    return await res.json();
  } catch (error) {
    console.error("Fetch Users Error:", error);
    return [];
  }
};

// 取得已開放的日期
export const fetchDates = async () => {
  try {
    const res = await fetch(`${API_URL}?action=getDates`);
    return await res.json();
  } catch (error) {
    console.error("Fetch Dates Error:", error);
    return [];
  }
};

// 取得報名狀況
export const fetchRegistrations = async () => {
  try {
    const res = await fetch(`${API_URL}?action=getRegistrations`);
    return await res.json();
  } catch (error) {
    console.error("Fetch Regs Error:", error);
    return [];
  }
};

// 通用的資料傳送功能 (新增/刪除/更新)
export const postData = async (action, payload) => {
  try {
    // 使用 text/plain 格式避免 CORS 問題
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action, ...payload })
    });
    return await res.json();
  } catch (error) {
    console.error("Post Data Error:", error);
    return { success: false, message: error.message };
  }
};