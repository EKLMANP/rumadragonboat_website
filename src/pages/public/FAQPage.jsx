// src/pages/public/FAQPage.jsx
// RUMA 龍舟隊常見問答頁面 - 保持紅黑主題設計 + i18n 支援

import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import { useLanguage } from '../../contexts/LanguageContext';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

// FAQ 內容 - 中英文
const faqData = {
    zh: {
        pageTitle: '常見問答',
        pageSubtitle: '關於加入 RUMA 龍舟隊，你可能想知道的事',
        items: [
            {
                question: '完全沒有划船經驗可以加入RUMA龍舟隊嗎?',
                answer: '當然沒問題，我們很多朋友一開始連獨木舟都沒有划過就來體驗，也不少人是體驗一次過後就加入我們！'
            },
            {
                question: '我...不會游泳耶，划龍舟會不會掉進水裡啊?',
                answer: '划龍舟練習時我們會有專業的舵手掌舵確保練習時的安全，每位上船的朋友也都會穿著救生衣，基本上是不會翻船啦！'
            },
            {
                question: '划龍舟體力是不是要非常好啊? 我看比賽每個人體型都是倒三角型',
                answer: '如果有人跟你說划龍舟不累，那他一定是騙你，體能、體態這件事其實還是需要配合飲食控制和持續自我堅持才能維持一定的水準，但我們有隊友加入龍舟隊一年後，配合飲食控制、重訓、划龍舟，體重減了12公斤，體脂降了5%，相信你也可以!'
            },
            {
                question: '參加體驗需要購買任何器材嗎?',
                answer: '參加體驗不需要喔，我們會準備槳 & 救生衣給你使用，但如果確定要加入我們 RUMA 龍舟隊，槳和救生衣就是需要額外自己購買的裝備喔！'
            },
            {
                question: '你們龍舟隊一年裡面會報名參加哪些龍舟賽事呢?',
                answer: '一般我們會參加每年端午節的龍舟賽，而在端午節前，也會參加台北市的鯨神盃龍舟賽，以及下半年10月左右的花蓮國際龍舟賽和接近年底(約 12 月)的台北城市盃龍舟錦標賽，其他的海外賽事我們也希望能夠多多參與！'
            }
        ]
    },
    en: {
        pageTitle: 'FAQ',
        pageSubtitle: 'Everything you need to know about joining the RUMA Dragon Boat Team',
        items: [
            {
                question: 'Can I join RUMA Dragon Boat Team without any paddling experience?',
                answer: "Absolutely! Many of our friends had never even paddled a kayak before joining us for a trial session. Quite a few of them joined the team right after their first experience!"
            },
            {
                question: "I... can't swim. Will I fall into the water while dragon boating?",
                answer: 'During practice, we have professional steerspersons to ensure safety. Everyone on the boat wears a life jacket. It is basically impossible to capsize!'
            },
            {
                question: 'Do I need to be in great shape? Everyone in competitions looks so fit with V-shaped bodies!',
                answer: "If someone tells you dragon boating isn't tiring, they're lying. Maintaining physical fitness and physique requires diet control and persistence. However, we have teammates who lost 12kg and dropped 5% body fat after a year of diet control, weight training, and dragon boating. We believe you can do it too!"
            },
            {
                question: 'Do I need to buy any equipment for the trial session?',
                answer: "No, you don't! We provide paddles and life jackets for trial sessions. However, if you decide to officially join the RUMA Dragon Boat Team, you will need to purchase your own paddle and life jacket."
            },
            {
                question: 'Which races does the team participate in throughout the year?',
                answer: 'Generally, we participate in the annual Dragon Boat Festival races. Before that, we also join the Taipei Whale Spirit Cup. In the second half of the year, around October, we race in the Hualien International Dragon Boat Festival, followed by the Taipei City Cup near the end of the year (around December). We also hope to participate in more overseas races in the future!'
            }
        ]
    }
};

