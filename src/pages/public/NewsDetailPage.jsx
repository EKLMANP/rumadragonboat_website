// src/pages/public/NewsDetailPage.jsx
// RUMA 龍舟隊最新消息詳情頁

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useLanguage } from '../../contexts/LanguageContext';
import { fetchNewsDetail } from '../../api/supabaseApi';
import { ArrowLeft, Calendar, Tag, Pin, Loader2 } from 'lucide-react';

const CATEGORIES = [
    { id: 'all', label: '全部', labelEn: 'All' },
    { id: '參賽消息', label: '參賽消息', labelEn: 'Race News' },
    { id: '隊伍活動', label: '隊伍活動', labelEn: 'Team Events' },
    { id: '體驗招募', label: '體驗招募', labelEn: 'Recruitment' },
    { id: '訓練回顧', label: '訓練回顧', labelEn: 'Training Review' }
];

export default function NewsDetailPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { lang } = useLanguage();
    const [news, setNews] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNews();
    }, [slug]);

    const loadNews = async () => {
        setLoading(true);
        const data = await fetchNewsDetail(slug);
        if (!data) {
            // 文章不存在，導回列表頁
            navigate('/news');
            return;
        }
        setNews(data);
        setLoading(false);
    };

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
    const renderContent = (content) => {
        if (!content || !Array.isArray(content)) return null;

        return content.map((block, index) => {
            switch (block.type) {
                case 'paragraph':
                    return (
                        <p key={index} className="text-gray-300 leading-relaxed mb-6">
                            {block.text}
                        </p>
                    );
                case 'heading':
                    return (
                        <h2 key={index} className="font-display font-bold text-2xl text-white mt-8 mb-4">
                            {block.text}
                        </h2>
                    );
                case 'image':
                    return (
                        <figure key={index} className="my-8">
                            <img
                                src={block.url}
                                alt={block.caption || ''}
                                referrerPolicy="no-referrer"
                                className="w-full rounded-lg"
                            />
                            {block.caption && (
                                <figcaption className="text-center text-gray-500 text-sm mt-2">
                                    {block.caption}
                                </figcaption>
                            )}
                        </figure>
                    );
                case 'video':
                    return (
                        <div key={index} className="my-8 aspect-video">
                            <iframe
                                src={block.url}
                                title={block.caption || 'Video'}
                                className="w-full h-full rounded-lg"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    );
                case 'quote':
                    return (
                        <blockquote key={index} className="border-l-4 border-red-600 pl-6 py-2 my-8 italic">
                            <p className="text-xl text-red-400 font-medium">
                                "{block.text}"
                            </p>
                            {block.author && (
                                <cite className="text-gray-500 not-italic mt-2 block">
                                    — {block.author}
                                </cite>
                            )}
                        </blockquote>
                    );
                case 'list':
                    return (
                        <ul key={index} className="list-disc list-inside space-y-2 mb-6 text-gray-300">
                            {block.items?.map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    );
                case 'link':
                    return (
                        <a
                            key={index}
                            href={block.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-red-500 hover:text-red-400 underline mb-4"
                        >
                            {block.text || block.url}
                        </a>
                    );
                default:
                    return null;
            }
        });
    };

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
                        {renderContent(displayContent)}
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
