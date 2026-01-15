-- =====================================================
-- RUMA Dragon Boat - GAS Migration Tables
-- 執行此檔案於 Supabase SQL Editor
-- 此為遷移 Google Sheets 資料用的補充表格
-- =====================================================

-- 1. 隊員資料表 (對應 Google Sheets User_DB)
-- 這是龍舟隊專用的隊員資訊，不同於 auth.users
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    weight NUMERIC(5,2),
    position TEXT DEFAULT '可以划左右槳及擔任舵手',
    skill_rating INTEGER DEFAULT 1 CHECK (skill_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 練習日期表 (對應 Google Sheets Practice_Dates)
-- 使用 display_date 儲存如 "2026/01/11(Sat)" 格式
CREATE TABLE IF NOT EXISTS public.practice_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    confirmed_date DATE NOT NULL UNIQUE,
    display_date TEXT NOT NULL,
    place TEXT DEFAULT '碧潭 Bitan',
    meeting_time TEXT DEFAULT '07:30',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 報名紀錄表 (對應 Google Sheets Registration_DB)
-- 使用 member_name 和 practice_date 作為文字格式
CREATE TABLE IF NOT EXISTS public.practice_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_name TEXT NOT NULL,
    practice_date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(member_name, practice_date)
);

-- 4. 出席紀錄表 (對應 Google Sheets Attendance_DB)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_name TEXT NOT NULL,
    practice_date TEXT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(member_name, practice_date)
);

-- 5. 裝備庫存表 (對應 Google Sheets Equipment)
CREATE TABLE IF NOT EXISTS public.equipment_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item TEXT NOT NULL UNIQUE,
    count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 借用紀錄表 (對應 Google Sheets BorrowRecords)
CREATE TABLE IF NOT EXISTS public.borrow_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_name TEXT NOT NULL,
    borrow_date DATE NOT NULL,
    item TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 索引 (提升查詢效能)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_practice_registrations_date ON public.practice_registrations(practice_date);
CREATE INDEX IF NOT EXISTS idx_practice_registrations_member ON public.practice_registrations(member_name);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(practice_date);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON public.attendance(member_name);
CREATE INDEX IF NOT EXISTS idx_borrow_records_member ON public.borrow_records(member_name);
CREATE INDEX IF NOT EXISTS idx_practice_dates_date ON public.practice_dates(confirmed_date DESC);
CREATE INDEX IF NOT EXISTS idx_members_name ON public.members(name);

-- =====================================================
-- RLS 政策 (Row Level Security)
-- =====================================================

-- 啟用 RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_records ENABLE ROW LEVEL SECURITY;

-- 所有已登入用戶可讀取所有資料
CREATE POLICY "Authenticated can read members" ON public.members
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read practice_dates" ON public.practice_dates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read practice_registrations" ON public.practice_registrations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read attendance" ON public.attendance
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read equipment_inventory" ON public.equipment_inventory
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read borrow_records" ON public.borrow_records
    FOR SELECT TO authenticated USING (true);

-- 報名相關操作
CREATE POLICY "Authenticated can insert practice_registrations" ON public.practice_registrations
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can delete practice_registrations" ON public.practice_registrations
    FOR DELETE TO authenticated USING (true);

-- 練習日期管理 (幹部權限)
CREATE POLICY "Authenticated can insert practice_dates" ON public.practice_dates
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can delete practice_dates" ON public.practice_dates
    FOR DELETE TO authenticated USING (true);

-- 出席紀錄管理 (幹部權限)
CREATE POLICY "Authenticated can insert attendance" ON public.attendance
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can delete attendance" ON public.attendance
    FOR DELETE TO authenticated USING (true);

-- 隊員管理 (管理員權限)
CREATE POLICY "Authenticated can insert members" ON public.members
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update members" ON public.members
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete members" ON public.members
    FOR DELETE TO authenticated USING (true);

-- 裝備管理 (管理員權限)
CREATE POLICY "Authenticated can insert equipment_inventory" ON public.equipment_inventory
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update equipment_inventory" ON public.equipment_inventory
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can upsert equipment_inventory" ON public.equipment_inventory
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 借用紀錄管理 (管理員權限)
CREATE POLICY "Authenticated can insert borrow_records" ON public.borrow_records
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can delete borrow_records" ON public.borrow_records
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 完成提示
-- =====================================================
-- 執行完畢後，請至 Table Editor 確認所有表格已建立：
-- 1. members
-- 2. practice_dates
-- 3. practice_registrations
-- 4. attendance
-- 5. equipment_inventory
-- 6. borrow_records
-- 
-- 接著可開始匯入 Google Sheets 資料
