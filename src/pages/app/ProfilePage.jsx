// src/pages/app/ProfilePage.jsx
// 個人資料頁面 - 頭像上傳、顯示名稱、變更密碼

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/AppLayout';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';
import { User, Camera, Save, Lock, Eye, EyeOff } from 'lucide-react';

export default function ProfilePage() {
    const { userProfile, refreshUserProfile } = useAuth();
    const fileInputRef = useRef(null);

    // 表單狀態
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    // 密碼變更
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);

    // 載入狀態
    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // 初始化表單
    useEffect(() => {
        if (userProfile) {
            setDisplayName(userProfile.name || '');
            setAvatarUrl(userProfile.avatar_url || null);
        }
    }, [userProfile]);

    // 處理頭像選擇
    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 驗證檔案類型
        if (!file.type.startsWith('image/')) {
            Swal.fire('錯誤', '請選擇圖片檔案', 'error');
            return;
        }

        // 驗證檔案大小 (最大 2MB)
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire('錯誤', '圖片大小不能超過 2MB', 'error');
            return;
        }

        setAvatarFile(file);

        // 建立預覽
        const reader = new FileReader();
        reader.onload = (e) => {
            setAvatarPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    // 儲存個人資料 (優化版 - 完全非阻塞，適應慢網路)
    const handleSaveProfile = async () => {
        if (!displayName.trim()) {
            Swal.fire('錯誤', '請輸入顯示名稱', 'warning');
            return;
        }

        setIsSaving(true);

        try {
            let finalAvatarUrl = avatarUrl;
            const trimmedName = displayName.trim();

            // Helper for timeout
            const withTimeout = (promise, ms = 15000, errorMsg = '請求超時，請檢查網路連線') => {
                return Promise.race([
                    promise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
                ]);
            };

            // 1. 上傳頭像 (如果有選擇新頭像)
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${userProfile.id}.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                const { error: uploadError } = await withTimeout(
                    supabase.storage
                        .from('avatars')
                        .upload(filePath, avatarFile, { upsert: true }),
                    30000, // 上傳給予較長時間 30s
                    '圖片上傳超時，請稍後再試'
                );

                if (uploadError) {
                    console.warn('頭像上傳失敗:', uploadError.message);
                    throw new Error('頭像上傳失敗，請稍後再試');
                }

                // 2. 取得公開 URL (加上時間戳記以避免快取)
                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                finalAvatarUrl = `${publicUrl}?t=${new Date().getTime()}`;
                console.log('New Avatar URL:', finalAvatarUrl);
            }

            // 3. 更新 users/members 表 (同步資料)
            // 嘗試更新 public.users (或 members) 表中的 avatar_url
            // 如果 members view 對應 public.users，這一併更新
            const updates = {
                name: trimmedName,
                avatar_url: finalAvatarUrl,
                updated_at: new Date().toISOString()
            };

            const { error: dbError } = await withTimeout(
                supabase
                    .from('members')
                    .update(updates)
                    .eq('email', userProfile.email),
                10000,
                '資料更新超時，請稍後再試'
            );

            if (dbError) {
                console.warn('Members 更新失敗:', dbError.message);
                // 不阻擋 metadata 更新，但記錄錯誤
            }

            // 4. 更新 auth.users metadata (這是 AuthContext 為了快速載入的主要來源)
            const { error: authError } = await withTimeout(
                supabase.auth.updateUser({
                    data: {
                        name: trimmedName,
                        avatar_url: finalAvatarUrl
                    }
                })
            );

            if (authError) {
                console.warn('Auth metadata 更新失敗:', authError.message);
                throw authError; // Metadata 更新失敗時視為整體失敗
            }

            // 5. 更新本地狀態
            setAvatarUrl(finalAvatarUrl);
            setAvatarFile(null);

            // 6. 觸發 Context 刷新 (不等待，避免因角色查詢超時導致 UI 卡住)
            if (refreshUserProfile) {
                refreshUserProfile().catch(err => console.error('Background refresh failed:', err));
            }

            // 成功提示
            Swal.fire({
                icon: 'success',
                title: '成功',
                text: '個人資料已更新',
                timer: 1500,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Save error:', error);
            Swal.fire('錯誤', error.message || '儲存失敗', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // 變更密碼
    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) {
            Swal.fire('錯誤', '請填寫新密碼', 'warning');
            return;
        }

        if (newPassword !== confirmPassword) {
            Swal.fire('錯誤', '兩次輸入的密碼不一致', 'warning');
            return;
        }

        if (newPassword.length < 6) {
            Swal.fire('錯誤', '密碼長度至少 6 個字元', 'warning');
            return;
        }

        setIsChangingPassword(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setNewPassword('');
            setConfirmPassword('');
            setCurrentPassword('');

            Swal.fire('成功', '密碼已變更', 'success');
        } catch (error) {
            console.error('Password change error:', error);
            Swal.fire('錯誤', error.message || '密碼變更失敗', 'error');
        } finally {
            setIsChangingPassword(false);
        }
    };

    // 取得頭像顯示內容
    const getAvatarDisplay = () => {
        if (avatarPreview) {
            return <img src={avatarPreview} alt="預覽" className="w-full h-full object-cover" />;
        }
        if (avatarUrl) {
            return <img src={avatarUrl} alt="頭像" className="w-full h-full object-cover" />;
        }
        return <span className="text-4xl font-bold text-sky-700">{displayName?.charAt(0)?.toUpperCase() || 'U'}</span>;
    };

    return (
        <AppLayout>
            <div className="max-w-2xl mx-auto">
                {/* 頁面標題 */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
                        <User size={32} className="text-blue-600" />
                        個人資料
                    </h1>
                    <p className="text-gray-500 mt-2">管理您的帳號資訊</p>
                </div>

                {/* 頭像區塊 */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
                    <div className="flex flex-col items-center">
                        {/* 圓形頭像 */}
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-sky-100 flex items-center justify-center border-4 border-blue-200">
                                {getAvatarDisplay()}
                            </div>
                            {/* 相機按鈕 */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-1 right-1 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition"
                            >
                                <Camera size={20} />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>
                        <p className="text-sm text-gray-500 mt-3">點擊相機圖示更換頭像</p>
                    </div>

                    {/* 顯示名稱 */}
                    <div className="mt-8">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            顯示名稱
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-800"
                            placeholder="請輸入您的名稱"
                        />
                    </div>

                    {/* 電子郵件 (唯讀) */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            電子郵件
                        </label>
                        <input
                            type="email"
                            value={userProfile?.email || ''}
                            disabled
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">電子郵件無法變更</p>
                    </div>

                    {/* 儲存按鈕 */}
                    <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="w-full mt-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <Save size={20} />
                        )}
                        {isSaving ? '儲存中...' : '儲存個人資料'}
                    </button>
                </div>

                {/* 變更密碼區塊 */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6">
                        <Lock size={20} className="text-blue-600" />
                        變更密碼
                    </h2>

                    <div className="space-y-4">
                        {/* 新密碼 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                新密碼
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasswords ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-800 pr-12"
                                    placeholder="請輸入新密碼"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(!showPasswords)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPasswords ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* 確認密碼 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                確認新密碼
                            </label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-800"
                                placeholder="請再次輸入新密碼"
                            />
                        </div>

                        {/* 變更密碼按鈕 */}
                        <button
                            onClick={handleChangePassword}
                            disabled={isChangingPassword}
                            className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isChangingPassword ? (
                                <span className="animate-spin">⏳</span>
                            ) : (
                                <Lock size={20} />
                            )}
                            {isChangingPassword ? '變更中...' : '變更密碼'}
                        </button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
