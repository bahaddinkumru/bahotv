import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = () => {
  const { user, isLoading, isBanned } = useAuth();

  if (isLoading)
    return <div className="flex h-screen items-center justify-center text-white">Yükleniyor...</div>;

  if (isBanned)
    return <Navigate to="/banned" replace />;

  if (!user)
    return <Navigate to="/" replace />;

  return <Outlet />;
};