export default function FAQPage() {
    const { lang } = useLanguage();
    const [openIndex, setOpenIndex] = useState(null);

    const content = faqData[lang] || faqData.zh;

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    // 動態注入 FAQPage JSON-LD Schema (SEO/AEO)
    React.useEffect(() => {
        const faqSchema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": content.items.map(item => ({
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item.answer
                }
            }))
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'faq-schema';
        script.text = JSON.stringify(faqSchema);

        // 移除舊的 schema (如果存在)
        const existingScript = document.getElementById('faq-schema');
        if (existingScript) {
            existingScript.remove();
        }

        document.head.appendChild(script);

        return () => {
            const scriptToRemove = document.getElementById('faq-schema');
            if (scriptToRemove) {
                scriptToRemove.remove();
            }
        };
    }, [content]);

    return (
        <div className="min-h-screen bg-[#0a0a0a] overflow-x-hidden font-sans">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-red-900/30 via-[#0a0a0a] to-[#0a0a0a]"></div>

                <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    {/* Icon */}
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600/20 rounded-full mb-6">
                        <HelpCircle size={40} className="text-red-500" />
                    </div>

                    {/* Title */}
                    <h1 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tight text-white mb-4">
                        {content.pageTitle}
                    </h1>
                    <div className="h-1 w-24 bg-red-600 mx-auto mb-6"></div>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        {content.pageSubtitle}
                    </p>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-16 px-4">
                <div className="max-w-3xl mx-auto space-y-4">
                    {content.items.map((item, index) => (
                        <div
                            key={index}
                            className={`border border-gray-800 rounded-lg overflow-hidden transition-all duration-300 ${openIndex === index ? 'bg-[#1a1a1a]' : 'bg-[#121212] hover:bg-[#161616]'
                                }`}
                        >
                            {/* Question */}
                            <button
                                onClick={() => toggleFAQ(index)}
                                className="w-full flex items-center justify-between gap-4 p-6 text-left"
                            >
                                <div className="flex items-start gap-4">
                                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-red-600 text-white font-bold text-sm rounded">
                                        Q{index + 1}
                                    </span>
                                    <h3 className="font-display text-lg md:text-xl font-bold text-white leading-relaxed">
                                        {item.question}
                                    </h3>
                                </div>
                                <div className="flex-shrink-0 text-gray-400">
                                    {openIndex === index ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                </div>
                            </button>

                            {/* Answer */}
                            <div
                                className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <div className="px-6 pb-6 pl-[72px]">
                                    <p className="text-gray-300 leading-relaxed">
                                        {item.answer}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section - Contact Style */}
            <section className="py-24 px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-red-900 via-red-800 to-red-900"></div>

                <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
                    <h2 className="font-display text-3xl md:text-5xl font-bold mb-6 uppercase">
                        {lang === 'zh' ? '準備好加入我們了嗎？' : 'Ready to Join Us?'}
                    </h2>
                    <p className="text-xl text-white/80 mb-4 max-w-2xl mx-auto">
                        {lang === 'zh' ? '不論你是新手還是有經驗的划手，RUMA 歡迎每一位熱愛龍舟的你！' : 'Whether you are a beginner or an experienced paddler, RUMA welcomes you!'}
                    </p>
                    <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto">
                        {lang === 'zh' ? '也歡迎各大品牌聯繫贊助' : 'Sponsorship inquiries are also welcome'}
                    </p>
                    <a
                        href="mailto:rumadragonboat@gmail.com"
                        className="inline-block bg-black text-white px-12 py-5 font-display font-bold text-lg uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300 transform -skew-x-12"
                    >
                        <span className="block transform skew-x-12">
                            {lang === 'zh' ? '聯絡我們' : 'Contact Us'}
                        </span>
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#0a0a0a] text-white py-12 px-4 border-t border-gray-800">
                <div className="max-w-6xl mx-auto text-center">
                    <p className="text-gray-500 text-sm">
                        © 2026 RUMA Dragon Boat Team. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
