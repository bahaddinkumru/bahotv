import { useEffect, useState } from 'react';
import { ShieldAlert, Image as ImageIcon, CalendarX, CalendarClock } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export function BannedPage() {
    const { user } = useAuth();
    const location = useLocation();
    const stateData = location.state as { reason?: string; until?: string } | null;

    const [banReason, setBanReason] = useState(stateData?.reason || 'Sistem kurallarını ihlal ettiğiniz için platformdan uzaklaştırıldınız.');
    const [proofImage, setProofImage] = useState<string | null>(null);
    const [bannedAt, setBannedAt] = useState<string | null>(null);
    const [bannedUntil, setBannedUntil] = useState<string | null>(stateData?.until || null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const fetchPenaltyDetails = async () => {
            try {
                const response = await api.get(`api/user/penalty/me`);
                const penalty = response.data;

                if (penalty) {
                    if (penalty.ban_reason) setBanReason(penalty.ban_reason);
                    if (penalty.proofImageUrl) setProofImage(penalty.proofImageUrl);

                    if (penalty.banned_at) {
                        setBannedAt(new Date(penalty.banned_at).toLocaleDateString('tr-TR', {
                            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }));
                    }

                    if (penalty.banned_until) {
                        setBannedUntil(new Date(penalty.banned_until).toLocaleDateString('tr-TR', {
                            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }));
                    } else {
                        setBannedUntil('KALICI BAN (Süresiz)');
                    }
                }
            } catch (error) {
                console.error("Ceza detayı çekilirken hata oluştu:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPenaltyDetails();
    }, [user]);

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-red-950/90 backdrop-blur-md border border-red-500 p-8 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.4)] text-center animate-in zoom-in duration-300">
                    <ShieldAlert className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-2">Erişim Engellendi</h2>
                    <p className="text-red-200 mb-6 text-sm">Hesabınız platform kurallarını ihlal ettiği için askıya alınmıştır.</p>

                    <div className="bg-black/40 p-4 rounded-lg text-left mb-6 border border-red-900">
                        {isLoading ? (
                            <div className="flex justify-center py-4">
                                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-slate-400 mb-1">Engellenme Sebebi:</p>
                                <p className="font-semibold text-white mb-5 text-sm">{banReason}</p>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    {bannedAt && (
                                        <div className="bg-black/30 p-2 rounded border border-red-900/30">
                                            <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                                                <CalendarX className="w-3 h-3" /> Ceza Başlangıcı
                                            </p>
                                            <p className="font-medium text-slate-300 text-xs">{bannedAt}</p>
                                        </div>
                                    )}

                                    {bannedUntil && (
                                        <div className="bg-red-900/20 p-2 rounded border border-red-500/30">
                                            <p className="text-[10px] text-red-300 mb-1 flex items-center gap-1">
                                                <CalendarClock className="w-3 h-3" /> Ceza Bitişi
                                            </p>
                                            <p className="font-bold text-red-400 text-xs">{bannedUntil}</p>
                                        </div>
                                    )}
                                </div>

                                {proofImage && (
                                    <div className="mt-4 pt-4 border-t border-red-900/50">
                                        <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                                            <ImageIcon className="w-4 h-4" /> İhlal Görüntüsü (Kanıt):
                                        </p>
                                        <div className="rounded-lg overflow-hidden border border-red-900/50 relative group">
                                            <img
                                                src={`${import.meta.env.VITE_API_URL || ''}${proofImage.replace(/^\//, '')}`}
                                                alt="Ban Kanıtı"
                                                className="w-full h-auto object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}