-- =====================================================
-- RUMA 龍舟隊網站資料庫 Schema
-- 請在 Supabase SQL Editor 執行此檔案
-- =====================================================

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
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
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
