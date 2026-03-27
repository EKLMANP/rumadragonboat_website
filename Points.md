# RUMA M 點 (M Points) 機制說明文件

本文件詳細說明 RUMA 龍舟隊的積點系統 (M Points) 設計、獲取規則、以及技術架構。

## 1. 核心概念 (Core Concepts)

**M 點 (M Points)** 是 RUMA 龍舟隊成員的貢獻與參與度指標。
*   **性質**: 屬於「會員積分」，主要用於獎勵出席與貢獻。
*   **流向**: 
    1.  透過參與練習、活動或貢獻獲得。
    2.  可兌換為 **U幣 (U Coins)** (貨幣)，用於購買商品或服務。
*   **歸戶**: 綁定於個人的使用者帳戶 (`users` 表)。

---

## 2. 獲取規則 (Accumulation Rules)

目前的積點規則定義於資料庫 `point_rules` 表中：

### A. 出席類 (Attendance)
| 代碼 | 規則名稱 | 點數 | 說明 |
| :--- | :--- | :--- | :--- |
| `PRACTICE_REGULAR` | 一般自主練習 | +1 | 平日/假日船練 |
| `PRACTICE_COACHED` | 教練團練課 | +2 | 有教練帶的正式練習 |
| `TRAINING_FITNESS` | 體能訓練課 | +1 | 划船後體能 |
| `TRAINING_ERG` | 划船機練習 | +2 | ERG 測驗/練習 |
| `EXTERNAL_PRACTICE`| 他隊訓練 | +0 | 僅紀錄不計點 |

### B. 貢獻類 (Contribution)
| 代碼 | 規則名稱 | 點數 | 說明 |
| :--- | :--- | :--- | :--- |
| `CONTRIB_MENTORING` | 帶新人 | +4 | 陪練、錄影回饋 |
| `CONTRIB_FILL_IN` | 撐人數補位 | +2 | 臨時補缺、穩定陣容 |
| `CONTRIB_TEAM_SUPPORT`| 隊務支援 | +2 | 活動支援、比賽後勤 |

### C. 獎勵類 (Bonus)
| 代碼 | 規則名稱 | 點數 | 說明 |
| :--- | :--- | :--- | :--- |
| `BONUS_PERFECT_MONTH` | 當月全勤 | +4 | 依當月表定次數達成全勤 |

### D. 自主訓練 (Self Training)
成員可透過上傳照片證明進行自主訓練（如健身房、跑步等），經管理員或系統審核後獲得點數。

---

## 3.  兌換與消耗 (Redemption & Usage)

M 點本身不直接用於購買，需先轉換為 U 幣。

### 轉換機制
*   **M 點 -> U 幣**: 目前設計匯率為 **20:1** (20 M 點兌換 1 U 幣)。
*   *備註: 匯率與轉換邏輯需在前端實作或透過 Database Function 處理。*

### 商品兌換 (Redeemable Products)
使用 U 幣可以兌換實體或虛擬商品 (`redeemable_products` / `rewards`)：
*   **範例商品**:
    *   槳造型鑰匙圈 (5 U幣)
    *   RUMA 限量棒球帽 (25 U幣)
    *   RUMA 限量帽T (50 U幣)
    *   教練團練課、影片回饋等 (虛擬服務)

---

## 4. 技術架構 (Technical Architecture)

### 資料庫關聯
1.  **`users`**: 
    *   `total_points` (生涯總累積)
    *   `current_year_points` (本年度累積，可能用於年度結算)
2.  **`point_rules`**: 定義所有給點規則 (Rule Code, Points)。
3.  **`point_events`**: 積點帳本 (Ledger)，記錄每一筆點數的增減、原因、關聯的規則 ID。
    *   `event_type`: 'earned' (獲得), 'spent' (消耗/兌換), 'bonus' (獎勵)。
4.  **`self_training_records`**: 儲存使用者上傳的訓練證明，審核通過後觸發寫入 `point_events` 並更新 `users`。
5.  **`u_coins_transactions`**: U 幣的交易紀錄。

### 實作狀態 (Implementation Status)
*   **Database**: Schema 已完整建立 (包含 Table, RLS policies, Default Rules)。
*   **Frontend**: 
    *   UI 介面 (`MyJourneyPage`) 已有雛形。
    *   **待辦事項**: 前端尚未與 `users` 表的點數欄位正式串接，目前部分顯示為靜態或 Mock 資料。需要更新 `AuthContext` 以讀取新的 `users` 表資料。
