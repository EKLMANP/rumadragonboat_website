-- 新增自主訓練積點規則 (修正版：category 使用 attendance)
-- 每次上傳自主訓練紀錄可獲得 1 M 點
-- category 只能是: attendance, contribution, bonus, penalty
INSERT INTO point_rules (rule_code, rule_name, base_points, category, description, is_active)
VALUES ('TRAINING_SELF', '自主訓練', 1, 'attendance', '上傳自主訓練紀錄可獲得 1 M 點', true)
ON CONFLICT (rule_code) DO NOTHING;

-- 確認 point_events 表的 RLS 允許使用者新增自己的紀錄
ALTER TABLE point_events ENABLE ROW LEVEL SECURITY;

-- 允許已登入使用者查看自己的 point_events
DROP POLICY IF EXISTS "Users can view own point events" ON point_events;
CREATE POLICY "Users can view own point events" ON point_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 允許已登入使用者新增自己的 point_events
DROP POLICY IF EXISTS "Users can insert own point events" ON point_events;
CREATE POLICY "Users can insert own point events" ON point_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 確認 training_records 表的 RLS 允許使用者查看及新增自己的紀錄
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own training records" ON training_records;
CREATE POLICY "Users can view own training records" ON training_records
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own training records" ON training_records;
CREATE POLICY "Users can insert own training records" ON training_records
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 確認 members 表允許使用者更新自己的 total_points
-- (透過 email 匹配確認身份)
DROP POLICY IF EXISTS "Users can update own member points" ON members;
CREATE POLICY "Users can update own member points" ON members
  FOR UPDATE TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
