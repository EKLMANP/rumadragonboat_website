-- =====================================================
-- RUMA 龍舟隊網站資料庫 Schema
-- 請在 Supabase SQL Editor 執行此檔案
-- =====================================================

-- =====================================================
-- 0. 基礎資料表 (Legacy)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.members (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    email TEXT,
    weight TEXT,
    position TEXT,
    skill_rating INTEGER,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.practice_dates (
    id SERIAL PRIMARY KEY,
    confirmed_date DATE NOT NULL,
    display_date TEXT NOT NULL,
    place TEXT,
    meeting_time TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.practice_registrations (
    id SERIAL PRIMARY KEY,
    member_name TEXT NOT NULL REFERENCES public.members(name) ON DELETE CASCADE,
    practice_date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(member_name, practice_date)
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id SERIAL PRIMARY KEY,
    member_name TEXT NOT NULL REFERENCES public.members(name) ON DELETE CASCADE,
    practice_date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.equipment_inventory (
    id SERIAL PRIMARY KEY,
    item TEXT UNIQUE NOT NULL,
    count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.borrow_records (
    id SERIAL PRIMARY KEY,
    member_name TEXT NOT NULL REFERENCES public.members(name) ON DELETE CASCADE,
    borrow_date TEXT NOT NULL,
    item TEXT NOT NULL REFERENCES public.equipment_inventory(item),
    count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 1. 擴展 auth.users 的 profiles 表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    phone TEXT,
    
    -- 會員資訊
    join_date DATE DEFAULT CURRENT_DATE,
    member_tier TEXT DEFAULT 'newbie' CHECK (member_tier IN ('newbie', 'regular', 'veteran')),
    
    -- 積點相關
    total_points INTEGER DEFAULT 0,
    current_year_points INTEGER DEFAULT 0,
    consecutive_years INTEGER DEFAULT 0,
    
    -- 文化層稱號
    cultural_title TEXT CHECK (cultural_title IN ('anchor', 'backbone', 'keeper', NULL)),
    
    -- 擴展欄位
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 為 users 表啟用 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS 政策：使用者可以讀取所有人的基本資料
CREATE POLICY "Users can view all profiles" ON public.users
    FOR SELECT USING (true);

-- RLS 政策：使用者只能更新自己的資料
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- 2. 角色表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL CHECK (name IN ('guest', 'member', 'management', 'admin')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入預設角色
INSERT INTO public.roles (name, description) VALUES
    ('guest', '訪客 - 僅能瀏覽公開內容'),
    ('member', '隊員 - 可報名船練、累積積點'),
    ('management', '幹部 - 可管理練習、發布文章'),
    ('admin', '管理員 - 最高權限')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 3. 使用者角色關聯表（支援多角色）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id),
    UNIQUE(user_id, role_id)
);

-- 為 user_roles 表啟用 RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS 政策：所有已登入使用者可以讀取角色
CREATE POLICY "Authenticated users can view roles" ON public.user_roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- 4. 練習表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.practices (
    id SERIAL PRIMARY KEY,
    practice_date DATE NOT NULL,
    practice_time TIME,
    practice_type TEXT DEFAULT 'regular' CHECK (practice_type IN ('regular', 'coached', 'fitness', 'erg', 'external')),
    has_coach BOOLEAN DEFAULT false,
    location TEXT DEFAULT '碧潭',
    max_participants INTEGER,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled', 'completed')),
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 為 practices 表啟用 RLS
ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;

-- RLS 政策：所有人可以查看練習
CREATE POLICY "Anyone can view practices" ON public.practices
    FOR SELECT USING (true);

-- =====================================================
-- 5. 報名表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.registrations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    practice_id INTEGER NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    seat_preference TEXT,
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled', 'no_show')),
    checked_in_at TIMESTAMPTZ,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, practice_id)
);

-- 為 registrations 表啟用 RLS
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- RLS 政策
CREATE POLICY "Users can view all registrations" ON public.registrations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can register themselves" ON public.registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. 積點規則表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.point_rules (
    id SERIAL PRIMARY KEY,
    rule_code TEXT UNIQUE NOT NULL,
    rule_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('attendance', 'contribution', 'bonus', 'penalty')),
    activity_type TEXT,
    base_points INTEGER NOT NULL DEFAULT 1,
    conditions JSONB,
    multipliers JSONB,
    applicable_tiers TEXT[],
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入預設積點規則
INSERT INTO public.point_rules (rule_code, rule_name, category, activity_type, base_points, description) VALUES
    ('PRACTICE_REGULAR', '一般自主練習', 'attendance', 'practice', 1, '平日/假日船練'),
    ('PRACTICE_COACHED', '教練團練課', 'attendance', 'practice', 2, '有教練帶的正式練習'),
    ('TRAINING_FITNESS', '體能訓練課', 'attendance', 'fitness', 1, '划船後體能'),
    ('TRAINING_ERG', '划船機練習', 'attendance', 'erg', 2, 'ERG 測驗/練習'),
    ('EXTERNAL_PRACTICE', '他隊訓練', 'attendance', 'external', 0, '僅紀錄不計點'),
    ('CONTRIB_MENTORING', '帶新人', 'contribution', 'mentoring', 4, '陪練、錄影回饋'),
    ('CONTRIB_FILL_IN', '撐人數補位', 'contribution', 'support', 2, '臨時補缺、穩定陣容'),
    ('CONTRIB_TEAM_SUPPORT', '隊務支援', 'contribution', 'support', 2, '活動支援、比賽後勤'),
    ('BONUS_PERFECT_MONTH', '當月全勤', 'bonus', NULL, 4, '依當月表定次數')
ON CONFLICT (rule_code) DO NOTHING;

-- =====================================================
-- 7. 積點事件紀錄表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.point_events (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('earned', 'spent', 'bonus', 'adjustment', 'expired')),
    points_change INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    source_type TEXT,
    source_id TEXT,
    rule_id INTEGER REFERENCES public.point_rules(id),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 為 point_events 表啟用 RLS
ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

-- RLS 政策
CREATE POLICY "Users can view own point events" ON public.point_events
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 8. 徽章表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.badges (
    id SERIAL PRIMARY KEY,
    badge_code TEXT UNIQUE NOT NULL,
    badge_name TEXT NOT NULL,
    description TEXT,
    icon_emoji TEXT,
    icon_url TEXT,
    category TEXT CHECK (category IN ('streak', 'milestone', 'monthly', 'seasonal', 'special')),
    badge_tier TEXT DEFAULT 'bronze' CHECK (badge_tier IN ('iron', 'steel', 'titanium', 'bronze', 'silver', 'gold')),
    unlock_conditions JSONB NOT NULL,
    auto_reward_points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入預設徽章
INSERT INTO public.badges (badge_code, badge_name, icon_emoji, category, badge_tier, unlock_conditions, auto_reward_points, description) VALUES
    ('FIRST_PRACTICE', '新手啟航', '🚣', 'milestone', 'bronze', '{"metric": "first_practice", "operator": "eq", "value": true}', 0, '完成首次練習'),
    ('POINTS_20', '累積 20 點', '⭐', 'milestone', 'bronze', '{"metric": "total_points", "operator": "gte", "value": 20}', 0, '累積積點達 20'),
    ('POINTS_40', '累積 40 點', '🌟', 'milestone', 'silver', '{"metric": "total_points", "operator": "gte", "value": 40}', 0, '累積積點達 40'),
    ('POINTS_60', '累積 60 點', '💫', 'milestone', 'gold', '{"metric": "total_points", "operator": "gte", "value": 60}', 0, '累積積點達 60'),
    ('RUMA_IRON', 'RUMA Iron', '🔩', 'streak', 'iron', '{"metric": "consecutive_perfect_months", "operator": "gte", "value": 1}', 2, '連續 1 個月全勤'),
    ('RUMA_STEEL', 'RUMA Steel', '⚙️', 'streak', 'steel', '{"metric": "consecutive_perfect_months", "operator": "gte", "value": 2}', 4, '連續 2 個月全勤'),
    ('RUMA_TITANIUM', 'RUMA Titanium', '💎', 'streak', 'titanium', '{"metric": "consecutive_perfect_months", "operator": "gte", "value": 3}', 6, '連續 3 個月全勤')
ON CONFLICT (badge_code) DO NOTHING;

-- =====================================================
-- 9. 使用者徽章關聯表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_badges (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    badge_id INTEGER NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_context JSONB,
    UNIQUE(user_id, badge_id)
);

-- 為 user_badges 表啟用 RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS 政策
CREATE POLICY "Users can view all badges" ON public.user_badges
    FOR SELECT USING (true);

-- =====================================================
-- 10. 兌換品表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rewards (
    id SERIAL PRIMARY KEY,
    reward_code TEXT UNIQUE NOT NULL,
    reward_name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    category TEXT CHECK (category IN ('coach_resource', 'merchandise', 'special')),
    pool_type TEXT NOT NULL CHECK (pool_type IN ('newbie_pool', 'veteran_pool', 'general_pool')),
    points_cost INTEGER NOT NULL,
    capacity INTEGER,
    stock_quantity INTEGER,
    per_user_limit INTEGER,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入預設兌換品
INSERT INTO public.rewards (reward_code, reward_name, category, pool_type, points_cost, description) VALUES
    ('COACH_GROUP_20', '團練教練課（20人）', 'coach_resource', 'general_pool', 2, '大團體教練課'),
    ('COACH_SMALL_10', '小組教練課（10人）', 'coach_resource', 'veteran_pool', 8, '進階小班課'),
    ('COACH_VIDEO_FEEDBACK', '教練影片回饋', 'coach_resource', 'general_pool', 4, '動作錄影 + 個人回饋'),
    ('COACH_PRIORITY', '比賽前加強課優先', 'coach_resource', 'veteran_pool', 12, '優先報名權'),
    ('MERCH_KEYCHAIN', '限量鑰匙圈', 'merchandise', 'general_pool', 20, 'RUMA 專屬'),
    ('MERCH_TOWEL', '限量毛巾', 'merchandise', 'general_pool', 30, 'RUMA 專屬')
ON CONFLICT (reward_code) DO NOTHING;

-- =====================================================
-- 11. 兌換紀錄表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.redemption_records (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reward_id INTEGER NOT NULL REFERENCES public.rewards(id),
    points_spent INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    fulfilled_at TIMESTAMPTZ,
    notes TEXT
);

-- =====================================================
-- 12. 文章表（CMS）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    content TEXT,
    cover_image TEXT,
    author_id UUID REFERENCES public.users(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    view_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 為 articles 表啟用 RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- RLS 政策
CREATE POLICY "Anyone can view published articles" ON public.articles
    FOR SELECT USING (status = 'published');

-- =====================================================
-- 13. 裝備表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.equipment (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'maintenance', 'retired')),
    current_borrower_id UUID REFERENCES public.users(id),
    borrowed_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 14. 建立 Trigger 函式：自動建立 user profile
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    
    -- 自動給予 member 角色
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT NEW.id, id FROM public.roles WHERE name = 'member';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 建立 Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 15. 建立索引優化查詢效能
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_registrations_practice ON public.registrations(practice_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON public.registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_point_events_user ON public.point_events(user_id);
CREATE INDEX IF NOT EXISTS idx_practices_date ON public.practices(practice_date);
CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);

-- =====================================================
-- 完成！
-- =====================================================
-- RUMA Dragon Boat - Schema Update
-- 1. Roles & Permissions
-- 2. Activities & Registrations
-- 3. Schema fixes (users table, email in members)

-- ==========================================
-- 1. ROLES SYSTEM
-- ==========================================




-- RLS for user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
-- Allow all authenticated users to read roles (needed for AuthContext)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Allow read access for authenticated users'
  ) THEN
    CREATE POLICY "Allow read access for authenticated users" ON user_roles FOR SELECT TO authenticated USING (true);
  END IF;
END $$;


-- ==========================================
-- 2. ACTIVITIES SYSTEM
-- ==========================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('boat_practice', 'team_building', 'race', 'internal_competition')),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  deadline DATE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'Everyone can view activities') THEN
    CREATE POLICY "Everyone can view activities" ON activities FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'Management can manage activities') THEN
    CREATE POLICY "Management can manage activities" ON activities FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'management')
      )
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS activity_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

