// src/App.jsx
// 重構後的主應用程式，包含公開頁面和受保護的會員專區

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Auth Provider
import { AuthProvider } from './contexts/AuthContext';
// Language Provider
import { LanguageProvider } from './contexts/LanguageContext';
// Loading Component
import LoadingSpinner from './components/LoadingSpinner';

// 路由保護元件
import ProtectedRoute, {
  MemberRoute,
  ManagementRoute,
  AdminRoute
} from './components/ProtectedRoute';
import { ROLES } from './contexts/AuthContext';

// ===== 公開頁面 (Lazy Loading) =====
const HomePage = React.lazy(() => import('./pages/public/HomePage'));
const LoginPage = React.lazy(() => import('./pages/public/LoginPage'));
const FAQPage = React.lazy(() => import('./pages/public/FAQPage'));
const NewsPage = React.lazy(() => import('./pages/public/NewsPage'));
const NewsDetailPage = React.lazy(() => import('./pages/public/NewsDetailPage'));

// ===== 會員專區頁面 (Lazy Loading) =====
const DashboardPage = React.lazy(() => import('./pages/app/DashboardPage'));
const PracticePage = React.lazy(() => import('./pages/app/PracticePage'));
const EquipmentPage = React.lazy(() => import('./pages/app/EquipmentPage'));
const ProfilePage = React.lazy(() => import('./pages/app/ProfilePage'));
const AnnouncementsNewsPage = React.lazy(() => import('./pages/app/AnnouncementsNewsPage'));
const CalendarPage = React.lazy(() => import('./pages/app/CalendarPage'));
const MyJourneyPage = React.lazy(() => import('./pages/app/MyJourneyPage'));

// ===== 舊有頁面 (Lazy Loading) =====
const CoachPage = React.lazy(() => import('./pages/CoachPage'));
const MemberPage = React.lazy(() => import('./pages/MemberPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const OldEquipmentPage = React.lazy(() => import('./pages/EquipmentPage'));

// ===== 尚未建立的佔位頁面 =====
const PlaceholderPage = ({ title }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
      <p className="text-gray-500">此頁面正在建置中...</p>
    </div>
  </div>
);

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* ===== 公開頁面 ===== */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/about" element={<PlaceholderPage title="關於我們" />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:slug" element={<NewsDetailPage />} />
            <Route path="/articles" element={<Navigate to="/news" replace />} />
            <Route path="/articles/:id" element={<Navigate to="/news" replace />} />
            <Route path="/contact" element={<PlaceholderPage title="聯絡我們" />} />
            <Route path="/faq" element={<FAQPage />} />

            {/* ===== 會員專區（需登入）===== */}
            {/* 隊員首頁 - 預設頁面 */}
            <Route
              path="/app"
              element={
                <MemberRoute>
                  <DashboardPage />
                </MemberRoute>
              }
            />

            {/* 個人資料（會員） */}
            <Route
              path="/app/profile"
              element={
                <MemberRoute>
                  <ProfilePage />
                </MemberRoute>
              }
            />

            {/* 船練報名（會員） */}
            <Route
              path="/app/practice"
              element={
                <MemberRoute>
                  <PracticePage />
                </MemberRoute>
              }
            />

            {/* 公用裝備查詢（會員） */}
            <Route
              path="/app/equipment"
              element={
                <MemberRoute>
                  <EquipmentPage />
                </MemberRoute>
              }
            />

            {/* 我的M點及U幣 - 導向 MyJourneyPage 的 points tab */}
            <Route
              path="/app/points"
              element={
                <MemberRoute>
                  <MyJourneyPage />
                </MemberRoute>
              }
            />

            {/* 最新公告（會員） */}
            <Route
              path="/app/announcements"
              element={
                <MemberRoute>
                  <AnnouncementsNewsPage />
                </MemberRoute>
              }
            />

            {/* 年度日程表（會員） */}
            <Route
              path="/app/calendar"
              element={
                <MemberRoute>
                  <CalendarPage />
                </MemberRoute>
              }
            />

            {/* 我的龍舟旅程（會員） */}
            <Route
              path="/app/journey/*"
              element={
                <MemberRoute>
                  <MyJourneyPage />
                </MemberRoute>
              }
            />

            {/* ===== 幹部專區 ===== */}
            <Route
              path="/app/coach"
              element={
                <ManagementRoute>
                  <CoachPage />
                </ManagementRoute>
              }
            />

            {/* 撰寫文章（幹部） */}
            <Route
              path="/app/articles/new"
              element={
                <ManagementRoute>
                  <PlaceholderPage title="撰寫文章" />
                </ManagementRoute>
              }
            />

            {/* ===== 管理員專區 ===== */}
            <Route
              path="/app/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />

            {/* 使用者管理（管理員） */}
            <Route
              path="/app/admin/users"
              element={
                <AdminRoute>
                  <PlaceholderPage title="使用者管理" />
                </AdminRoute>
              }
            />

            {/* ===== 舊版路由（兼容性，之後會移除）===== */}
            <Route path="/member" element={<MemberPage />} />
            <Route path="/equipment" element={<OldEquipmentPage />} />
            <Route path="/coach" element={<CoachPage />} />
            <Route path="/admin" element={<AdminPage />} />

            {/* 404 Not Found */}
            <Route
              path="*"
              element={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-8xl mb-4">🌊</div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">404</h1>
                    <p className="text-gray-500 mb-6">找不到這個頁面</p>
                    <a
                      href="/"
                      className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
                    >
                      返回首頁
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;