// src/pages/public/NewsDetailPage.jsx
// RUMA 龍舟隊最新消息詳情頁

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useLanguage } from '../../contexts/LanguageContext';
import { fetchNewsDetail, fetchNewsPreview } from '../../api/supabaseApi';
import { ArrowLeft, Calendar, Tag, Pin, Loader2, Eye } from 'lucide-react';
import NewsContentRenderer from '../../components/NewsContentRenderer';

const CATEGORIES = [
    { id: 'all', label: '全部', labelEn: 'All' },
    { id: '體驗招募', label: '體驗招募', labelEn: 'Recruitment' },
    { id: '比賽消息', label: '比賽消息', labelEn: 'Race' },
    { id: '團隊活動', label: '團隊活動', labelEn: 'Team Activity' },
    { id: '運動相關', label: '運動相關', labelEn: 'Training' },
    { id: '其他', label: '其他', labelEn: 'Others' }
];

export default function NewsDetailPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { lang } = useLanguage();
    const [news, setNews] = useState(null);
    const [loading, setLoading] = useState(true);

    // Preview mode: ?preview=true&token=xxx
    const searchParams = new URLSearchParams(location.search);
    const isPreview = searchParams.get('preview') === 'true';
    const previewToken = searchParams.get('token') ?? '';

    useEffect(() => {
        loadNews();
    }, [slug]);

    const loadNews = async () => {
        setLoading(true);
        let data;
        if (isPreview && previewToken) {
            data = await fetchNewsPreview(slug, previewToken);
        } else {
            data = await fetchNewsDetail(slug);
        }
        if (!data) {
            navigate('/news');
            return;
        }
        setNews(data);
        setLoading(false);
    };

    // 動態注入 Article Schema (SEO/AEO) — 草稿預覽模式下跳過
    useEffect(() => {
        if (!news || isPreview) return;

        const articleSchema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": news.title,
            "datePublished": news.published_at,
            "dateModified": news.updated_at || news.published_at,
            "author": {
                "@type": "Organization",
                "name": "RUMA 龍舟隊"
            },
            "publisher": {
                "@type": "Organization",
                "name": "RUMA 龍舟隊",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://rumadragonboat.com/logo_website.png"
                }
            },
            "image": news.cover_image || "https://rumadragonboat.com/banner.jpg",
            "description": news.excerpt || "",
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://rumadragonboat.com/news/${news.slug}`
            }
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'article-schema';
        script.text = JSON.stringify(articleSchema);

        // 移除舊的 schema
        const existingScript = document.getElementById('article-schema');
        if (existingScript) {
            existingScript.remove();
        }

        document.head.appendChild(script);

        return () => {
            const scriptToRemove = document.getElementById('article-schema');
            if (scriptToRemove) {
                scriptToRemove.remove();
            }
        };
    }, [news]);

    // 格式化日期
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // 渲染富文本內容
    // Note: Converted to use NewsContentRenderer for consistency


    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <Loader2 size={40} className="animate-spin text-red-500" />
            </div>
        );
    }

    if (!news) {
        return null;
    }

    const displayTitle = (lang === 'en' && news.title_en) ? news.title_en : news.title;
    const displayExcerpt = (lang === 'en' && news.excerpt_en) ? news.excerpt_en : news.excerpt;
    const displayContent = (lang === 'en' && news.content_en && news.content_en.length > 0) ? news.content_en : news.content;
    const categoryObj = CATEGORIES.find(c => c.id === news.category);
    const displayCategory = categoryObj ? (lang === 'zh' ? categoryObj.label : categoryObj.labelEn) : news.category;

    return (
        <div className="min-h-screen bg-[#0a0a0a] font-sans">
            <Navbar />

            {/* 草稿預覽橫幅 */}
            {isPreview && (
                <div className="bg-yellow-500 text-black text-center py-2.5 px-4 font-bold text-sm flex items-center justify-center gap-2">
                    <Eye size={16} />
                    草稿預覽模式 — 此文章尚未正式發布，僅供審核使用
                </div>
            )}

            {/* Hero Banner */}
            <section className="relative h-[60vh] min-h-[400px] flex items-end overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    {news.cover_image ? (
                        <img
                            src={news.cover_image}
                            alt={displayTitle}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            style={{ filter: 'brightness(0.4)' }}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-4xl mx-auto px-4 pb-12 w-full">
                    {/* Badges */}
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold uppercase rounded">
                            {displayCategory}
                        </span>
                        {news.is_pinned && (
                            <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded flex items-center gap-1">
                                <Pin size={12} />
                                {lang === 'zh' ? '置頂' : 'Pinned'}
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h1 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-white mb-4 leading-tight">
                        {displayTitle}
                    </h1>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-gray-400 text-sm">
                        <span className="flex items-center gap-1.5">
                            <Calendar size={16} />
                            {formatDate(news.published_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Tag size={16} />
                            {displayCategory}
                        </span>
                    </div>
                </div>
            </section>

            {/* Article Content */}
            <article className="py-12">
                <div className="max-w-3xl mx-auto px-4">
                    {/* Excerpt as Lead */}


                    {/* Main Content */}
                    <div className="prose prose-invert max-w-none">
                        <NewsContentRenderer content={displayContent} />
                    </div>

                    {/* Back Button */}
                    <div className="mt-12 pt-8 border-t border-gray-800">
                        <Link
                            to="/news"
                            className="inline-flex items-center gap-2 text-red-500 hover:text-red-400 font-bold transition group"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            {lang === 'zh' ? '返回最新消息' : 'Back to News'}
                        </Link>
                    </div>
                </div>
            </article>

            {/* Footer */}
            <footer className="bg-[#0a0a0a] text-white py-8 px-4 border-t border-gray-800">
                <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
                    © {new Date().getFullYear()} RUMA Dragon Boat Team. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
