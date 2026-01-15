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
