// src/components/NewsManager.jsx
// 最新消息管理元件 - 用於幹部專區

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
    Plus, Save, Trash2, Edit3, Eye, EyeOff, Pin, Loader2,
    Image as ImageIcon, Video, Link as LinkIcon, Type, List, Quote, X, GripVertical, FileText,
    Clipboard, Upload, FileUp, Layout, Maximize2, Minimize2, ExternalLink
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

function SortableBlock({ block, index, updateContentBlock, removeContentBlock, updateListItem, addListItem, onInsertLink, activeLang }) {
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
                        {block.items?.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-center gap-2">
                                <span className="text-gray-400">•</span>
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => updateListItem(index, itemIdx, e.target.value)}
                                    className="flex-1 p-2 border rounded text-gray-900"
                                    placeholder={activeLang === 'zh' ? "清單項目..." : "List item..."}
                                />
                            </div>
                        ))}
                        <button
                            onClick={() => addListItem(index)}
                            className="text-sm text-blue-500 hover:underline"
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
    const [showPreview, setShowPreview] = useState(false);

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
            if (/^##\s+(.+)$/.test(trimmed)) {
                flushParagraph();
                const match = trimmed.match(/^##\s+(.+)$/);
                blocks.push({ type: 'heading', level: 'h2', text: match[1], _id: generateId() });
                continue;
            }
            if (/<h2[^>]*>(.+?)<\/h2>/i.test(trimmed)) {
                flushParagraph();
                const match = trimmed.match(/<h2[^>]*>(.+?)<\/h2>/i);
                blocks.push({ type: 'heading', level: 'h2', text: match[1], _id: generateId() });
                continue;
            }

            // H3 標題 (### or <h3>)
            if (/^###\s+(.+)$/.test(trimmed)) {
                flushParagraph();
                const match = trimmed.match(/^###\s+(.+)$/);
                blocks.push({ type: 'heading', level: 'h3', text: match[1], _id: generateId() });
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
                blocks.push({ type: 'list', items, _id: generateId() });
                continue;
            }

            // 連結 ([text](url) or <a>)
            if (/^\[([^\]]+)\]\(([^)]+)\)$/.test(trimmed)) {
                flushParagraph();
                const match = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                blocks.push({ type: 'link', text: match[1], url: match[2], _id: generateId() });
                continue;
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
        if (news) {
            setEditingNews(news);
            setFormData({
                title: news.title || '',
                title_en: news.title_en || '',
                category: news.category || '隊伍活動',
                cover_image: news.cover_image || '',
                excerpt: news.excerpt || '',
                excerpt_en: news.excerpt_en || '',
                content: (news.content || []).map(b => ({ ...b, _id: b._id || generateId() })),
                content_en: (news.content_en || []).map(b => ({ ...b, _id: b._id || generateId() })),
                is_pinned: news.is_pinned || false,
                is_published: news.is_published || false
            });
        } else {
            setEditingNews(null);
            setFormData({
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
        }
        setShowEditor(true);
    };

    // 關閉編輯器
    const closeEditor = () => {
        setShowEditor(false);
        setEditingNews(null);
        setIsFullscreen(false);
        setShowPreview(false);
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
                newBlock.items = [''];
                break;
            case 'link':
                newBlock.url = '';
                newBlock.text = '';
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
            const items = [...newContent[blockIndex].items];
            items[itemIndex] = value;
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
                items: [...newContent[blockIndex].items, '']
            };
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
                            <div className="flex items-center gap-2">
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
                            <div className="grid grid-cols-2 gap-4">
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
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_pinned}
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_pinned: e.target.checked }))}
                                            className="w-5 h-5 rounded"
                                        />
                                        <span className="text-sm font-bold text-gray-600">{activeLang === 'zh' ? '置頂' : 'Pinned'}</span>
                                    </label>
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

                            {/* Footer */}
                            <div className="flex flex-wrap gap-2 md:gap-3 p-4 md:p-6 border-t bg-gray-50 rounded-b-2xl">
                                <button
                                    onClick={closeEditor}
                                    className="py-2 md:py-3 px-3 md:px-4 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition text-sm md:text-base"
                                >
                                    {activeLang === 'zh' ? '取消' : 'Cancel'}
                                </button>
                                <button
                                    onClick={() => setShowPreview(true)}
                                    className="py-2 md:py-3 px-3 md:px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1 md:gap-2 text-sm md:text-base"
                                >
                                    <Eye size={16} className="md:w-[18px] md:h-[18px]" />
                                    {activeLang === 'zh' ? '預覽' : 'Preview'}
                                </button>
                                <button
                                    onClick={() => handleSave(false)}
                                    disabled={loading}
                                    className="flex-1 min-w-[100px] py-2 md:py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-1 md:gap-2 text-sm md:text-base whitespace-nowrap"
                                >
                                    <Save size={16} className="md:w-[18px] md:h-[18px]" />
                                    {activeLang === 'zh' ? '儲存草稿' : 'Save'}
                                </button>
                                <button
                                    onClick={() => handleSave(true)}
                                    disabled={loading}
                                    className="flex-1 min-w-[100px] py-2 md:py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1 md:gap-2 text-sm md:text-base whitespace-nowrap"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin md:w-[18px] md:h-[18px]" /> : <Eye size={16} className="md:w-[18px] md:h-[18px]" />}
                                    {activeLang === 'zh' ? '發布' : 'Publish'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[#171717] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-700">
                            <h3 className="text-lg font-bold text-white">{activeLang === 'zh' ? '文章預覽' : 'Article Preview'}</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-gray-700 rounded-lg transition"
                            >
                                <X size={20} className="text-white" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Cover Image */}
                            {formData.cover_image && (
                                <div className="mb-6 rounded-xl overflow-hidden">
                                    <img
                                        src={formData.cover_image}
                                        alt={formData.title}
                                        className="w-full h-64 object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                            )}

                            {/* Title */}
                            <h1 className="text-3xl font-bold text-white mb-4">
                                {activeLang === 'zh' ? formData.title : formData.title_en || formData.title}
                            </h1>

                            {/* Category & Date */}
                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded">
                                    {formData.category}
                                </span>
                                <span className="text-gray-500 text-sm">
                                    {new Date().toLocaleDateString('zh-TW')}
                                </span>
                            </div>

                            {/* Excerpt */}
                            {(activeLang === 'zh' ? formData.excerpt : formData.excerpt_en) && (
                                <p className="text-gray-400 text-lg mb-8 italic border-l-4 border-red-600 pl-4">
                                    {activeLang === 'zh' ? formData.excerpt : formData.excerpt_en}
                                </p>
                            )}

                            {/* Content Blocks */}
                            <div className="prose prose-invert max-w-none">
                                <NewsContentRenderer content={activeLang === 'zh' ? formData.content : formData.content_en} />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-700 flex justify-end">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-6 py-2 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition"
                            >
                                關閉預覽
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
