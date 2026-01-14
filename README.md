# RUMA Dragon Boat Team Website

## 專案簡介
這是 RUMA 龍舟隊的官方網站專案，用於管理隊員、練習、公告與最新消息。

---

## 🚀 部署流程 (Deployment Workflow)

本專案採用 **Git Flow** 進行開發與部署管理，區分為 **UAT (測試環境)** 與 **Production (正式環境)**。

### 1. 環境架構

| 環境 | 分支 (Branch) | 前端網址 (Vercel) | 後端資料庫 (Supabase) | 用途 |
| :--- | :--- | :--- | :--- | :--- |
| **UAT** | `develop` | `https://ruma-dragonboat-uat.vercel.app` (範例) | **RUMA-UAT** | 內部測試、功能驗收 |
| **PROD** | `main` | `https://ruma-dragonboat.vercel.app` | **RUMA-PROD** | 正式上線給所有用戶使用 |

---

### 2. 如何進行開發與部署

#### **Step 1: 開發新功能**
從 `develop` 分支建立新的功能分支：
```bash
git checkout develop
git pull
git checkout -b feature/您的功能名稱
# ... 開始寫程式 ...
```

#### **Step 2: 部署到 UAT 測試**
當功能開發完成後，合併回 `develop` 分支，Vercel 會自動部署到 UAT 環境。
```bash
git checkout develop
git merge feature/您的功能名稱
git push origin develop
# Vercel 自動觸發部署到 UAT
```

#### **Step 3: 正式上線 (Production)**
當 UAT 測試通過後，將 `develop` 合併到 `main` 分支。
```bash
git checkout main
git merge develop
git push origin main
# Vercel 自動觸發部署到 Production
```

---

### 3. Vercel 專案設定說明

為了讓 UAT 與 Production 連到不同的資料庫，我們在 Vercel 建立了兩個分開的專案：

#### **專案 A: Production (正式環境)**
- **Project Name**: `ruma-dragonboat`
- **Production Branch**: `main`
- **Environment Variables**:
  - `VITE_SUPABASE_URL`: (正式環境 Supabase URL)
  - `VITE_SUPABASE_ANON_KEY`: (正式環境 Supabase Anon Key)

#### **專案 B: UAT (測試環境)**
- **Project Name**: `ruma-dragonboat-uat`
- **Production Branch**: `develop`
- **Environment Variables**:
  - `VITE_SUPABASE_URL`: (測試環境 Supabase URL)
  - `VITE_SUPABASE_ANON_KEY`: (測試環境 Supabase Anon Key)

---

### 4. 常用指令

```bash
# 啟動本地開發伺服器
npm run dev

# 部署到 UAT (手動觸發)
npm run deploy:uat

# 部署到 Production (手動觸發)
npm run deploy:prod
```

---

## 測試帳號

### Management user:
- 帳號：`n79928@gmail.com`
- 密碼：`000000`

### Member user:
- 帳號：`siaominpan@gmail.com`
- 密碼：`000000`

### Admin user
- 帳號：`rumadragonboat@gmail.com`
- 密碼：`Rmdb20240109`