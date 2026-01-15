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

    // 基於 email 的角色映射（最終備援）
    const EMAIL_ROLE_MAP = {
        'rumadragonboat@gmail.com': [ROLES.ADMIN],
        'n79928@gmail.com': [ROLES.MANAGEMENT],
        'siaominpan@gmail.com': [ROLES.MEMBER]
    };

    // 取得使用者的角色列表 (使用 RPC 函數繞過 RLS)
    const fetchUserRoles = useCallback(async (userId, email = null) => {
        try {
            // 檢查記憶體快取
            if (roleCache.has(userId)) {
                console.log('使用快取的角色:', roleCache.get(userId));
                return roleCache.get(userId);
            }

            // 檢查 localStorage 快取
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

            // 優先使用 email 備援角色（如果有）
            if (email && EMAIL_ROLE_MAP[email]) {
                const emailRoles = EMAIL_ROLE_MAP[email];
                console.log('使用 email 備援角色:', email, emailRoles);
                roleCache.set(userId, emailRoles);
                localStorage.setItem(`user_roles_${userId}`, JSON.stringify(emailRoles));
                return emailRoles;
            }

            // 帶有超時保護的 RPC 查詢 (5 秒)
            let roles = [];
            try {
                const rpcPromise = supabase.rpc('get_my_roles');
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Role fetch timeout')), 10000);
                });

                const { data: rpcData, error: rpcError } = await Promise.race([rpcPromise, timeoutPromise]);

                if (!rpcError && rpcData && rpcData.length > 0) {
                    roles = rpcData.map(r => r.role_name).filter(Boolean);
                    console.log('RPC 取得角色成功:', roles);
                } else if (rpcError) {
                    console.warn('RPC 取得角色失敗:', rpcError.message);
                }
            } catch (queryError) {
                console.warn('角色查詢失敗或超時:', queryError.message);
            }

            // 如果查詢失敗，使用預設會員角色
            const finalRoles = roles.length > 0 ? roles : [ROLES.MEMBER];

            // 儲存快取
            roleCache.set(userId, finalRoles);
            localStorage.setItem(`user_roles_${userId}`, JSON.stringify(finalRoles));

            console.log('最終角色:', finalRoles);
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

            // 最終備援：使用 email 映射或預設角色
            if (email && EMAIL_ROLE_MAP[email]) {
                const fallbackRoles = EMAIL_ROLE_MAP[email];
                roleCache.set(userId, fallbackRoles);
                localStorage.setItem(`user_roles_${userId}`, JSON.stringify(fallbackRoles));
                return fallbackRoles;
            }

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
                avatar_url: authUser.user_metadata?.avatar_url || null
            };

            setUserProfile(finalProfile);
            setUserRoles(roles);
            console.log('載入完成 - email:', authUser.email, '角色:', roles);
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
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth 狀態變化:', event);

                if (!isMounted) return;

                if (event === 'SIGNED_IN' && session?.user) {
                    setLoading(true);

                    // 清除快取
                    roleCache.clear();

                    // 設置用戶
                    setUser(session.user);

                    // 設置 profile
                    const quickProfile = {
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '會員'
                    };
                    setUserProfile(quickProfile);

                    // 獲取角色
                    const roles = await fetchUserRoles(session.user.id, session.user.email);
                    setUserRoles(roles);
                    console.log('登入後角色:', roles);

                    setLoading(false);
                } else if (event === 'SIGNED_OUT') {
                    roleCache.clear();
                    loadingRef.current = null;
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

    // 登入函式
    const signIn = async (email, password) => {
        setError(null);
        setLoading(true);
        try {
            // 清除舊快取
            roleCache.clear();

            // 直接使用 Supabase 登入（不加額外超時，避免誤報錯誤）
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            setError(err);
            setLoading(false);
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

            // 背景執行 Supabase 登出
            const { error } = await supabase.auth.signOut();
            if (error) console.warn('登出警告:', error);

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
        console.log('角色已刷新:', roles);
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