-- RLS for registrations
ALTER TABLE activity_registrations ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_registrations' AND policyname = 'Users can view own registrations') THEN
    CREATE POLICY "Users can view own registrations" ON activity_registrations FOR SELECT TO authenticated USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'management')
        )
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_registrations' AND policyname = 'Users can register themselves') THEN
    CREATE POLICY "Users can register themselves" ON activity_registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_registrations' AND policyname = 'Users can cancel own') THEN
    CREATE POLICY "Users can cancel own" ON activity_registrations FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;


-- ==========================================
-- 3. SCHEMA FIXES & ROLE ASSIGNMENT
-- ==========================================

-- Assign Roles to specific emails
DO $$
DECLARE
  v_admin_role_id UUID;
  v_mgmt_role_id UUID;
  v_member_role_id UUID;
  v_user_id UUID;
BEGIN
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO v_mgmt_role_id FROM roles WHERE name = 'management';
  SELECT id INTO v_member_role_id FROM roles WHERE name = 'member';

  -- Admin: rumadragonboat@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'rumadragonboat@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_admin_role_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Management: n79928@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'n79928@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_mgmt_role_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Member: siaominpan@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'siaominpan@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_member_role_id) ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Fix table columns
ALTER TABLE members ADD COLUMN IF NOT EXISTS email TEXT;

