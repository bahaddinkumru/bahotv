import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

interface ThemeColors {
  gradient: string;
  accent: string;
  hover: string;
}

export function Settings() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [filters, setFilters] = useState({
    university: false,
    gender: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const getSettings = async () => {
      try {
        if (user?.settings) {
          setFilters({
            university: user.settings.filter_university || false,
            gender: user.settings.filter_gender || false
          });
          setIsFetching(false);
        } else {
          const response = await api.get('api/users/me');
          setFilters({
            university: response.data.filter_university,
            gender: response.data.filter_gender
          });
        }
      } catch (err) {
        console.error("Ayarlar çekilemedi:", err);
      } finally {
        setIsFetching(false);
      }
    };

    getSettings();
  }, [user]);

  const themeColors: Record<string, ThemeColors> = {
    sau: {
      gradient: 'from-blue-600 to-blue-800',
      accent: 'bg-blue-600',
      hover: 'hover:bg-blue-700',
    },
    subu: {
      gradient: 'from-emerald-600 to-teal-700',
      accent: 'bg-emerald-600',
      hover: 'hover:bg-emerald-700',
    },
  };

  const theme = (user?.university && themeColors[user.university])
    ? themeColors[user.university]
    : themeColors.sau;

  const handleBack = () => {
    navigate('/video');
  };

  const toggleFilter = (key: 'university' | 'gender') => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess('');
    setError('');

    try {
      await api.patch('api/user/settings', {
        filter_university: filters.university,
        filter_gender: filters.gender,
      });

      if (user) {
        const updatedUser = {
          ...user,
          filter_university: filters.university,
          filter_gender: filters.gender,
          settings: {
            filter_university: filters.university,
            filter_gender: filters.gender
          }
        };

        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      setSuccess('Ayarlar başarıyla kaydedildi! Yönlendiriliyorsunuz...');

      setTimeout(() => {
        navigate('/video');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Ayarlar kaydedilemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} flex items-center justify-center p-4`}>
      <div className="w-full max-w-lg"> {/* max-w-2xl biraz genişti, lg daha mobil uyumlu */}

        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors group"
        >
          <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="font-medium">Video Sohbet'e Dön</span>
        </button>

        <form onSubmit={handleSubmit} className="relative">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 shadow-2xl">

            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className="text-white text-3xl font-bold mb-2 tracking-tight">Eşleşme Ayarları</h1>
              <p className="text-blue-100/80 text-sm">
                Kriterlerinizi belirleyin, size en uygun kişiyi bulalım.
              </p>
            </div>

            {/* Error & Success Messages */}
            {error && (
              <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4 animate-pulse flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <p className="text-red-100 text-sm font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <p className="text-emerald-100 text-sm font-medium">{success}</p>
              </div>
            )}

            {/* Checkbox Options Container */}
            <div className="space-y-4 mb-8">

              {/* 1. SEÇENEK: ÜNİVERSİTE */}
              <div
                onClick={() => toggleFilter('university')}
                className={`group relative overflow-hidden w-full p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${filters.university
                  ? 'border-white bg-white/20 shadow-lg'
                  : 'border-white/10 bg-black/20 hover:bg-black/30 hover:border-white/30'
                  }`}
              >
                {/* Checkbox Icon */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${filters.university
                  ? 'bg-white text-blue-600 scale-110 shadow-md'
                  : 'bg-white/10 text-transparent border border-white/20'
                  }`}>
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>

                <div className="flex-1 z-10">
                  <p className="text-white font-bold text-lg leading-tight mb-1">Kendi Okulum</p>
                  <p className="text-white/60 text-xs font-medium">
                    Sadece {user?.university === 'sau' ? 'Sakarya Üni.' : 'Uygulamalı Bilimler'} öğrencileri
                  </p>
                </div>

                {/* Arkaplan Efekti (Seçili ise) */}
                {filters.university && (
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                )}
              </div>

              {/* 2. SEÇENEK: CİNSİYET */}
              <div
                onClick={() => toggleFilter('gender')}
                className={`group relative overflow-hidden w-full p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${filters.gender
                  ? 'border-white bg-white/20 shadow-lg'
                  : 'border-white/10 bg-black/20 hover:bg-black/30 hover:border-white/30'
                  }`}
              >
                {/* Checkbox Icon */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${filters.gender
                  ? 'bg-white text-pink-600 scale-110 shadow-md'
                  : 'bg-white/10 text-transparent border border-white/20'
                  }`}>
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>

                <div className="flex-1 z-10">
                  <p className="text-white font-bold text-lg leading-tight mb-1">Hemcinsim Olsun</p>
                  <p className="text-white/60 text-xs font-medium">
                    Sadece {user?.gender === 'male' ? 'erkek' : 'kadın'} kullanıcılar
                  </p>
                </div>

                {/* Arkaplan Efekti (Seçili ise) */}
                {filters.gender && (
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="mb-8 bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 flex gap-3 items-start">
              <div className="mt-0.5 min-w-[20px]">ℹ️</div>
              <p className="text-blue-50 text-xs leading-relaxed">
                Hiçbir seçim yapmazsanız <strong>Genel Havuz</strong> üzerinden (tüm okul ve cinsiyetlerle) rastgele eşleşirsiniz.
              </p>
            </div>

            {/* Save Button */}
            <button
              type='submit'
              disabled={isLoading}
              className={`w-full relative overflow-hidden group bg-white text-gray-900 hover:text-white rounded-xl py-4 transition-all disabled:opacity-70 disabled:cursor-not-allowed font-bold text-lg shadow-xl shadow-black/10`}
            >
              {/* Hover Gradient Background */}
              <div className={`absolute inset-0 w-full h-full ${theme.accent} translate-y-full group-hover:translate-y-0 transition-transform duration-300`}></div>

              <div className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Ayarları Kaydet</span>
                  </>
                )}
              </div>
            </button>

          </div>
        </form>

        <p className="text-white/30 text-[10px] text-center mt-8 font-medium tracking-wide uppercase">
          Gizlilik Odaklı & Anonim Eşleşme
        </p>
      </div>
    </div>
  );
}