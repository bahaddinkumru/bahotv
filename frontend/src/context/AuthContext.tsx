import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export enum Role {
    USER = 'user',
    ADMIN = 'admin',
    SUPER_ADMIN = 'super_admin',
}

export interface User {
    id: number;
    email: string;
    is_active: boolean;
    name: string;
    surname: string;
    role: Role;
    university: 'sau' | 'subu';
    gender: 'male' | 'female';
    settings?: {
        filter_university: boolean;
        filter_gender: boolean;
    };
}

interface AuthContextType {
    user: User | null;
    isBanned: boolean;
    setIsBanned: React.Dispatch<React.SetStateAction<boolean>>;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    login: (data: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    verify: (data: { email: string; code: string }) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
    isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isBanned, setIsBanned] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Her başlangıçta mevcut session'ı kontrol et
                const userRes = await api.get('api/user/me');
                if (userRes.data) {
                    setUser(userRes.data);

                    // Sicil kontrolü: 403 gelirse BanGuard yakalar
                    const penaltyRes = await api.get('api/user/penalty/me');
                    if (penaltyRes.data && penaltyRes.data.is_banned) {
                        setIsBanned(true);
                    }
                }
            } catch (error: any) {
                if (error.response?.status === 403) {
                    setIsBanned(true);
                } else if (error.response?.status === 401) {
                    // Token yok veya geçersiz, sessizce geç
                    setUser(null);
                } else {
                    console.error("Oturum kontrolü yapılamadı", error);
                }
            }

            setIsInitialized(true);
        };

        checkAuth();
    }, []);

    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'user' && event.newValue === null) {
                setUser(null);
                setIsBanned(false);
                navigate('/');
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [navigate]);

    const login = async (loginData: any) => {
        setIsLoading(true);
        try {
            const res = await api.post('api/auth/login', loginData);
            const { user: userData } = res.data;

            // Login başarılı = kullanıcı banlı değil (backend zaten banlıyı reddediyor)
            setUser(userData);
            setIsBanned(false);
            navigate('/settings');

        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message;

            if (error.response?.status === 403 || errorMsg === 'Hesabınız engellenmiştir.') {
                setIsBanned(true);
                navigate('/banned', {
                    state: {
                        reason: error.response?.data?.reason || 'Topluluk kurallarını ihlal ettiniz.',
                        until: error.response?.data?.banned_until || 'Süresiz'
                    }
                });
                return;
            }

            if (errorMsg === 'Lütfen email hesabınızı kontrol edip onaylayınız.') {
                navigate('/verify', { state: { email: loginData.email } });
            } else {
                throw error;
            }
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (registerData: any) => {
        setIsLoading(true);
        try {
            await api.post('api/user', registerData);
            return Promise.resolve();
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const verify = async (verifyData: { email: string; code: string }) => {
        setIsLoading(true);
        try {
            await api.post('api/auth/verify', verifyData);
            navigate('/', { state: { message: 'Hesabınız onaylandı. Lütfen giriş yapın.' } });
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await api.post('api/auth/logout');
        } finally {
            setUser(null);
            setIsBanned(false);
            navigate('/');
        }
    };

    return (
        <AuthContext.Provider value={{
            user, isBanned, setIsBanned, setUser,
            login, register, verify, logout,
            isLoading, isInitialized
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);