// src/components/NewsManager.jsx
// 最新消息管理元件 - 用於幹部專區

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
    Plus, Save, Trash2, Edit3, Eye, EyeOff, Pin, Loader2,
    Image as ImageIcon, Video, Link as LinkIcon, Type, List, Quote, X, GripVertical
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

// 分類選項
const CATEGORY_OPTIONS = [
    { value: '參賽消息', label: '參賽消息' },
    { value: '隊伍活動', label: '隊伍活動' },
    { value: '體驗招募', label: '體驗招募' },
    { value: '訓練回顧', label: '訓練回顧' }
];

const generateId = () => Math.random().toString(36).substr(2, 9);

function SortableBlock({ block, index, updateContentBlock, removeContentBlock, updateListItem, addListItem }) {
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
                    <textarea
                        value={block.text}
                        onChange={(e) => updateContentBlock(index, 'text', e.target.value)}
                        className="w-full p-2 border rounded text-gray-900"
                        rows={3}
                        placeholder="輸入段落文字..."
                    />
                )}

                {block.type === 'heading' && (
                    <input
                        type="text"
                        value={block.text}
                        onChange={(e) => updateContentBlock(index, 'text', e.target.value)}
                        className="w-full p-2 border rounded text-gray-900 font-bold text-lg"
                        placeholder="輸入標題..."
                    />
                )}

                {block.type === 'image' && (
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={block.url}
                            onChange={(e) => updateContentBlock(index, 'url', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900"
                            placeholder="圖片 URL..."
                        />
                        <input
                            type="text"
                            value={block.caption}
                            onChange={(e) => updateContentBlock(index, 'caption', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900 text-sm"
                            placeholder="圖片說明（選填）"
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
                            placeholder="YouTube 或影片嵌入 URL..."
                        />
                        <input
                            type="text"
                            value={block.caption}
                            onChange={(e) => updateContentBlock(index, 'caption', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900 text-sm"
                            placeholder="影片說明（選填）"
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
                            placeholder="引言內容..."
                        />
                        <input
                            type="text"
                            value={block.author}
                            onChange={(e) => updateContentBlock(index, 'author', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900 text-sm"
                            placeholder="引言者（選填）"
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
                                    placeholder="清單項目..."
                                />
                            </div>
                        ))}
                        <button
                            onClick={() => addListItem(index)}
                            className="text-sm text-blue-500 hover:underline"
                        >
                            + 新增項目
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
                            placeholder="連結 URL..."
                        />
                        <input
                            type="text"
                            value={block.text}
                            onChange={(e) => updateContentBlock(index, 'text', e.target.value)}
                            className="w-full p-2 border rounded text-gray-900 text-sm"
                            placeholder="顯示文字（選填）"
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
                break;
            case 'image':
                newBlock.url = '';
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-bold text-gray-800">
                                {editingNews ? '編輯消息' : '建立新消息'}
                            </h3>
                            <button onClick={closeEditor} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X size={20} />
                            </button>
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
                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                            {/* 標題 */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    {activeLang === 'zh' ? '標題 *' : 'Title (English) *'}
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
                                    <label className="block text-sm font-bold text-gray-600 mb-2">分類</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full p-3 border rounded-lg text-gray-900"
                                    >
                                        {CATEGORY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                                        <span className="text-sm font-bold text-gray-600">置頂</span>
                                    </label>
                                </div>
                            </div>

                            {/* 封面圖片 */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">封面圖片 URL</label>
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
                                    {activeLang === 'zh' ? '摘要' : 'Summary (English)'}
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
                                    {activeLang === 'zh' ? '內文' : 'Content (English)'}
                                </label>

                                {/* 工具列 */}
                                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                                    <button onClick={() => addContentBlock('paragraph')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                        <Type size={14} /> 段落
                                    </button>
                                    <button onClick={() => addContentBlock('heading')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                        <Type size={14} className="font-bold" /> 標題
                                    </button>
                                    <button onClick={() => addContentBlock('image')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                        <ImageIcon size={14} /> 圖片
                                    </button>
                                    <button onClick={() => addContentBlock('video')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                        <Video size={14} /> 影片
                                    </button>
                                    <button onClick={() => addContentBlock('quote')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                        <Quote size={14} /> 引言
                                    </button>
                                    <button onClick={() => addContentBlock('list')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                        <List size={14} /> 清單
                                    </button>
                                    <button onClick={() => addContentBlock('link')} className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-sm text-gray-700 shadow-sm">
                                        <LinkIcon size={14} /> 連結
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
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>

                                    {(activeLang === 'zh' ? formData.content : formData.content_en).length === 0 && (
                                        <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                                            點擊上方按鈕新增內容區塊
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
                                <button
                                    onClick={closeEditor}
                                    className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => handleSave(false)}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    儲存草稿
                                </button>
                                <button
                                    onClick={() => handleSave(true)}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
                                    發布
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
