import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UniversitySelector } from './pages/UniversitySelector';
import { LoginForm } from './pages/LoginForm';
import { RegisterForm } from './pages/RegisterForm';
import { Settings } from './pages/Settings';
import { VideoChat } from './pages/VideoChat';
import { Verify } from './pages/Verify';
import { ProtectedRoute } from './components/ProtectedRoute';

import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/pages/Dashboard';
import Users from './admin/pages/Users';
import Analytics from './admin/pages/Analytics';
import Reports from './admin/pages/Reports';
import AdminSettings from './admin/pages/Settings';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import GlobalNotificationModal from './components/GlobalNotificationModal';
import { BannedPage } from './pages/BannedPage';

function AppRoutes() {
  const { user, isInitialized, isBanned } = useAuth();

  if (!isInitialized)
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Başlatılıyor...</div>;

  return (
    <>
      <GlobalNotificationModal />

      <Routes>
        <Route
          path="/"
          element={isBanned ? <Navigate to="/banned" replace /> : (user ? <Navigate to="/video" replace /> : <UniversitySelector />)}
        />
        <Route
          path="/:university/login"
          element={isBanned ? <Navigate to="/banned" replace /> : (user ? <Navigate to="/video" replace /> : <LoginForm />)}
        />
        <Route
          path="/:university/register"
          element={isBanned ? <Navigate to="/banned" replace /> : (user ? <Navigate to="/video" replace /> : <RegisterForm />)}
        />
        <Route
          path="/verify"
          element={isBanned ? <Navigate to="/banned" replace /> : (user ? <Navigate to="/video" replace /> : <Verify />)}
        />

        <Route
          path="/banned"
          element={
            isBanned
              ? <BannedPage />
              : (user ? <Navigate to="/video" replace /> : <Navigate to="/" replace />)
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/settings" element={<Settings />} />
          <Route path="/video" element={<VideoChat />} />
        </Route>

        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route
          path="*"
          element={isBanned ? <Navigate to="/banned" replace /> : (user ? <Navigate to="/video" replace /> : <Navigate to="/" replace />)}
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}