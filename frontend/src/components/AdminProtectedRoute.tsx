import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, Role } from '../context/AuthContext';

export const AdminProtectedRoute = () => {
    const { user, isInitialized } = useAuth();

    if (!isInitialized)
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Başlatılıyor...</div>;

    if (!user || user.role !== Role.SUPER_ADMIN)
        return <Navigate to="/" replace />;

    return <Outlet />;
};
