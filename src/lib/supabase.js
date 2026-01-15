// src/lib/supabase.js
// Supabase 客戶端配置
// 請在 .env 檔案中設定 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        '⚠️ Supabase 環境變數未設定。請在 .env 檔案中設定：\n' +
        'VITE_SUPABASE_URL=你的_Supabase_URL\n' +
        'VITE_SUPABASE_ANON_KEY=你的_Supabase_Anon_Key'
    );
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
);

// 輔助函式：取得當前使用者
export const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('取得使用者失敗:', error);
        return null;
    }
    return user;
};

// 輔助函式：取得當前 session
export const getCurrentSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('取得 session 失敗:', error);
        return null;
    }
    return session;
};
