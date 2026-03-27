-- ==========================================
-- RUMA Dragon Boat - Restore Missing News
-- Restores 2 announcements for user n79928@gmail.com
-- ==========================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 1. Get User ID for n79928@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'n79928@gmail.com';

  IF v_user_id IS NOT NULL THEN
    
    -- 2. Insert Announcement 1: Team Recruitment
    INSERT INTO announcements (title, content, category, date, pinned, created_by)
    VALUES (
      '2024 年度龍舟隊員擴大招募中', 
      'RUMA 龍舟隊誠摯邀請熱愛水上運動的你加入！<br>
      無論你是新手還是有經驗的划手，我們都歡迎。<br>
      <br>
      <b>招募條件：</b><br>
      1. 熱愛團隊合作<br>
      2. 能配合週末訓練時間<br>
      3. 不怕曬、不怕累<br>
      <br>
      意者請直接在「管理專區」報名體驗活動，或聯繫我們！', 
      '活動', 
      CURRENT_DATE - INTERVAL '2 days', 
      true, 
      v_user_id
    );

    -- 3. Insert Announcement 2: Training Schedule
    INSERT INTO announcements (title, content, category, date, pinned, created_by)
    VALUES (
      '一月份加強訓練公告', 
      '各位隊員請注意，為了備戰即將到來的賽事，一月份將增加週間體能訓練。<br>
      <br>
      <b>時間：</b> 每週三晚上 19:30 - 21:00<br>
      <b>地點：</b> 健身房 (詳情請見群組)<br>
      <b>內容：</b><br>
      - 核心肌群強化<br>
      - 心肺耐力訓練<br>
      <br>
      請大家務必撥空參加！', 
      '裝勤', 
      CURRENT_DATE, 
      false, 
      v_user_id
    );

  ELSE
    RAISE NOTICE 'User n79928@gmail.com not found. Skipping restore.';
  END IF;

END $$;
