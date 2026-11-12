// src/utils/i18n.js
// 給「非 React 元件」使用的語系小工具（API 層、Context、工具函式）
// React 元件內請沿用 useLanguage() 的 lang 與 `lang === 'zh' ? ... : ...` 慣例。

// 與 LanguageContext 相同的判斷：先看 localStorage，沒有再看瀏覽器語言
export function getLang() {
    try {
        const stored = localStorage.getItem('ruma_lang');
        if (stored) return stored;
        const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
        return browserLang.includes('zh') ? 'zh' : 'en';
    } catch {
        return 'zh';
    }
}

// 依目前語系回傳對應文案：tr('中文', 'English')
export function tr(zh, en) {
    return getLang() === 'zh' ? zh : en;
}

// ===== 年 / 月下拉選單顯示文字（option 的 value 仍維持數字）=====
export const MONTH_ABBR_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// 年份：中文「2026 年」、英文「2026」
export function formatYearLabel(year, lang) {
    return lang === 'zh' ? `${year} 年` : `${year}`;
}

// 月份：中文「10 月」、英文「OCT」（month 為 1-12）
export function formatMonthLabel(month, lang) {
    const m = parseInt(month, 10);
    return lang === 'zh' ? `${m} 月` : (MONTH_ABBR_EN[m - 1] || `${m}`);
}
