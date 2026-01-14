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
