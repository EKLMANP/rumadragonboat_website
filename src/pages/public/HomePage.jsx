// src/pages/public/HomePage.jsx
// RUMA 龍舟隊官網首頁 - Fightness 風格設計 + i18n 支援

import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function HomePage() {
    const { isAuthenticated } = useAuth();
    const { t, lang } = useLanguage();
    const location = useLocation();

    // 處理 hash 導航：頁面載入或 hash 變化時滾動到對應 section
    useEffect(() => {
        const hash = location.hash;
        if (hash) {
            const sectionId = hash.substring(1); // 移除 '#'
            // 延遲執行以確保頁面已完全載入
            setTimeout(() => {
                const element = document.getElementById(sectionId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }, [location.hash]);

    // 影片檔案路徑（放在 public 資料夾）
    const heroVideoSrc = '/hero-video.mp4';
    const heroImageFallback = '/banner.jpg';

    // RUMA 官方 Email
    const rumaEmail = 'rumadragonboat@gmail.com';

    return (
        <div className="min-h-screen bg-[#0a0a0a] overflow-x-hidden font-sans">
            <Navbar />

            {/* ===== HERO SECTION ===== */}
            <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
                {/* Video Background */}
                <div className="absolute inset-0 z-0">
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        poster={heroImageFallback}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ filter: 'brightness(0.4)' }}
                    >
                        <source src={heroVideoSrc} type="video/mp4" />
                    </video>
                    {/* Fallback Image */}
                    <img
                        src={heroImageFallback}
                        alt="RUMA Dragon Boat"
                        className="absolute inset-0 w-full h-full object-cover -z-10"
                        style={{ filter: 'brightness(0.4)' }}
                    />
                </div>

                {/* Hero Content */}
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left w-full pt-20">
                    {/* Giant Typography */}
                    <h1 className="font-display font-bold text-6xl md:text-8xl lg:text-9xl uppercase leading-none tracking-tighter mb-4">
                        <span className="block text-white drop-shadow-lg">{t('hero_title_1')}</span>
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-white">
                            {t('hero_title_2')}
                        </span>
                    </h1>

                    {/* Tagline with red border */}
                    <p className="mt-4 max-w-2xl text-xl md:text-2xl text-gray-200 font-light border-l-4 border-red-600 pl-4 italic">
                        {t('hero_subtitle')}
                    </p>

                    {/* CTA Buttons - Skewed Style */}
                    <div className="mt-10 flex flex-col sm:flex-row gap-4">
                        {!isAuthenticated && (
                            <a
                                href="#about"
                                className="bg-red-600 text-white px-8 py-4 text-lg font-display font-bold uppercase tracking-widest hover:bg-white hover:text-red-600 transition-all duration-300 transform -skew-x-12"
                            >
                                <span className="block transform skew-x-12">{t('hero_cta_about')}</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* Decorative Skew at bottom */}
                <div className="absolute bottom-0 left-0 w-full h-24 bg-[#0a0a0a] transform origin-bottom-right -skew-y-3 translate-y-12"></div>
            </section>

            {/* ===== 關於我們 SECTION (50/50 Split Layout) ===== */}
            <section id="about" className="grid grid-cols-1 md:grid-cols-2 min-h-[600px]">
                {/* Left: Image */}
                <div className="relative h-80 md:h-auto overflow-hidden group">
                    <img
                        src="/Landing page 1.jpg"
                        alt="RUMA Team Spirit"
                        onError={(e) => { e.target.src = '/banner.jpg'; }}
                        className="w-full h-full object-cover min-h-[400px] transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500"></div>
                </div>

                {/* Right: Red Content - Gradient matching Contact section */}
                <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-900 flex flex-col justify-center p-10 md:p-16 lg:p-20 text-white relative">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-0.5 w-12 bg-white"></div>
                        <span className="font-display font-bold tracking-widest text-sm uppercase">
                            {t('about_title_1')} {t('about_title_2')}
                        </span>
                    </div>
                    <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold uppercase leading-tight mb-8">
                        {t('core_title_1')}<br />{t('core_title_2')}
                    </h2>
                    {lang === 'zh' ? (
                        <p className="text-white/90 text-lg leading-relaxed mb-8">
                            RUMA龍舟隊是在2024由一群熱愛龍舟運動，來自各國朋友組成，<strong>RUMA</strong>四個字母元素代表<span className="font-bold">叛逆</span>、<span className="font-bold">團結</span>、<span className="font-bold">勇敢</span>、<span className="font-bold">友誼</span>，而RUMA組合起來在馬來文是「<strong>家</strong>」的意思。我們希望隊友在享受龍舟運動的同時，也都能融入RUMA大家庭，一起運動、一起保持健康！
                        </p>
                    ) : (
                        <p className="text-white/90 text-lg leading-relaxed mb-8">
                            Founded in 2024, <strong>RUMA</strong> Dragon Boat is a diverse crew of paddlers from around the globe, united by our passion for the sport. RUMA stands for <span className="font-bold">Rebellion</span>, <span className="font-bold">Unity</span>, <span className="font-bold">Might</span>, and <span className="font-bold">Amity</span> — and in Malay, it means "<strong>Home</strong>". Train hard. Stay healthy. Paddle as one.
                        </p>
                    )}
                    <div>
                        <a
                            href="#core-values"
                            className="inline-block border-2 border-white text-white px-8 py-3 font-display font-bold uppercase tracking-wider hover:bg-white hover:text-red-600 transition-all duration-300 transform -skew-x-12"
                        >
                            <span className="block transform skew-x-12">{lang === 'zh' ? '了解更多' : 'LEARN MORE'}</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* ===== RUMA 核心價值 SECTION ===== */}
            <section id="core-values" className="relative py-24 bg-[#121212] z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="text-center mb-16">
                        <h2 className="font-display text-4xl md:text-6xl font-bold uppercase tracking-tight text-white mb-2">
                            {t('core_title_1')} <span className="text-red-600">{t('core_title_2')}</span>
                        </h2>
                        <div className="h-1 w-24 bg-red-600 mx-auto"></div>
                    </div>

                    {/* Core Values Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Value 1 */}
                        <div className="group relative bg-[#2b2b2b] p-8 hover:-translate-y-2 transition-transform duration-300 border-b-4 border-red-600 text-center">
                            <div className="text-5xl mb-4">🤝</div>
                            <h3 className="font-display text-2xl font-bold uppercase text-white">{t('core_value_1')}</h3>
                        </div>

                        {/* Value 2 */}
                        <div className="group relative bg-[#2b2b2b] p-8 hover:-translate-y-2 transition-transform duration-300 border-b-4 border-white text-center">
                            <div className="text-5xl mb-4">💡</div>
                            <h3 className="font-display text-2xl font-bold uppercase text-white">{t('core_value_2')}</h3>
                        </div>

                        {/* Value 3 */}
                        <div className="group relative bg-[#2b2b2b] p-8 hover:-translate-y-2 transition-transform duration-300 border-b-4 border-red-600 text-center">
                            <div className="text-5xl mb-4">🌱</div>
                            <h3 className="font-display text-2xl font-bold uppercase text-white">{t('core_value_3')}</h3>
                        </div>

                        {/* Value 4 */}
                        <div className="group relative bg-[#2b2b2b] p-8 hover:-translate-y-2 transition-transform duration-300 border-b-4 border-white text-center">
                            <div className="text-5xl mb-4">🔓</div>
                            <h3 className="font-display text-2xl font-bold uppercase text-white">{t('core_value_4')}</h3>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== ACHIEVEMENTS SECTION (Timeline Style - Grouped by Year) ===== */}
            <section id="achievements" className="py-24 bg-[#0a0a0a] relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="font-display text-4xl md:text-6xl font-bold uppercase text-right text-white mb-16">
                        {t('achievements_title_1')}<span className="text-red-600">{t('achievements_title_2')}</span>
                    </h2>

                    {/* Timeline */}
                    <div className="relative border-l-2 border-gray-800 ml-4 md:ml-12 space-y-12">
                        {/* Year 2025 */}
                        <div className="relative pl-8 md:pl-12">
                            <div className="absolute -left-2.5 top-0 h-5 w-5 rounded-full bg-red-600 border-4 border-[#0a0a0a]"></div>
                            <div className="text-lg text-red-600 font-bold mb-6 font-display">2025</div>

                            {/* Event 1 - 花蓮國際龍舟賽 */}
                            <div className="mb-8">
                                <h3 className="font-display text-xl font-bold text-white mb-2">
                                    {lang === 'zh' ? '花蓮國際龍舟賽' : 'Hualien International Dragon Boat Festival'}
                                </h3>
                                <p className="text-gray-400 text-sm mb-2">{lang === 'zh' ? '大型混合龍舟 2000米' : '2000m Mixed Large Boat'}</p>
                                <div className="inline-block bg-amber-600/20 text-amber-400 text-xs font-bold px-3 py-1 uppercase">
                                    {lang === 'zh' ? '第 3 名' : '3RD PLACE'}
                                </div>
                            </div>

                            {/* Event 2 - 新北市議長盃 */}
                            <div>
                                <h3 className="font-display text-xl font-bold text-white mb-2">
                                    {lang === 'zh' ? '新北市議長盃龍舟錦標賽' : 'New Taipei City Speaker Cup'}
                                </h3>
                                <p className="text-gray-400 text-sm mb-2">{lang === 'zh' ? '大型混合龍舟' : 'Mixed Large Boat'}</p>
                                <div className="inline-block bg-gray-600/20 text-gray-300 text-xs font-bold px-3 py-1 uppercase">
                                    {lang === 'zh' ? '第 12 名' : '12TH PLACE'}
                                </div>
                            </div>
                        </div>

                        {/* Year 2024 */}
                        <div className="relative pl-8 md:pl-12">
                            <div className="absolute -left-2.5 top-0 h-5 w-5 rounded-full bg-gray-600 border-4 border-[#0a0a0a]"></div>
                            <div className="text-lg text-gray-500 font-bold mb-6 font-display">2024</div>

                            {/* Event - 新北市議長盃 */}
                            <div>
                                <h3 className="font-display text-xl font-bold text-white mb-2">
                                    {lang === 'zh' ? '新北市議長盃龍舟錦標賽' : 'New Taipei City Speaker Cup'}
                                </h3>
                                <p className="text-gray-400 text-sm mb-2">{lang === 'zh' ? '大型混合龍舟' : 'Mixed Large Boat'}</p>
                                <div className="inline-block bg-sky-600/20 text-sky-400 text-xs font-bold px-3 py-1 uppercase">
                                    {lang === 'zh' ? '第 7 名' : '7TH PLACE'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== 為什麼選擇 RUMA SECTION (50/50 Split Layout - Zig-Zag) ===== */}
            <section id="why-ruma" className="grid grid-cols-1 md:grid-cols-2 min-h-[700px]">
                {/* Left: Black Content */}
                <div className="bg-[#0a0a0a] flex flex-col justify-center p-10 md:p-16 lg:p-20 order-2 md:order-1 relative z-10 border-t border-gray-900 md:border-none">
                    <h2 className="font-display text-4xl md:text-5xl font-bold uppercase text-white mb-12">
                        {t('why_title_1')} <span className="text-red-600">{t('why_title_2')}</span>？
                    </h2>

                    {/* Vertical Feature List */}
                    <div className="space-y-10">
                        {/* Feature 1 - 專業訓練 */}
                        <div className="flex gap-6 group">
                            <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center border border-red-600 bg-red-600/10 group-hover:bg-red-600 transition-all duration-300 transform group-hover:-skew-x-12">
                                <span className="text-2xl transform group-hover:skew-x-12 transition-transform">🚣</span>
                            </div>
                            <div>
                                <h3 className="font-display text-xl font-bold text-white uppercase mb-2 group-hover:text-red-500 transition-colors">
                                    {t('why_card_1_title')}
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    {t('why_card_1_desc')}
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 - 團隊精神 */}
                        <div className="flex gap-6 group">
                            <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center border border-red-600 bg-red-600/10 group-hover:bg-red-600 transition-all duration-300 transform group-hover:-skew-x-12">
                                <span className="text-2xl transform group-hover:skew-x-12 transition-transform">👥</span>
                            </div>
                            <div>
                                <h3 className="font-display text-xl font-bold text-white uppercase mb-2 group-hover:text-red-500 transition-colors">
                                    {t('why_card_2_title')}
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    {t('why_card_2_desc')}
                                </p>
                            </div>
                        </div>

                        {/* Feature 3 - 挑戰自我 */}
                        <div className="flex gap-6 group">
                            <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center border border-red-600 bg-red-600/10 group-hover:bg-red-600 transition-all duration-300 transform group-hover:-skew-x-12">
                                <span className="text-2xl transform group-hover:skew-x-12 transition-transform">🏆</span>
                            </div>
                            <div>
                                <h3 className="font-display text-xl font-bold text-white uppercase mb-2 group-hover:text-red-500 transition-colors">
                                    {t('why_card_3_title')}
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    {t('why_card_3_desc')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Image */}
                <div className="relative h-80 md:h-auto overflow-hidden order-1 md:order-2">
                    <img
                        src="/Landing page2.jpg"
                        alt="RUMA Action"
                        onError={(e) => { e.target.src = '/banner.jpg'; }}
                        className="w-full h-full object-cover min-h-[400px] transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/80 to-transparent md:hidden"></div>
                </div>
            </section>

            {/* ===== STATS SECTION (Skewed) ===== */}
            <section id="stats" className="relative py-24 bg-[#0a0a0a] overflow-hidden" style={{ transform: 'skewY(-3deg)', transformOrigin: 'top left' }}>
                <div style={{ transform: 'skewY(3deg)' }} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="text-center p-6 border border-gray-800 bg-[#121212]/50">
                            <div className="font-display text-5xl md:text-6xl font-bold text-red-600 mb-2">50<span className="text-white">+</span></div>
                            <div className="text-sm font-bold uppercase tracking-widest text-gray-400">{t('stat_members')}</div>
                        </div>
                        <div className="text-center p-6 border border-gray-800 bg-[#121212]/50">
                            <div className="font-display text-5xl md:text-6xl font-bold text-white mb-2">3<span className="text-red-600">+</span></div>
                            <div className="text-sm font-bold uppercase tracking-widest text-gray-400">{t('stat_years')}</div>
                        </div>
                        <div className="text-center p-6 border border-gray-800 bg-[#121212]/50">
                            <div className="font-display text-5xl md:text-6xl font-bold text-white mb-2">100<span className="text-red-600">+</span></div>
                            <div className="text-sm font-bold uppercase tracking-widest text-gray-400">{t('stat_trainings')}</div>
                        </div>
                        <div className="text-center p-6 border border-gray-800 bg-[#121212]/50">
                            <div className="font-display text-5xl md:text-6xl font-bold text-red-600 mb-2">10<span className="text-white">+</span></div>
                            <div className="text-sm font-bold uppercase tracking-widest text-gray-400">{t('stat_races')}</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== FAQ SECTION ===== */}
            <section id="faq" className="py-24 bg-[#121212] relative">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="text-center mb-16">
                        <h2 className="font-display text-4xl md:text-6xl font-bold uppercase tracking-tight text-white mb-2">
                            {t('nav_faq')}
                        </h2>
                        <div className="h-1 w-24 bg-red-600 mx-auto mb-4"></div>
                        <p className="text-gray-400 text-lg">
                            {lang === 'zh' ? '關於加入 RUMA 龍舟隊，你可能想知道的事' : 'Everything you need to know about joining RUMA'}
                        </p>
                    </div>

                    {/* FAQ Items - Accordion Style */}
                    <div className="space-y-4">
                        {[
                            {
                                q: lang === 'zh' ? '完全沒有划船經驗可以加入RUMA龍舟隊嗎?' : 'Can I join without any paddling experience?',
                                a: lang === 'zh' ? '當然沒問題，我們很多朋友一開始連獨木舟都沒有划過就來體驗，也不少人是體驗一次過後就加入我們！' : 'Absolutely! Many of our friends had never even paddled a kayak before joining us for a trial session.'
                            },
                            {
                                q: lang === 'zh' ? '我...不會游泳耶，划龍舟會不會掉進水裡啊?' : "I can't swim. Will I fall into the water?",
                                a: lang === 'zh' ? '划龍舟練習時我們會有專業的舵手掌舵確保練習時的安全，每位上船的朋友也都會穿著救生衣，基本上是不會翻船啦！' : 'During practice, we have professional steerspersons to ensure safety. Everyone wears a life jacket.'
                            },
                            {
                                q: lang === 'zh' ? '參加體驗需要購買任何器材嗎?' : 'Do I need to buy any equipment for the trial?',
                                a: lang === 'zh' ? '參加體驗不需要喔，我們會準備槳 & 救生衣給你使用，但如果確定要加入我們 RUMA 龍舟隊，槳和救生衣就是需要額外自己購買的裝備喔！' : "No! We provide paddles and life jackets for trial sessions. If you join officially, you'll need your own."
                            }
                        ].map((item, index) => (
                            <details key={index} className="group border border-gray-800 rounded-lg overflow-hidden bg-[#1a1a1a] hover:border-gray-700 transition-colors">
                                <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer list-none">
                                    <div className="flex items-start gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-red-600 text-white font-bold text-sm rounded">
                                            Q{index + 1}
                                        </span>
                                        <h3 className="font-display text-lg font-bold text-white leading-relaxed">
                                            {item.q}
                                        </h3>
                                    </div>
                                    <span className="flex-shrink-0 text-gray-400 group-open:rotate-180 transition-transform">
                                        ▼
                                    </span>
                                </summary>
                                <div className="px-6 pb-6 pl-[72px]">
                                    <p className="text-gray-300 leading-relaxed">{item.a}</p>
                                </div>
                            </details>
                        ))}
                    </div>

                    {/* Link to full FAQ page */}
                    <div className="text-center mt-10">
                        <a
                            href="/faq"
                            className="inline-block border-2 border-red-600 text-red-500 px-8 py-3 font-display font-bold uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all duration-300"
                        >
                            {lang === 'zh' ? '查看更多問答' : 'View All FAQs'}
                        </a>
                    </div>
                </div>
            </section>

            {/* ===== CTA SECTION (聯絡我們) ===== */}
            <section id="contact" className="py-24 px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-red-900 via-red-800 to-red-900"></div>

                <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
                    <h2 className="font-display text-3xl md:text-5xl font-bold mb-6 uppercase">
                        {t('cta_title')}
                    </h2>
                    <p className="text-xl text-white/80 mb-4 max-w-2xl mx-auto">
                        {t('cta_desc_1')}
                    </p>
                    <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto">
                        {t('cta_desc_2')}
                    </p>
                    <a
                        href={`mailto:${rumaEmail}`}
                        className="inline-block bg-black text-white px-12 py-5 font-display font-bold text-lg uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300 transform -skew-x-12"
                    >
                        <span className="block transform skew-x-12">{t('cta_button')}</span>
                    </a>
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="bg-[#0a0a0a] text-white py-12 px-4 border-t border-gray-800">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        {/* Logo with Image */}
                        <Link to="/" className="flex items-center gap-3 group">
                            <img
                                src="/logo_website.png"
                                alt="RUMA"
                                className="h-8 md:h-10 w-auto group-hover:scale-110 transition"
                            />
                            <span className="font-display font-bold text-2xl md:text-3xl italic tracking-wider text-white">
                                RUMA<span className="text-red-600">.</span>
                            </span>
                        </Link>

                        {/* Footer Links - Changed to IG Icon only */}
                        <div className="flex gap-8 items-center">
                            <a
                                href="https://www.instagram.com/ruma_dragonboat/#"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/icon"
                            >
                                <img
                                    src="/IG icon.png"
                                    alt="Instagram"
                                    className="h-8 md:h-10 w-auto opacity-80 group-hover/icon:opacity-100 transition-opacity"
                                />
                            </a>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
                        {t('footer_copyright')}
                    </div>
                </div>
            </footer>
        </div>
    );
}
