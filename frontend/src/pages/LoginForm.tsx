import { useState } from 'react';
import { Mail, Lock, ArrowLeft, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginForm() {
  const { university } = useParams<{ university: 'sau' | 'subu' }>();
  const navigate = useNavigate();

  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const themeColors = {
    sau: {
      gradient: 'from-blue-600 to-blue-800',
      accent: 'bg-blue-600',
      hover: 'hover:bg-blue-700',
      universityName: 'Sakarya Üniversitesi',
    },
    subu: {
      gradient: 'from-emerald-600 to-teal-700',
      accent: 'bg-emerald-600',
      hover: 'hover:bg-emerald-700',
      universityName: 'Sakarya Uygulamalı Bilimler Üniversitesi',
    },
  };

  const theme = university ? themeColors[university] : themeColors.sau;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login({ email, password });
    } catch (err: any) {
      const responseData = err.response?.data;

      if (responseData && responseData.message === 'Hesabınız engellenmiştir.') {
        navigate('/banned', {
          state: {
            reason: responseData.reason || 'Topluluk kurallarını ihlal ettiniz.',
            until: responseData.banned_until
          }
        });
      } else
        setError(responseData?.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">

        {/* Geri Dön Butonu */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Geri Dön</span>
        </button>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-white text-3xl mb-2">Hoş Geldiniz</h1>
            <p className="text-white/70">{theme.universityName}</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-100 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* E-posta Input */}
            <div>
              <label className="block text-white/90 mb-2 text-sm">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@sakarya.edu.tr"
                  className="w-full bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                  required
                />
              </div>
            </div>

            {/* Şifre Input */}
            <div>
              <label className="block text-white/90 mb-2 text-sm">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-lg pl-11 pr-11 py-3 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-white focus:ring-white/30"
                />
                <span className="text-white/80 text-sm">Beni Hatırla</span>
              </label>
              <button type="button" className="text-white/80 hover:text-white text-sm transition-colors">
                Şifremi Unuttum
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full ${theme.accent} ${theme.hover} text-white rounded-lg py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Giriş Yapılıyor...</span>
                </>
              ) : (
                <span>Giriş Yap</span>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/50 text-sm">veya</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          <div className="text-center">
            <p className="text-white/70 text-sm">
              Hesabınız yok mu?{' '}
              <Link to={`/${university}/register`} className="text-white hover:underline">
                Kayııt Ol
              </Link>
            </p>
          </div>
        </div>

        <p className="text-white/50 text-xs text-center mt-6">
          Bu uygulama sadece eğitim amaçlıdır.
        </p>
      </div>
    </div>
  );
}