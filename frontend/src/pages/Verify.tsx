import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Verify = () => {
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);

    const { verify, isLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            navigate('/');
        }
    }, [email, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);

        if (!code || code.length < 6) {
            setStatus({ type: 'error', message: 'Lütfen 6 haneli kodu eksiksiz giriniz.' });
            return;
        }

        try {
            await verify({ email, code });

            setStatus({ type: 'success', message: 'Doğrulama başarılı! Yönlendiriliyorsunuz...' });

        } catch (err: any) {
            const backendMessage = err.message;

            if (backendMessage === 'Kodun süresi dolmuş. Yeni doğrulama kodu gönderildi.') {
                setStatus({
                    type: 'info',
                    message: 'Girdiğiniz kodun süresi dolmuş. E-postanıza yeni bir kod gönderdik, lütfen onu giriniz.'
                });
                setCode('');
            }
            else if (backendMessage?.includes('saniye sonra tekrar deneyin')) {
                setStatus({ type: 'error', message: backendMessage });
            }
            else {
                setStatus({ type: 'error', message: backendMessage || 'Doğrulama başarısız.' });
            }
        }
    };

    if (!email) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                {/* Cam Efektli Kart */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-400/30">
                            <ShieldCheck className="w-8 h-8 text-blue-400" />
                        </div>
                        <h1 className="text-white text-2xl font-bold mb-2">Hesabını Doğrula</h1>
                        <p className="text-white/60 text-sm">
                            <span className="text-white font-medium">{email}</span> adresine gönderilen 6 haneli kodu giriniz.
                        </p>
                    </div>

                    {/* Durum Mesajları (Alerts) */}
                    {status && (
                        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 border ${status.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-200' :
                            status.type === 'info' ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' :
                                'bg-green-500/20 border-green-500/50 text-green-200'
                            }`}>
                            {status.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
                            {status.type === 'info' && <RefreshCw className="w-5 h-5 shrink-0" />}
                            {status.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                            <p className="text-sm">{status.message}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-white/80 mb-2 text-sm font-medium">Doğrulama Kodu</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    if (val.length <= 6) setCode(val);
                                }}
                                placeholder="123456"
                                className="w-full bg-black/20 text-white text-center text-2xl tracking-[0.5em] placeholder-white/20 border border-white/10 rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || code.length !== 6}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl py-3.5 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Kontrol Ediliyor...</span>
                                </>
                            ) : (
                                <>
                                    <span>Onayla ve Giriş Yap</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Alt Bilgi */}
                    <div className="mt-8 text-center">
                        <p className="text-white/40 text-xs">
                            Kodu almadınız mı? Spam klasörünü kontrol edin.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};