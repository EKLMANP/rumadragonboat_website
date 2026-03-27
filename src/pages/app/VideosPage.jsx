import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { fetchVideos, postData, updateVideoOrder, updateVideo, deleteVideo } from '../../api/supabaseApi';
import AppLayout from '../../components/AppLayout';
import Swal from 'sweetalert2';
import { Play, UploadCloud, ArrowUpDown, Save, X, ExternalLink, Move, Pencil, Trash2, Search, Film } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sortable Video Card Component ---
// This is used exclusively when 'sortMode' is true
const SortableVideoCard = ({ video, id }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.7 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden group relative">
            {/* Thumbnail */}
            <div className="aspect-video bg-gray-200 relative">
                <img
                    src={`https://img.youtube.com/vi/${getYouTubeId(video.url)}/hqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                />
                {/* Drag Handle Overlay */}
                <div
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                >
                    <Move className="text-white w-10 h-10" />
                    <span className="text-sm text-white font-medium mt-2">拖移排序</span>
                </div>
            </div>
            {/* Content */}
            <div className="p-4">
                <h3 className="font-bold text-gray-800 line-clamp-2">{video.title}</h3>
            </div>
        </div>
    );
};

// --- Helper Functions ---
const getYouTubeId = (url) => {
    try {
        // Handles: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/
        const regex = /(?:youtube\.com\/(?:shorts\/|embed\/|(?:[^\/]+\/.+\/)|(?:.*[?&]v=))|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = url.match(regex);
        return match ? match[1] : null;
    } catch {
        return null;
    }
};

const CATEGORIES = [
    { id: 'racing', label_zh: '龍舟比賽', label_en: 'Dragon Boat Racing' },
    { id: 'tutorial', label_zh: '划船教學', label_en: 'Rowing Tutorial' },
    { id: 'event', label_zh: '活動花絮', label_en: 'Event Highlights' },
    { id: 'other', label_zh: '其他', label_en: 'Others' }
];

export default function VideosPage() {
    const { lang } = useLanguage();
    const { isManagement } = useAuth();
    const isManager = isManagement; // Determine if they can sort

    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState('racing');
    const [currentPage, setCurrentPage] = useState(1);

    // Sort + Filter logic
    const [sortMode, setSortMode] = useState(false);
    const [sortFilter, setSortFilter] = useState('default'); // 'default' or 'oldest'
    const [yearFilter, setYearFilter] = useState('all'); // 'all' or specific year string e.g. '2026'
    const [searchQuery, setSearchQuery] = useState(''); // Text search query

    // For DnD Sortable state per tab
    const [tabVideos, setTabVideos] = useState([]);

    useEffect(() => {
        loadVideos();
    }, []);

    const loadVideos = async () => {
        setLoading(true);
        const data = await fetchVideos();
        setVideos(data || []);
        setLoading(false);
    };

    // Compute year options dynamically from all videos
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const yearsWithVideos = new Set(
            videos.map(v => new Date(v.created_at).getFullYear())
        );
        // Include current year + all future years up to current + all past years with videos
        const minYear = yearsWithVideos.size > 0 ? Math.min(...yearsWithVideos) : currentYear;
        const years = [];
        for (let y = currentYear; y >= minYear; y--) {
            years.push(y);
        }
        return years;
    }, [videos]);

    // Filter and Sort active tab videos
    useEffect(() => {
        let filtered = videos.filter(v => v.category === activeTab);

        // Apply year filter
        if (yearFilter !== 'all') {
            filtered = filtered.filter(v => new Date(v.created_at).getFullYear() === parseInt(yearFilter));
        }

        // Apply search query filter (case-insensitive fuzzy match)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(v => v.title.toLowerCase().includes(query));
        }

        // Apply sort
        if (sortFilter === 'oldest') {
            filtered = [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else {
            // 'default': sort_order ASC, created_at DESC — already ordered from DB fetch
            filtered = [...filtered].sort((a, b) => {
                if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
                return new Date(b.created_at) - new Date(a.created_at);
            });
        }

        setTabVideos(filtered);
        setCurrentPage(1);
    }, [videos, activeTab, sortFilter, yearFilter, searchQuery]);

    // Pagination logic
    const isMobile = window.innerWidth < 768; // simple check
    const ITEMS_PER_PAGE = isMobile ? 4 : 8;
    const totalPages = Math.ceil(tabVideos.length / ITEMS_PER_PAGE);

    const paginatedVideos = useMemo(() => {
        // If sorting mode is ON, show ALL videos in that category on one page to allow cross-page sorting easily
        if (sortMode) return tabVideos;

        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return tabVideos.slice(start, start + ITEMS_PER_PAGE);
    }, [tabVideos, currentPage, ITEMS_PER_PAGE, sortMode]);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handlers
    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setTabVideos((items) => {
                const oldIndex = items.findIndex(v => v.id === active.id);
                const newIndex = items.findIndex(v => v.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSaveOrder = async () => {
        Swal.fire({
            title: lang === 'zh' ? '儲存排序中...' : 'Saving order...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        // The current tabVideos array is the new order.
        // We will assign them incrementing positive sort_order values.
        const updates = tabVideos.map((video, index) => ({
            id: video.id,
            sort_order: index + 1
        }));

        const result = await updateVideoOrder(updates);

        if (result.success) {
            // Re-fetch all to ensure local state is synced
            await loadVideos();
            setSortMode(false);
            Swal.fire({
                icon: 'success',
                title: lang === 'zh' ? '排序更新成功' : 'Order Updated Successfully',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            Swal.fire('Error', result.message, 'error');
        }
    };

    const handleUploadClick = async () => {
        const inputClasses = "w-full bg-gray-100 text-black text-sm rounded-lg p-3 mt-2 border border-transparent focus:border-red-500 focus:bg-white focus:ring-0 outline-none transition-colors box-border";
        const { value: formValues } = await Swal.fire({
            title: lang === 'zh' ? '上傳影片' : 'Upload Video',
            html: `
                <div class="space-y-4 text-left p-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">影片標題 / Video Title</label>
                        <input id="swal-title" class="${inputClasses}" placeholder="Enter title">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">影片類別 / Category</label>
                        <select id="swal-category" class="${inputClasses}">
                            ${CATEGORIES.map(c => `<option value="${c.id}">${c.label_zh} / ${c.label_en}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">YouTube URL</label>
                        <p class="text-xs text-gray-500 mt-1">請先將影片上傳到 YouTube，再把 YouTube 上面的影片連結貼過來</p>
                        <input id="swal-url" class="${inputClasses}" placeholder="https://youtube.com/...">
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: lang === 'zh' ? '確認送出' : 'Submit',
            cancelButtonText: lang === 'zh' ? '取消' : 'Cancel',
            confirmButtonColor: '#ea580c', // Orange
            preConfirm: () => {
                const title = document.getElementById('swal-title').value;
                const category = document.getElementById('swal-category').value;
                const url = document.getElementById('swal-url').value;

                if (!title || !url) {
                    Swal.showValidationMessage('標題與連結為必填 (Title and URL are required)');
                    return false;
                }
                if (!getYouTubeId(url)) {
                    Swal.showValidationMessage('無效的 YouTube 連結 (Invalid YouTube URL)');
                    return false;
                }
                return { title, category, url };
            }
        });

        if (formValues) {
            Swal.fire({
                title: lang === 'zh' ? '上傳中...' : 'Uploading...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const result = await postData('addVideo', formValues);

            if (result.success) {
                await loadVideos();
                setCurrentPage(1);
                Swal.fire({
                    icon: 'success',
                    title: lang === 'zh' ? '影片上傳成功！' : 'Video uploaded successfully!',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Error', result.message, 'error');
            }
        }
    };

    const handleEditVideo = async (video) => {
        const inputClasses = "w-full bg-gray-100 text-black text-sm rounded-lg p-3 mt-2 border border-transparent focus:border-red-500 focus:bg-white focus:ring-0 outline-none transition-colors box-border";
        const { value: formValues } = await Swal.fire({
            title: lang === 'zh' ? '編輯影片' : 'Edit Video',
            html: `
                <div class="space-y-4 text-left p-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">影片標題 / Video Title</label>
                        <input id="swal-title" class="${inputClasses}" value="${video.title.replace(/"/g, '&quot;')}" placeholder="Enter title">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">影片類別 / Category</label>
                        <select id="swal-category" class="${inputClasses}">
                            ${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === video.category ? 'selected' : ''}>${c.label_zh} / ${c.label_en}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">YouTube URL</label>
                        <input id="swal-url" class="${inputClasses}" value="${video.url.replace(/"/g, '&quot;')}" placeholder="https://youtube.com/...">
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: lang === 'zh' ? '儲存' : 'Save',
            cancelButtonText: lang === 'zh' ? '取消' : 'Cancel',
            confirmButtonColor: '#ea580c',
            preConfirm: () => {
                const title = document.getElementById('swal-title').value;
                const category = document.getElementById('swal-category').value;
                const url = document.getElementById('swal-url').value;

                if (!title || !url) {
                    Swal.showValidationMessage('標題與連結為必填 (Title and URL are required)');
                    return false;
                }
                if (!getYouTubeId(url)) {
                    Swal.showValidationMessage('無效的 YouTube 連結 (Invalid YouTube URL)');
                    return false;
                }
                return { title, category, url };
            }
        });

        if (formValues) {
            Swal.fire({
                title: lang === 'zh' ? '儲存中...' : 'Saving...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const result = await updateVideo(video.id, formValues);
            if (result.success) {
                await loadVideos();
                Swal.fire({
                    icon: 'success',
                    title: lang === 'zh' ? '影片更新成功！' : 'Video updated successfully!',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Error', result.message, 'error');
            }
        }
    };

    const handleDeleteVideo = async (video) => {
        const result = await Swal.fire({
            title: lang === 'zh' ? '確定要刪除這支影片嗎？' : 'Delete this video?',
            text: video.title,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: lang === 'zh' ? '是的，刪除' : 'Yes, delete',
            cancelButtonText: lang === 'zh' ? '取消' : 'Cancel'
        });

        if (result.isConfirmed) {
            Swal.fire({
                title: lang === 'zh' ? '刪除中...' : 'Deleting...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const delResult = await deleteVideo(video.id);
            if (delResult.success) {
                await loadVideos();
                Swal.fire({
                    icon: 'success',
                    title: lang === 'zh' ? '已成功刪除' : 'Deleted successfully',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Error', delResult.message, 'error');
            }
        }
    };

    // Open video in modal (inline playback)
    const playVideo = (video) => {
        if (sortMode) return; // Prevent playing while sorting
        const yId = getYouTubeId(video.url);
        Swal.fire({
            html: `
                <div class="aspect-video w-full">
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src="https://www.youtube.com/embed/${yId}?autoplay=1" 
                        title="${video.title}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
                <h3 class="mt-4 font-bold text-lg text-left">${video.title}</h3>
            `,
            width: '800px',
            showConfirmButton: false,
            showCloseButton: true,
            padding: '1em',
            customClass: {
                popup: 'rounded-xl',
                htmlContainer: '!m-0'
            }
        });
    };

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto space-y-6 pb-16">
                {/* Header Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                                <Film className="text-sky-600" /> {lang === 'zh' ? '各式影片' : 'Videos'}
                            </h1>
                            <p className="text-gray-500 mt-1">
                                {lang === 'zh' ? '龍舟比賽、划船教學、活動花絮等各式影片' : 'Dragon boat races, tutorials, event highlights, and more.'}
                            </p>
                        </div>
                        <div className="flex gap-2 items-center">
                            <button
                                onClick={handleUploadClick}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition shadow-sm"
                            >
                                <UploadCloud size={18} />
                                {lang === 'zh' ? '上傳影片' : 'Upload Video'}
                            </button>

                            {/* Management Sort Button */}
                            {isManager && !sortMode && (
                                <button
                                    onClick={() => {
                                        setSortFilter('default'); // reset filter when sorting
                                        setSortMode(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition shadow-sm"
                                >
                                    <ArrowUpDown size={18} />
                                    {lang === 'zh' ? '調整影片順序' : 'Adjust Order'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Tabs & Filters */}
                    <div className="border-b border-gray-100">
                        {/* Category Tabs */}
                        <div className="flex overflow-x-auto hide-scrollbar">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        if (sortMode) return;
                                        setActiveTab(cat.id);
                                    }}
                                    className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition border-b-2 ${activeTab === cat.id
                                        ? 'border-red-600 text-red-600 bg-red-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                        } ${sortMode && activeTab !== cat.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {lang === 'zh' ? cat.label_zh : cat.label_en}
                                </button>
                            ))}
                        </div>

                        {/* Filter row: Search + Year + Sort */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-50">
                            {/* Search Bar */}
                            <div className="relative w-full md:w-64 shrink-0">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search size={16} className="text-gray-400" />
                                </span>
                                <input
                                    type="text"
                                    placeholder={lang === 'zh' ? '搜尋影片標題...' : 'Search videos...'}
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 outline-none transition"
                                    disabled={sortMode}
                                />
                            </div>

                            <div className="flex items-center w-full md:w-auto justify-end gap-2 shrink-0">
                                {/* Year Filter */}
                                <select
                                    disabled={sortMode}
                                    value={yearFilter}
                                    onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }}
                                    className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 p-2 outline-none disabled:opacity-50"
                                >
                                    <option value="all">{lang === 'zh' ? '全部' : 'All Years'}</option>
                                    {yearOptions.map(y => (
                                        <option key={y} value={String(y)}>{y}</option>
                                    ))}
                                </select>

                                {/* Sort Filter */}
                                <select
                                    disabled={sortMode}
                                    value={sortFilter}
                                    onChange={(e) => setSortFilter(e.target.value)}
                                    className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 p-2 outline-none disabled:opacity-50"
                                >
                                    <option value="default">{lang === 'zh' ? '由新到舊' : 'Newest First'}</option>
                                    <option value="oldest">{lang === 'zh' ? '由舊到新' : 'Oldest First'}</option>
                                </select>
                            </div>
                        </div>

                        {/* Video Grid */}
                        <div className="p-6">
                            {loading ? (
                                <div className="flex justify-center items-center py-20 text-gray-400">
                                    <span className="animate-pulse">{lang === 'zh' ? '載入中...' : 'Loading...'}</span>
                                </div>
                            ) : tabVideos.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center">
                                    <Play size={48} className="text-gray-200 mb-4" />
                                    <p className="text-lg font-medium text-gray-500">{lang === 'zh' ? '此類別尚無影片' : 'No videos in this category yet.'}</p>
                                    <p className="text-sm mt-1">點擊右上方「上傳影片」新增內容</p>
                                </div>
                            ) : sortMode ? (
                                // --- SORTING MODE UI ---
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-3 p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200 shadow-sm">
                                        <div className="flex items-start gap-2">
                                            <ArrowUpDown size={20} className="text-yellow-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold">排序模式</p>
                                                <p className="text-sm opacity-90">請拖曳影片卡片來調整順序，完成後請點擊「確認儲存」。</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => {
                                                    setSortMode(false);
                                                    loadVideos(); // reset original order
                                                }}
                                                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition whitespace-nowrap"
                                            >
                                                <X size={16} className="inline mr-1" />
                                                取消
                                            </button>
                                            <button
                                                onClick={handleSaveOrder}
                                                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white border border-transparent rounded-lg font-medium transition shadow-sm whitespace-nowrap"
                                            >
                                                <Save size={16} className="inline mr-1" />
                                                確認儲存
                                            </button>
                                        </div>
                                    </div>

                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <SortableContext items={tabVideos.map(v => v.id)} strategy={rectSortingStrategy}>
                                                {tabVideos.map(video => (
                                                    <SortableVideoCard key={video.id} id={video.id} video={video} />
                                                ))}
                                            </SortableContext>
                                        </div>
                                    </DndContext>
                                </div>
                            ) : (
                                // --- NORMAL VIEW UI ---
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {paginatedVideos.map((video) => (
                                            <div key={video.id} className="bg-white rounded-xl shadow-sm border border-gray-100/50 overflow-hidden group hover:shadow-md hover:border-red-100 transition duration-300">
                                                {/* Thumbnail Container */}
                                                <div
                                                    onClick={() => playVideo(video)}
                                                    className="aspect-video bg-slate-100 relative cursor-pointer overflow-hidden"
                                                >
                                                    <img
                                                        src={`https://img.youtube.com/vi/${getYouTubeId(video.url)}/hqdefault.jpg`}
                                                        alt={video.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                                        loading="lazy"
                                                        onError={(e) => { e.target.src = '/Default_Thumbnail.png'; }} // Fallback
                                                    />
                                                    {/* Play Button Overlay */}
                                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition flex items-center justify-center">
                                                        <div className="w-14 h-14 bg-red-600/90 text-white rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition duration-300 backdrop-blur-sm">
                                                            <Play size={24} className="ml-1" fill="currentColor" />
                                                        </div>
                                                    </div>

                                                    {/* Management Edit/Delete Buttons Overlay */}
                                                    {isManager && !sortMode && (
                                                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleEditVideo(video); }}
                                                                className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-full shadow-md backdrop-blur-sm transition"
                                                                title={lang === 'zh' ? '編輯影片' : 'Edit'}
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteVideo(video); }}
                                                                className="p-2 bg-white/90 hover:bg-red-50 text-red-600 rounded-full shadow-md backdrop-blur-sm transition"
                                                                title={lang === 'zh' ? '刪除影片' : 'Delete'}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Card Info */}
                                                <div className="p-4">
                                                    <a
                                                        href={video.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-bold text-gray-800 line-clamp-2 hover:text-red-600 transition flex items-start gap-1 group/link"
                                                        title="在 YouTube 另開分頁觀看"
                                                    >
                                                        <span>{video.title}</span>
                                                        <ExternalLink size={14} className="opacity-0 group-hover/link:opacity-100 shrink-0 mt-1" />
                                                    </a>
                                                    <p className="text-xs text-gray-400 mt-2 font-medium">
                                                        {new Date(video.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex justify-center items-center gap-2 pt-4 border-t border-gray-100">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                                            >
                                                {lang === 'zh' ? '上一頁' : 'Prev'}
                                            </button>

                                            <div className="flex px-1 gap-1">
                                                {[...Array(totalPages)].map((_, i) => (
                                                    <button
                                                        key={i + 1}
                                                        onClick={() => setCurrentPage(i + 1)}
                                                        className={`w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center transition
                                                    ${currentPage === i + 1
                                                                ? 'bg-red-600 text-white shadow-sm'
                                                                : 'text-gray-600 hover:bg-gray-100'}`}
                                                    >
                                                        {i + 1}
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                                            >
                                                {lang === 'zh' ? '下一頁' : 'Next'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
