-- 允許使用者刪除自己的訓練紀錄
CREATE POLICY IF NOT EXISTS "Users can delete own training records"
    ON training_records
    FOR DELETE
    USING (auth.uid() = user_id);

-- 允許使用者更新自己的訓練紀錄
CREATE POLICY IF NOT EXISTS "Users can update own training records"
    ON training_records
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 允許使用者刪除自己的 point_events（用於紀錄刪除時扣除 M 點）
CREATE POLICY IF NOT EXISTS "Users can delete own point events"
    ON point_events
    FOR DELETE
    USING (auth.uid() = user_id);
