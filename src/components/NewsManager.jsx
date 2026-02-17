// src/components/NewsManager.jsx
// 最新消息管理元件 - 用於幹部專區

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
    Plus, Save, Trash2, Edit3, Eye, EyeOff, Pin, Loader2,
    Image as ImageIcon, Video, Link as LinkIcon, Type, List, Quote, X, GripVertical, FileText,
    Clipboard, Upload, FileUp, Layout, Maximize2, Minimize2, ExternalLink, ChevronDown, ChevronRight
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fetchAllNews, createNews, updateNews, deleteNews } from '../api/supabaseApi';
import NewsContentRenderer from './NewsContentRenderer';

// 分類選項 (with i18n support)
const CATEGORY_OPTIONS = [
    { value: '體驗招募', label: '體驗招募', labelEn: 'Recruitment' },
    { value: '比賽消息', label: '比賽消息', labelEn: 'Race' },
    { value: '團隊活動', label: '團隊活動', labelEn: 'Team Activity' },
    { value: '運動相關', label: '運動相關', labelEn: 'Training' },
    { value: '其他', label: '其他', labelEn: 'Others' }
];

const generateId = () => Math.random().toString(36).substr(2, 9);

// List Item Component
function SortableListItem({ item, index, updateListItem, removeListItem, activeLang }) {
    // Ensure item is object, handle string legacy
    const itemId = typeof item === 'string' ? index : item.id;
    const itemText = typeof item === 'string' ? item : item.text;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: itemId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 mb-2 group">
            <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 p-1 touch-none">
                <GripVertical size={16} />
            </div>
            <span className="text-gray-400">•</span>
            <input
                type="text"
                value={itemText}
                onChange={(e) => updateListItem(index, e.target.value)}
                className="flex-1 p-2 border rounded text-gray-900"
                placeholder={activeLang === 'zh' ? "清單項目..." : "List item..."}
            />
            <button
                onClick={() => removeListItem(index)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition opacity-0 group-hover:opacity-100"
                title={activeLang === 'zh' ? "刪除項目" : "Remove item"}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}

function SortableBlock({ block, index, updateContentBlock, removeContentBlock, updateListItem, addListItem, removeListItem, reorderListItem, onInsertLink, activeLang }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 999 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    // Sensors for inner list
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleListDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return;

        if (active.id !== over.id) {
            const getItemId = (item, idx) => typeof item === 'string' ? idx : item.id;

            const oldIndex = block.items.findIndex((item, idx) => getItemId(item, idx) === active.id);
            const newIndex = block.items.findIndex((item, idx) => getItemId(item, idx) === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                reorderListItem(index, oldIndex, newIndex);
            }
        }
    };

    return (
        <div ref={setNodeRef} style={style} className={`relative p-4 border rounded-lg bg-gray-50 ${isDragging ? 'shadow-xl ring-2 ring-red-500' : ''}`}>
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-2 left-2 p-1 cursor-grab hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 touch-none"
            >
                <GripVertical size={20} />
            </div>

            <button
                onClick={() => removeContentBlock(index)}
                className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded z-10"
            >
                <X size={14} className="text-red-500" />
            </button>

            <div className="mt-6">
                {block.type === 'paragraph' && (
                    <div className="space-y-2">
                        <textarea
                            value={block.text}
                            onChange={(e) => updateContentBlock(index, 'text', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900"
                            rows={3}
                            placeholder={activeLang === 'zh' ? "輸入段落文字..." : "Enter paragraph text..."}
                        />
                        <button
                            onClick={() => onInsertLink && onInsertLink(index)}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                            type="button"
                        >
                            <ExternalLink size={12} />
                            {activeLang === 'zh' ? '插入連結' : 'Insert Link'}
                        </button>
                        {block.text && block.text.includes('[') && block.text.includes('](') && (
                            <p className="text-xs text-gray-400">{activeLang === 'zh' ? '包含 Markdown 連結，發布後將轉為可點擊連結' : 'Contains Markdown links, will become clickable after publishing'}</p>
                        )}
                    </div>
                )}

                {block.type === 'heading' && (
                    <div className="flex gap-2 items-center">
                        <select
                            value={block.level || 'h2'}
                            onChange={(e) => updateContentBlock(index, 'level', e.target.value)}
                            className="p-2 border rounded text-gray-900 bg-white"
                        >
                            <option value="h2">H2 主標題</option>
                            <option value="h3">H3 副標題</option>
                        </select>
                        <input
                            type="text"
                            value={block.text}
                            onChange={(e) => updateContentBlock(index, 'text', e.target.value)}
                            className="flex-1 p-2 border rounded text-gray-900 font-bold text-lg"
                            placeholder={activeLang === 'zh' ? "輸入標題..." : "Enter heading..."}
                        />
                    </div>
                )}

                {block.type === 'image' && (
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={block.url}
                            onChange={(e) => updateContentBlock(index, 'url', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900"
                            placeholder={activeLang === 'zh' ? "圖片 URL..." : "Image URL..."}
                        />
                        <input
                            type="text"
                            value={block.alt || ''}
                            onChange={(e) => updateContentBlock(index, 'alt', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900"
                            placeholder={activeLang === 'zh' ? "圖片替代文字 (Alt) * - SEO 必填" : "Alt text * - Required for SEO"}
                        />
                        <input
                            type="text"
                            value={block.caption}
                            onChange={(e) => updateContentBlock(index, 'caption', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900 text-sm"
                            placeholder={activeLang === 'zh' ? "圖片說明（選填）" : "Caption (optional)"}
                        />
                    </div>
                )}

                {block.type === 'video' && (
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={block.url}
                            onChange={(e) => updateContentBlock(index, 'url', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900"
                            placeholder={activeLang === 'zh' ? "YouTube 或影片嵌入 URL..." : "YouTube or video embed URL..."}
                        />
                        <input
                            type="text"
                            value={block.caption}
                            onChange={(e) => updateContentBlock(index, 'caption', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900 text-sm"
                            placeholder={activeLang === 'zh' ? "影片說明（選填）" : "Caption (optional)"}
                        />
                    </div>
                )}

                {block.type === 'quote' && (
                    <div className="space-y-2">
                        <textarea
                            value={block.text}
                            onChange={(e) => updateContentBlock(index, 'text', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900 italic"
                            rows={2}
                            placeholder={activeLang === 'zh' ? "引言內容..." : "Quote content..."}
                        />
                        <input
                            type="text"
                            value={block.author}
                            onChange={(e) => updateContentBlock(index, 'author', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900 text-sm"
                            placeholder={activeLang === 'zh' ? "引言者（選填）" : "Author (optional)"}
                        />
                    </div>
                )}

                {block.type === 'list' && (
                    <div className="space-y-2">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleListDragEnd}
                        >
                            <SortableContext
                                items={block.items?.map((item, i) => typeof item === 'string' ? i : item.id) || []}
                                strategy={verticalListSortingStrategy}
                            >
                                {block.items?.map((item, itemIdx) => (
                                    <SortableListItem
                                        key={typeof item === 'string' ? itemIdx : item.id}
                                        item={item}
                                        index={itemIdx}
                                        updateListItem={(idx, val) => updateListItem(index, idx, val)}
                                        removeListItem={(idx) => removeListItem && removeListItem(index, idx)}
                                        activeLang={activeLang}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                        <button
                            onClick={() => addListItem(index)}
                            className="text-sm text-blue-500 hover:underline mt-2"
                        >
                            {activeLang === 'zh' ? '+ 新增項目' : '+ Add Item'}
                        </button>
                    </div>
                )}

                {block.type === 'link' && (
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={block.url}
                            onChange={(e) => updateContentBlock(index, 'url', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900"
                            placeholder={activeLang === 'zh' ? "連結 URL..." : "Link URL..."}
                        />
                        <input
                            type="text"
                            value={block.text}
                            onChange={(e) => updateContentBlock(index, 'text', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900 text-sm"
                            placeholder={activeLang === 'zh' ? "顯示文字（選填）" : "Display text (optional)"}
                        />
                    </div>
                )}

                {block.type === 'details' && (
                    <div className="space-y-2 border-l-4 border-gray-300 pl-4">
                        <input
                            type="text"
                            value={block.summary}
                            onChange={(e) => updateContentBlock(index, 'summary', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900 font-bold"
                            placeholder={activeLang === 'zh' ? "摘要標題 (點擊展開)..." : "Summary (Click to expand)..."}
                        />
                        <textarea
                            value={block.content}
                            onChange={(e) => updateContentBlock(index, 'content', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900"
                            rows={4}
                            placeholder={activeLang === 'zh' ? "隱藏的詳細內容..." : "Hidden content..."}
                        />
                        <p className="text-xs text-gray-400">
                            {activeLang === 'zh'
                                ? '支援 **粗體** 與 [連結](url)'
                                : 'Supports **bold** and [links](url)'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function NewsManager() {
    const [newsList, setNewsList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [editingNews, setEditingNews] = useState(null);

    // 編輯表單 state
    const [formData, setFormData] = useState({
        title: '',
        title_en: '',
        category: '隊伍活動',
        cover_image: '',
        excerpt: '',
        excerpt_en: '',
        content: [],
        content_en: [],
        is_pinned: false,
        is_published: false
    });

    const [activeLang, setActiveLang] = useState('zh'); // zh | en
    const [editMode, setEditMode] = useState('visual'); // visual | paste | upload
    const [importText, setImportText] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    // const [showPreview, setShowPreview] = useState(false); // Removed internal preview modal state

    // --- Auto Save Logic ---
    useEffect(() => {
        if (!showEditor) return;

        const draftKey = editingNews ? `news_draft_${editingNews.id}` : 'news_draft_new';
        const timer = setTimeout(() => {
            if (formData.title || formData.content.length > 0) {
                // Only save if there's actual content
                localStorage.setItem(draftKey, JSON.stringify({
                    ...formData,
                    timestamp: new Date().getTime()
                }));
                // Optional: distinct visual indicator for saved?
            }
        }, 1000); // Debounce 1s

        return () => clearTimeout(timer);
    }, [formData, showEditor, editingNews]);

    // Restore draft on open (Implementation inside openEditor)

    // --- Preview Logic ---
    const handlePreviewNewWindow = () => {
        // Create a basic HTML structure
        const previewContent = `
            <!DOCTYPE html>
            <html lang="${activeLang}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Preview: ${activeLang === 'zh' ? formData.title : (formData.title_en || formData.title)}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&family=Outfit:wght@400;700&display=swap');
                    body { font-family: 'Outfit', 'Noto Sans TC', sans-serif; background-color: #1a1a1a; color: white; }
                    .prose a { color: #f87171; text-decoration: underline; }
                    /* Custom details styling matching app */
                    details > summary { list-style: none; }
                    details > summary::-webkit-details-marker { display: none; }
                </style>
            </head>
            <body class="p-8 max-w-4xl mx-auto">
                 ${formData.cover_image ? `<img src="${formData.cover_image}" class="w-full h-64 object-cover rounded-xl mb-8" />` : ''}
                 
                 <h1 class="text-4xl font-bold mb-4">${activeLang === 'zh' ? formData.title : (formData.title_en || formData.title)}</h1>
                 
                 <div class="flex items-center gap-3 mb-6">
                    <span class="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded">${formData.category}</span>
                    <span class="text-gray-400 text-sm">${new Date().toLocaleDateString('zh-TW')}</span>
                 </div>

                 ${(activeLang === 'zh' ? formData.excerpt : formData.excerpt_en) ? `
                    <div class="text-gray-300 text-lg mb-8 italic border-l-4 border-red-600 pl-4 bg-gray-800/30 p-4 rounded-r-lg">
                        ${activeLang === 'zh' ? formData.excerpt : formData.excerpt_en}
                    </div>
                 ` : ''}

                 <div class="space-y-6">
                    ${(activeLang === 'zh' ? formData.content : formData.content_en).map(block => {
            // Basic Rendering Logic mimicking NewsContentRenderer
            // Helper to render text with bold and links
            const renderText = (text) => {
                if (!text) return '';
                // Replace bold
                let html = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
                // Replace links
                // Check if it's an internal link (starts with #) or external
                html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
                    const isInternal = url.startsWith('#');
                    const target = isInternal ? '' : 'target="_blank"';
                    const rel = isInternal ? '' : 'rel="noopener noreferrer"';
                    return `<a href="${url}" ${target} ${rel} class="text-red-400 hover:text-red-300 underline">${text}</a>`;
                });
                return html;
            };

            switch (block.type) {
                case 'paragraph':
                    return `<p class="text-gray-300 leading-relaxed whitespace-pre-line">${renderText(block.text)}</p>`;
                case 'heading':
                    const Tag = block.level === 'h3' ? 'h3' : 'h2';
                    const cls = block.level === 'h3' ? 'text-xl mt-6 mb-3' : 'text-2xl mt-8 mb-4';
                    const idAttr = block.id ? `id="${block.id}"` : '';
                    return `<${Tag} ${idAttr} class="font-bold text-white ${cls}">${block.text}</${Tag}>`;
                case 'image':
                    return `<figure class="my-8"><img src="${block.url}" alt="${block.alt}" class="w-full rounded-lg" /><figcaption class="text-center text-gray-500 text-sm mt-2">${block.caption}</figcaption></figure>`;
                case 'video':
                    return `<div class="my-8 aspect-video"><iframe src="${block.url}" class="w-full h-full rounded-lg" allowfullscreen></iframe></div>`;
                case 'quote':
                    return `<blockquote class="border-l-4 border-red-600 pl-6 py-2 my-8 italic"><p class="text-xl text-red-400">"${block.text}"</p><cite class="text-gray-500 not-italic mt-2 block">— ${block.author}</cite></blockquote>`;
                case 'list':
                    return `<ul class="list-disc list-inside space-y-2 mb-6 text-gray-300">${block.items.map(i => `<li>${renderText(typeof i === 'string' ? i : i.text)}</li>`).join('')}</ul>`;
                case 'details':
                    return `
                                    <details class="my-6 group bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
                                        <summary class="flex items-center justify-between cursor-pointer p-4 font-bold text-white hover:bg-gray-700 transition">
                                            <span>${renderText(block.summary)}</span>
                                            <span class="text-gray-400 transition-transform group-open:rotate-180">▼</span>
                                        </summary>
                                        <div class="p-4 border-t border-gray-700 text-gray-300 whitespace-pre-line">
                                            ${renderText(block.content)}
                                        </div>
                                    </details>
                                `;
                case 'link':
                    return `<a href="${block.url}" target="_blank" class="inline-block text-red-500 underline mb-4">${block.text || block.url}</a>`;
                default: return '';
            }
        }).join('')}
                 </div>
            </body>
            </html>
        `;

        const blob = new Blob([previewContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    // 解析 Markdown/HTML 為區塊
    const parseMarkdownToBlocks = (text) => {
        const blocks = [];
        const lines = text.split('\n');
        let currentParagraph = [];

        const flushParagraph = () => {
            if (currentParagraph.length > 0) {
                const text = currentParagraph.join('\n').trim();
                if (text) {
                    blocks.push({ type: 'paragraph', text, _id: generateId() });
                }
                currentParagraph = [];
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // H2 標題 (## or <h2>)
            const h2Match = trimmed.match(/^##\s+(.*?)(?:\s+\{#([^}]+)\})?$/);
            if (h2Match) {
                flushParagraph();
                blocks.push({ type: 'heading', level: 'h2', text: h2Match[1], id: h2Match[2], _id: generateId() });
                continue;
            }
            if (/<h2[^>]*>(.+?)<\/h2>/i.test(trimmed)) {
                flushParagraph();
                const match = trimmed.match(/<h2[^>]*>(.+?)<\/h2>/i);
                // HTML parsing could also extract ID from attributes if needed, but for now focus on MD
                blocks.push({ type: 'heading', level: 'h2', text: match[1], _id: generateId() });
                continue;
            }

            // H3 標題 (### or <h3>)
            const h3Match = trimmed.match(/^###\s+(.*?)(?:\s+\{#([^}]+)\})?$/);
            if (h3Match) {
                flushParagraph();
                blocks.push({ type: 'heading', level: 'h3', text: h3Match[1], id: h3Match[2], _id: generateId() });
                continue;
            }
            if (/<h3[^>]*>(.+?)<\/h3>/i.test(trimmed)) {
                flushParagraph();
                const match = trimmed.match(/<h3[^>]*>(.+?)<\/h3>/i);
                blocks.push({ type: 'heading', level: 'h3', text: match[1], _id: generateId() });
                continue;
            }

            // 圖片 (![alt](url) or <img>)
            if (/!\[([^\]]*)\]\(([^)]+)\)/.test(trimmed)) {
                flushParagraph();
                const match = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                blocks.push({ type: 'image', url: match[2], alt: match[1], caption: '', _id: generateId() });
                continue;
            }
            if (/<img[^>]+src=["']([^"']+)["'][^>]*>/i.test(trimmed)) {
                flushParagraph();
                const srcMatch = trimmed.match(/<img[^>]+src=["']([^"']+)["']/);
                const altMatch = trimmed.match(/alt=["']([^"']*)["']/);
                blocks.push({ type: 'image', url: srcMatch[1], alt: altMatch ? altMatch[1] : '', caption: '', _id: generateId() });
                continue;
            }

            // 引言 (> or <blockquote>)
            if (/^>\s*(.+)$/.test(trimmed)) {
                flushParagraph();
                const match = trimmed.match(/^>\s*(.+)$/);
                blocks.push({ type: 'quote', text: match[1], author: '', _id: generateId() });
                continue;
            }

            // 清單 (- or * or <li>)
            if (/^[-*]\s+(.+)$/.test(trimmed)) {
                flushParagraph();
                const items = [trimmed.match(/^[-*]\s+(.+)$/)[1]];
                // 繼續收集同層級的清單項目
                while (i + 1 < lines.length && /^[-*]\s+(.+)$/.test(lines[i + 1].trim())) {
                    i++;
                    items.push(lines[i].trim().match(/^[-*]\s+(.+)$/)[1]);
                }
                blocks.push({ type: 'list', items: items.map(t => ({ id: generateId(), text: t })), _id: generateId() });
                continue;
            }

            // 連結 ([text](url) or <a>)
            if (/^\[([^\]]+)\]\(([^)]+)\)$/.test(trimmed)) {
                flushParagraph();
                const match = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                blocks.push({ type: 'link', text: match[1], url: match[2], _id: generateId() });
                continue;
            }

            // Details/Summary (<details>...</details>)
            // Note: This is a simplified parser assuming <details><summary>...</summary>...</details> structure on multiple lines
            if (trimmed.startsWith('<details>')) {
                flushParagraph();
                // Collect lines until </details>
                let detailsContent = [];
                let hasClosed = false;

                // If the single line contains the whole block (which is rare in strict XML but possible in sloppy HTML)
                if (trimmed.includes('</details>')) {
                    // Simple implementation for single line? skipping for now, assuming multiline for better UX
                }

                i++; // Move to next line
                while (i < lines.length) {
                    if (lines[i].trim().includes('</details>')) {
                        hasClosed = true;
                        break;
                    }
                    detailsContent.push(lines[i]);
                    i++;
                }

                if (hasClosed) {
                    const fullDetails = detailsContent.join('\n');
                    // Extract Summary
                    const summaryMatch = fullDetails.match(/<summary>(.*?)<\/summary>/s);
                    let summary = summaryMatch ? summaryMatch[1].trim() : 'Summary';

                    // Extract Content (everything after summary)
                    let content = fullDetails.replace(/<summary>.*?<\/summary>/s, '').trim();

                    blocks.push({ type: 'details', summary, content, _id: generateId() });
                    continue;
                }
            }

            // 空行
            if (trimmed === '') {
                flushParagraph();
                continue;
            }

            // 普通段落
            currentParagraph.push(trimmed);
        }

        flushParagraph();
        return blocks;
    };

    // 匯入 Markdown/HTML
    const handleImport = () => {
        if (!importText.trim()) {
            Swal.fire('請貼上內容', '', 'warning');
            return;
        }
        const blocks = parseMarkdownToBlocks(importText);
        const fieldName = activeLang === 'zh' ? 'content' : 'content_en';
        setFormData(prev => ({
            ...prev,
            [fieldName]: [...prev[fieldName], ...blocks]
        }));
        setImportText('');
        setEditMode('visual'); // 匯入後切換回視覺化模式
        Swal.fire({
            icon: 'success',
            title: `已匯入 ${blocks.length} 個區塊`,
            timer: 1500,
            showConfirmButton: false
        });
    };

    // 處理檔案上傳 (.md / .html)
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const blocks = parseMarkdownToBlocks(text);
            const fieldName = activeLang === 'zh' ? 'content' : 'content_en';
            setFormData(prev => ({
                ...prev,
                [fieldName]: [...prev[fieldName], ...blocks]
            }));
            setEditMode('visual');
            Swal.fire({
                icon: 'success',
                title: `已匯入檔案內容 (${blocks.length} 個區塊)`,
                timer: 1500,
                showConfirmButton: false
            });
        };
        reader.readAsText(file);
    };

    // 載入最新消息列表
    useEffect(() => {
        loadNews();
    }, []);

    const loadNews = async () => {
        setLoading(true);
        const data = await fetchAllNews();
        setNewsList(data);
        setLoading(false);
    };

    // 開啟編輯器（新增或編輯）
    const openEditor = (news = null) => {
        let initialData = {
            title: '',
            title_en: '',
            category: '隊伍活動',
            cover_image: '',
            excerpt: '',
            excerpt_en: '',
            content: [],
            content_en: [],
            is_pinned: false,
            pinned_order: 100,
            is_published: false
        };

        if (news) {
            setEditingNews(news);
            initialData = {
                title: news.title || '',
                title_en: news.title_en || '',
                category: news.category || '隊伍活動',
                cover_image: news.cover_image || '',
                excerpt: news.excerpt || '',
                excerpt_en: news.excerpt_en || '',
                content: (news.content || []).map(b => ({ ...b, _id: b._id || generateId() })),
                content_en: (news.content_en || []).map(b => ({ ...b, _id: b._id || generateId() })),
                is_pinned: news.is_pinned || false,
                pinned_order: news.pinned_order ?? 100,
                is_published: news.is_published || false
            };
        } else {
            setEditingNews(null);
            // Check for Auto-save Draft
            const savedDraft = localStorage.getItem('news_draft_new');
            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft);
                    // Check if draft is recent? (Optional)
                    // For now, just load it if it exists. 
                    // Better UX: Ask user? "Found unsaved draft..."
                    // Since I cannot interact easily with Swal inside this logic without blocking or complex state:
                    // I will just use the draft if creating NEW news.
                    // For editing existing news, we check 'news_draft_ID'.

                    // But wait, if they clicked "Create News", maybe they want a clean slate?
                    // To be safe, let's checking the timestamp?
                    // Let's keep it simple: if creating new, default to empty. 
                    // To support restoring, maybe a button "Restore Draft"?
                    // OR: just load the draft automatically if it's new.
                    // Implementation: Load draft if exists.
                    initialData = parsed;
                } catch (e) {
                    console.error("Failed to parse draft", e);
                }
            }
        }

        // Logic for checking draft specific to news ID
        if (news) {
            const savedDraft = localStorage.getItem(`news_draft_${news.id}`);
            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft);
                    // If draft timestamp > news updated_at?
                    // Simplification: Always prefer draft if it exists in local storage (implies unsaved work)
                    // But we should probably alert the user.
                    // For now, let's just use it to prevent data loss.
                    initialData = parsed;
                } catch (e) { }
            }
        }

        setFormData(initialData);
        setShowEditor(true);
    };

    // 關閉編輯器
    const closeEditor = () => {
        if (editingNews) {
            localStorage.removeItem(`news_draft_${editingNews.id}`);
        } else {
            localStorage.removeItem('news_draft_new');
        }
        setShowEditor(false);
        setEditingNews(null);
        setIsFullscreen(false);
        // setShowPreview(false);
    };

    // 插入連結到段落
    const insertLinkToParagraph = async (index) => {
        const { value: formValues } = await Swal.fire({
            title: '插入連結',
            html:
                '<input id="swal-link-text" class="swal2-input" placeholder="顯示文字">' +
                '<input id="swal-link-url" class="swal2-input" placeholder="網址 (https://...)">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: '插入',
            cancelButtonText: '取消',
            preConfirm: () => {
                return {
                    text: document.getElementById('swal-link-text').value,
                    url: document.getElementById('swal-link-url').value
                };
            }
        });

        if (formValues && formValues.url) {
            const linkText = formValues.text || formValues.url;
            const markdown = `[${linkText}](${formValues.url})`;
            const fieldName = activeLang === 'zh' ? 'content' : 'content_en';
            setFormData(prev => {
                const newContent = [...prev[fieldName]];
                newContent[index] = {
                    ...newContent[index],
                    text: (newContent[index].text || '') + ' ' + markdown
                };
                return { ...prev, [fieldName]: newContent };
            });
        }
    };

    // 新增內容區塊
    const addContentBlock = (type) => {
        const newBlock = { type, _id: generateId() };
        switch (type) {
            case 'paragraph':
                newBlock.text = '';
                break;
            case 'heading':
                newBlock.text = '';
                newBlock.level = 'h2';
                break;
            case 'image':
                newBlock.url = '';
                newBlock.alt = '';
                newBlock.caption = '';
                break;
            case 'video':
                newBlock.url = '';
                newBlock.caption = '';
                break;
            case 'quote':
                newBlock.text = '';
                newBlock.author = '';
                break;
            case 'list':
                newBlock.items = [{ id: generateId(), text: '' }];
                break;
            case 'link':
                newBlock.url = '';
                newBlock.text = '';
                break;
            case 'details':
                newBlock.summary = '';
                newBlock.content = '';
                break;
            default:
                break;
        }
        const fieldName = activeLang === 'zh' ? 'content' : 'content_en';
        setFormData(prev => ({
            ...prev,
            [fieldName]: [...prev[fieldName], newBlock]
        }));
    };

    // 更新內容區塊
    const updateContentBlock = (index, field, value) => {
        const fieldName = activeLang === 'zh' ? 'content' : 'content_en';
        setFormData(prev => {
            const newContent = [...prev[fieldName]];
            newContent[index] = { ...newContent[index], [field]: value };
            return { ...prev, [fieldName]: newContent };
        });
    };

    // 刪除內容區塊
    const removeContentBlock = (index) => {
        const fieldName = activeLang === 'zh' ? 'content' : 'content_en';
        setFormData(prev => ({
            ...prev,
            [fieldName]: prev[fieldName].filter((_, i) => i !== index)
        }));
    };

    // 更新清單項目
    const updateListItem = (blockIndex, itemIndex, value) => {
        const fieldName = activeLang === 'zh' ? 'content' : 'content_en';
        setFormData(prev => {
            const newContent = [...prev[fieldName]];
            const items = [...(newContent[blockIndex].items || [])];
            // Handle legacy string items
            if (typeof items[itemIndex] === 'string') {
                items[itemIndex] = { id: generateId(), text: value };
            } else {
                items[itemIndex] = { ...items[itemIndex], text: value };
            }
            newContent[blockIndex] = { ...newContent[blockIndex], items };
            return { ...prev, [fieldName]: newContent };
        });
    };

    // 新增清單項目
    const addListItem = (blockIndex) => {
        const fieldName = activeLang === 'zh' ? 'content' : 'content_en';
        setFormData(prev => {
            const newContent = [...prev[fieldName]];
            newContent[blockIndex] = {
                ...newContent[blockIndex],
                items: [...(newContent[blockIndex].items || []), { id: generateId(), text: '' }]
            };
            return { ...prev, [fieldName]: newContent };
        });
    };

    // 刪除清單項目
    const removeListItem = (blockIndex, itemIndex) => {
        const fieldName = activeLang === 'zh' ? 'content' : 'content_en';
        setFormData(prev => {
            const newContent = [...prev[fieldName]];
            const items = [...(newContent[blockIndex].items || [])];
            items.splice(itemIndex, 1);
            newContent[blockIndex] = { ...newContent[blockIndex], items };
            return { ...prev, [fieldName]: newContent };
        });
    };

    // 重新排序清單項目
    const reorderListItem = (blockIndex, oldIndex, newIndex) => {
        const fieldName = activeLang === 'zh' ? 'content' : 'content_en';
        setFormData(prev => {
            const newContent = [...prev[fieldName]];
            const items = arrayMove(newContent[blockIndex].items || [], oldIndex, newIndex);
            newContent[blockIndex] = { ...newContent[blockIndex], items };
            return { ...prev, [fieldName]: newContent };
        });
    };

    // 儲存（發布或草稿）
    const handleSave = async (publish = false) => {
        if (!formData.title.trim()) {
            Swal.fire('請填寫標題', '', 'warning');
            return;
        }

        setLoading(true);
        const dataToSave = {
            ...formData,
            pinned_order: (formData.pinned_order === '' || formData.pinned_order === null || formData.pinned_order === undefined) ? 100 : formData.pinned_order,
            is_published: publish
        };

        let result;
        if (editingNews) {
            result = await updateNews(editingNews.id, dataToSave);
        } else {
            result = await createNews(dataToSave);
        }

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: publish ? '已發布' : '已儲存草稿',
                timer: 1500,
                showConfirmButton: false
            });

            // Clear draft
            if (editingNews) {
                localStorage.removeItem(`news_draft_${editingNews.id}`);
            } else {
                localStorage.removeItem('news_draft_new');
            }

            closeEditor();
            loadNews();
        } else {
            Swal.fire('儲存失敗', result.message, 'error');
        }
        setLoading(false);
    };

    // 刪除
    const handleDelete = async (id, title) => {
        const result = await Swal.fire({
            title: '刪除此消息?',
            text: `確定要刪除「${title}」嗎？`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: '刪除',
            cancelButtonText: '取消'
        });

        if (result.isConfirmed) {
            setLoading(true);
            const res = await deleteNews(id);
            if (res.success) {
                Swal.fire('已刪除', '', 'success');
                loadNews();
            } else {
                Swal.fire('刪除失敗', res.message, 'error');
            }
            setLoading(false);
        }
    };

    // 切換發布狀態
    const togglePublish = async (news) => {
        setLoading(true);
        const result = await updateNews(news.id, {
            ...news,
            is_published: !news.is_published
        });
        if (result.success) {
            loadNews();
        }
        setLoading(false);
    };

    // 格式化日期
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('zh-TW');
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const fieldName = activeLang === 'zh' ? 'content' : 'content_en';
            setFormData(prev => {
                const items = prev[fieldName];
                const oldIndex = items.findIndex(item => item._id === active.id);
                const newIndex = items.findIndex(item => item._id === over.id);
                return {
                    ...prev,
                    [fieldName]: arrayMove(items, oldIndex, newIndex),
                };
            });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-down">
            {/* 標題與新增按鈕 */}
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                    📰 最新消息管理
                </h3>
                <button
                    onClick={() => openEditor()}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold"
                >
                    <Plus size={18} />
                    建立新消息
                </button>
            </div>

            {/* 消息列表 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading && newsList.length === 0 ? (
                    <div className="p-10 text-center">
                        <Loader2 size={30} className="animate-spin text-gray-400 mx-auto" />
                    </div>
                ) : newsList.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        目前沒有任何最新消息
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-sm text-gray-600">
                                <th className="p-4">標題</th>
                                <th className="p-4 hidden md:table-cell">分類</th>
                                <th className="p-4 hidden md:table-cell">狀態</th>
                                <th className="p-4 hidden lg:table-cell">建立日期</th>
                                <th className="p-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {newsList.map(news => (
                                <tr key={news.id} className="border-t hover:bg-gray-50 transition">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {news.is_pinned && <Pin size={14} className="text-yellow-500" />}
                                            <span className="font-bold text-gray-800 line-clamp-1">{news.title}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 hidden md:table-cell">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                            {news.category}
                                        </span>
                                    </td>
                                    <td className="p-4 hidden md:table-cell">
                                        <span className={`px-2 py-1 text-xs rounded-full font-bold ${news.is_published
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {news.is_published ? '已發布' : '草稿'}
                                        </span>
                                    </td>
                                    <td className="p-4 hidden lg:table-cell text-gray-500 text-sm">
                                        {formatDate(news.created_at)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => togglePublish(news)}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                                                title={news.is_published ? '取消發布' : '發布'}
                                            >
                                                {news.is_published ? <EyeOff size={16} className="text-gray-400" /> : <Eye size={16} className="text-green-500" />}
                                            </button>
                                            <button
                                                onClick={() => openEditor(news)}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                                                title="編輯"
                                            >
                                                <Edit3 size={16} className="text-blue-500" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(news.id, news.title)}
                                                className="p-2 hover:bg-red-50 rounded-lg transition"
                                                title="刪除"
                                            >
                                                <Trash2 size={16} className="text-red-500" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 編輯器 Modal */}
            {showEditor && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
                    <div className={`bg-white rounded-2xl shadow-2xl my-8 transition-all duration-300 ${isFullscreen ? 'fixed inset-4 m-0 max-w-none w-auto' : 'w-full max-w-3xl'
                        }`}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-bold text-gray-800">
                                {editingNews
                                    ? (activeLang === 'zh' ? '編輯消息' : 'Edit News')
                                    : (activeLang === 'zh' ? '建立新消息' : 'Create News')
                                }
                            </h3>

                            {/* Header Actions (Moved from Footer) */}
                            <div className="flex items-center gap-2 ml-auto mr-4">
                                <button
                                    onClick={() => handlePreviewNewWindow()}
                                    className="px-3 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition flex items-center gap-2 text-sm"
                                    title={activeLang === 'zh' ? '在新視窗預覽' : 'Preview in new window'}
                                >
                                    <ExternalLink size={16} />
                                    <span className="hidden md:inline">{activeLang === 'zh' ? '預覽' : 'Preview'}</span>
                                </button>
                                <button
                                    onClick={() => handleSave(false)}
                                    disabled={loading}
                                    className="px-3 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition flex items-center gap-2 text-sm"
                                >
                                    <Save size={16} />
                                    <span className="hidden md:inline">{activeLang === 'zh' ? '存草稿' : 'Draft'}</span>
                                </button>
                                <button
                                    onClick={() => handleSave(true)}
                                    disabled={loading}
                                    className="px-3 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center gap-2 text-sm"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                                    <span className="hidden md:inline">{activeLang === 'zh' ? '發布' : 'Publish'}</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-2 border-l pl-4">
                                <button
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-800"
                                    title={isFullscreen ? (activeLang === 'zh' ? '縮小' : 'Minimize') : (activeLang === 'zh' ? '全螢幕' : 'Fullscreen')}
                                >
                                    {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                                </button>
                                <button onClick={closeEditor} className="p-2 hover:bg-gray-100 rounded-lg text-gray-800">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Language Tabs */}
                        <div className="border-b flex px-6">
                            <button
                                onClick={() => setActiveLang('zh')}
                                className={`px-4 py-3 font-bold text-sm transition-colors border-b-2 ${activeLang === 'zh' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                繁體中文
                            </button>
                            <button
                                onClick={() => setActiveLang('en')}
                                className={`px-4 py-3 font-bold text-sm transition-colors border-b-2 ${activeLang === 'en' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                English
                            </button>
                        </div>

                        {/* Form */}
                        <div className={`p-6 space-y-6 overflow-y-auto ${isFullscreen ? 'max-h-[calc(100vh-200px)]' : 'max-h-[60vh]'}`}>
                            {/* 標題 */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    {activeLang === 'zh' ? '標題 *' : 'Title *'}
                                </label>
                                <input
                                    type="text"
                                    value={activeLang === 'zh' ? formData.title : formData.title_en}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        [activeLang === 'zh' ? 'title' : 'title_en']: e.target.value
                                    }))}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-300 outline-none text-gray-900"
                                    placeholder={activeLang === 'zh' ? "輸入消息標題..." : "Enter news title..."}
                                />
                            </div>

                            {/* 分類 & 選項 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-2">{activeLang === 'zh' ? '文章分類' : 'Category'}</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full p-3 border rounded-lg text-gray-900"
                                    >
                                        {CATEGORY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{activeLang === 'zh' ? opt.label : opt.labelEn}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end gap-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="pinned"
                                            checked={formData.is_pinned}
                                            onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                        />
                                        <label htmlFor="pinned" className="text-gray-700 font-bold flex items-center gap-1 whitespace-nowrap">
                                            <Pin size={16} /> 置頂文章 / Pinned
                                        </label>

                                        {formData.is_pinned && (
                                            <div className="ml-0 md:ml-4 flex items-center gap-2 mt-2 md:mt-0">
                                                <label htmlFor="pinned_order" className="text-sm text-gray-500 font-bold whitespace-nowrap">
                                                    順序 / Order :
                                                </label>
                                                <input
                                                    type="number"
                                                    id="pinned_order"
                                                    value={formData.pinned_order ?? ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormData({
                                                            ...formData,
                                                            pinned_order: val === '' ? '' : parseInt(val)
                                                        });
                                                    }}
                                                    placeholder="100"
                                                    className="w-24 p-1 border border-gray-300 rounded text-center text-sm text-gray-900 bg-white"
                                                    min="0"
                                                />
                                                <span className="text-xs text-gray-400 whitespace-nowrap">(越小越前面 / Smaller is higher)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 封面圖片 */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">{activeLang === 'zh' ? '封面圖片 URL' : 'Cover Image URL'}</label>
                                <input
                                    type="text"
                                    value={formData.cover_image}
                                    onChange={(e) => setFormData(prev => ({ ...prev, cover_image: e.target.value }))}
                                    className="w-full p-3 border rounded-lg text-gray-900"
                                    placeholder="https://..."
                                />
                            </div>

                            {/* 摘要 */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    {activeLang === 'zh' ? '摘要' : 'Summary'}
                                </label>
                                <textarea
                                    value={activeLang === 'zh' ? formData.excerpt : formData.excerpt_en}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        [activeLang === 'zh' ? 'excerpt' : 'excerpt_en']: e.target.value
                                    }))}
                                    className="w-full p-3 border rounded-lg text-gray-900"
                                    rows={2}
                                    placeholder={activeLang === 'zh' ? "簡短描述這則消息..." : "Brief summary..."}
                                />
                            </div>

                            {/* 內容編輯器 */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    {activeLang === 'zh' ? '內文' : 'Content'}
                                </label>

                                {/* 編輯模式切換 Tab */}
                                <div className="flex gap-2 mb-4 border-b">
                                    <button
                                        onClick={() => setEditMode('visual')}
                                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${editMode === 'visual' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Layout size={16} /> {activeLang === 'zh' ? '視覺化編輯' : 'Visual Editor'}
                                    </button>
                                    <button
                                        onClick={() => setEditMode('paste')}
                                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${editMode === 'paste' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Clipboard size={16} /> {activeLang === 'zh' ? '貼上內容' : 'Paste Content'}
                                    </button>
                                    <button
                                        onClick={() => setEditMode('upload')}
                                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${editMode === 'upload' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Upload size={16} /> {activeLang === 'zh' ? '上傳檔案' : 'Upload File'}
                                    </button>
                                </div>

                                {/* 視覺化編輯器 */}
                                {editMode === 'visual' && (
                                    <>
                                        {/* 工具列 */}
                                        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                                            <button onClick={() => addContentBlock('paragraph')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                                <Type size={14} /> {activeLang === 'zh' ? '段落' : 'Paragraph'}
                                            </button>
                                            <button onClick={() => addContentBlock('heading')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                                <Type size={14} className="font-bold" /> {activeLang === 'zh' ? '標題' : 'Heading'}
                                            </button>
                                            <button onClick={() => addContentBlock('image')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                                <ImageIcon size={14} /> {activeLang === 'zh' ? '圖片' : 'Image'}
                                            </button>
                                            <button onClick={() => addContentBlock('video')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                                <Video size={14} /> {activeLang === 'zh' ? '影片' : 'Video'}
                                            </button>
                                            <button onClick={() => addContentBlock('quote')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                                <Quote size={14} /> {activeLang === 'zh' ? '引言' : 'Quote'}
                                            </button>
                                            <button onClick={() => addContentBlock('list')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                                <List size={14} /> {activeLang === 'zh' ? '清單' : 'List'}
                                            </button>
                                            <button onClick={() => addContentBlock('link')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                                <LinkIcon size={14} /> {activeLang === 'zh' ? '連結' : 'Link'}
                                            </button>
                                            <button onClick={() => addContentBlock('details')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                                <ChevronDown size={14} /> {activeLang === 'zh' ? '摺疊內容' : 'Details'}
                                            </button>
                                        </div>

                                        {/* 內容區塊 */}
                                        <div className="space-y-4">
                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                onDragEnd={handleDragEnd}
                                            >
                                                <SortableContext
                                                    items={(activeLang === 'zh' ? formData.content : formData.content_en).map(b => b._id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    {(activeLang === 'zh' ? formData.content : formData.content_en).map((block, index) => (
                                                        <SortableBlock
                                                            key={block._id}
                                                            block={block}
                                                            index={index}
                                                            updateContentBlock={updateContentBlock}
                                                            removeContentBlock={removeContentBlock}
                                                            updateListItem={updateListItem}
                                                            addListItem={addListItem}
                                                            removeListItem={removeListItem}
                                                            reorderListItem={reorderListItem}
                                                            onInsertLink={insertLinkToParagraph}
                                                            activeLang={activeLang}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </DndContext>

                                            {(activeLang === 'zh' ? formData.content : formData.content_en).length === 0 && (
                                                <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                                                    {activeLang === 'zh'
                                                        ? '點擊上方按鈕新增內容區塊，或切換到「貼上內容」/「上傳檔案」模式匯入文章'
                                                        : 'Click the buttons above to add content blocks, or switch to "Paste Content" / "Upload File" mode to import articles'
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* 貼上模式 */}
                                {editMode === 'paste' && (
                                    <div className="space-y-4 animate-fade-in-down">
                                        <div className="p-4 bg-gray-50 border rounded-lg">
                                            <p className="text-sm text-gray-600 mb-2 font-bold">
                                                {activeLang === 'zh' ? '請貼上 Markdown 或 HTML 內容：' : 'Paste Markdown or HTML content:'}
                                            </p>
                                            <div className="text-xs text-gray-500 mb-3">
                                                {activeLang === 'zh' ? '支援：## H2, ### H3, ![alt](url), > Quote, - List, [Link](url)' : 'Supports: ## H2, ### H3, ![alt](url), > Quote, - List, [Link](url)'}
                                            </div>
                                            <textarea
                                                value={importText}
                                                onChange={(e) => setImportText(e.target.value)}
                                                className="w-full p-4 border rounded-lg text-gray-900 font-mono text-sm h-64 focus:ring-2 focus:ring-red-200 outline-none"
                                                placeholder={activeLang === 'zh' ? `## 文章標題\n\n這裡是文章內容...\n\n![圖片描述](https://example.com/image.jpg)` : `## Article Title\n\nContent goes here...\n\n![Image](https://example.com/image.jpg)`}
                                            />
                                            <div className="flex justify-end mt-3">
                                                <button
                                                    onClick={handleImport}
                                                    className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                                                >
                                                    <FileText size={16} /> {activeLang === 'zh' ? '解析並匯入' : 'Parse & Import'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 上傳模式 */}
                                {editMode === 'upload' && (
                                    <div className="space-y-4 animate-fade-in-down">
                                        <div className="p-10 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center hover:bg-gray-100 transition relative">
                                            <input
                                                type="file"
                                                accept=".md,.html,.txt"
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="pointer-events-none">
                                                <FileUp size={48} className="mx-auto text-gray-400 mb-4" />
                                                <p className="text-lg font-bold text-gray-600">
                                                    {activeLang === 'zh' ? '點擊或拖曳檔案至此' : 'Click or drag file here'}
                                                </p>
                                                <p className="text-sm text-gray-500 mt-2">
                                                    {activeLang === 'zh' ? '支援 .md, .html, .txt 格式' : 'Supports .md, .html, .txt formats'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
