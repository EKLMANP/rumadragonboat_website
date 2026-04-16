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

    // 快速 session 判斷 — 優先信任 AuthContext，僅在未初始化時才檢查 Supabase
    useEffect(() => {
        let isMounted = true;

        if (initialized) {
            // AuthContext 已完成初始化，直接信任
            setSessionChecked(true);
            setHasValidSession(isAuthenticated);
            return;
        }

        // AuthContext 尚未初始化 — 先用 localStorage 快速判斷，避免 getSession 延遲
        const hasStoredToken = Object.keys(localStorage).some(key =>
            key.startsWith('sb-') && key.endsWith('-auth-token')
        );
        const hasUserFromContext = !!user;

        if (hasStoredToken || hasUserFromContext) {
            // 有 token 或有 user，先放行（AuthContext 初始化完成後會再次觸發此 effect）
            setHasValidSession(true);
            setSessionChecked(true);
        } else {
            // 無任何登入跡象，直接判定未登入
            setHasValidSession(false);
            setSessionChecked(true);
        }

        return () => { isMounted = false; };
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