-- Create users table (needed for AuthContext) if not exists
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Public profiles') THEN
    CREATE POLICY "Public profiles" ON users FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Sync auth.users to users
INSERT INTO users (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;
-- Create Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('活動', '比賽', '裝勤', '榮譽', '其他')),
  date DATE NOT NULL,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Public read announcements') THEN
    CREATE POLICY "Public read announcements" ON announcements FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Management manage announcements') THEN
    CREATE POLICY "Management manage announcements" ON announcements FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'management')
      )
    );
  END IF;
END $$;

-- Add avatar_url to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_url TEXT;
-- 最新消息表 (News)
-- 用於存儲 RUMA 龍舟隊的最新消息/文章

CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL DEFAULT '隊伍活動',
    cover_image TEXT,
    excerpt TEXT,
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_pinned BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_news_published ON news(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_pinned ON news(is_pinned DESC, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug);

-- RLS 政策
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- 允許所有人讀取已發布的最新消息
CREATE POLICY "Anyone can read published news"
    ON news FOR SELECT
    USING (is_published = true);

-- 允許 Management 角色讀取所有最新消息（含草稿）
CREATE POLICY "Management can read all news"
    ON news FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('management', 'admin')
        )
    );

-- 允許 Management 角色新增最新消息
CREATE POLICY "Management can insert news"
    ON news FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('management', 'admin')
        )
    );

