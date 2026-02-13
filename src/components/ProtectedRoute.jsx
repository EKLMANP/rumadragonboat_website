// src/components/ProtectedRoute.jsx
// 路由保護元件，根據角色決定是否放行 - 修復版

import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, ROLES } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * 路由保護元件
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子元件
 * @param {string} props.requiredRole - 需要的角色（member, management, admin）
 * @param {string} props.redirectTo - 未授權時重導向的路徑（預設 /login）
 * @param {boolean} props.requireAuth - 是否需要登入（預設 true）
 */
export default function ProtectedRoute({
    children,
    requiredRole = ROLES.MEMBER,
    redirectTo = '/',
    requireAuth = true
}) {
    const { isAuthenticated, hasRoleLevel, initialized, user, userRoles, loading } = useAuth();
    const location = useLocation();
    const [sessionChecked, setSessionChecked] = useState(false);
    const [hasValidSession, setHasValidSession] = useState(null);

    // 直接檢查 Supabase Session（避免 AuthContext 初始化太慢導致誤判）
    useEffect(() => {
        let isMounted = true;
        let timeoutId;

        const checkSession = async () => {
            try {
                // 設置超時保護
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        reject(new Error('Session check timeout'));
                    }, 15000); // 15 秒超時
                });

                const sessionPromise = supabase.auth.getSession();

                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
                clearTimeout(timeoutId);

                if (isMounted) {
                    setHasValidSession(!!session);
                    setSessionChecked(true);
                    console.log('Session check 完成:', !!session);
                }
            } catch (err) {
                console.warn('Session check 超時或失敗:', err.message);
                clearTimeout(timeoutId);

                if (isMounted) {
                    // 檢查 localStorage 是否有 auth token 作為備援
                    // Supabase 的 key 格式: sb-<project-ref>-auth-token
                    const hasStoredToken = Object.keys(localStorage).some(key =>
                        key.startsWith('sb-') && key.endsWith('-auth-token')
                    );

                    // 也檢查是否有 user_roles 快取（表示之前成功登入過）
                    const hasRolesCache = Object.keys(localStorage).some(key =>
                        key.startsWith('user_roles_')
                    );

                    // 如果 AuthContext 已經有 user 資料，視為已登入
                    const hasUserFromContext = !!user;

                    const shouldBeLoggedIn = hasStoredToken || hasRolesCache || hasUserFromContext;
                    console.log('使用備援判斷:', { hasStoredToken, hasRolesCache, hasUserFromContext, shouldBeLoggedIn });
                    setHasValidSession(shouldBeLoggedIn);
                    setSessionChecked(true);
                }
            }
        };

        // 如果 AuthContext 已初始化，直接使用其結果
        if (initialized) {
            setSessionChecked(true);
            setHasValidSession(isAuthenticated);
        } else {
            // 否則直接檢查 Supabase
            checkSession();
        }

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [initialized, isAuthenticated, user]);

    // 判斷是否還在初始載入中
    const isInitialLoading = !sessionChecked;

    // 只在真正初始載入時顯示 loading
    if (isInitialLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">載入中...</p>
                </div>
            </div>
        );
    }

    // 需要登入但未登入（使用 hasValidSession 作為更可靠的判斷）
    const isLoggedIn = initialized ? isAuthenticated : hasValidSession;
    if (requireAuth && !isLoggedIn) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // 已登入但權限不足
    // 注意：如果 AuthContext 還沒完全初始化，先允許通過（等待角色載入）
    if (requiredRole && initialized && userRoles.length > 0 && !hasRoleLevel(requiredRole)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-blue-50">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md">
                    <div className="text-6xl mb-4">🚫</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">權限不足</h2>
                    <p className="text-gray-600 mb-6">
                        您沒有存取此頁面的權限。<br />
                        如需權限，請聯繫管理員。
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
                    >
                        返回上一頁
                    </button>
                </div>
            </div>
        );
    }

    return children;
}

/**
 * 管理員專用路由
 */
export function AdminRoute({ children }) {
    return (
        <ProtectedRoute requiredRole={ROLES.ADMIN}>
            {children}
        </ProtectedRoute>
    );
}

/**
 * 幹部專用路由
 */
export function ManagementRoute({ children }) {
    return (
        <ProtectedRoute requiredRole={ROLES.MANAGEMENT}>
            {children}
        </ProtectedRoute>
    );
}

/**
 * 會員專用路由（已登入即可）
 */
export function MemberRoute({ children }) {
    return (
        <ProtectedRoute requiredRole={ROLES.MEMBER}>
            {children}
        </ProtectedRoute>
    );
}
