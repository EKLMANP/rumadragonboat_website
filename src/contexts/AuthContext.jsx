// src/contexts/AuthContext.jsx
// 使用者驗證狀態管理 Context - 優化版

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// 角色定義
export const ROLES = {
    GUEST: 'guest',
    MEMBER: 'member',
    MANAGEMENT: 'management',
    ADMIN: 'admin'
};

// 角色權限等級（用於權限比較）
const ROLE_LEVELS = {
    [ROLES.GUEST]: 0,
    [ROLES.MEMBER]: 1,
    [ROLES.MANAGEMENT]: 2,
    [ROLES.ADMIN]: 3
};

// 角色快取 (避免重複查詢)
const roleCache = new Map();

// 建立 Context
const AuthContext = createContext(null);

// Auth Provider 元件
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [userRoles, setUserRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [initialized, setInitialized] = useState(false);
    const loadingRef = useRef(false);

    // EMAIL_ROLE_MAP has been removed for security reasons.
    // Roles are now exclusively fetched from the backend RPC function 'get_my_roles'
    // or loaded from local storage cache.

    // 取得使用者的角色列表
    const fetchUserRoles = useCallback(async (userId, email = null) => {
        // 已知管理者 Email 速查表 (優先於資料庫查詢，提供即時回應)
        // 已知管理者 Email 速查表 (優先於資料庫查詢，提供即時回應)
        const EMAIL_ROLE_MAP = {
            'rumadragonboat@gmail.com': [ROLES.ADMIN],
            'kenny.chen.tpe@gmail.com': [ROLES.MANAGEMENT],
            'n79928@gmail.com': [ROLES.MANAGEMENT],
            'tanpennee9307@gmail.com': [ROLES.MANAGEMENT],
            'irene.c0102@gmail.com': [ROLES.MANAGEMENT]
        };

        try {
            // 1. 優先檢查記憶體快取 (最快)
            if (roleCache.has(userId)) {
                console.log('使用快取的角色:', roleCache.get(userId));
                return roleCache.get(userId);
            }

            // 2. 檢查 Email 速查表 (即時回應，不等資料庫)
            if (email) {
                const emailLower = email.toLowerCase();
                if (EMAIL_ROLE_MAP[emailLower]) {
                    const roles = EMAIL_ROLE_MAP[emailLower];
                    console.log('使用 Email 速查角色:', roles);
                    roleCache.set(userId, roles);
                    localStorage.setItem(`user_roles_${userId}`, JSON.stringify(roles));
                    return roles;
                }
            }

            // 3. 檢查 localStorage 快取
            const cached = localStorage.getItem(`user_roles_${userId}`);
            if (cached) {
                try {
                    const cachedRoles = JSON.parse(cached);
                    console.log('使用 localStorage 快取的角色:', cachedRoles);
                    roleCache.set(userId, cachedRoles);
                    return cachedRoles;
                } catch (e) {
                    console.warn('解析快取角色失敗:', e);
                }
            }

            // 4. 資料庫查詢 (帶 3s 超時，避免長時間等待)
            let roles = [];
            let querySuccess = false;

            try {
                const queryPromise = supabase.rpc('get_my_roles');

                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Role query timeout')), 5000); // 5s timeout
                });

                const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

                if (!error && data) {
                    // RPC returns [{ role_name: 'admin' }, ...]
                    roles = data.map(item => item.role_name).filter(Boolean);
                    querySuccess = true;
                    if (import.meta.env.DEV) console.log('資料庫取得角色成功:', roles);
                } else if (error) {
                    console.warn('資料庫取得角色失敗:', error.message);
                }
            } catch (queryError) {
                console.warn('角色查詢失敗或超時:', queryError.message);
            }

            // 5. 最終角色決定
            const finalRoles = roles.length > 0 ? roles : [ROLES.MEMBER];

            // 只在查詢成功時才儲存快取
            if (querySuccess) {
                roleCache.set(userId, finalRoles);
                localStorage.setItem(`user_roles_${userId}`, JSON.stringify(finalRoles));
            }

            console.log('最終角色:', finalRoles, querySuccess ? '(已快取)' : '(未快取-fallback)');
            return finalRoles;
        } catch (err) {
            console.warn('取得使用者角色錯誤:', err.message);

            // 嘗試從 localStorage 取得快取
            const cached = localStorage.getItem(`user_roles_${userId}`);
            if (cached) {
                try {
                    return JSON.parse(cached);
                } catch (e) {
                    console.warn('解析快取角色失敗:', e);
                }
            }

            // 最終備援邏輯移除，預設為會員
            /*
            if (email && EMAIL_ROLE_MAP[email]) {
                const fallbackRoles = EMAIL_ROLE_MAP[email];
                roleCache.set(userId, fallbackRoles);
                localStorage.setItem(`user_roles_${userId}`, JSON.stringify(fallbackRoles));
                return fallbackRoles;
            }
            */

            return [ROLES.MEMBER];
        }
    }, []);

    // 取得使用者個人資料（從 members 表）- 優化版
    const fetchUserProfile = useCallback(async (userId, email) => {
        try {
            const { data, error } = await supabase
                .from('members')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (error) {
                console.warn('取得使用者資料失敗:', error.message);
                return {
                    id: userId,
                    name: email?.split('@')[0] || '會員',
                    email: email
                };
            }

            if (data) {
                return {
                    ...data,
                    id: userId,
                    email: email
                };
            }

            return {
                id: userId,
                name: email?.split('@')[0] || '會員',
                email: email
            };
        } catch (err) {
            console.warn('取得使用者資料錯誤:', err);
            return {
                id: userId,
                name: email?.split('@')[0] || '會員',
                email: email
            };
        }
    }, []);

    // 載入使用者資料 (優化版 - 修復角色載入問題)
    const loadUserData = useCallback(async (authUser, forceReload = false) => {
        if (!authUser) {
            setUser(null);
            setUserProfile(null);
            setUserRoles([]);
            return;
        }

        // 如果是強制重新載入，清除所有快取
        if (forceReload) {
            roleCache.clear();
            localStorage.removeItem(`user_roles_${authUser.id}`);
            loadingRef.current = null; // 重置 loading flag 以允許載入
        }

        // 防止同一用戶的重複並發載入 (僅限非強制重載)
        if (!forceReload && loadingRef.current === authUser.id) {
            console.log('跳過重複載入:', authUser.email);
            return;
        }
        loadingRef.current = authUser.id;

        try {
            setUser(authUser);

            // 先設定基本資料，讓 UI 快速顯示
            const quickProfile = {
                id: authUser.id,
                email: authUser.email,
                name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '會員',
                avatar_url: authUser.user_metadata?.avatar_url || null
            };
            setUserProfile(quickProfile);

            // 只有非強制重新載入時才使用快取
            if (!forceReload) {
                const cachedRoles = roleCache.get(authUser.id) ||
                    JSON.parse(localStorage.getItem(`user_roles_${authUser.id}`) || 'null');

                if (cachedRoles) {
                    setUserRoles(cachedRoles);
                    console.log('使用快取角色:', cachedRoles);
                }
            }

            // 載入完整資料 (使用 email 備援確保正確角色)
            const [profile, roles] = await Promise.all([
                fetchUserProfile(authUser.id, authUser.email),
                fetchUserRoles(authUser.id, authUser.email)
            ]);

            const finalProfile = {
                ...profile,
                id: authUser.id,
                email: authUser.email,
                name: authUser.user_metadata?.name || profile.name || authUser.email?.split('@')[0],
                avatar_url: authUser.user_metadata?.avatar_url || profile.avatar_url || null
            };

            setUserProfile(finalProfile);
            setUserRoles(roles);
            setUserRoles(roles);
            if (import.meta.env.DEV) console.log('載入完成 - email:', authUser.email, '角色:', roles);
        } finally {
            // 只有當仍是同一用戶時才清除 loading flag
            if (loadingRef.current === authUser.id) {
                loadingRef.current = null;
            }
        }
    }, [fetchUserProfile, fetchUserRoles]);

    // 初始化認證狀態 (簡化版 - 移除超時機制)
    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            try {
                // 直接獲取 session，不設超時限制
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.warn('獲取 session 失敗:', error.message);
                }

                if (isMounted) {
                    if (session?.user) {
                        // 設置基本用戶狀態
                        setUser(session.user);

                        // 快速設置 profile
                        const quickProfile = {
                            id: session.user.id,
                            email: session.user.email,
                            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '會員'
                        };
                        setUserProfile(quickProfile);

                        // 立即獲取角色 (使用 email 備援確保快速)
                        const roles = await fetchUserRoles(session.user.id, session.user.email);
                        if (isMounted) {
                            setUserRoles(roles);
                            console.log('初始化角色完成:', roles);
                        }

                        // 背景載入完整 profile
                        fetchUserProfile(session.user.id, session.user.email).then(profile => {
                            if (isMounted && profile) {
                                setUserProfile(prev => ({ ...prev, ...profile }));
                            }
                        });
                    }
                    setLoading(false);
                    setInitialized(true);
                }
            } catch (err) {
                console.error('初始化認證失敗:', err);
                if (isMounted) {
                    setError(err);
                    setLoading(false);
                    setInitialized(true);
                }
            }
        };

        initAuth();

        // 監聽認證狀態變化
        // 重要：Supabase 會依序觸發 INITIAL_SESSION -> SIGNED_IN / SIGNED_OUT
        // 我們需要正確處理 INITIAL_SESSION 以避免重複載入或誤登出
        let lastProcessedUserId = null;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth 狀態變化:', event, session?.user?.email);

                if (!isMounted) return;

                // INITIAL_SESSION 是頁面載入時 Supabase 發送的第一個事件
                // 如果已經在 initAuth 中處理過，則跳過
                if (event === 'INITIAL_SESSION') {
                    console.log('跳過 INITIAL_SESSION - 已在 initAuth 中處理');
                    if (session?.user) {
                        lastProcessedUserId = session.user.id;
                    }
                    return;
                }

                if (event === 'SIGNED_IN' && session?.user) {
                    // 新登入時清除快取 (僅記憶體)，並重新查詢角色
                    // 保留 localStorage 快取以供 fallback 使用
                    roleCache.delete(session.user.id);
                    // localStorage.removeItem(`user_roles_${session.user.id}`); // 移除此行，保留本地快取作為備援

                    // 防止重複處理同一個用戶 (但不影響全新登入)
                    if (lastProcessedUserId === session.user.id && user?.id === session.user.id) {
                        console.log('跳過重複 SIGNED_IN 事件');
                        return;
                    }
                    lastProcessedUserId = session.user.id;

                    setLoading(true);

                    // 設置用戶
                    setUser(session.user);

                    // 設置 profile
                    const quickProfile = {
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '會員'
                    };
                    setUserProfile(quickProfile);

                    // 獲取角色 - 強制查詢，不使用快取
                    const roles = await fetchUserRoles(session.user.id, session.user.email);
                    setUserRoles(roles);
                    setLoading(false);
                    console.log('登入後查詢角色:', roles);
                } else if (event === 'SIGNED_OUT') {
                    // 確認真的是登出，而不是誤發
                    // 檢查是否有有效 session
                    const { data: { session: currentSession } } = await supabase.auth.getSession();
                    if (currentSession?.user) {
                        console.log('忽略虛假 SIGNED_OUT - session 仍然有效');
                        return;
                    }

                    console.log('執行真正登出');
                    roleCache.clear();
                    loadingRef.current = null;
                    lastProcessedUserId = null;
                    setUser(null);
                    setUserProfile(null);
                    setUserRoles([]);
                    setLoading(false);
                } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                    setUser(session.user);
                } else if (event === 'USER_UPDATED' && session?.user) {
                    // 刷新角色
                    const roles = await fetchUserRoles(session.user.id, session.user.email);
                    setUserRoles(roles);
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [fetchUserProfile, fetchUserRoles]);

    // 登入函式 (優化：加上 15s 超時與錯誤處理)
    const signIn = async (email, password) => {
        setError(null);
        setLoading(true);
        try {
            // 清除舊快取
            roleCache.clear();

            // 建立 15 秒超時 Promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Login timeout')), 15000);
            });

            // 執行登入請求 (與超時競賽)
            const loginPromise = supabase.auth.signInWithPassword({
                email,
                password
            });

            const { data, error } = await Promise.race([loginPromise, timeoutPromise]);

            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error('登入異常:', err);
            setError(err);
            setLoading(false);

            // 判斷是否為網路錯誤
            if (err.message === 'Login timeout') {
                return { success: false, error: { message: '連線逾時，請檢查網路狀況' } };
            }
            if (err.message === 'Failed to fetch' || err.message.includes('Network request failed')) {
                return { success: false, error: { message: '網路連線失敗，請檢查您的網路或關閉 VPN/攔截器' } };
            }

            return { success: false, error: err };
        }
    };

    // 登出函式 (優化：立即清除狀態)
    const signOut = async () => {
        try {
            // 立即清除本地狀態和快取
            roleCache.clear();
            const keys = Object.keys(localStorage).filter(k => k.startsWith('user_roles_'));
            keys.forEach(k => localStorage.removeItem(k));

            setUser(null);
            setUserProfile(null);
            setUserRoles([]);

            // 背景執行 Supabase 登出 - 同樣加上超時保護以免卡住 UI
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
            const signOutPromise = supabase.auth.signOut();

            await Promise.race([signOutPromise, timeoutPromise]);

            return { success: true };
        } catch (err) {
            console.error('登出失敗:', err);
            setError(err);
            return { success: false, error: err };
        }
    };

    // 強制刷新用戶角色（用於角色更新後）
    const refreshUserRoles = useCallback(async () => {
        if (!user) return;

        // 清除快取
        roleCache.delete(user.id);
        localStorage.removeItem(`user_roles_${user.id}`);

        // 重新取得角色
        const roles = await fetchUserRoles(user.id);
        setUserRoles(roles);
        if (import.meta.env.DEV) console.log('角色已刷新:', roles);
    }, [user, fetchUserRoles]);

    // 刷新用戶資料
    const refreshUserProfile = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // 清除快取強制重新載入
                roleCache.delete(session.user.id);
                await loadUserData(session.user);
            }
        } catch (err) {
            console.error('刷新用戶資料失敗:', err);
        }
    }, [loadUserData]);

    // 檢查是否擁有特定角色
    const hasRole = useCallback((requiredRole) => {
        if (!requiredRole) return true;
        return userRoles.includes(requiredRole);
    }, [userRoles]);

    // 檢查是否擁有指定角色等級以上的權限
    const hasRoleLevel = useCallback((requiredRole) => {
        if (!requiredRole) return true;

        const requiredLevel = ROLE_LEVELS[requiredRole] || 0;
        const userMaxLevel = Math.max(
            ...userRoles.map(role => ROLE_LEVELS[role] || 0),
            0
        );

        return userMaxLevel >= requiredLevel;
    }, [userRoles]);

    // 檢查是否已登入
    const isAuthenticated = !!user;

    // 檢查是否為管理員
    const isAdmin = hasRole(ROLES.ADMIN);

    // 檢查是否為幹部
    const isManagement = hasRole(ROLES.MANAGEMENT) || isAdmin;

    // 檢查是否為隊員
    const isMember = hasRole(ROLES.MEMBER) || isManagement;

    // Context 值
    const value = {
        // 狀態
        user,
        userProfile,
        userRoles,
        loading,
        error,
        initialized,
        isAuthenticated,

        // 角色檢查
        isAdmin,
        isManagement,
        isMember,
        hasRole,
        hasRoleLevel,

        // 操作
        signIn,
        signOut,
        logout: signOut,
        refreshUserProfile,
        refreshUserRoles,

        // 常數
        ROLES
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// 自訂 Hook
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth 必須在 AuthProvider 內使用');
    }
    return context;
}

export default AuthContext;
