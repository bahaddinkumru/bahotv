import { useState } from 'react';
import { Mail, Lock, ArrowLeft, Eye, EyeOff, GraduationCap, User, Key } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RegisterForm() {
  const { university } = useParams<{ university: 'sau' | 'subu' }>();
  const navigate = useNavigate();

  const { register, verify } = useAuth();

  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [verificationCode, setVerificationCode] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    gender: '' as 'male' | 'female' | '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const themeColors = {
    sau: {
      gradient: 'from-blue-600 to-blue-800',
      accent: 'bg-blue-600',
      hover: 'hover:bg-blue-700',
      universityName: 'Sakarya Üniversitesi',
      emailDomain: '@sakarya.edu.tr',
    },
    subu: {
      gradient: 'from-emerald-600 to-teal-700',
      accent: 'bg-emerald-600',
      hover: 'hover:bg-emerald-700',
      universityName: 'Sakarya Uygulamalı Bilimler Üniversitesi',
      emailDomain: '@subu.edu.tr',
    },
  };

  const theme = university ? themeColors[university] : themeColors.sau;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.surname || !formData.email ||
      !formData.gender || !formData.password || !formData.confirmPassword) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }
    if (!formData.email.toLowerCase().includes(theme.emailDomain.replace('@', ''))) {
      setError(`Lütfen geçerli bir ${theme.emailDomain} adresi giriniz`);
      return;
    }
    if (!acceptTerms) {
      setError('Kullanım koşullarını kabul etmelisiniz');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        gender: formData.gender as 'male' | 'female',
        password: formData.password,
        university: university || 'sau',
      });

      setStep('verify');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Kayıt başarısız.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await verify({
        email: formData.email,
        code: verificationCode
      });

    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Hatalı kod girdiniz.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">

        {/* Geri Dön Butonu */}
        <button
          onClick={() => step === 'verify' ? setStep('register') : navigate('/')}
          className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{step === 'verify' ? 'Forma Dön' : 'Geri Dön'}</span>
        </button>

        {/* Ana Kart */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl max-h-[calc(100vh-120px)] overflow-y-auto transition-all duration-300">

          {/* Başlık Kısmı */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-fadeIn">
              {step === 'verify' ? (
                <Key className="w-8 h-8 text-white animate-pulse" />
              ) : (
                <GraduationCap className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-white text-3xl mb-2">
              {step === 'verify' ? 'Hesabı Doğrula' : 'Kayıt Ol'}
            </h1>
            <p className="text-white/70">
              {step === 'verify'
                ? `${formData.email} adresine gelen 6 haneli kodu girin.`
                : theme.universityName}
            </p>
          </div>

          {/* Hata Mesajı Kutusu */}
          {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 animate-shake">
              <p className="text-red-100 text-sm font-medium flex items-center gap-2">⚠️ {error}</p>
            </div>
          )}

          {step === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4 animate-fadeIn">
              {/* Ad & Soyad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/90 mb-2 text-sm">Ad</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Ahmet"
                      className="w-full bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white/90 mb-2 text-sm">Soyad</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                    <input
                      type="text"
                      name="surname"
                      value={formData.surname}
                      onChange={handleChange}
                      placeholder="Yılmaz"
                      className="w-full bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-white/90 mb-2 text-sm">E-posta</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={`ornek${theme.emailDomain}`}
                    className="w-full bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Cinsiyet */}
              <div>
                <label className="block text-white/90 mb-2 text-sm">Cinsiyet</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full bg-white/10 text-white border border-white/20 rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all appearance-none cursor-pointer"
                    required
                  >
                    <option value="" className="bg-gray-800">Cinsiyet Seçin</option>
                    <option value="male" className="bg-gray-800">Erkek</option>
                    <option value="female" className="bg-gray-800">Kadın</option>
                  </select>
                </div>
              </div>

              {/* Şifre */}
              <div>
                <label className="block text-white/90 mb-2 text-sm">Şifre</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
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

              {/* Şifre Tekrar */}
              <div>
                <label className="block text-white/90 mb-2 text-sm">Şifre Tekrar</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-lg pl-11 pr-11 py-3 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Koşullar */}
              <div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="w-4 h-4 mt-1 rounded border-white/20 bg-white/10 text-white focus:ring-white/30"
                  />
                  <span className="text-white/80 text-sm">
                    <a href="#" className="underline hover:text-white">Kullanım koşullarını</a> kabul ediyorum
                  </span>
                </label>
              </div>

              {/* Kayıt Ol Butonu */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full ${theme.accent} ${theme.hover} text-white rounded-lg py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>İşleniyor...</span>
                  </>
                ) : (
                  <span>Kayıt Ol</span>
                )}
              </button>
            </form>

          ) : (

            <form onSubmit={handleVerify} className="space-y-6 animate-fadeIn">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <p className="text-white/80 text-sm">
                  Mail kutunuzu (Spam klasörü dahil) kontrol ediniz. Kod 15 dakika geçerlidir.
                </p>
              </div>

              <div>
                <label className="block text-white/90 mb-2 text-sm text-center">Doğrulama Kodu</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value) && e.target.value.length <= 6) {
                        setVerificationCode(e.target.value);
                      }
                    }}
                    placeholder="123456"
                    className="w-full bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-lg pl-11 pr-4 py-4 text-2xl tracking-[0.5em] text-center font-bold focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                    required
                    maxLength={6}
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className={`w-full ${theme.accent} ${theme.hover} text-white rounded-lg py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Doğrulanıyor...</span>
                  </>
                ) : (
                  <span>Doğrula ve Giriş Yap</span>
                )}
              </button>
            </form>
          )}

          {/* Ayırıcı ve Giriş Linki (Sadece Kayıt adımında göster) */}
          {step === 'register' && (
            <>
              <div className="my-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-white/50 text-sm">veya</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>
              <div className="text-center">
                <p className="text-white/70 text-sm">
                  Zaten hesabınız var mı?{' '}
                  <Link
                    to={`/${university}/login`}
                    className="text-white hover:underline"
                  >
                    Giriş Yap
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-white/50 text-xs text-center mt-6">
          Bu uygulama sadece eğitim amaçlıdır.
        </p>
      </div>
    </div>
  );
}