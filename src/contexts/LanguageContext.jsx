// src/contexts/LanguageContext.jsx
// 多語系切換 Context - 支援中英文切換

import React, { createContext, useContext, useState, useEffect } from 'react';

// 翻譯內容 - 專業體育行業翻譯
const translations = {
    zh: {
        // Navigation
        nav_home: '首頁',
        nav_about: '關於我們',
        nav_why_ruma: '為什麼選擇RUMA',
        nav_news: '最新消息',

        nav_contact: '聯絡我們',
        nav_faq: '常見問答',
        btn_login: '隊友登入',
        btn_join: '加入我們',

        // Hero Section
        hero_title_1: 'RUMA',
        hero_title_2: '龍舟隊',
        hero_subtitle: '沒有你、我，只有「我們」',
        hero_cta_about: '認識 RUMA',
        hero_cta_video: '觀看影片',

        // About Section
        about_title_1: '關於',
        about_title_2: '我們',
        about_content_1: 'RUMA龍舟隊是在2024由一群熱愛龍舟運動，來自各國朋友組成，',
        about_highlight_ruma: 'RUMA',
        about_content_2: '四個字母元素代表',
        about_value_1: '叛逆',
        about_value_2: '團結',
        about_value_3: '勇敢',
        about_value_4: '友誼',
        about_content_3: '，而RUMA組合起來在馬來文是「',
        about_highlight_home: '家',
        about_content_4: '」的意思。',
        about_closing: '我們希望隊友在享受龍舟運動的同時，也都能融入RUMA大家庭，一起運動、一起保持健康！',

        // Core Values Section
        core_title_1: 'RUMA',
        core_title_2: '核心價值',
        core_value_1: '團隊至上',
        core_value_2: '樂於分享',
        core_value_3: '成長心態',
        core_value_4: '透明開放',

        // Achievements Section
        achievements_title_1: '競賽',
        achievements_title_2: '實績',
        achievement_1_title: '2025 花蓮國際龍舟賽',
        achievement_1_rank: '第 3 名',
        achievement_1_desc: '2000米大型混合龍舟',
        achievement_2_title: '2024 新北市議長盃龍舟錦標賽',
        achievement_2_rank: '第 7 名',
        achievement_2_desc: '大型混合龍舟',

        // Why RUMA Section
        why_title_1: '為什麼選擇',
        why_title_2: 'RUMA',
        why_subtitle: '我們不只是一支龍舟隊，更是一個追求卓越的團隊',
        why_card_1_title: '專業訓練',
        why_card_1_desc: '由專業教練帶領，系統化訓練課程，從基礎到進階，幫助你成為優秀的划手。',
        why_card_2_title: '團隊精神',
        why_card_2_desc: '龍舟是團隊運動，在這裡你會找到志同道合的夥伴，一起努力、一起成長。',
        why_card_3_title: '挑戰自我',
        why_card_3_desc: '參與各項比賽和活動，突破自己的極限，在汗水中找到成就感。',

        // Stats Section
        stat_members: '隊員',
        stat_years: '年經驗',
        stat_trainings: '次訓練',
        stat_races: '場比賽',

        // CTA Section
        cta_title: '準備好加入我們了嗎？',
        cta_desc_1: '不論你是新手還是有經驗的划手，RUMA 歡迎每一位熱愛龍舟的你！',
        cta_desc_2: '也歡迎各大品牌聯繫贊助',
        cta_button: '聯絡我們',

        // Footer
        footer_instagram: 'Instagram',
        footer_about: '關於我們',
        footer_articles: '文章',
        footer_contact: '聯絡我們',
        footer_copyright: '© 2026 RUMA Dragon Boat Team. All rights reserved.',

        // Backend App - Common
        app_loading: '載入中...',
        app_save: '儲存',
        app_cancel: '取消',
        app_confirm: '確認',
        app_delete: '刪除',
        app_edit: '編輯',
        app_create: '新增',
        app_search: '搜尋',
        app_no_data: '無資料',
        app_view_all: '查看全部 →',
        app_register: '報名',
        app_submit: '提交',
        app_back: '返回',
        app_tbd: '待定',

        // Backend App - Roles
        role_admin: '管理員',
        role_management: '幹部',
        role_member: '隊員',

        // Backend App - Dashboard
        dash_welcome: '歡迎回來，',
        dash_today_msg: '今天也要努力提升自己喔！',
        dash_upload_training: '📸 上傳自主訓練紀錄',
        dash_register_now: '立即報名活動 →',
        dash_total_points: '累積M點',
        dash_monthly_practice: '本月練習',
        dash_streak: '連續出席',
        dash_rank: '本月排名',
        dash_upcoming: '📅 近期開放報名活動',
        dash_no_activities: '目前無開放報名的活動',
        dash_my_points: '🏆 我的M點',
        dash_no_badges: '尚無徽章',
        dash_badge_newbie: '新手啟航',

        // Backend App - Bug Report
        bug_report: 'Bug 回報',

        // Backend App - Settings
        settings_profile: '個人設定',
        settings_logout: '登出',

        // Backend App - Admin Page
        admin_title: '🔧 管理員後台',
        admin_desc: '建立隊員資料與更新公用裝備狀態',
        admin_reload: '重新載入',
        admin_tab_members: '隊員資料管理',
        admin_tab_equipment: '裝備管理',
        admin_tab_users: '使用者帳號管理',
        admin_tab_bugs: 'Bug修復',
        admin_add_member: '輸入隊員資料',
        admin_member_list: '已輸入的隊員資料',
        admin_member_count: '共 {count} 人',
        admin_name: '姓名',
        admin_email: 'Email',
        admin_weight: '體重 (kg)',
        admin_position: '劃船位置',
        admin_skill: '技術評分 (1-5)',
        admin_add: '新增',
        admin_no_members: '尚無資料',
        admin_editing: '正在編輯:',
        admin_page_info: '第 {current} / {total} 頁',
        admin_prev: '← 上一頁',
        admin_next: '下一頁 →',
        admin_equip_title: '裝備庫存管理',
        admin_select_equip: '選擇裝備',
        admin_quantity: '數量 (0-15)',
        admin_update_stock: '確認更新庫存',
        admin_stock_overview: '目前庫存概覽:',
        admin_borrow_title: '裝備借用紀錄',
        admin_borrower: '借用人',
        admin_borrow_date: '借用日期',
        admin_borrow_item: '借用裝備',
        admin_borrow_count: '借用數量',
        admin_add_record: '新增借用紀錄',
        admin_borrow_records: '現有借用紀錄',
        admin_no_records: '目前無借用紀錄',
        admin_create_user: '建立新使用者',
        admin_role: '角色',
        admin_create: '建立',
        admin_user_list: '現有使用者',
        admin_no_users: '無使用者資料',
        admin_member_email: '隊員 Email',
        admin_update_email: '更新 Email',
        admin_bug_list: 'Bug 報告列表',
        admin_bug_resolved: '已解決',
        admin_bug_pending: '待處理',
        admin_no_bugs: '目前無 Bug 報告',
        admin_sync: '資料同步中...',

        // Calendar Page
        cal_title: '年度日程表',
        cal_desc: '查看所有活動，點擊活動可報名',
        cal_open_activities: '開放報名的活動',
        cal_loading: '載入中...',
        cal_no_activities: '目前無開放報名的活動',
        cal_go_register: '前往活動報名',
        cal_register: '報名',
        cal_months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        cal_days: ['日', '一', '二', '三', '四', '五', '六'],
        cal_year_suffix: '年',
        type_race: '龍船比賽',
        type_practice: '船練',
        type_team_building: 'Team Building',
        type_internal: '內部競賽',
        type_tbd: '待定',

        // Practice/Registration Page
        prac_title: '活動報名',
        prac_desc: '選擇想報名的活動',
        prac_select: '選擇活動',
        prac_submit: '確認報名',
        prac_cancel: '取消報名',
        prac_registered: '已報名',
        prac_seating: '座位表',
        prac_my_reg: '我的報名紀錄',
        prac_no_activities: '目前無開放報名的活動',

        // My Journey Page
        journey_title: '我的龍舟旅程',
        journey_activities: '活動報名',
        journey_training: '自主訓練',
        journey_achievements: '成就記錄',
        journey_upload: '上傳訓練紀錄',
        journey_no_records: '尚無記錄',
        journey_status_pending: '待審核',
        journey_status_approved: '已通過',
        journey_status_rejected: '已拒絕',
    },
    en: {
        // Navigation
        nav_home: 'HOME',
        nav_about: 'ABOUT US',
        nav_why_ruma: 'WHY RUMA',
        nav_news: 'NEWS',

        nav_contact: 'CONTACT',
        nav_faq: 'FAQ',
        btn_login: 'TEAM LOGIN',
        btn_join: 'JOIN US',

        // Hero Section
        hero_title_1: 'RUMA',
        hero_title_2: 'DRAGON BOAT',
        hero_subtitle: 'No You, No Me — Only "US"',
        hero_cta_about: 'DISCOVER RUMA',
        hero_cta_video: 'WATCH VIDEO',

        // About Section
        about_title_1: 'ABOUT',
        about_title_2: 'US',
        about_content_1: 'Founded in 2024, RUMA Dragon Boat is a diverse crew of paddlers from around the globe, united by our passion for the sport. ',
        about_highlight_ruma: 'RUMA',
        about_content_2: ' stands for ',
        about_value_1: 'Rebellion',
        about_value_2: 'Unity',
        about_value_3: 'Might',
        about_value_4: 'Amity',
        about_content_3: ' — and in Malay, it means "',
        about_highlight_home: 'Home',
        about_content_4: '".',
        about_closing: 'We believe that every teammate should feel at home while chasing excellence on the water. Train hard. Stay healthy. Paddle as one.',

        // Core Values Section
        core_title_1: 'RUMA',
        core_title_2: 'CORE VALUES',
        core_value_1: 'TEAM FIRST',
        core_value_2: 'SHARE FREELY',
        core_value_3: 'GROWTH MINDSET',
        core_value_4: 'OPEN & HONEST',

        // Achievements Section
        achievements_title_1: 'HALL OF',
        achievements_title_2: 'GLORY',
        achievement_1_title: '2025 Hualien International Dragon Boat Festival',
        achievement_1_rank: '3RD PLACE',
        achievement_1_desc: '2000m Grand Final — Mixed Large Boat',
        achievement_2_title: '2024 New Taipei City Speaker Cup',
        achievement_2_rank: '7TH PLACE',
        achievement_2_desc: 'Mixed Large Boat Category',

        // Why RUMA Section
        why_title_1: 'WHY',
        why_title_2: 'RUMA',
        why_subtitle: 'We are more than a team — we are a family chasing greatness together.',
        why_card_1_title: 'ELITE TRAINING',
        why_card_1_desc: 'World-class coaching with structured programs — from fundamentals to race-day performance.',
        why_card_2_title: 'TEAM SPIRIT',
        why_card_2_desc: 'Dragon boat is a team sport. Here, you\'ll find like-minded paddlers pushing limits together.',
        why_card_3_title: 'CHALLENGE YOURSELF',
        why_card_3_desc: 'Compete in regattas. Break personal records. Discover the champion within.',

        // Stats Section
        stat_members: 'MEMBERS',
        stat_years: 'YEARS',
        stat_trainings: 'SESSIONS',
        stat_races: 'RACES',

        // CTA Section
        cta_title: 'READY TO JOIN THE CREW?',
        cta_desc_1: 'Whether you\'re a rookie or an experienced paddler, RUMA welcomes everyone who loves dragon boat!',
        cta_desc_2: 'Sponsorship inquiries are also welcome.',
        cta_button: 'CONTACT US',

        // Footer
        footer_instagram: 'Instagram',
        footer_about: 'About Us',
        footer_articles: 'Articles',
        footer_contact: 'Contact',
        footer_copyright: '© 2026 RUMA Dragon Boat Team. All rights reserved.',

        // Backend App - Common
        app_loading: 'Loading...',
        app_save: 'Save',
        app_cancel: 'Cancel',
        app_confirm: 'Confirm',
        app_delete: 'Delete',
        app_edit: 'Edit',
        app_create: 'Create',
        app_search: 'Search',
        app_no_data: 'No data',
        app_view_all: 'View all →',
        app_register: 'Register',
        app_submit: 'Submit',
        app_back: 'Back',
        app_tbd: 'TBD',

        // Backend App - Roles
        role_admin: 'Admin',
        role_management: 'Management',
        role_member: 'Member',

        // Backend App - Dashboard
        dash_welcome: 'Welcome back, ',
        dash_today_msg: 'Keep up the great work today!',
        dash_upload_training: '📸 Upload Training Record',
        dash_register_now: 'Register for Activity →',
        dash_total_points: 'M Points',
        dash_monthly_practice: 'Monthly Sessions',
        dash_streak: 'Weekly Streak',
        dash_rank: 'Monthly Rank',
        dash_upcoming: '📅 Upcoming Activities',
        dash_no_activities: 'No open activities',
        dash_my_points: '🏆 My Points & Coins',
        dash_no_badges: 'No badges yet',
        dash_badge_newbie: 'New Paddler',

        // Backend App - Bug Report
        bug_report: 'Report Bug',

        // Backend App - Settings
        settings_profile: 'Profile Settings',
        settings_logout: 'Logout',

        // Backend App - Admin Page
        admin_title: '🔧 Admin Panel',
        admin_desc: 'Manage member data and update equipment status',
        admin_reload: 'Reload',
        admin_tab_members: 'Member Management',
        admin_tab_equipment: 'Equipment',
        admin_tab_users: 'User Accounts',
        admin_tab_bugs: 'Bug Fixes',
        admin_add_member: 'Add Member',
        admin_member_list: 'Member List',
        admin_member_count: '{count} members',
        admin_name: 'Name',
        admin_email: 'Email',
        admin_weight: 'Weight (kg)',
        admin_position: 'Paddling Position',
        admin_skill: 'Skill Rating (1-5)',
        admin_add: 'Add',
        admin_no_members: 'No members yet',
        admin_editing: 'Editing:',
        admin_page_info: 'Page {current} / {total}',
        admin_prev: '← Previous',
        admin_next: 'Next →',
        admin_equip_title: 'Equipment Inventory',
        admin_select_equip: 'Select Equipment',
        admin_quantity: 'Quantity (0-15)',
        admin_update_stock: 'Update Stock',
        admin_stock_overview: 'Current Stock:',
        admin_borrow_title: 'Borrow Records',
        admin_borrower: 'Borrower',
        admin_borrow_date: 'Borrow Date',
        admin_borrow_item: 'Item',
        admin_borrow_count: 'Quantity',
        admin_add_record: 'Add Record',
        admin_borrow_records: 'Current Records',
        admin_no_records: 'No borrow records',
        admin_create_user: 'Create New User',
        admin_role: 'Role',
        admin_create: 'Create',
        admin_user_list: 'User List',
        admin_no_users: 'No users found',
        admin_member_email: 'Member Email',
        admin_update_email: 'Update Email',
        admin_bug_list: 'Bug Reports',
        admin_bug_resolved: 'Resolved',
        admin_bug_pending: 'Pending',
        admin_no_bugs: 'No bug reports',
        admin_sync: 'Syncing...',

        // Calendar Page
        cal_title: 'Annual Schedule',
        cal_desc: 'View all activities. Click to register',
        cal_open_activities: 'Open for Registration',
        cal_loading: 'Loading...',
        cal_no_activities: 'No activities open for registration',
        cal_go_register: 'Go to Registration',
        cal_register: 'Register',
        cal_months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        cal_days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        cal_year_suffix: '',
        type_race: 'Dragon Boat Race',
        type_practice: 'Boat Practice',
        type_team_building: 'Team Building',
        type_internal: 'Internal Competition',
        type_tbd: 'TBD',

        // Practice/Registration Page
        prac_title: 'Activity Registration',
        prac_desc: 'Select activities to register',
        prac_select: 'Select Activity',
        prac_submit: 'Confirm Registration',
        prac_cancel: 'Cancel Registration',
        prac_registered: 'Registered',
        prac_seating: 'Seating Chart',
        prac_my_reg: 'My Registrations',
        prac_no_activities: 'No activities open for registration',

        // My Journey Page
        journey_title: 'My Dragon Boat Journey',
        journey_activities: 'Activities',
        journey_training: 'Self Training',
        journey_achievements: 'Achievements',
        journey_upload: 'Upload Training Record',
        journey_no_records: 'No records yet',
        journey_status_pending: 'Pending',
        journey_status_approved: 'Approved',
        journey_status_rejected: 'Rejected',
    }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState('zh');

    // 初始化：檢查 localStorage 或瀏覽器語言
    useEffect(() => {
        const storedLang = localStorage.getItem('ruma_lang');
        if (storedLang) {
            setLang(storedLang);
        } else {
            // 自動偵測瀏覽器語言
            const browserLang = navigator.language || navigator.userLanguage;
            if (browserLang && browserLang.toLowerCase().includes('zh')) {
                setLang('zh');
            } else {
                setLang('en');
            }
        }
    }, []);

    // 切換語言
    const toggleLanguage = () => {
        const newLang = lang === 'zh' ? 'en' : 'zh';
        setLang(newLang);
        localStorage.setItem('ruma_lang', newLang);
    };

    // 取得翻譯文字
    const t = (key) => {
        return translations[lang][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

export default LanguageContext;
