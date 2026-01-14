// src/pages/public/LoginPage.jsx
// 登入頁面

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Swal from 'sweetalert2';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { signIn, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // 取得原本要去的頁面
    const from = location.state?.from?.pathname || '/app';

    // 如果已登入，重導向到會員區
    React.useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            Swal.fire({
                icon: 'warning',
                title: '請填寫完整',
                text: '請輸入電子郵件和密碼',
                confirmButtonColor: '#0ea5e9'
            });
            return;
        }

        setIsLoading(true);

        try {
            const { success, error } = await signIn(email, password);

            if (success) {
                Swal.fire({
                    icon: 'success',
                    title: '登入成功！',
                    text: '歡迎回來 RUMA 🐉',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    navigate(from, { replace: true });
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: '登入失敗',
                    text: error?.message || '電子郵件或密碼錯誤',
                    confirmButtonColor: '#0ea5e9'
                });
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: '登入失敗',
                text: '發生未知錯誤，請稍後再試',
                confirmButtonColor: '#0ea5e9'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-black flex flex-col">
            {/* Header - 與首頁一致 */}
            <header className="bg-black/80 backdrop-blur-sm shadow-sm border-b border-red-900/30">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <img
                            src="/logo_website.png"
                            alt="RUMA Logo"
                            className="h-8 md:h-10 w-auto group-hover:scale-110 transition"
                        />
                        <span className="font-black text-xl md:text-2xl tracking-tight text-white">
                            <span className="text-red-500">RUMA</span>
                        </span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl shadow-xl p-8">
                        {/* Logo */}
                        <div className="text-center mb-8">
                            <div className="text-6xl mb-4">🚣</div>
                            <h1 className="text-2xl font-bold text-gray-800">隊友登入</h1>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    電子郵件
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 focus:border-transparent transition outline-none text-gray-900 placeholder-gray-400"
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    密碼
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 focus:border-transparent transition outline-none text-gray-900 placeholder-gray-400"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transform transition hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="animate-spin">⏳</span>
                                        登入中...
                                    </span>
                                ) : (
                                    '登入'
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="my-8 flex items-center">
                            <div className="flex-grow border-t border-gray-200"></div>
                            <span className="px-4 text-gray-400 text-sm">或</span>
                            <div className="flex-grow border-t border-gray-200"></div>
                        </div>

                        {/* Info */}
                        <div className="text-center text-sm text-gray-500">
                            <p>還沒有登入的帳號嗎？</p>
                            <p className="mt-1">請聯繫 RUMA 幹部團隊為您建立登入帳號</p>
                        </div>
                    </div>

                    {/* Back to Home */}
                    <div className="text-center mt-6">
                        <Link
                            to="/"
                            className="text-red-400 hover:text-red-300 font-medium"
                        >
                            ← 返回首頁
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-black text-white text-center py-4 border-t border-red-900/30">
                <div className="flex items-center justify-center gap-2">
                    <img src="/logo_website.png" alt="RUMA" className="h-5 w-auto" />
                    <span>Designed by{' '}</span>
                    <a
                        href="https://www.instagram.com/ruma_dragonboat"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-red-400 font-bold"
                    >
                        RUMA dragon boat
                    </a>
                </div>
            </footer>
        </div>
    );
}
