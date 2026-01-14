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
