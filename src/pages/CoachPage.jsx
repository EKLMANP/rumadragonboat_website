// src/pages/CoachPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
// Icons
import {
  Users, Calendar, ClipboardList, CheckCircle,
  ChevronLeft, ChevronRight, Search, Filter,
  MapPin, Clock, Edit, Trash2, Plus, X,
  AlertCircle, ChevronDown, Check, Zap, Lock, Save, Dumbbell, Megaphone, Newspaper, BarChart3, Trophy, ListChecks, Loader2, Gift, Info, ChevronUp
} from 'lucide-react';
// API
import { fetchAllData, postData, saveAttendance, fetchAttendance, fetchActivities, fetchActivityRegistrations, fetchAnnouncements, fetchDates, adminListUsers, saveSeatingArrangement, awardFitnessAttendance, fetchFitnessHistory, addReward, updateReward, deleteReward, fetchRewards, fetchRedemptionRecords, updateRedemptionStatus } from '../api/supabaseApi';
import { generateSeating } from '../utils/seatingLogic';
import SeatVisualizer from '../components/SeatVisualizer';
import AppLayout from '../components/AppLayout';
import NewsManager from '../components/NewsManager';

import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const CoachPage = () => {
  const { userProfile, user, isManagement, isAdmin } = useAuth(); // Auth Context
  const { lang, t } = useLanguage();                      // Language Context
  const navigate = useNavigate();

  // --- 頁籤控制 State ---
  const [activeTab, setActiveTab] = useState('dates');

  // --- 基礎設定 State ---
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({
    name: '',
    type: 'boat_practice',
    date: '',
    start_time: '07:30',
    end_time: '11:30',
    location: '碧潭 Bitan',
    customLocation: '',
    deadline: ''
  });

  // --- 公告管理 State ---
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    category: '活動',
    pinned: false
  });
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  // --- 兌換管理 State ---
  const [rewards, setRewards] = useState([]); // New state for rewards list
  const [editingRewardId, setEditingRewardId] = useState(null);
  const [newReward, setNewReward] = useState({
    name: '',
    points_cost: '',
    stock: '', // New: Stock field
    description: '',
    imageFile: null
  });
  const [redemptionRecords, setRedemptionRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Legacy states (kept for transitional logic if needed, but primary is activities now)
  const [dbDates, setDbDates] = useState([]); // Still used for compatibility until full refactor
  const [seatingCharts, setSeatingCharts] = useState({});
  const [selectedSeatingDate, setSelectedSeatingDate] = useState(''); // New: Selected date for seating chart
  const [selectedSeatingCell, setSelectedSeatingCell] = useState(null); // Selected cell for swapping

  // Loading 狀態管理
  const [loading, setLoading] = useState(false); // 全頁遮罩
  const [backgroundLoading, setBackgroundLoading] = useState(false); // 背景載入

  // Handle Reward Creation
  const handleCreateReward = async () => {
    if (!newReward.name || !newReward.points_cost) {
      Swal.fire({
        title: '欄位未填',
        text: '請填寫項目名稱與點數',
        icon: 'warning'
      });
      return;
    }

    setLoading(true);

    // Check file size (1MB limit)
    let processedFile = newReward.imageFile;
    if (processedFile && processedFile.size > 1024 * 1024) {
      // Simple compression logic or reject
      // Since users asked for auto-compression, we can try to compress or just alert for now if complex.
      // For this environment, building a full canvas compressor is complex in one go.
      // User requirement: "系統需自動壓縮至 1MB 以下".
      // Implementation of simple compression:
      try {
        processedFile = await compressImage(processedFile);
      } catch (e) {
        console.error("Compression failed:", e);
        Swal.fire('圖片處理失敗', '無法壓縮圖片，請上傳較小的檔案', 'error');
        setLoading(false);
        return;
      }
    }

    let res;
    if (editingRewardId) {
      // Update existing reward
      res = await updateReward({
        id: editingRewardId,
        name: newReward.name,
        points_cost: parseInt(newReward.points_cost),
        stock: parseInt(newReward.stock) || 0, // Update stock
        description: newReward.description,
        image_url: newReward.image_url, // Keep old URL if no new file
        imageFile: processedFile
      });
    } else {
      // Create new reward
      res = await addReward({
        name: newReward.name,
        points_cost: parseInt(newReward.points_cost),
        stock: parseInt(newReward.stock) || 0, // Add stock
        description: newReward.description,
        imageFile: processedFile
      });
    }

    setLoading(false);

    if (res.success) {
      Swal.fire(
        editingRewardId ? (lang === 'zh' ? '更新成功' : 'Updated') : (lang === 'zh' ? '新增成功' : 'Created'),
        lang === 'zh' ? `已${editingRewardId ? '更新' : '新增'}兌換項目：${newReward.name}` : `Reward ${editingRewardId ? 'updated' : 'created'}: ${newReward.name}`,
        'success'
      );

      // Reset form
      setNewReward({
        name: '',
        points_cost: '',
        stock: '',
        description: '',
        imageFile: null,
        image_url: null
      });
      setEditingRewardId(null);

      // Reset file input
      const fileInput = document.getElementById('reward-image-input');
      if (fileInput) fileInput.value = '';

      // Refresh list
      loadRewards();
    } else {
      Swal.fire(editingRewardId ? (lang === 'zh' ? '更新失敗' : 'Update Failed') : (lang === 'zh' ? '新增失敗' : 'Create Failed'), res.message, 'error');
    }
  };

  const handleEditReward = (reward) => {
    setNewReward({
      name: reward.name,
      points_cost: reward.points_cost,
      stock: reward.stock || 0,
      description: reward.description || '',
      image_url: reward.image_url,
      imageFile: null
    });
    setEditingRewardId(reward.id);

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setNewReward({
      name: '',
      points_cost: '',
      stock: '',
      description: '',
      imageFile: null,
      image_url: null
    });
    setEditingRewardId(null);
    const fileInput = document.getElementById('reward-image-input');
    if (fileInput) fileInput.value = '';
  };

  const handleDeleteReward = async (id, name) => {
    const result = await Swal.fire({
      title: lang === 'zh' ? '確定刪除？' : 'Delete Reward?',
      text: lang === 'zh' ? `確定要刪除「${name}」嗎？此動作無法復原。` : `Delete "${name}"? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: lang === 'zh' ? '是的，刪除' : 'Yes, Delete',
      cancelButtonText: lang === 'zh' ? '取消' : 'Cancel'
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await deleteReward(id);
      setLoading(false);

      if (res.success) {
        Swal.fire('已刪除', lang === 'zh' ? '該項目已成功刪除' : 'Reward deleted', 'success');
        loadRewards();
      } else {
        Swal.fire('刪除失敗', res.message, 'error');
      }
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if too large (heuristic)
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress quality
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Canvas is empty'));
              return;
            }
            const newFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(newFile);
          }, 'image/jpeg', 0.7); // 70% quality
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };



  // --- 點名系統 State ---
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [rollCallDate, setRollCallDate] = useState('');
  const [attendanceList, setAttendanceList] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [activityRegistrations, setActivityRegistrations] = useState([]); // New state for raw activity regs
  const [adminMembers, setAdminMembers] = useState([]);

  // --- 船練點名 分頁 State ---
  const [rollCallPage, setRollCallPage] = useState(1);
  const [rollCallItemsPerPage, setRollCallItemsPerPage] = useState(window.innerWidth < 768 ? 5 : 6);

  useEffect(() => {
    const handleResize = () => setRollCallItemsPerPage(window.innerWidth < 768 ? 5 : 6);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 活動管理篩選與分頁 State ---
  const [createdActivityFilter, setCreatedActivityFilter] = useState('all');
  const [createdPage, setCreatedPage] = useState(1);
  const [statsFilter, setStatsFilter] = useState('all');
  const [statsPage, setStatsPage] = useState(1);
  // New state for list pagination/filtering in the right column
  const [listFilter, setListFilter] = useState('all');
  const [listPage, setListPage] = useState(1);

  // --- 排行榜進階篩選 State ---
  const [rawAttendanceHistory, setRawAttendanceHistory] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [totalSessionsInPeriod, setTotalSessionsInPeriod] = useState(0);

  // 篩選條件
  const [reportType, setReportType] = useState('month');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1);
  const [targetDay, setTargetDay] = useState('');

  // --- 體能課點名 State ---
  const [fitnessDate, setFitnessDate] = useState(new Date().toISOString().split('T')[0]);
  const [fitnessSearch, setFitnessSearch] = useState('');
  const [fitnessSelected, setFitnessSelected] = useState([]);
  const [extraFitnessCandidates, setExtraFitnessCandidates] = useState([]); // New: 手動新增的額外人員
  const [fitnessHistory, setFitnessHistory] = useState([]);
  const [fitnessSubmitting, setFitnessSubmitting] = useState(false);

  const placeOptions = [
    "碧潭 Bitan",
    "百齡橋 Bailing Bridge",
    "蘆洲微風運河 Luzhou Breeze Canal",
    "大直龍舟碼頭 Dazhi Dragon Boat Pier"
  ];

  const generateTimeOptions = () => {
    const options = [];
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 60; j += 15) {
        const h = i.toString().padStart(2, '0');
        const m = j.toString().padStart(2, '0');
        options.push(`${h}:${m}`);
      }
    }
    return options;
  };

  useEffect(() => {
    loadPriorityData();
  }, []);

  useEffect(() => {
    if (rawAttendanceHistory.length > 0) {
      calculateStats();
    }
  }, [rawAttendanceHistory, reportType, targetYear, targetMonth, targetDay]);

  // Fetch rewards when tab changes to redemption
  useEffect(() => {
    if (activeTab === 'redemption') {
      loadRewards();
      loadRedemptionRecords();
    }
  }, [activeTab]);

  const loadRewards = async () => {
    const data = await fetchRewards();
    setRewards(data);
  };

  const loadRedemptionRecords = async () => {
    setLoadingRecords(true);
    const data = await fetchRedemptionRecords();
    setRedemptionRecords(data);
    setLoadingRecords(false);
  };

  const handleUpdateRedemptionStatus = async (id, newStatus) => {
    // Get current user name for delivered_by
    const delivererName = userProfile?.name || user?.email || 'Admin';
    const res = await updateRedemptionStatus(id, newStatus, delivererName);
    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: '狀態已更新',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
      });
      loadRedemptionRecords();
    } else {
      Swal.fire('更新失敗', res.message, 'error');
    }
  };

  const loadPriorityData = async () => {
    setLoading(true);
    try {
      // Phase 1: 優先載入活動和公告 (最常用的資料) - 快速載入
      // 使用個別 catch 避免單一 API 失敗導致整個頁面掛掉
      const safeFetch = async (fn, defaultVal = []) => {
        try {
          const res = await fn;
          return res || defaultVal;
        } catch (e) {
          console.warn("API Partial Fail:", e);
          return defaultVal;
        }
      };

      const [activitiesData, announcementsData, adminUsersData] = await Promise.all([
        safeFetch(fetchActivities(), []),
        safeFetch(fetchAnnouncements(), []),
        safeFetch(adminListUsers(), { success: false, data: { users: [] } })
      ]);

      setActivities(activitiesData);
      setAnnouncements(announcementsData);

      let adminMembersList = [];
      if (adminUsersData?.success && adminUsersData.data?.users) {
        adminMembersList = adminUsersData.data.users;
        setAdminMembers(adminMembersList);
      }

      // Legacy Date Handling
      const practiceActivities = (activitiesData || []).filter(a => a.type === 'boat_practice');
      const mappedDates = practiceActivities.map(a => ({
        date: formatDateWithDay(a.date),
        place: a.location,
        time: a.start_time
      }));
      setDbDates(mappedDates);

      // 初始日期設定
      if (mappedDates.length > 0) {
        setTargetDay(mappedDates[0].date.split('(')[0].replace(/\//g, '-'));
        setSelectedSeatingDate(mappedDates[0].date); // Initialize seating date
      } else {
        setTargetDay(new Date().toISOString().split('T')[0]);
      }

      // 關閉主 Loading
      setLoading(false);

      // Phase 2: 背景延遲載入
      setBackgroundLoading(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      const [attData, actRegsData] = await Promise.all([
        safeFetch(fetchAttendance(), []),
        safeFetch(fetchActivityRegistrations(), [])
      ]);

      setActivityRegistrations(actRegsData || []);

      // 單獨輕量請求 members (可能失敗所以包 try-catch)
      let membersData = null;
      try {
        const { data } = await import('../lib/supabase').then(m =>
          m.supabase.from('members').select('user_id, name, email, weight, position, skill_rating').order('name')
        );
        membersData = data;
        const allUsersData = (membersData || []).map(m => ({
          UserId: m.user_id,
          Name: m.name,
          Email: m.email,
          Weight: m.weight,
          Position: m.position,
          Skill_Rating: m.skill_rating,
          M_Points: m.total_points || 0
        }));
        setAllUsers(allUsersData);
      } catch (memErr) {
        console.warn("Members fetch fail", memErr);
      }

      setRawAttendanceHistory(attData || []);

      // Build email-to-name lookup from already-fetched membersData (no extra query needed)
      const emailToMemberName = {};
      (membersData || []).forEach(m => {
        if (m.email && m.name) emailToMemberName[m.email.toLowerCase()] = m.name;
      });

      // 構建報名名單 (需依賴 adminMembersList + members fallback)
      const newRegsMapped = (actRegsData || []).map(r => {
        const userInfo = adminMembersList.find(u => u.id === r.user_id);
        // If memberName is missing, try to resolve from members table by email
        const memberFallbackName = userInfo?.email ? emailToMemberName[userInfo.email.toLowerCase()] : null;
        const resolvedName = userInfo?.memberName || memberFallbackName || r.users?.name || r.name || 'Unknown';

        return {
          name: resolvedName,
          practicedates: r.activities?.date ? formatDateWithDay(r.activities.date) : '',
          activityId: r.activity_id
        };
      }).filter(r => r.practicedates);

      setRegistrations(newRegsMapped);

    } catch (error) {
      console.error("Critical Load Error", error);
    } finally {
      setLoading(false);
      setBackgroundLoading(false);
    }
  };

  const calculateStats = () => {
    if (!Array.isArray(rawAttendanceHistory)) return;

    const filteredRecords = rawAttendanceHistory.filter(record => {
      const recDate = new Date(record.Date);
      const recYear = recDate.getFullYear();
      const recMonth = recDate.getMonth() + 1;
      const recDateStr = record.Date.split('(')[0].replace(/\//g, '-');

      if (reportType === 'year') {
        return recYear === parseInt(targetYear);
      } else if (reportType === 'month') {
        return recYear === parseInt(targetYear) && recMonth === parseInt(targetMonth);
      } else if (reportType === 'day') {
        return recDateStr === targetDay;
      }
      return false;
    });

    const uniqueDates = new Set(filteredRecords.map(r => r.Date));
    const totalSessions = uniqueDates.size;
    setTotalSessionsInPeriod(totalSessions);

    const stats = {};
    filteredRecords.forEach(record => {
      const name = record.Name;
      stats[name] = (stats[name] || 0) + 1;
    });

    const result = Object.entries(stats)
      .map(([name, count]) => {
        const rate = totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0;
        return { name, count, rate };
      })
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });

    setLeaderboardData(result);
  };

  const formatDateWithDay = (dateString) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = new Date(dateString);
    const dayName = days[d.getDay()];
    return `${dateString.replace(/-/g, '/')}(${dayName})`;
  };

  // --- 操作邏輯 (New Activity System) ---
  const handleCreateActivity = async () => {
    // Validation
    if (!newActivity.name || !newActivity.date || !newActivity.type) {
      Swal.fire('欄位未填', '請填寫活動名稱、類型與日期', 'warning');
      return;
    }

    // 處理自訂地點
    const finalLocation = newActivity.location === 'Other'
      ? (newActivity.customLocation || '其他')
      : newActivity.location;

    // 處理「待定」時間 - 轉為 null 避免 DB 錯誤
    const finalStartTime = newActivity.start_time === 'Pending' ? null : newActivity.start_time;
    const finalEndTime = newActivity.end_time === 'Pending' ? null : newActivity.end_time;

    // Confirmation
    const result = await Swal.fire({
      title: '確定建立活動?',
      html: `
            <div class="text-left">
                <p><strong>名稱:</strong> ${newActivity.name}</p>
                <p><strong>類型:</strong> ${newActivity.type}</p>
                <p><strong>日期:</strong> ${newActivity.date}</p>
                <p><strong>地點:</strong> ${finalLocation}</p>
            </div>
        `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '建立',
      cancelButtonText: '取消'
    });

    if (result.isConfirmed) {
      console.time('ActivityCreation');
      setLoading(true);
      const activityToCreate = {
        ...newActivity,
        location: finalLocation,
        start_time: finalStartTime,
        end_time: finalEndTime
      };

      console.log('Sending create request...', activityToCreate);
      const res = await postData('addActivity', activityToCreate);
      console.log('Create response:', res);

      if (res.success) {
        // Optimistic Update: 直接將新活動加入現有列表，不重新 fetch
        const createdActivity = res.data;
        if (createdActivity) {
          setActivities(prev => [createdActivity, ...prev]);

          // Legacy Sync (if needed)
          if (createdActivity.type === 'boat_practice') {
            const mapLegacyDate = {
              date: formatDateWithDay(createdActivity.date),
              place: createdActivity.location,
              time: createdActivity.start_time
            };
            setDbDates(prev => [...prev, mapLegacyDate]);
          }
        } else {
          // Fallback if data is missing for some reason (shouldn't happen with new API)
          console.warn('No data returned from create, falling back to fetch');
          const updatedActivities = await fetchActivities();
          setActivities(updatedActivities || []);
        }

        setNewActivity(prev => ({ ...prev, name: '', date: '', deadline: '', customLocation: '' })); // Reset non-defaults
        console.timeEnd('ActivityCreation');
        setLoading(false);
        Swal.fire('成功', '活動已建立', 'success');
      } else {
        console.timeEnd('ActivityCreation');
        setLoading(false);
        Swal.fire('失敗', res.message || '建立失敗', 'error');
      }
    }
  };


  const handleDeleteActivity = async (id, name) => {
    const result = await Swal.fire({
      title: '刪除活動?',
      text: `確定要刪除 ${name} 嗎？這將會刪除所有相關報名紀錄。`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: '刪除',
      cancelButtonText: '取消'
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('deleteActivity', { id });
      if (res.success) {
        setActivities(prev => prev.filter(a => a.id !== id));
        Swal.fire('已刪除', '', 'success');
      } else {
        Swal.fire('刪除失敗', res.message, 'error');
      }
      setLoading(false);
    }
  };

  const handleClearPast = async () => {
    const result = await Swal.fire({
      title: '確定要清除過期資料嗎?',
      text: "這將會刪除今天以前的所有日期與報名紀錄",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: '確認清除',
      cancelButtonText: '取消'
    });
    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('clearPastData', {});

      const datesData = await fetchDates();
      const dateList = datesData.map(d => ({
        date: d.Confirmed_date || d.Confirmed_Date,
        place: d.Place || '',
        time: d.Meeting_Time || ''
      })).filter(d => d.date);
      setDbDates(dateList);

      setLoading(false);
      if (res.success) {
        Swal.fire('清除成功', '過期資料已移除', 'success');
      } else {
        Swal.fire('清除失敗', res.message, 'error');
      }
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content || !newAnnouncement.date) {
      Swal.fire('欄位未填', '請填寫標題、內容與日期', 'warning');
      return;
    }

    setLoading(true);
    const res = await postData('addAnnouncement', newAnnouncement);
    if (res.success) {
      const updated = await fetchAnnouncements();
      setAnnouncements(updated || []);
      setNewAnnouncement({
        title: '',
        content: '',
        date: new Date().toISOString().split('T')[0],
        category: '活動',
        pinned: false
      });
      Swal.fire('發布成功', '', 'success');
    } else {
      Swal.fire('發布失敗', res.message, 'error');
    }
    setLoading(false);
  };

  const handleDeleteAnnouncement = async (id) => {
    const result = await Swal.fire({
      title: '刪除公告?',
      text: '確定要刪除此公告嗎？',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: '刪除'
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('deleteAnnouncement', { id });
      if (res.success) {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        Swal.fire('已刪除', '', 'success');
      } else {
        Swal.fire('刪除失敗', res.message, 'error');
      }
      setLoading(false);
    }
  };

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement) return;

    setLoading(true);
    const res = await postData('updateAnnouncement', editingAnnouncement);
    if (res.success) {
      const updated = await fetchAnnouncements();
      setAnnouncements(updated || []);
      setEditingAnnouncement(null);
      Swal.fire('更新成功', '', 'success');
    } else {
      Swal.fire('更新失敗', res.message, 'error');
    }
    setLoading(false);
  };

  const handleDeleteDbDate = async (dateStr) => {
    const result = await Swal.fire({
      title: '刪除此日期?',
      text: `確定要取消 ${dateStr} 的練習嗎？`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: '刪除',
      cancelButtonText: '取消'
    });
    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('deleteDate', { Confirmed_date: dateStr });

      if (res.success) {
        setDbDates(prev => prev.filter(d => d.date !== dateStr));
        setLoading(false);
        Swal.fire('已刪除', '', 'success');
      } else {
        setLoading(false);
      }
    }
  };

  const handleGenerateSeating = async () => {
    if (backgroundLoading) {
      Swal.fire('資料同步中', '請稍候 2-3 秒等待隊員資料同步...', 'info');
      return;
    }

    // Build lookup maps from allUsers (members table data — now includes UserId)
    const usersByUserId = {};
    const usersByEmail = {};
    allUsers.forEach(u => {
      if (u.UserId) usersByUserId[u.UserId] = u;
      if (u.Email) usersByEmail[u.Email.toLowerCase()] = u;
    });

    const newCharts = {};
    let hasAnyRegistrations = false;

    dbDates.forEach(item => {
      // Find activity for this date
      const dateStr = item.date.split('(')[0].replace(/\//g, '-');
      const activity = activities.find(a => a.date === dateStr && a.type === 'boat_practice');
      if (!activity) return;

      // Get registrations for this activity directly from activityRegistrations (has user_id)
      const dateRegs = activityRegistrations.filter(r => r.activity_id === activity.id);
      if (dateRegs.length === 0) return;
      hasAnyRegistrations = true;

      // Match each registration to a member — primary: user_id, fallback: email
      const participants = [];
      dateRegs.forEach(r => {
        // Primary: match activity_registrations.user_id → members.user_id (direct, no RPC needed)
        let member = usersByUserId[r.user_id];

        // Fallback: for members with NULL user_id, try email via adminMembers
        if (!member && adminMembers.length > 0) {
          const adminUser = adminMembers.find(u => u.id === r.user_id);
          if (adminUser?.email) {
            member = usersByEmail[adminUser.email.toLowerCase()];
          }
        }

        if (member) {
          const attendanceCount = (rawAttendanceHistory || []).filter(rec => rec.Name === member.Name).length;
          participants.push({ ...member, attendanceCount });
        }
      });

      const seatingResult = generateSeating(participants);
      const { reserve: seatingReserve, ...boatPart } = seatingResult;
      let boatData = { ...boatPart, reserve: seatingReserve || [] };
      if (!boatData.drummer) boatData.drummer = null;
      newCharts[item.date] = boatData;

      // 🔥 Sync to DB Immediately
      saveSeatingArrangement(item.date, boatData).catch(err => console.error('Auto-save failed:', err));
    });

    if (!hasAnyRegistrations) {
      Swal.fire('還沒有隊友報名喔!', '目前沒有任何報名資料', 'info');
      return;
    }

    setSeatingCharts(newCharts);

    Swal.fire({
      icon: 'success',
      title: '槳位已生成',
      text: '座位表已自動同步至前台',
      timer: 1500,
      showConfirmButton: false
    });

    setTimeout(() => {
      const section = document.getElementById('seating-section');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSeatSelect = (cell) => {
    if (selectedSeatingCell) {
      // If clicking same cell, deselect
      if (selectedSeatingCell.side === cell.side && selectedSeatingCell.index === cell.index) {
        setSelectedSeatingCell(null);
        return;
      }
      // Swap
      handleSwapSeat(selectedSeatingDate, selectedSeatingCell, cell);
      setSelectedSeatingCell(null);
    } else {
      setSelectedSeatingCell(cell);
    }
  };

  const handleSwapSeat = (date, pos1, pos2) => {
    const newCharts = JSON.parse(JSON.stringify(seatingCharts));
    const boat = newCharts[date];
    if (!boat) return;

    const ensureArrayLength = (side, index) => {
      if (side === 'steer' || side === 'drummer') return;

      const targetArray = side === 'reserve' ? (boat.reserve || (boat.reserve = [])) : (boat[side] || (boat[side] = []));

      while (targetArray.length <= index) {
        targetArray.push(null);
      }
    };

    ensureArrayLength(pos1.side, pos1.index);
    ensureArrayLength(pos2.side, pos2.index);

    const getPerson = (pos) => {
      if (pos.side === 'steer') return boat.steer;
      if (pos.side === 'drummer') return boat.drummer;
      if (pos.side === 'reserve') return boat.reserve?.[pos.index];
      return boat[pos.side][pos.index];
    };

    const setPerson = (pos, person) => {
      if (pos.side === 'steer') {
        boat.steer = person || null;
      } else if (pos.side === 'drummer') {
        boat.drummer = person || null;
      } else if (pos.side === 'reserve') {
        if (!boat.reserve) boat.reserve = [];
        boat.reserve[pos.index] = person || null;
      } else {
        boat[pos.side][pos.index] = person || null;
      }
    };

    const person1 = getPerson(pos1);
    const person2 = getPerson(pos2);
    setPerson(pos1, person2);
    setPerson(pos2, person1);
    setSeatingCharts(newCharts);

    // 🔥 Sync to DB on Swap
    saveSeatingArrangement(date, newCharts[date]).catch(err => console.error('Swap save failed:', err));
  };

  // --- 點名邏輯 ---
  const openRollCall = (specificDate = null) => {
    if (backgroundLoading) {
      Swal.fire('資料同步中', '請稍候，正在下載最新報名名單...', 'info');
      return;
    }

    let target = specificDate;
    if (!target) {
      if (dbDates.length > 0) {
        target = dbDates[0].date;
      } else {
        Swal.fire('無日期', '目前沒有任何已開放的練習日期', 'warning');
        return;
      }
    }
    setRollCallDate(target);
    updateRollCallList(target);
    setShowAttendanceModal(true);
  };

  const updateRollCallList = (date) => {
    // 1. 取得報名者
    const signedUpUsers = registrations
      .filter(r => r.practicedates === date)
      .map(r => r.name);

    // 2. 取得已出席者 (包含手動新增的歷史紀錄)
    // 需將日期格式統一：date 是 "YYYY/MM/DD(Day)", history Date 是 "YYYY-MM-DD"
    const targetDateSimple = date.split('(')[0].replace(/\//g, '-');
    const attendedInHistory = rawAttendanceHistory
      .filter(r => {
        const rDate = r.Date.split('(')[0].replace(/\//g, '-');
        return rDate === targetDateSimple;
      })
      .map(r => r.Name);

    // 3. 合併並去重
    const combined = [...new Set([...signedUpUsers, ...attendedInHistory])];
    setAttendanceList(combined);
  };

  const toggleAttendance = (name) => {
    if (attendanceList.includes(name)) {
      setAttendanceList(attendanceList.filter(n => n !== name));
    } else {
      setAttendanceList([...attendanceList, name]);
    }
  };

  // ✨✨✨ 點名優化：樂觀更新 (Optimistic UI Update) ✨✨✨
  const updateLocalHistoryOptimistically = (dateStr, names) => {
    // 1. 標準化日期格式：將 "2026/01/07(Wed)" 轉為 "2026-01-07"
    // 這樣本地數據格式會跟資料庫讀回來的格式一致
    const cleanDate = dateStr.split('(')[0].replace(/\//g, '-');

    setRawAttendanceHistory(prev => {
      // 2. 先移除該日期原本的舊紀錄 (以免重複或沒更新到移除的人)
      const filtered = prev.filter(r => {
        const rDate = r.Date.split('(')[0].replace(/\//g, '-');
        return rDate !== cleanDate;
      });

      // 3. 塞入新的紀錄
      const newRecords = names.map(name => ({
        Date: cleanDate,
        Name: name
      }));

      // 4. 回傳合併後的數據 -> 這會直接觸發 useEffect 重新計算排行榜
      return [...filtered, ...newRecords];
    });
  };

  const submitAttendance = async () => {
    if (!rollCallDate) return;

    // 1. 啟動 Loading 遮罩
    setLoading(true);

    // 2. 呼叫後端儲存 (這個動作需要 1-2 秒，是唯一的等待時間)
    const result = await saveAttendance(rollCallDate, attendanceList);

    // 3. 請求完成，**立刻**關閉 Loading
    // 我們不需要等待 fetchAttendance (因為那個很慢)，這裡直接讓使用者覺得完成了
    setLoading(false);

    if (result.success) {
      setShowAttendanceModal(false);

      // 4. 顯示成功訊息 (設定 timer 自動關閉，且隱藏確認按鈕，讓流程更順)
      Swal.fire({
        icon: 'success',
        title: '點名完成!',
        text: `已儲存 ${rollCallDate} 的紀錄`,
        timer: 1500,
        showConfirmButton: false
      });

      // 5. 【關鍵】直接在本地端更新排行榜資料 (Optimistic Update)
      // 這樣使用者切換到「出席報表」時，數據已經是新的了，不用等網路下載
      updateLocalHistoryOptimistically(rollCallDate, attendanceList);

    } else {
      Swal.fire('失敗', '儲存點名失敗', 'error');
    }
  };



  // Pre-calculate locked users (historically confirmed)
  // Ensure rollCallDate and rawAttendanceHistory are valid to prevent crashes
  const safeRollCallDate = rollCallDate || '';
  const targetDateSimple = safeRollCallDate.split('(')[0].replace(/\//g, '-');

  const safeHistory = Array.isArray(rawAttendanceHistory) ? rawAttendanceHistory : [];
  const lockedUserNames = safeHistory
    .filter(h => h && h.Date === targetDateSimple)
    .map(h => h && h.Name);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* 頁面標題 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            📝 {lang === 'zh' ? '幹部專區' : 'Management Zone'}
          </h1>
          <p className="text-gray-500 mt-1">
            {lang === 'zh' ? '建立報名活動、建立公告、建立最新消息、生成槳位、點名以及出席統計' : 'Manage activities, seating charts, roll calls, and attendance stats'}
          </p>
        </div>

        {/* 📌 Tab Navigation (頁籤導航) */}
        {/* 📌 Tab Navigation (頁籤導航) */}
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-6">
          {/* Mobile View: Dropdown */}
          <div className="md:hidden">
            <label className="block text-sm font-bold text-gray-700 mb-1 px-1">{lang === 'zh' ? '選擇功能' : 'Select Function'}</label>
            <div className="relative">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full p-4  bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
              >
                {[
                  { id: 'dates', label: lang === 'zh' ? '活動管理' : 'Activities' },
                  { id: 'seating', label: lang === 'zh' ? '槳位生成' : 'Seating' },
                  { id: 'rollcall', label: lang === 'zh' ? '點名系統' : 'Roll Call' },
                  { id: 'announcements', label: lang === 'zh' ? '建立隊內公告' : 'Team Announcement' },
                  { id: 'news', label: lang === 'zh' ? '建立官網消息' : 'Official News' },
                  { id: 'report', label: lang === 'zh' ? '出席報表' : 'Reports' },
                  { id: 'redemption', label: lang === 'zh' ? '新增兌換項目' : 'Add Reward' },
                ].map(tab => (
                  <option key={tab.id} value={tab.id}>{tab.label}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                <ChevronDown size={20} />
              </div>
            </div>
          </div>

          {/* Desktop View: Buttons */}
          <div className="hidden md:flex flex-wrap md:flex-nowrap gap-2">
            {[
              { id: 'dates', icon: Calendar, label: lang === 'zh' ? '活動管理' : 'Activities' },
              { id: 'seating', icon: Zap, label: lang === 'zh' ? '槳位生成' : 'Seating' },
              { id: 'rollcall', icon: ListChecks, label: lang === 'zh' ? '點名系統' : 'Roll Call' },
              { id: 'announcements', icon: Megaphone, label: lang === 'zh' ? '建立隊內\n公告' : 'Create Team Announcement' },
              { id: 'news', icon: Newspaper, label: lang === 'zh' ? '建立官網\n最新消息' : 'Create Official News' },
              { id: 'report', icon: BarChart3, label: lang === 'zh' ? '出席報表' : 'Reports' },
              { id: 'redemption', icon: Gift, label: lang === 'zh' ? '新增兌換\n項目' : 'Add Reward' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all relative
                  ${activeTab === tab.id
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <tab.icon size={20} className="shrink-0" />
                <span className="text-sm md:text-base whitespace-pre-line text-left leading-tight">{tab.label}</span>
                {backgroundLoading && tab.id !== 'dates' && (
                  <span className="absolute top-1 right-1">
                    <Loader2 size={12} className="animate-spin text-sky-400" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">

          {/* ==================== (a) 活動管理 Tab (Activity Management) ==================== */}
          {activeTab === 'dates' && (
            <div className="space-y-6 animate-fade-in-down">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. 建立活動區塊 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Plus size={24} className="text-orange-500" /> {lang === 'zh' ? '建立新活動' : 'Create New Activity'}
                  </h3>
                  <div className="flex flex-col gap-4">
                    {/* 活動名稱 */}
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '活動名稱' : 'Activity Name'}</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-300 outline-none text-gray-900"
                        value={newActivity.name}
                        onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                        placeholder={lang === 'zh' ? '例如：平日夜練、端午競賽...' : 'e.g., Night Practice, Dragon Boat Race...'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '活動類別' : 'Category'}</label>
                      <select
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-300 outline-none text-gray-900"
                        value={newActivity.type}
                        onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                      >
                        <option value="boat_practice" className="text-gray-900 bg-white">{lang === 'zh' ? '船練 (Boat Practice)' : 'Boat Practice'}</option>
                        <option value="team_building" className="text-gray-900 bg-white">{lang === 'zh' ? 'Team Building' : 'Team Building'}</option>
                        <option value="race" className="text-gray-900 bg-white">{lang === 'zh' ? '龍舟比賽 (Dragon Boat Race)' : 'Dragon Boat Race'}</option>
                        <option value="internal_competition" className="text-gray-900 bg-white">{lang === 'zh' ? '內部競賽 (Internal Competition)' : 'Internal Competition'}</option>
                      </select>
                    </div>

                    {/* 日期與截止日 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '活動日期' : 'Date'}</label>
                        <input
                          type="text"
                          onFocus={(e) => e.target.type = 'date'}
                          onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                          className="w-full p-2 border rounded-lg text-gray-900 placeholder-gray-400"
                          value={newActivity.date}
                          onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                          placeholder={lang === 'zh' ? '年/月/日' : 'YYYY/MM/DD'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '報名截止日' : 'Deadline'}</label>
                        <input
                          type="text"
                          onFocus={(e) => e.target.type = 'date'}
                          onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                          className="w-full p-2 border rounded-lg text-gray-900 placeholder-gray-400"
                          value={newActivity.deadline}
                          onChange={(e) => setNewActivity({ ...newActivity, deadline: e.target.value })}
                          placeholder={lang === 'zh' ? '年/月/日' : 'YYYY/MM/DD'}
                        />
                      </div>
                    </div>

                    {/* 地點與時間 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '地點' : 'Location'}</label>
                        {/* 根據活動類別顯示不同選項 */}
                        {(newActivity.type === 'boat_practice' || newActivity.type === 'race') ? (
                          <>
                            <select
                              className="w-full p-2 border rounded-lg text-gray-900"
                              value={newActivity.location}
                              onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value, customLocation: '' })}
                            >
                              <option value="碧潭 Bitan" className="text-gray-900 bg-white">{lang === 'zh' ? '碧潭 Bitan' : 'Bitan'}</option>
                              <option value="百齡橋 Bailing Bridge" className="text-gray-900 bg-white">{lang === 'zh' ? '百齡橋 Bailing Bridge' : 'Bailing Bridge'}</option>
                              <option value="蘆洲微風運河 Luzhou" className="text-gray-900 bg-white">{lang === 'zh' ? '蘆洲微風運河 Luzhou' : 'Luzhou Breeze Canal'}</option>
                              <option value="大直龍舟碼頭 Dazhi" className="text-gray-900 bg-white">{lang === 'zh' ? '大直龍舟碼頭 Dazhi' : 'Dazhi Pier'}</option>
                              <option value="Other" className="text-gray-900 bg-white">{lang === 'zh' ? '其他 (自行輸入)' : 'Other (Type below)'}</option>
                            </select>
                            {newActivity.location === 'Other' && (
                              <input
                                type="text"
                                className="w-full p-2 border rounded-lg text-gray-900 mt-2"
                                value={newActivity.customLocation}
                                onChange={(e) => setNewActivity({ ...newActivity, customLocation: e.target.value })}
                                placeholder={lang === 'zh' ? '請輸入自訂地點...' : 'Enter custom location...'}
                              />
                            )}
                          </>
                        ) : (
                          <input
                            type="text"
                            className="w-full p-2 border rounded-lg text-gray-900"
                            value={newActivity.location}
                            onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                            placeholder={lang === 'zh' ? '輸入地點...' : 'Enter location...'}
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '時間 (起訖)' : 'Time (Start-End)'}</label>
                        <div className="flex items-center gap-1 h-[38px]">
                          <select
                            className="flex-1 min-w-0 p-2 border rounded-lg text-xs sm:text-sm text-gray-900"
                            value={newActivity.start_time}
                            onChange={(e) => setNewActivity({ ...newActivity, start_time: e.target.value })}
                          >
                            <option value="Pending" className="text-gray-900 bg-white">{lang === 'zh' ? '待定' : 'TBD'}</option>
                            {generateTimeOptions().map(t => <option key={t} value={t} className="text-gray-900 bg-white">{t}</option>)}
                          </select>
                          <span className="text-gray-500 flex-shrink-0">-</span>
                          <select
                            className="flex-1 min-w-0 p-2 border rounded-lg text-xs sm:text-sm text-gray-900"
                            value={newActivity.end_time}
                            onChange={(e) => setNewActivity({ ...newActivity, end_time: e.target.value })}
                          >
                            <option value="Pending" className="text-gray-900 bg-white">待定</option>
                            {generateTimeOptions().map(t => <option key={t} value={t} className="text-gray-900 bg-white">{t}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>


                    <button
                      onClick={handleCreateActivity}
                      className="w-full py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition font-bold mt-4 shadow-md flex items-center justify-center gap-2"
                    >
                      {lang === 'zh' ? '建立活動' : 'Create Activity'} <Save size={18} />
                    </button>
                  </div>
                </div>

                {/* 2. 已建立活動清單 (Restored) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                      {lang === 'zh' ? '已建立活動' : 'Activities'} ({activities.length})
                    </h3>
                    <select
                      value={listFilter}
                      onChange={(e) => { setListFilter(e.target.value); setListPage(1); }}
                      className="p-1 px-2 border rounded-lg text-xs text-gray-600 outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="all">All</option>
                      <option value="boat_practice">Boat</option>
                      <option value="race">Race</option>
                      <option value="team_building">Team</option>
                      <option value="internal_competition">Comp</option>
                    </select>
                  </div>

                  <div className="flex-1 bg-gray-50 rounded-lg p-2 space-y-2 overflow-y-auto max-h-[500px]">
                    {(() => {
                      const filteredList = activities.filter(a => listFilter === 'all' || a.type === listFilter);
                      const totalListPages = Math.ceil(filteredList.length / 5);
                      const currentListItems = filteredList.slice((listPage - 1) * 5, listPage * 5);

                      if (filteredList.length === 0) {
                        return <div className="text-center py-10 text-gray-400">{lang === 'zh' ? '尚無活動' : 'No activities'}</div>;
                      }

                      return (
                        <>
                          {currentListItems.map((activity) => (
                            <div key={activity.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition group relative">
                              <div className="flex justify-between items-start">
                                <div className="w-full">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-bold
                                        ${activity.type === 'boat_practice' ? 'bg-blue-500' :
                                        activity.type === 'race' ? 'bg-red-500' :
                                          activity.type === 'team_building' ? 'bg-green-500' : 'bg-purple-500'}
                                    `}>
                                      {activity.type === 'boat_practice' ? (lang === 'zh' ? '船練' : 'Boat') :
                                        activity.type === 'race' ? (lang === 'zh' ? '比賽' : 'Race') :
                                          activity.type === 'team_building' ? (lang === 'zh' ? '團建' : 'Team') : (lang === 'zh' ? '內賽' : 'Comp')}
                                    </span>
                                    <span className="font-bold text-gray-800 text-sm">{activity.name}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                                    <span className="flex items-center gap-1"><Calendar size={10} /> {activity.date}</span>
                                    <span className="flex items-center gap-1"><MapPin size={10} /> {activity.location}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteActivity(activity.id, activity.name)}
                                  className="text-gray-300 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                                  title={lang === 'zh' ? '刪除' : 'Delete'}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Mini Pagination */}
                          {totalListPages > 1 && (
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200">
                              <button
                                onClick={() => setListPage(p => Math.max(1, p - 1))}
                                disabled={listPage === 1}
                                className="p-1.5 px-3 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              >
                                &lt;
                              </button>
                              <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{listPage} / {totalListPages}</span>
                              <button
                                onClick={() => setListPage(p => Math.min(totalListPages, p + 1))}
                                disabled={listPage === totalListPages}
                                className="p-1.5 px-3 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              >
                                &gt;
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}

                  </div>
                </div>

              </div>

              {/* 3. 活動管理與統計 (合併版) - Moves to full width below */}
              {/* 2. 活動管理與統計 (合併版) */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                    <ListChecks size={24} className="text-blue-500" /> {lang === 'zh' ? '活動管理與統計' : 'Activity Management & Stats'}
                  </h3>
                  <select
                    value={statsFilter}
                    onChange={(e) => { setStatsFilter(e.target.value); setStatsPage(1); }}
                    className="p-2 border rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-300 outline-none"
                  >
                    <option value="all" className="text-gray-900 bg-white">{lang === 'zh' ? '全部類別' : 'All Categories'}</option>
                    <option value="boat_practice" className="text-gray-900 bg-white">{lang === 'zh' ? '船練' : 'Boat Practice'}</option>
                    <option value="team_building" className="text-gray-900 bg-white">{lang === 'zh' ? '團建' : 'Team Building'}</option>
                    <option value="race" className="text-gray-900 bg-white">{lang === 'zh' ? '龍舟比賽' : 'Race'}</option>
                    <option value="internal_competition" className="text-gray-900 bg-white">{lang === 'zh' ? '內部競賽' : 'Internal Comp'}</option>
                  </select>
                </div>

                <div className="overflow-x-auto min-h-[300px] flex flex-col gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-2 md:hidden">👈 左右滑動查看更多</p>
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 text-xs sm:text-sm">
                          <th className="p-3 rounded-l-lg whitespace-nowrap">{lang === 'zh' ? '活動名稱' : 'Activity'}</th>
                          <th className="p-3 whitespace-nowrap">{lang === 'zh' ? '日期' : 'Date'}</th>
                          <th className="p-3 whitespace-nowrap">{lang === 'zh' ? '類別' : 'Type'}</th>
                          <th className="p-3 whitespace-nowrap">{lang === 'zh' ? '已報名人數' : 'Registered'}</th>
                          <th className="p-3 rounded-r-lg whitespace-nowrap text-right">{lang === 'zh' ? '操作' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {(() => {
                          const filtered = activities.filter(a => statsFilter === 'all' || a.type === statsFilter);
                          const totalPages = Math.ceil(filtered.length / 5);
                          const paginated = filtered.slice((statsPage - 1) * 5, statsPage * 5);

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan="5" className="p-8 text-center text-gray-400">{lang === 'zh' ? '尚無符合條件的活動' : 'No activities found'}</td>
                              </tr>
                            );
                          }

                          return paginated.map(activity => {
                            const count = activityRegistrations.filter(r => r.activity_id === activity.id).length;
                            return (
                              <tr key={activity.id} className="border-b border-gray-100 hover:bg-blue-50/30 transition group">
                                <td className="p-3 font-bold text-gray-800">
                                  {activity.name}
                                  <div className="text-xs text-gray-400 font-normal mt-0.5 flex items-center gap-1">
                                    <MapPin size={10} /> {activity.location}
                                  </div>
                                </td>
                                <td className="p-3 text-gray-600 font-mono">{activity.date}</td>
                                <td className="p-3">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-bold
                                      ${activity.type === 'boat_practice' ? 'bg-blue-500' :
                                      activity.type === 'race' ? 'bg-red-500' :
                                        activity.type === 'team_building' ? 'bg-green-500' : 'bg-purple-500'}
                                    `}>
                                    {activity.type === 'boat_practice' ? (lang === 'zh' ? '船練' : 'Boat Practice') :
                                      activity.type === 'race' ? (lang === 'zh' ? '比賽' : 'Race') :
                                        activity.type === 'team_building' ? (lang === 'zh' ? '團建' : 'Team Building') : (lang === 'zh' ? '內賽' : 'Internal Comp')}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <button
                                    className={`font-bold hover:underline flex items-center gap-1 transition
                                        ${count > 0 ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400'}
                                      `}
                                    onClick={() => {
                                      const registrationList = activityRegistrations
                                        .filter(r => r.activity_id === activity.id)
                                        .map((r, idx) => {
                                          const userInfo = adminMembers.find(u => u.id === r.user_id);
                                          // Fallback: look up name from members table (allUsers) by email
                                          const memberFallback = userInfo?.email ? allUsers.find(u => u.Email && u.Email.toLowerCase() === userInfo.email.toLowerCase()) : null;
                                          return {
                                            regNo: `REG-${activity.id.toString().slice(0, 4).toUpperCase()}-${String(idx + 1).padStart(3, '0')}`,
                                            name: userInfo?.memberName || memberFallback?.Name || userInfo?.email || r.users?.name || 'Unknown',
                                            email: userInfo?.email || r.users?.email || '-'
                                          };
                                        });

                                      Swal.fire({
                                        title: `<strong>${activity.name}</strong>`,
                                        html: `
                                            <div class="text-left">
                                              <p class="mb-2 text-sm text-gray-500">
                                                📅 ${activity.date} | 📍 ${activity.location}
                                              </p>
                                              <div class="bg-gray-50 rounded-lg p-2 max-h-[300px] overflow-y-auto border border-gray-200">
                                                ${registrationList.length > 0 ? `
                                                  <table class="w-full text-sm">
                                                    <thead class="bg-gray-100 text-gray-600 sticky top-0">
                                                      <tr>
                                                        <th class="p-2 text-left">#</th>
                                                        <th class="p-2 text-left">姓名</th>
                                                        <th class="p-2 text-left">Email</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      ${registrationList.map((r, i) => `
                                                        <tr class="border-b last:border-0 hover:bg-white">
                                                          <td class="p-2 font-mono text-xs text-gray-400">${i + 1}</td>
                                                          <td class="p-2 font-bold text-gray-800">${r.name}</td>
                                                          <td class="p-2 text-gray-500 text-xs">${r.email}</td>
                                                        </tr>
                                                      `).join('')}
                                                    </tbody>
                                                  </table>
                                                ` : '<p class="text-center text-gray-400 py-4">目前無人報名</p>'}
                                              </div>
                                              <div class="mt-4 text-right text-xs text-gray-400">
                                                共 ${registrationList.length} 人報名
                                              </div>
                                            </div>
                                          `,
                                        width: '600px',
                                        grow: 'row', // Allow duplicate content to show if needed, but fixed width is key
                                        showCloseButton: true,
                                        showConfirmButton: false
                                      });
                                    }}
                                  >
                                    {count} {lang === 'zh' ? '人' : ''}
                                    <span className="text-xs font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                                      ({lang === 'zh' ? '查看名單' : 'View List'})
                                    </span>
                                  </button>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => handleDeleteActivity(activity.id, activity.name)}
                                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition"
                                    title={lang === 'zh' ? '刪除活動' : 'Delete Activity'}
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>

                    {/* 分頁按鈕 */}
                    {(() => {
                      const filtered = activities.filter(a => statsFilter === 'all' || a.type === statsFilter);
                      const totalPages = Math.ceil(filtered.length / 5);

                      if (totalPages <= 1) return null;

                      return (
                        <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                          <button
                            onClick={() => setStatsPage(p => Math.max(1, p - 1))}
                            disabled={statsPage === 1}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                          >
                            ← {lang === 'zh' ? '上一頁' : 'Prev'}
                          </button>
                          <span className="text-xs font-mono text-gray-400">Page {statsPage} / {totalPages}</span>
                          <button
                            onClick={() => setStatsPage(p => Math.min(totalPages, p + 1))}
                            disabled={statsPage === totalPages}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                          >
                            {lang === 'zh' ? '下一頁' : 'Next'} →
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>


          )}

          {/* ==================== (c) 公告管理 Tab (Announcements) ==================== */}
          {activeTab === 'announcements' && (
            <div className="space-y-6 animate-fade-in-down">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. 建立公告 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                  <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Megaphone size={24} className="text-red-500" /> {lang === 'zh' ? '發布新公告' : 'Post New Announcement'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '公告標題' : 'Title'}</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-200 outline-none text-gray-900"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                        placeholder={lang === 'zh' ? '輸入標題...' : 'Enter title...'}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '日期' : 'Date'}</label>
                        <input
                          type="date"
                          className="w-full p-2 border rounded-lg text-gray-900"
                          value={newAnnouncement.date}
                          onChange={(e) => setNewAnnouncement({ ...newAnnouncement, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '分類' : 'Category'}</label>
                        <select
                          className="w-full p-2 border rounded-lg text-gray-900"
                          value={newAnnouncement.category}
                          onChange={(e) => setNewAnnouncement({ ...newAnnouncement, category: e.target.value })}
                        >
                          <option value="活動">{lang === 'zh' ? '活動' : 'Activity'}</option>
                          <option value="比賽">{lang === 'zh' ? '比賽' : 'Race'}</option>
                          <option value="裝勤">{lang === 'zh' ? '裝勤' : 'Equipment'}</option>
                          <option value="榮譽">{lang === 'zh' ? '榮譽' : 'Honor'}</option>
                          <option value="其他">{lang === 'zh' ? '其他' : 'Other'}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '內容' : 'Content'}</label>
                      <textarea
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-200 outline-none h-32 text-gray-900"
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                        placeholder={lang === 'zh' ? '輸入公告詳細內容...' : 'Enter details...'}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="pinned"
                        checked={newAnnouncement.pinned}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, pinned: e.target.checked })}
                        className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                      />
                      <label htmlFor="pinned" className="text-sm font-medium text-gray-700 select-none cursor-pointer">{lang === 'zh' ? '置頂此公告' : 'Pin Announcement'}</label>
                    </div>
                    <button
                      onClick={handleCreateAnnouncement}
                      className="w-full py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold shadow-md flex items-center justify-center gap-2"
                    >
                      {lang === 'zh' ? '發布公告' : 'Post Announcement'} <Save size={18} />
                    </button>
                  </div>
                </div>

                {/* 2. 公告列表 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <ListChecks size={24} className="text-gray-500" /> {lang === 'zh' ? '已發布公告' : 'Posted Announcements'} ({announcements.length})
                  </h3>
                  <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3 bg-gray-50 p-3 rounded-lg">
                    {announcements.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">{lang === 'zh' ? '尚無公告' : 'No announcements'}</div>
                    ) : (
                      announcements.map((item) => (
                        <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-red-200 transition">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {item.pinned && <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded font-bold">{lang === 'zh' ? '置頂' : 'Pinned'}</span>}
                                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-bold">{item.category}</span>
                                <span className="text-xs text-gray-400">{item.date}</span>
                              </div>
                              <h4 className="font-bold text-gray-800">{item.title}</h4>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.content}</p>
                            </div>
                            <button
                              onClick={() => handleEditAnnouncement(item)}
                              className="text-gray-300 hover:text-blue-500 p-1 mr-1"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteAnnouncement(item.id)}
                              className="text-gray-300 hover:text-red-500 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div >
          )}

          {/* ==================== (b) 槳位生成 Tab ==================== */}
          {
            activeTab === 'news' && (
              <NewsManager />
            )
          }

          {/* ==================== (d) 兌換管理 Tab ==================== */}
          {
            activeTab === 'redemption' && (
              <div className="space-y-6 animate-fade-in-down">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Gift className="text-pink-500" /> {editingRewardId ? (lang === 'zh' ? '編輯兌換項目' : 'Edit Redemption Item') : (lang === 'zh' ? '新增兌換項目' : 'Add Redemption Item')}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 左側：表單 */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '項目名稱' : 'Item Name'}</label>
                        <input
                          type="text"
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-pink-200 outline-none text-gray-900"
                          value={newReward.name}
                          onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                          placeholder={lang === 'zh' ? '例如：RUMA 隊服, 1對1教練課...' : 'e.g., Team Jersey, Private Coaching...'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '所需 M 點' : 'M Points Cost'}</label>
                        <input
                          type="number"
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-pink-200 outline-none text-gray-900"
                          value={newReward.points_cost}
                          onChange={(e) => setNewReward({ ...newReward, points_cost: e.target.value })}
                          placeholder="100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '庫存數量' : 'Stock Quantity'}</label>
                        <input
                          type="number"
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-pink-200 outline-none text-gray-900"
                          value={newReward.stock}
                          onChange={(e) => setNewReward({ ...newReward, stock: e.target.value })}
                          placeholder="e.g. 10"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '項目描述 (選填)' : 'Description (Optional)'}</label>
                        <textarea
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-pink-200 outline-none h-24 text-gray-900"
                          value={newReward.description}
                          onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                          placeholder={lang === 'zh' ? '輸入詳細說明...' : 'Enter details...'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '上傳圖片 (最大 1MB)' : 'Upload Image (Max 1MB)'}</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition relative">
                          <input
                            id="reward-image-input"
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setNewReward({ ...newReward, imageFile: file });
                              }
                            }}
                          />
                          <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                            <div className="bg-pink-100 p-3 rounded-full text-pink-500">
                              <Gift size={24} />
                            </div>
                            <p className="text-sm text-gray-500 font-medium">
                              {newReward.imageFile ? newReward.imageFile.name : (lang === 'zh' ? '點擊或拖曳圖片至此' : 'Click or Drag image here')}
                            </p>
                            <p className="text-xs text-gray-400">Supported: JPG, PNG</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 右側：預覽 */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
                      <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">{lang === 'zh' ? '預覽效果' : 'Preview'}</h4>

                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full max-w-xs">
                        <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden flex items-center justify-center relative">
                          {newReward.imageFile || newReward.image_url ? (
                            <>
                              {/* Background blurred image */}
                              <div className="absolute inset-0 w-full h-full">
                                <img
                                  src={newReward.imageFile ? URL.createObjectURL(newReward.imageFile) : newReward.image_url}
                                  className="w-full h-full object-cover blur-md opacity-40 scale-110"
                                  alt=""
                                />
                              </div>
                              {/* Main image */}
                              <img
                                src={newReward.imageFile ? URL.createObjectURL(newReward.imageFile) : newReward.image_url}
                                alt="Preview"
                                className="w-full h-full object-contain relative z-10"
                              />
                            </>
                          ) : (
                            <Gift className="text-gray-300 relative z-10" size={48} />
                          )}
                          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full z-20">
                            {newReward.points_cost || 0} Points
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg mb-1">{newReward.name || (lang === 'zh' ? '項目名稱' : 'Item Name')}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2">{newReward.description || (lang === 'zh' ? '項目描述...' : 'Description...')}</p>
                        <button className="w-full mt-3 py-2 bg-sky-600 text-white rounded-lg text-sm font-bold opacity-50 cursor-not-allowed">
                          {lang === 'zh' ? '兌換' : 'Redeem'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t pt-6 flex justify-end">
                    <button
                      onClick={handleCreateReward}
                      className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition font-bold flex items-center gap-2"
                    >
                      <Gift size={20} /> {lang === 'zh' ? '確認新增項目' : 'Add Reward Item'}
                    </button>
                  </div>
                </div>

                {/* 兌換項目列表 (Moved outside the form container but inside the redemption tab) */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <ListChecks className="text-sky-500" /> {lang === 'zh' ? '已建立的兌換項目' : 'Created Redemption Items'} ({rewards.length})
                  </h3>

                  {rewards.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      {lang === 'zh' ? '尚未建立任何兌換項目' : 'No redemption items created yet'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rewards.map((reward) => (
                        <div key={reward.id} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden flex flex-col h-full group hover:shadow-lg transition-shadow duration-300 relative">
                          {/* Admin Actions */}
                          <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-lg backdrop-blur-sm shadow-sm">
                            <button
                              onClick={() => handleEditReward(reward)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition"
                              title={lang === 'zh' ? '編輯' : 'Edit'}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteReward(reward.id, reward.name)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition"
                              title={lang === 'zh' ? '刪除' : 'Delete'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="h-48 bg-gray-50 relative overflow-hidden flex items-center justify-center">
                            {reward.image_url ? (
                              <>
                                {/* Background blurred image */}
                                <div className="absolute inset-0 w-full h-full">
                                  <img
                                    src={reward.image_url}
                                    className="w-full h-full object-cover blur-md opacity-40"
                                    alt=""
                                  />
                                </div>
                                <img
                                  src={reward.image_url}
                                  alt={reward.name}
                                  className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105 relative z-10"
                                />
                              </>
                            ) : (
                              <Gift size={48} className="text-gray-300" />
                            )}
                          </div>

                          <div className="p-4 flex flex-col flex-grow">
                            <h4 className="font-bold text-lg text-gray-800 mb-1">{reward.name}</h4>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-3 min-h-[2.5rem]">{reward.description || (lang === 'zh' ? '無描述' : 'No description')}</p>

                            <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
                              <span className="text-sky-600 font-bold font-outfit text-xl">{reward.points_cost} <span className="text-sm text-gray-400 font-normal">{lang === 'zh' ? 'M點' : 'M Pts'}</span></span>
                              <span className={`font-bold text-sm px-2 py-1 rounded-full ${reward.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {lang === 'zh' ? `庫存: ${reward.stock}` : `Stock: ${reward.stock}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Redemption Records Section */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mt-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <ClipboardList className="text-purple-500" /> {lang === 'zh' ? '兌換紀錄' : 'Redemption Records'}
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-3 px-4 font-bold text-gray-600">{lang === 'zh' ? '兌換時間' : 'Date'}</th>
                          <th className="py-3 px-4 font-bold text-gray-600">{lang === 'zh' ? '隊員' : 'Member'}</th>
                          <th className="py-3 px-4 font-bold text-gray-600">{lang === 'zh' ? '兌換項目' : 'Item'}</th>
                          <th className="py-3 px-4 font-bold text-gray-600">{lang === 'zh' ? '兌換數量' : 'Quantity'}</th>
                          <th className="py-3 px-4 font-bold text-gray-600">{lang === 'zh' ? '交付人' : 'Delivered By'}</th>
                          <th className="py-3 px-4 font-bold text-gray-600">{lang === 'zh' ? '狀態' : 'Status'}</th>
                          <th className="py-3 px-4 font-bold text-gray-600 text-right">{lang === 'zh' ? '操作' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingRecords ? (
                          <tr><td colSpan="7" className="text-center py-8 text-gray-400"><Loader2 className="animate-spin inline mr-2" /> Loading...</td></tr>
                        ) : redemptionRecords.length === 0 ? (
                          <tr><td colSpan="7" className="text-center py-8 text-gray-400">{lang === 'zh' ? '尚無兌換紀錄' : 'No records found'}</td></tr>
                        ) : (
                          redemptionRecords
                            .slice((listPage - 1) * 5, listPage * 5)
                            .map(record => (
                              <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                <td className="py-3 px-4 text-sm text-gray-500">{new Date(record.redeemed_at).toLocaleDateString()} {new Date(record.redeemed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="py-3 px-4 font-bold text-gray-700">{record.user_name}</td>
                                <td className="py-3 px-4 text-gray-800">{record.product_name}</td>
                                <td className="py-3 px-4 text-gray-600 font-medium">1</td>
                                <td className="py-3 px-4 text-sm text-gray-500">{record.delivered_by || '-'}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${record.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {record.status === 'delivered' ? (lang === 'zh' ? '已交付' : 'Delivered') : (lang === 'zh' ? '待交付' : 'Pending')}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {record.status !== 'delivered' && (
                                    <button
                                      onClick={() => handleUpdateRedemptionStatus(record.id, 'delivered')}
                                      className="bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-green-200"
                                    >
                                      {lang === 'zh' ? '確認已交付' : 'Confirm Delivered'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {redemptionRecords.length > 5 && (
                      <div className="flex justify-center items-center mt-6 gap-4">
                        <button
                          onClick={() => setListPage(p => Math.max(1, p - 1))}
                          disabled={listPage === 1}
                          className="p-2 border rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          <ChevronLeft size={20} className="text-gray-600" />
                        </button>
                        <span className="text-gray-600 font-medium">
                          {lang === 'zh' ? `第 ${listPage} 頁` : `Page ${listPage}`} / {Math.ceil(redemptionRecords.length / 5)}
                        </span>
                        <button
                          onClick={() => setListPage(p => Math.min(Math.ceil(redemptionRecords.length / 5), p + 1))}
                          disabled={listPage >= Math.ceil(redemptionRecords.length / 5)}
                          className="p-2 border rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          <ChevronRight size={20} className="text-gray-600" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          }
          {
            activeTab === 'seating' && (
              <div id="seating-section" className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-orange-500 animate-fade-in-down">
                {/* 顯示背景同步提示 */}
                {backgroundLoading && (
                  <div className="mb-4 bg-blue-50 text-blue-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-blue-100">
                    <Loader2 className="animate-spin" size={16} /> 正在同步最新隊員資料與報名紀錄，請稍候...
                  </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap"><Zap className="text-orange-500" /> {lang === 'zh' ? '槳位生成中心' : 'Seating Generation'}</h2>
                  <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
                    {/* Row 1: Date Selector (Styled) */}
                    <div className="flex flex-row items-center gap-2 w-full md:w-auto">
                      <label className="text-gray-600 font-bold text-sm shrink-0">{lang === 'zh' ? '訓練日期' : 'Training Date'}:</label>
                      <div className="relative flex-1 md:flex-none">
                        <select
                          value={selectedSeatingDate}
                          onChange={(e) => setSelectedSeatingDate(e.target.value)}
                          className="w-full md:w-auto appearance-none pl-4 pr-10 py-2 bg-white border-2 border-gray-200 rounded-full text-base md:text-lg font-bold text-gray-600 shadow-sm focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100 transition cursor-pointer hover:border-gray-300 md:min-w-[200px]"
                        >
                          {dbDates.length === 0 && <option value="" className="text-gray-900 bg-white">{lang === 'zh' ? '無活動' : 'No Activities'}</option>}
                          {dbDates.map(d => (
                            <option key={d.date} value={d.date} className="text-gray-900 bg-white">{d.date}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown size={20} strokeWidth={3} />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Buttons */}
                    <div className="flex flex-row gap-3 w-full md:w-auto">
                      <button onClick={handleClearPast} className="flex-1 md:flex-none px-4 md:px-6 py-2 border-2 border-red-100 text-red-500 rounded-full hover:bg-red-50 font-bold transition whitespace-nowrap text-sm md:text-base">{lang === 'zh' ? '清除過期資料' : 'Clear Past Data'}</button>
                      <button onClick={handleGenerateSeating} className="flex-1 md:flex-none px-6 md:px-8 py-2 md:py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition font-bold flex items-center justify-center gap-2 whitespace-nowrap text-sm md:text-base">
                        <Zap size={18} fill="currentColor" /> {lang === 'zh' ? '生成槳位' : 'Generate Seating'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-12">
                  {/* Show only selected date or empty state */}
                  {!selectedSeatingDate || !seatingCharts[selectedSeatingDate] ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <p className="text-gray-400">
                        {selectedSeatingDate
                          ? (lang === 'zh' ? '此日期尚未生成槳位，請點擊「生成槳位」按鈕。' : 'No seating chart for this date. Click "Generate Seating".')
                          : (lang === 'zh' ? '請選擇一個日期...' : 'Please select a date...')}
                      </p>
                    </div>
                  ) : (
                    (() => {
                      const date = selectedSeatingDate;
                      const boatData = seatingCharts[date];
                      const targetDateInfo = dbDates.find(d => d.date === date);
                      const placeInfo = targetDateInfo ? targetDateInfo.place : '';
                      const timeInfo = targetDateInfo ? targetDateInfo.time : '';

                      return (
                        <div key={date} className="flex flex-col xl:flex-row items-start justify-center gap-6 w-full max-w-7xl mx-auto px-1 md:px-4">
                          {/* Boat Section */}
                          <div className="flex-1 w-full flex justify-center">
                            <SeatVisualizer
                              boatData={boatData}
                              date={date}
                              place={placeInfo}
                              time={timeInfo}
                              isEditable={true}
                              showStats={true}
                              selectedSeat={selectedSeatingCell}
                              onSelect={handleSeatSelect}
                              onSwap={(pos1, pos2) => handleSwapSeat(date, pos1, pos2)}
                            />
                          </div>

                          {/* Reserve List Section */}
                          {boatData.reserve && boatData.reserve.length > 0 && (
                            <div className="w-full xl:w-80 flex-shrink-0 animate-fade-in-right mt-6 xl:mt-0">
                              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden sticky top-24">
                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200 flex justify-between items-center">
                                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                    <ClipboardList className="text-gray-500" size={20} />
                                    {lang === 'zh' ? '候補練習名單' : 'Reserve List'}
                                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                      {boatData.reserve.length}
                                    </span>
                                  </h3>
                                </div>

                                <div className="p-2 max-h-[600px] overflow-y-auto space-y-2 relative scrollbar-thin scrollbar-thumb-gray-200">
                                  {/* Hint */}
                                  <div className="text-xs text-gray-400 text-center mb-2 px-4 py-1 bg-yellow-50 text-yellow-600 rounded-lg mx-2 border border-yellow-100">
                                    {lang === 'zh' ? '💡 點擊名單與座位可互相交換' : '💡 Click to swap with boat seat'}
                                  </div>

                                  {boatData.reserve.map((user, idx) => {
                                    const isSelected = selectedSeatingCell?.side === 'reserve' && selectedSeatingCell?.index === idx;
                                    return (
                                      <div
                                        key={`reserve-${idx}`}
                                        onClick={() => handleSeatSelect({ side: 'reserve', index: idx })}
                                        className={`
                                            flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                                            ${isSelected
                                            ? 'border-orange-500 bg-orange-50 shadow-md scale-[1.02] z-10'
                                            : 'border-gray-100 hover:border-sky-300 hover:bg-sky-50'
                                          }
                                        `}
                                      >
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs shadow-inner">
                                          Wait
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-bold text-gray-800 truncate">{user.Name}</div>
                                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                            <span title="Attendance" className="flex items-center gap-0.5">📅 {user.attendanceCount || 0}</span>
                                            <span title="Skill" className="flex items-center gap-0.5">💪 {user.skill || user.Skill_Rating || 0}</span>
                                            <span title="M-Points" className="flex items-center gap-0.5">🏆 {user.mPoints || 0}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            )
          }


          {/* ==================== (c) 點名系統 Tab (Combined) ==================== */}
          {
            activeTab === 'rollcall' && (
              <div className="space-y-8 animate-fade-in-down">
                {backgroundLoading && (
                  <div className="mb-4 bg-blue-50 text-blue-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-blue-100">
                    <Loader2 className="animate-spin" size={16} /> 正在同步報名名單，請稍候...
                  </div>
                )}

                {/* --- Block 1: 船練點名 (Boat Practice Roll Call) --- */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                      <ClipboardList className="text-green-600" /> {lang === 'zh' ? '船練點名' : 'Boat Practice Roll Call'}
                    </h3>
                  </div>

                  {dbDates.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
                      {lang === 'zh' ? '目前沒有任何練習場次，請先至「日期管理」新增。' : 'No practice sessions available. Add one in "Activities".'}
                    </div>
                  ) : (
                    (() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      // Show ALL dates (past + future) sorted by most recent first
                      // This allows retroactive (補) roll call for past sessions
                      const validRollCallDates = [...dbDates].sort((a, b) => {
                        const da = new Date(a.date.split('(')[0].replace(/\//g, '-'));
                        const db2 = new Date(b.date.split('(')[0].replace(/\//g, '-'));
                        return db2 - da;
                      });

                      const totalPages = Math.ceil(validRollCallDates.length / rollCallItemsPerPage);
                      const startIndex = (rollCallPage - 1) * rollCallItemsPerPage;
                      const paginatedDates = validRollCallDates.slice(startIndex, startIndex + rollCallItemsPerPage);

                      if (validRollCallDates.length === 0) {
                        return (
                          <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
                            {lang === 'zh' ? '目前沒有任何練習場次。' : 'No practice sessions available.'}
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginatedDates.map((item) => {
                              // Detect if this date has already been rolled call
                              const targetDateSimple = item.date.split('(')[0].replace(/\//g, '-');
                              const isRolledCall = rawAttendanceHistory.some(r => {
                                const rDate = r.Date.split('(')[0].replace(/\//g, '-');
                                return rDate === targetDateSimple;
                              });

                              // Detect if the activity date is in the past
                              const [year, month, day] = targetDateSimple.split('-');
                              const itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                              itemDate.setHours(0, 0, 0, 0);
                              const isPast = itemDate < today;
                              const isToday = itemDate.getTime() === today.getTime();

                              const handleClick = async () => {
                                if (isRolledCall) {
                                  const confirm = await Swal.fire({
                                    title: lang === 'zh' ? '此場次已完成點名' : 'Roll Call Already Done',
                                    text: lang === 'zh' ? '確定要補充/重新點名嗎？（舊紀錄將被更新）' : 'Re-doing roll call will update the existing records.',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#16a34a',
                                    confirmButtonText: lang === 'zh' ? '確定補點名' : 'Proceed',
                                    cancelButtonText: lang === 'zh' ? '取消' : 'Cancel'
                                  });
                                  if (!confirm.isConfirmed) return;
                                }
                                openRollCall(item.date);
                              };

                              return (
                                <div key={item.date}
                                  onClick={handleClick}
                                  className={`group cursor-pointer bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative overflow-hidden
                                    ${isRolledCall
                                      ? 'border-green-400 bg-green-50 hover:border-green-500'
                                      : 'border-gray-200 hover:border-green-400'
                                    }`}>

                                  {/* Background icon */}
                                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
                                    <ClipboardList size={48} className={isRolledCall ? 'text-green-600' : 'text-green-500'} />
                                  </div>

                                  {/* Date + status badges row */}
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 text-green-700 font-bold text-lg">
                                      <Calendar size={20} /> {item.date.split('(')[0]}
                                    </div>
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {isRolledCall && (
                                        <span className="flex items-center gap-1 text-xs bg-green-600 text-white font-bold px-2 py-0.5 rounded-full">
                                          ✓ {lang === 'zh' ? '已點名' : 'Done'}
                                        </span>
                                      )}
                                      {isPast && !isToday && (
                                        <span className="text-xs bg-gray-200 text-gray-600 font-medium px-2 py-0.5 rounded-full">
                                          {lang === 'zh' ? '已結束' : 'Past'}
                                        </span>
                                      )}
                                      {isToday && (
                                        <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                                          {lang === 'zh' ? '今天' : 'Today'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-1 text-sm text-gray-600">
                                    <span className="flex items-center gap-1"><Clock size={14} /> {item.time}</span>
                                    <span className="flex items-center gap-1"><MapPin size={14} /> {item.place.split(' ')[0]}</span>
                                  </div>

                                  <button className={`mt-2 w-full py-2 font-bold rounded-lg transition
                                    ${isRolledCall
                                      ? 'bg-green-100 text-green-700 group-hover:bg-green-600 group-hover:text-white'
                                      : 'bg-green-50 text-green-700 group-hover:bg-green-600 group-hover:text-white'
                                    }`}>
                                    {isRolledCall
                                      ? (lang === 'zh' ? '📝 補充點名' : 'Update Roll Call')
                                      : (lang === 'zh' ? '開始點名' : 'Start Roll Call')
                                    }
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {totalPages > 1 && (
                            <div className="flex justify-center items-center mt-6 gap-4">
                              <button
                                onClick={() => setRollCallPage(p => Math.max(1, p - 1))}
                                disabled={rollCallPage === 1}
                                className="p-2 border rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                <ChevronLeft size={20} className="text-gray-600" />
                              </button>
                              <span className="text-gray-600 font-medium">
                                {lang === 'zh' ? `第 ${rollCallPage} 頁` : `Page ${rollCallPage}`} / {totalPages}
                              </span>
                              <button
                                onClick={() => setRollCallPage(p => Math.min(totalPages, p + 1))}
                                disabled={rollCallPage === totalPages}
                                className="p-2 border rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                <ChevronRight size={20} className="text-gray-600" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* --- Block 2: 體能課點名 (Fitness Class Roll Call) --- */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-purple-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-purple-100 p-2.5 rounded-full text-purple-600">
                      <Dumbbell size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        {lang === 'zh' ? '體能課點名' : 'Fitness Class Roll Call'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {lang === 'zh' ? '勾選參加體能課的隊員，每人自動加 1 M 點' : 'Select members who attended fitness class, each gets 1 M-point'}
                      </p>
                    </div>
                  </div>

                  {/* 日期選擇 */}
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-600 mb-2">
                      {lang === 'zh' ? '📅 選擇日期' : '📅 Select Date'}
                    </label>
                    <input
                      type="date"
                      value={fitnessDate}
                      onChange={(e) => {
                        setFitnessDate(e.target.value);
                        setFitnessSelected([]);
                        setExtraFitnessCandidates([]);
                      }}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 font-bold focus:ring-2 focus:ring-blue-300 outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1 ml-1">{lang === 'zh' ? '預設顯示當日有報名船練的人員' : 'Defaults to members registered for boat practice on this date'}</p>
                  </div>

                  {/* 搜尋/新增隊員 */}
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none text-gray-900 appearance-none cursor-pointer"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && val.trim()) {
                              if (!extraFitnessCandidates.includes(val)) {
                                setExtraFitnessCandidates(prev => [...prev, val]);
                                // Auto-select when manually added
                                setFitnessSelected(prev => [...prev, val]);
                              }
                              e.target.value = ''; // Reset
                            }
                          }}
                        >
                          <option value="" className="text-gray-900 bg-white">{lang === 'zh' ? '+ 手動新增出席人員' : '+ Manually Add Attendee'}</option>
                          {allUsers
                            .filter(u => u.Name && u.Name.trim().length > 0) // Filter out empty names
                            .filter(u => {
                              // Filter out those already shown in the main list (registered boat practice attendees)
                              // Normalize date for comparison: YYYY/MM/DD(Day) -> YYYY-MM-DD
                              const isRegistered = registrations.some(r => {
                                const regDate = r.practicedates.split('(')[0].replace(/\//g, '-');
                                return regDate === fitnessDate && r.name === u.Name;
                              });
                              // Also filter out already manually added
                              return !isRegistered && !extraFitnessCandidates.includes(u.Name);
                            })
                            .map(u => (
                              <option key={u.Name} value={u.Name} className="text-gray-900 bg-white">{u.Name}</option>
                            ))
                          }
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* 全選 / 清除 按鈕 */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => {
                        // Select all visible candidates (Registered + Extras)
                        const registeredToday = registrations
                          .filter(r => r.practicedates.split('(')[0].replace(/\//g, '-') === fitnessDate)
                          .map(r => r.name);
                        const allCandidates = [...new Set([...registeredToday, ...extraFitnessCandidates])];
                        setFitnessSelected(allCandidates);
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition border border-blue-200"
                    >
                      {lang === 'zh' ? '全選' : 'Select All'}
                    </button>
                    <button
                      onClick={() => setFitnessSelected([])}
                      className="px-3 py-1.5 text-xs font-bold bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition border border-gray-200"
                    >
                      {lang === 'zh' ? '清除' : 'Clear'}
                    </button>
                    <span className="ml-auto text-sm text-gray-500 self-center">
                      {lang === 'zh' ? `已選 ${fitnessSelected.length} 人` : `${fitnessSelected.length} selected`}
                    </span>
                  </div>

                  {/* 隊員勾選列表 (Registered + Extras) */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-6 max-h-[400px] overflow-y-auto">
                    {(() => {
                      // 1. Get registered users for this date
                      const registeredUsers = registrations
                        .filter(r => r.practicedates.split('(')[0].replace(/\//g, '-') === fitnessDate)
                        .map(r => ({ name: r.name, source: 'registered' }));

                      // 2. Get manually added users
                      const manualUsers = extraFitnessCandidates.map(name => ({ name, source: 'manual' }));

                      // 3. Combine
                      const combined = [...registeredUsers, ...manualUsers];

                      if (combined.length === 0) {
                        return (
                          <div className="col-span-full py-8 text-center text-gray-400 border-2 border-dashed rounded-xl flex flex-col items-center gap-2">
                            <Users size={24} className="opacity-30" />
                            <span>{lang === 'zh' ? '該日期無人報名船練，請手動新增' : 'No boat practice signups for this date. Add manually.'}</span>
                          </div>
                        );
                      }

                      return combined.map((user) => {
                        const isSelected = fitnessSelected.includes(user.name);
                        return (
                          <div
                            key={user.name}
                            onClick={() => {
                              if (isSelected) {
                                setFitnessSelected(prev => prev.filter(n => n !== user.name));
                              } else {
                                setFitnessSelected(prev => [...prev, user.name]);
                              }
                            }}
                            className={`
                              p-3 rounded-lg border-2 cursor-pointer flex items-center justify-between gap-2 transition select-none relative overflow-hidden
                              ${isSelected
                                ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-md'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200 hover:bg-blue-50/30'
                              }
                            `}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition ${isSelected ? 'bg-blue-500' : 'bg-gray-200'}`}>
                                {isSelected && <Check size={14} className="text-white" />}
                              </div>
                              <span className={`font-bold text-sm truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{user.name}</span>
                            </div>
                            {user.source === 'manual' && (
                              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold shrink-0">
                                {lang === 'zh' ? '手動' : 'Manual'}
                              </span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* 送出按鈕 */}
                  <button
                    disabled={fitnessSelected.length === 0 || fitnessSubmitting}
                    onClick={async () => {
                      const confirm = await Swal.fire({
                        title: lang === 'zh' ? '確認體能課點名？' : 'Confirm Fitness Roll Call?',
                        html: `<div class="text-left">
                        <p><strong>${lang === 'zh' ? '日期' : 'Date'}:</strong> ${fitnessDate}</p>
                        <p><strong>${lang === 'zh' ? '出席人數' : 'Attendees'}:</strong> ${fitnessSelected.length} ${lang === 'zh' ? '人' : ''}</p>
                        <p class="text-sm text-gray-500 mt-2">${lang === 'zh' ? '每人將獲得 1 M 點' : 'Each gets 1 M-point'}</p>
                      </div>`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: lang === 'zh' ? '確認送出' : 'Confirm',
                        cancelButtonText: lang === 'zh' ? '取消' : 'Cancel',
                        confirmButtonColor: '#2563eb'
                      });

                      if (!confirm.isConfirmed) return;

                      setFitnessSubmitting(true);
                      try {
                        const result = await awardFitnessAttendance(
                          fitnessDate,
                          fitnessSelected,
                          userProfile?.email || 'unknown'
                        );

                        if (result.success) {
                          await Swal.fire({
                            icon: 'success',
                            title: lang === 'zh' ? '點名完成！' : 'Roll Call Complete!',
                            text: result.message,
                            timer: 2000,
                            showConfirmButton: false
                          });
                          setFitnessSelected([]);
                          setExtraFitnessCandidates([]); // Clear manual entries too? Maybe keep them? User usually wants reset. Let's reset.

                          // 刷新歷史
                          const history = await fetchFitnessHistory(fitnessDate);
                          setFitnessHistory(history);
                        } else {
                          Swal.fire('失敗', result.message || '點名失敗', 'error');
                        }
                      } catch (err) {
                        Swal.fire('錯誤', err.message, 'error');
                      } finally {
                        setFitnessSubmitting(false);
                      }
                    }}
                    className={`
                    w-full py-3.5 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition
                    ${fitnessSelected.length > 0 && !fitnessSubmitting
                        ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white hover:shadow-lg hover:from-blue-700 hover:to-sky-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                  `}
                  >
                    {fitnessSubmitting ? (
                      <><Loader2 size={18} className="animate-spin" /> {lang === 'zh' ? '處理中...' : 'Processing...'}</>
                    ) : (
                      <><Dumbbell size={18} /> {lang === 'zh' ? `確認體能課點名 (${fitnessSelected.length} 人)` : `Confirm Fitness Roll Call (${fitnessSelected.length})`}</>
                    )}
                  </button>

                  {/* 該日期歷史紀錄 */}
                  {fitnessHistory.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <ClipboardList size={18} className="text-blue-500" />
                        {lang === 'zh' ? `${fitnessDate} 已記錄的體能課出席` : `Fitness attendance on ${fitnessDate}`}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {fitnessHistory.map((record) => (
                          <span key={record.id} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-bold border border-blue-200">
                            {record.users?.name || record.users?.email || 'Unknown'} (+{record.points_change})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          }

          {/* ==================== (d) 出席報表 Tab ==================== */}
          {
            activeTab === 'report' && (
              <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-yellow-100 animate-fade-in-down">
                {backgroundLoading && (
                  <div className="mb-4 bg-yellow-50 text-yellow-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-yellow-100">
                    <Loader2 className="animate-spin" size={16} /> 正在統計最新數據...
                  </div>
                )}

                {/* 標題與篩選控制列 */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-yellow-100 p-2 rounded-full text-yellow-600">
                      <Trophy size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{lang === 'zh' ? '出席率排行榜' : 'Attendance Leaderboard'}</h3>
                      <p className="text-xs text-gray-500">Total Sessions: <span className="font-bold text-blue-600 text-sm">{totalSessionsInPeriod}</span> {lang === 'zh' ? '次練習' : 'Sessions'}</p>
                    </div>
                  </div>

                  {/* 篩選器群組 */}
                  <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                    <div className="flex bg-white rounded-md shadow-sm p-1 border border-gray-200">
                      <button onClick={() => setReportType('year')} className={`px-3 py-1 rounded text-xs font-bold transition ${reportType === 'year' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{lang === 'zh' ? '年' : 'Year'}</button>
                      <button onClick={() => setReportType('month')} className={`px-3 py-1 rounded text-xs font-bold transition ${reportType === 'month' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{lang === 'zh' ? '月' : 'Month'}</button>
                      <button onClick={() => setReportType('day')} className={`px-3 py-1 rounded text-xs font-bold transition ${reportType === 'day' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{lang === 'zh' ? '日' : 'Day'}</button>
                    </div>

                    <div className="flex items-center gap-2">
                      {reportType !== 'day' && (
                        <select
                          value={targetYear}
                          onChange={(e) => setTargetYear(e.target.value)}
                          className="pl-2 pr-6 py-1.5 bg-white border border-gray-300 rounded text-sm font-bold outline-none focus:ring-2 focus:ring-blue-300 text-gray-800"
                        >
                          {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                            <option key={y} value={y} className="text-gray-900 bg-white">{y} {lang === 'zh' ? '年' : 'Year'}</option>
                          ))}
                        </select>
                      )}
                      {reportType === 'month' && (
                        <select
                          value={targetMonth}
                          onChange={(e) => setTargetMonth(e.target.value)}
                          className="pl-2 pr-6 py-1.5 bg-white border border-gray-300 rounded text-sm font-bold outline-none focus:ring-2 focus:ring-blue-300 text-gray-800"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m} className="text-gray-900 bg-white">{m} {lang === 'zh' ? '月' : 'Month'}</option>
                          ))}
                        </select>
                      )}
                      {reportType === 'day' && (
                        <input
                          type="date"
                          value={targetDay}
                          onChange={(e) => setTargetDay(e.target.value)}
                          className="pl-2 pr-2 py-1 bg-white border border-gray-300 rounded text-sm font-bold outline-none focus:ring-2 focus:ring-blue-300 text-gray-800"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* 排行榜列表 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leaderboardData.map((stat, index) => (
                    <div key={stat.name} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border hover:bg-yellow-50 transition group">
                      <div className="flex items-center gap-3 w-full">
                        {/* 排名 Icon (前三名 Emoji) */}
                        <div className="shrink-0 w-10 text-center">
                          {index === 0 ? <span className="text-3xl drop-shadow-sm">🥇</span> :
                            index === 1 ? <span className="text-3xl drop-shadow-sm">🥈</span> :
                              index === 2 ? <span className="text-3xl drop-shadow-sm">🥉</span> :
                                <span className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-500 font-bold flex items-center justify-center mx-auto shadow-sm">
                                  {index + 1}
                                </span>
                          }
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between items-end mb-1">
                            <span className="font-bold text-gray-700">{stat.name}</span>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 rounded">{stat.count} 次</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${stat.rate >= 80 ? 'bg-green-500' :
                                stat.rate >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                                }`}
                              style={{ width: `${stat.rate}%` }}
                            ></div>
                          </div>
                          <p className="text-[10px] text-gray-400 text-right mt-0.5">{stat.rate}% 出席率</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {leaderboardData.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
                      <BarChart3 size={48} className="mb-2 opacity-20" />
                      <p>該區間尚無點名紀錄</p>
                    </div>
                  )}
                </div>
              </div>
            )
          }



        </div >

        {/* 點名 Modal (共用元件) */}
        {
          showAttendanceModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-scale-in">
                <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="text-green-800" />
                    <div className="flex flex-col">
                      <span className="text-xs text-green-700 font-bold uppercase tracking-wider">ROLL CALL</span>
                      <div className="relative group cursor-pointer">
                        <select
                          value={rollCallDate}
                          onChange={(e) => {
                            setRollCallDate(e.target.value);
                            updateRollCallList(e.target.value);
                          }}
                          className="appearance-none bg-transparent font-bold text-lg text-gray-800 outline-none cursor-pointer pr-6 border-b border-transparent hover:border-green-500 transition"
                        >
                          {dbDates.map(d => (
                            <option key={d.date} value={d.date}>{d.date}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-0 top-1.5 text-green-700 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowAttendanceModal(false)} className="text-gray-400 hover:text-gray-800 font-bold p-1 rounded-full hover:bg-gray-100 transition">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-50/50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <Users size={20} className="text-gray-500" />
                      {lang === 'zh' ? '預約報名名單' : 'Registered List'} :
                    </h3>
                    <button
                      onClick={() => {
                        const newNames = registrations
                          .filter(r => r.practicedates === rollCallDate)
                          .map(r => r.name)
                          .filter(name => !attendanceList.includes(name) && !(lockedUserNames.includes(name) && !isAdmin));
                        if (newNames.length > 0) {
                          setAttendanceList(prev => [...prev, ...newNames]);
                        }
                      }}
                      className="text-xs bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition font-bold"
                    >
                      {lang === 'zh' ? '全選' : 'Select All'}
                    </button>
                  </div>

                  {/* Pre-calculate locked users (historically confirmed) */}
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {registrations
                      .filter(r => r.practicedates === rollCallDate)
                      .map(reg => {
                        const isAttended = attendanceList.includes(reg.name);
                        // Lock if in history AND not admin
                        const isLocked = lockedUserNames.includes(reg.name) && !isAdmin;

                        return (
                          <div
                            key={reg.activityId + reg.name}
                            onClick={() => !isLocked && toggleAttendance(reg.name, reg.activityId, 'boat_practice', rollCallDate)}
                            className={`
                            p-3 rounded-xl border flex justify-between items-center transition-all
                            ${isLocked
                                ? 'bg-green-50 border-green-200 text-green-800 opacity-60 cursor-not-allowed'
                                : (isAttended
                                  ? 'bg-green-100 border-green-300 text-green-900 cursor-pointer shadow-sm hover:shadow-md font-bold'
                                  : 'bg-white border-gray-200 text-gray-400 grayscale opacity-80 cursor-pointer hover:shadow-sm hover:border-green-200 hover:opacity-100'
                                )
                              }
                          `}
                          >
                            <span className="font-bold flex items-center gap-1">
                              {reg.name}
                              {isLocked ? (lang === 'zh' ? '(已點名)' : '(Confirmed)') : ''}
                              {isLocked && <Lock size={14} className="text-gray-500" />}
                            </span>
                            {isAttended && <Zap size={16} className="text-green-600 fill-green-600" />}
                          </div>
                        );
                      })}
                  </div>
                  {registrations.filter(r => r.practicedates === rollCallDate).length === 0 && (
                    <div className="col-span-2 text-center text-gray-400 py-4 bg-white rounded border border-dashed">此日期無人報名</div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1"><Plus size={14} /> 新增空降 (沒報名但有來)：</p>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-300 outline-none text-gray-800"
                    onChange={(e) => {
                      if (e.target.value) {
                        toggleAttendance(e.target.value);
                        e.target.value = ''; // Reset
                      }
                    }}
                  >
                    <option value="">-- 選擇隊員加入 --</option>
                    {allUsers
                      .filter(u => {
                        const isRegistered = registrations.some(r => r.practicedates === rollCallDate && r.name === u.Name);
                        return !isRegistered;
                      })
                      // .filter(u => !attendanceList.includes(u.Name)) // User 要求不要隱藏，而是反灰
                      .map(u => {
                        const isAttended = attendanceList.includes(u.Name);
                        return (
                          <option
                            key={u.Name}
                            value={u.Name}
                            disabled={isAttended}
                            className={isAttended ? "text-gray-400 bg-gray-100 italic" : ""}
                          >
                            {u.Name} {isAttended ? (lang === 'zh' ? '(已點名)' : '(Selected)') : ''}
                          </option>
                        );
                      })
                    }
                  </select>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {attendanceList
                      .filter(name => {
                        return !registrations.some(r => r.practicedates === rollCallDate && r.name === name);
                      })
                      .map(name => (
                        <span key={name} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-sm border border-yellow-200">
                          {name}
                          <button onClick={() => toggleAttendance(name)} className="hover:text-red-600 bg-white rounded-full p-0.5 ml-1"><Trash2 size={12} /></button>
                        </span>
                      ))
                    }
                  </div>
                </div>


                <div className="p-4 border-t bg-white flex gap-3">
                  <button onClick={() => setShowAttendanceModal(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                  <button onClick={submitAttendance} className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg hover:from-green-700 hover:to-emerald-700 flex items-center justify-center gap-2 transition">
                    <Save size={18} /> {lang === 'zh' ? '確認送出' : 'Confirm'} ({attendanceList.length} {lang === 'zh' ? '人' : ''})
                  </button>
                </div>
              </div>
            </div>

          )
        }

        {/* Edit Announcement Modal */}
        {
          editingAnnouncement && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                <div className="bg-gray-100 p-4 flex justify-between items-center border-b">
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <Edit size={20} className="text-blue-600" /> {lang === 'zh' ? '編輯公告' : 'Edit Announcement'}
                  </h3>
                  <button
                    onClick={() => setEditingAnnouncement(null)}
                    className="text-gray-500 hover:text-gray-700 bg-white rounded-full p-1 hover:bg-gray-200 transition"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '公告標題' : 'Title'}</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none text-gray-900"
                      value={editingAnnouncement.title}
                      onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '日期' : 'Date'}</label>
                      <input
                        type="date"
                        className="w-full p-2 border rounded-lg text-gray-900"
                        value={editingAnnouncement.date}
                        onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '分類' : 'Category'}</label>
                      <select
                        className="w-full p-2 border rounded-lg text-gray-900"
                        value={editingAnnouncement.category}
                        onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, category: e.target.value })}
                      >
                        <option value="活動">活動</option>
                        <option value="比賽">比賽</option>
                        <option value="裝勤">裝勤</option>
                        <option value="榮譽">榮譽</option>
                        <option value="其他">其他</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">{lang === 'zh' ? '內容' : 'Content'}</label>
                    <textarea
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none h-32 text-gray-900"
                      value={editingAnnouncement.content}
                      onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-pinned"
                      checked={editingAnnouncement.pinned}
                      onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, pinned: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="edit-pinned" className="text-sm font-medium text-gray-700 select-none cursor-pointer">{lang === 'zh' ? '置頂此公告' : 'Pin Announcement'}</label>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                  <button
                    onClick={() => setEditingAnnouncement(null)}
                    className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition"
                  >
                    {lang === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleUpdateAnnouncement}
                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow flex items-center gap-2"
                  >
                    <Save size={18} /> {lang === 'zh' ? '儲存更新' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Loading Overlay */}
        {
          loading && (
            <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 border border-sky-100">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
                <p className="font-bold text-gray-700">{lang === 'zh' ? '處理中...' : 'Processing...'}</p>
              </div>
            </div>
          )
        }
      </div >
    </AppLayout >
  );
};

export default CoachPage;