-- 允許 Management 角色更新最新消息
CREATE POLICY "Management can update news"
    ON news FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('management', 'admin')
        )
    );

-- 允許 Management 角色刪除最新消息
CREATE POLICY "Management can delete news"
    ON news FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('management', 'admin')
        )
    );

-- 更新時間觸發器
CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_news_updated_at
    BEFORE UPDATE ON news
    FOR EACH ROW
    EXECUTE FUNCTION update_news_updated_at();
-- =====================================================
-- RUMA Dragon Boat - 新功能資料表 Migration
-- 請在 Supabase SQL Editor 執行此 SQL
-- =====================================================

-- 1. 自主訓練紀錄 (Self Training Records)
CREATE TABLE IF NOT EXISTS self_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  photo_url TEXT,
  training_date DATE NOT NULL,
  training_type TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  m_points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. U幣交易紀錄 (U-Coins Transactions)
CREATE TABLE IF NOT EXISTS u_coins_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  m_points_used INTEGER DEFAULT 0,
  u_coins_amount INTEGER NOT NULL,
  product_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 可兌換商品 (Redeemable Products)
CREATE TABLE IF NOT EXISTS redeemable_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  u_coins_price INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 新增預設商品
INSERT INTO redeemable_products (name, description, u_coins_price, stock, is_active) VALUES
  ('槳造型鑰匙圈', 'RUMA 限定版槳造型鑰匙圈', 5, 50, true),
  ('RUMA限量帽T', 'RUMA 限量版連帽衛衣', 50, 20, true),
  ('RUMA限量棒球帽', 'RUMA 限量版棒球帽', 25, 30, true);

