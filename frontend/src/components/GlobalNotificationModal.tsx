import { useEffect, useState } from 'react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import api from '../utils/api';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { ComplaintAction } from '../admin/pages/Reports';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface NotificationData {
    id?: number;
    type: string | ComplaintAction;
    title: string;
    message?: string;
    reason?: string;
    banned_until?: string | null;
}

export default function GlobalNotificationModal() {
    const [queue, setQueue] = useState<NotificationData[]>([]);
    const { user, isBanned, setIsBanned } = useAuth();
    const navigate = useNavigate();

    const currentNotif = queue[0] || null;

    useEffect(() => {
        if (!user || isBanned) return;

        const executeBanProtocol = (data: Partial<NotificationData>) => {
            setIsBanned(true);

            navigate('/banned', {
                state: {
                    reason: data.message || data.reason || 'Sistem kurallarını ihlal ettiniz.',
                    until: data.type === ComplaintAction.PERMA_BAN ? 'Süresiz' : (data.banned_until || 'Süresiz')
                }
            });
        };

        const fetchUnreadNotifications = async () => {
            try {
                const res = await api.get('api/notifications/unread');
                if (res.data && res.data.length > 0) {
                    const banNotif = res.data.find((n: any) =>
                        n.type === ComplaintAction.BAN || n.type === ComplaintAction.PERMA_BAN
                    );
                    if (banNotif) executeBanProtocol(banNotif);
                    else setQueue(res.data);
                }
            } catch (error) {
                console.log("Bildirim API Hatası");
            }
        };

        fetchUnreadNotifications();

        const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const socket: Socket = io(SOCKET_URL, {
            transports: ["websocket"],
            withCredentials: true,
            reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
            if (import.meta.env.DEV) console.log('✅ Bildirim Soketi Aktif:', socket.id);
        });

        socket.on('new_notification', (notification: NotificationData) => {
            if (notification.type === ComplaintAction.BAN || notification.type === ComplaintAction.PERMA_BAN) return;
            setQueue(prev => [...prev, notification]);
            toast('Yeni bir mesajınız var!', { icon: '🔔' });
        });

        socket.on('force_logout', (data: Partial<NotificationData>) => {
            executeBanProtocol(data);
        });

        return () => {
            socket.disconnect();
        };
    }, [user, isBanned, setIsBanned, navigate]);

    const handleAcknowledge = async () => {
        if (!currentNotif) return;
        try {
            await api.put(`api/notifications/${currentNotif.id}/read`);
        } catch (error) {
            console.error("Bildirim okundu işaretlenemedi:", error);
        }
        setQueue(prev => prev.slice(1));
    };

    if (!currentNotif) return null;

    const isWarning = currentNotif.type === ComplaintAction.WARN;
    const isReject = currentNotif.type === ComplaintAction.REJECT;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`relative max-w-md w-full p-6 rounded-2xl border shadow-2xl
                ${isWarning ? 'bg-amber-950/90 border-amber-500 shadow-amber-900/50' : ''}
                ${isReject ? 'bg-slate-900 border-slate-600 shadow-slate-900/50' : ''}
                ${!isWarning && !isReject ? 'bg-blue-950/90 border-blue-500 shadow-blue-900/50' : ''}
            `}>
                <div className="flex flex-col items-center text-center">
                    <div className={`p-4 rounded-full mb-4 
                        ${isWarning ? 'bg-amber-500/20 text-amber-400' : ''}
                        ${isReject ? 'bg-slate-500/20 text-slate-400' : ''}
                        ${!isWarning && !isReject ? 'bg-blue-500/20 text-blue-400' : ''}
                    `}>
                        {isWarning && <AlertTriangle className="w-10 h-10" />}
                        {isReject && <XCircle className="w-10 h-10" />}
                        {!isWarning && !isReject && <Info className="w-10 h-10" />}
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">{currentNotif.title}</h2>
                    <p className="text-slate-300 mb-8 leading-relaxed">
                        {currentNotif.message}
                    </p>

                    <button
                        onClick={handleAcknowledge}
                        className={`w-full py-3 px-4 rounded-xl font-bold transition-all
                            ${isWarning ? 'bg-amber-500 hover:bg-amber-400 text-amber-950' : ''}
                            ${isReject ? 'bg-slate-200 hover:bg-white text-slate-900' : ''}
                            ${!isWarning && !isReject ? 'bg-blue-500 hover:bg-blue-400 text-white' : ''}
                        `}
                    >
                        {queue.length > 1 ? `Okudum, Sıradakine Geç (${queue.length - 1})` : 'Okudum, Anladım'}
                    </button>
                </div>
            </div>
        </div>
    );
}