-- 完成！
-- Add i18n columns to news table
ALTER TABLE news 
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS excerpt_en TEXT,
ADD COLUMN IF NOT EXISTS content_en JSONB DEFAULT '[]'::jsonb;
-- =====================================================
-- Database Functions for Admin Role Management
-- 執行此 SQL 於 Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. 刪除現有函式（如果存在）
DROP FUNCTION IF EXISTS admin_assign_role(UUID, TEXT);
DROP FUNCTION IF EXISTS admin_list_users_with_roles();
DROP FUNCTION IF EXISTS get_role_id_by_name(TEXT);

-- 2. 建立輔助函式：根據角色名稱取得角色 ID
CREATE OR REPLACE FUNCTION get_role_id_by_name(role_name TEXT)
RETURNS INTEGER AS $$
DECLARE
    result_id INTEGER;
BEGIN
    SELECT id INTO result_id FROM roles WHERE name = role_name;
    RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 建立管理員指派角色函式
CREATE OR REPLACE FUNCTION admin_assign_role(
    target_user_id UUID,
    new_role TEXT
)
RETURNS JSONB AS $$
DECLARE
    role_id_val INTEGER;
    caller_roles TEXT[];
BEGIN
    -- 取得呼叫者的角色列表
    SELECT ARRAY_AGG(r.name) INTO caller_roles
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid();
    
    -- 檢查呼叫者是否為 admin 或 management
    IF NOT ('admin' = ANY(caller_roles) OR 'management' = ANY(caller_roles)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only admin or management can assign roles');
    END IF;
    
    -- 取得角色 ID
    SELECT id INTO role_id_val FROM roles WHERE name = new_role;
    
    IF role_id_val IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role name');
    END IF;
    
    -- 刪除該用戶現有角色
    DELETE FROM user_roles WHERE user_id = target_user_id;
    
    -- 插入新角色
    INSERT INTO user_roles (user_id, role_id) VALUES (target_user_id, role_id_val);
    
    RETURN jsonb_build_object('success', true, 'message', 'Role assigned successfully');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 建立取得所有用戶及其角色的函式
CREATE OR REPLACE FUNCTION admin_list_users_with_roles()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    member_name TEXT,
    role_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- 返回所有 members 與其對應的 auth user 和角色
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email::TEXT,
        m.name as member_name,
        COALESCE(r.name, 'member') as role_name,
        au.created_at
    FROM auth.users au
    LEFT JOIN members m ON m.email = au.email
    LEFT JOIN user_roles ur ON ur.user_id = au.id
    LEFT JOIN roles r ON r.id = ur.role_id
    ORDER BY m.name, au.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 授予執行權限
GRANT EXECUTE ON FUNCTION admin_assign_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION get_role_id_by_name(TEXT) TO authenticated;

-- 6. 確保 user_roles 表有正確的 RLS 政策讓函式可以操作
-- (SECURITY DEFINER 函式會以建立者身份執行，繞過 RLS)
