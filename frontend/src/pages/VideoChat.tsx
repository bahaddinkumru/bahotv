import { useState, useEffect, useRef } from "react";
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    SkipForward,
    X,
    Send,
    MessageCircle,
    Settings as SettingsIcon,
    AlertTriangle
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { ChatMessage } from "../components/ChatMessage";
import { useAuth } from "../context/AuthContext";
import toast, { Toaster } from 'react-hot-toast';
import api from "../utils/api";

export enum ComplaintReason {
    INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT', // Uygunsuz içerik paylaşımı (Ekran görüntülü)
    INSULT = 'INSULT',                               // Hakaret ve küfür
    SPAM = 'SPAM'                                    // Spam ve taciz
}

export interface Message {
    id: string;
    text: string;
    sender: "me" | "stranger";
    timestamp: Date;
}

const rtcConfig = {
    iceServers: [
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
};

export function VideoChat() {
    const navigate = useNavigate();

    const { user, logout } = useAuth();
    const university = user?.university || "sau";

    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [statusText, setStatusText] = useState("Sistem başlatılıyor...");
    const [isChatOpen, setIsChatOpen] = useState(false);

    const [isServerReady, _setIsServerReady] = useState(false);
    const isServerReadyRef = useRef(false);
    const setIsServerReady = (val: boolean) => { isServerReadyRef.current = val; _setIsServerReady(val); };

    const [isCameraReady, setIsCameraReady] = useState(false);

    const [stats, setStats] = useState({ activeMatches: 0, waitingUsers: 0, totalOnlineUsers: 0 });

    const [isNextDisabled, _setIsNextDisabled] = useState(false);
    const isNextDisabledRef = useRef(false);
    const setIsNextDisabled = (val: boolean) => { isNextDisabledRef.current = val; _setIsNextDisabled(val); };

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedReportReason, setSelectedReportReason] = useState<ComplaintReason | "">("");

    const handleReasonSelect = (reason: ComplaintReason) => {
        setSelectedReportReason(reason);
    };

    const socketRef = useRef<Socket | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const currentPartnerIdRef = useRef<string | null>(null);
    const currentPartnerDbIdRef = useRef<string | null>(null);
    const incomingStreamRef = useRef<MediaStream | null>(null);

    const myVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const themeColors = {
        sau: {
            primary: "from-blue-600 to-blue-800",
            accent: "bg-blue-600",
            hover: "hover:bg-blue-700",
        },
        subu: {
            primary: "from-emerald-600 to-teal-700",
            accent: "bg-emerald-600",
            hover: "hover:bg-emerald-700",
        },
    };
    const theme = university ? themeColors[university] : themeColors.sau;

    useEffect(() => {
        document.body.className = "min-h-screen";
        if (university === "sau") {
            document.body.classList.add(
                "bg-gradient-to-br",
                "from-blue-600",
                "to-blue-800"
            );
        } else {
            document.body.classList.add(
                "bg-gradient-to-br",
                "from-emerald-600",
                "to-teal-700"
            );
        }
        return () => {
            document.body.className = "";
        };
    }, [university]);

    useEffect(() => {

        initSystem();

        return () => {
            if (socketRef.current) {
                socketRef.current.emit("end_match");
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
            }
            stopChat(true);
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    useEffect(() => {
        if (
            isConnected &&
            remoteVideoRef.current &&
            incomingStreamRef.current
        ) {
            if (import.meta.env.DEV) console.log("Video elementi hazır, görüntü basılıyor...");
            remoteVideoRef.current.srcObject = incomingStreamRef.current;

            remoteVideoRef.current
                .play()
                .catch((e) => {
                    if (e.name === "AbortError") return;
                    if (import.meta.env.DEV) console.error("Video oynatma hatası:", e);
                });
        }
    }, [isConnected]);

    const initSystem = async () => {
        setStatusText("Kamera izni bekleniyor...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            localStreamRef.current = stream;

            if (myVideoRef.current) myVideoRef.current.srcObject = stream;
            setIsCameraReady(true);

            setStatusText("Oturum kontrol ediliyor...");
            try {
                await api.get('api/notifications/unread');
            } catch (error) {
                console.log("Öncü istek tamamlandı, soket aşamasına geçiliyor.");
            }

            setStatusText("Sunucu bağlantısı bekleniyor...");

            const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

            socketRef.current = io(SOCKET_URL, {
                transports: ["websocket"],
                withCredentials: true,
                reconnectionAttempts: 5,
                extraHeaders: {
                    "ngrok-skip-browser-warning": "true"
                }
            });

            setupSocketListeners();

        } catch (err) {
            if (import.meta.env.DEV) console.error(err);
            setStatusText("Kamera izni reddedildi!");

            toast.error("Kamera ve Mikrofon izni vermeden devam edemezsiniz.", {
                duration: 4000
            });

            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    };

    const startMatching = () => {
        if (import.meta.env.DEV) console.log("startMatching tetiklendi. States:", { isServerReady, isCameraReady, isConnected, isSearching });

        if (!localStreamRef.current || !socketRef.current) {
            if (import.meta.env.DEV) console.warn("Kamera veya Soket hazır değil.");
            return;
        }

        if (!socketRef.current.connected) {
            if (import.meta.env.DEV) console.warn("Soket koptuğu için arama yapılamıyor.");
            return;
        }

        if (!isServerReadyRef.current) {
            if (import.meta.env.DEV) console.warn("Sunucu henüz hazır değil (auth_success bekleniyor).");
            return;
        }

        stopChat(false);
        setStatusText("Öğrenci aranıyor...");
        setIsSearching(true);
        setMessages([]);

        if (import.meta.env.DEV) console.log("find_match emiti gönderiliyor...");
        socketRef.current.emit("find_match");
    };

    const setupSocketListeners = () => {
        const socket = socketRef.current;
        if (!socket) return;

        socket.on("connect", () => {
            if (import.meta.env.DEV) console.log("Socket bağlandı");

            socket.emit("subscribe_stats");
        });

        socket.on("auth_success", () => {
            if (import.meta.env.DEV) console.log("Oturum doğrulandı, eşleşme başlatılabilir.");
            setIsServerReady(true);
        });

        socket.on("error_message", (msg) => {
            if (msg.includes("yetkiniz yok")) return;

            if (msg.includes("1 dakika içinde")) {
                toast(msg, {
                    icon: '⚠️',
                    duration: 10000,
                    position: 'top-center',
                    style: { background: '#f59e0b', color: '#fff', fontWeight: 'bold' }
                });
                return;
            }

            if (msg.includes("iptal edilmiştir")) {
                toast.success(msg, {
                    duration: 6000,
                    position: 'top-center',
                    style: { background: '#10b981', color: '#fff', fontWeight: 'bold' }
                });
                return;
            }

            if (msg.includes("Sistem bakıma alındı")) {
                toast.error(msg, { duration: 8000, position: 'top-center' });
                stopChat(false);
                setStatusText("Sistem şu an bakımda. Lütfen daha sonra tekrar gelin.");
                return;
            }

            toast.error(msg, {
                duration: 4000,
                position: 'top-center',
                style: {
                    background: '#333',
                    color: '#fff',
                },
            });

            setIsSearching(false);
            setIsNextDisabled(false);
            setStatusText("");

            if (msg.includes("Oturum") || msg.includes("Token")) {

                setTimeout(() => {
                    logout();
                    navigate("/");
                }, 2000);
            }
        });

        socket.on("match_found", ({ partnerId, partnerDbId, initiator }) => {
            if (import.meta.env.DEV) console.log("Eşleşme bulundu! Partner:", partnerId, "İnitiator:", initiator);
            setIsSearching(false);
            setStatusText("Eşleşme bulundu! Bağlanıyor...");
            currentPartnerIdRef.current = partnerId;
            currentPartnerDbIdRef.current = partnerDbId;
            createPeerConnection(initiator, partnerId);
        });

        socket.on("waiting", (msg) => {
            if (import.meta.env.DEV) console.log("Bekleme durumuna geçildi:", msg);
            setIsSearching(true);
            setStatusText(msg || "Sırada bekleniyor...");
        });
        socket.on("partner_disconnected", () => {
            if (import.meta.env.DEV) console.log("Partner ayrıldı sinyali alındı. currentPartnerId:", currentPartnerIdRef.current, "isNextDisabled:", isNextDisabled);

            if (isNextDisabledRef.current) {
                if (import.meta.env.DEV) console.log("isNextDisabled aktif olduğu için otomatik arama iptal edildi (Zaten ben geçtim).");
                return;
            }

            setStatusText("Karşı taraf ayrıldı, otomatik olarak yeni kişi aranıyor...");

            stopChat(false);

            setTimeout(() => {
                if (socketRef.current && socketRef.current.connected) {
                    if (import.meta.env.DEV) console.log("Partner ayrıldığı için otomatik startMatching başlatılıyor...");
                    startMatching();
                }
            }, 1000 + Math.random() * 1500);
        });
        socket.on("signal", async ({ sender, signal }) => {
            if (sender !== currentPartnerIdRef.current) return;

            if (!peerConnectionRef.current && signal.type === "offer")
                createPeerConnection(false, sender);

            const pc = peerConnectionRef.current;
            if (!pc) return;

            try {
                if (signal.type === "offer") {
                    await pc.setRemoteDescription(
                        new RTCSessionDescription(signal)
                    );
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit("signal", { target: sender, signal: answer });
                } else if (signal.type === "answer") {
                    await pc.setRemoteDescription(
                        new RTCSessionDescription(signal)
                    );
                } else if (signal.candidate) {
                    if (pc.remoteDescription) {
                        await pc.addIceCandidate(
                            new RTCIceCandidate(signal.candidate)
                        );
                    } else {
                        console.warn('SDP bekleniyor, candidate es geçildi');
                    }
                }
            } catch (e) {
                if (import.meta.env.DEV) console.error("Sinyal hatası:", e);
            }
        });

        socket.on("disconnect", () => {
            setStatusText("Bağlantı koptu. Tekrar bağlanılıyor... 🔌");
            setIsConnected(false);
            setIsServerReady(false);
            setIsSearching(false);
        });

        socket.on('live_stats', (data) => {
            setStats(data);
        });

    };

    const stopChat = (notifyServer = true) => {
        if (import.meta.env.DEV) console.log("Sohbet durduruluyor, temizlik yapılıyor... NotifyServer:", notifyServer);

        if (dataChannelRef.current) {
            dataChannelRef.current.close();
            dataChannelRef.current = null;
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (remoteVideoRef.current)
            remoteVideoRef.current.srcObject = null;

        incomingStreamRef.current = null;

        setIsConnected(false);
        setIsSearching(false);
        currentPartnerIdRef.current = null;
        currentPartnerDbIdRef.current = null;

        if (notifyServer && socketRef.current)
            socketRef.current.emit("stop_search");
    };

    const createPeerConnection = (initiator: boolean, partnerId: string) => {
        const pc = new RTCPeerConnection(rtcConfig);
        peerConnectionRef.current = pc;

        localStreamRef.current?.getTracks().forEach((track) => {
            pc.addTrack(track, localStreamRef.current!);
        });

        pc.ontrack = (event) => {
            if (import.meta.env.DEV) console.log("Stream alındı!");
            if (event.streams && event.streams[0])
                incomingStreamRef.current = event.streams[0];
            else
                incomingStreamRef.current = new MediaStream([event.track]);

            setIsConnected(true);
            setStatusText("Bağlantı başarılı! Konuşabilirsin.");
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current?.emit("signal", {
                    target: partnerId,
                    signal: { candidate: event.candidate },
                });
            }
        };

        pc.onconnectionstatechange = () => {
            if (
                pc.connectionState === "disconnected" ||
                pc.connectionState === "failed"
            ) {
                if (import.meta.env.DEV) console.log("WebRTC bağlantısı koptu.");
                stopChat(false);
                setStatusText("Bağlantı koptu. Yeni kişi aranıyor...");
                setTimeout(() => { startMatching(); }, 1500);
            }
        };

        if (initiator) {
            const channel = pc.createDataChannel("chat");
            setupDataChannel(channel);

            pc.createOffer()
                .then((offer) => pc.setLocalDescription(offer))
                .then(() => {
                    socketRef.current?.emit("signal", {
                        target: partnerId,
                        signal: pc.localDescription,
                    });
                });
        } else {
            pc.ondatachannel = (event) => setupDataChannel(event.channel);
        }
    };

    const setupDataChannel = (channel: RTCDataChannel) => {
        dataChannelRef.current = channel;
        channel.onmessage = (event) => addMessage(event.data, "stranger");
    };

    const handleNext = () => {
        if (isNextDisabled || !socketRef.current) return;

        setIsNextDisabled(true);
        socketRef.current.emit("end_match");
        stopChat(false);
        setStatusText("Diğer kişiye geçiliyor...");

        setTimeout(() => {
            startMatching();
            setTimeout(() => {
                setIsNextDisabled(false);
            }, 1500 + Math.random() * 500);
        }, 800 + Math.random() * 700);
    };

    const handleDisconnectAndBack = async () => {
        if (socketRef.current) {
            socketRef.current.emit("end_match");
        }
        stopChat(true);
        await logout();
        navigate("/");
    };

    const toggleVideo = () => {
        setIsVideoOn(!isVideoOn);
        localStreamRef.current
            ?.getVideoTracks()
            .forEach((t) => (t.enabled = !isVideoOn));
    };

    const toggleAudio = () => {
        setIsAudioOn(!isAudioOn);
        localStreamRef.current
            ?.getAudioTracks()
            .forEach((t) => (t.enabled = !isAudioOn));
    };

    const addMessage = (text: string, sender: "me" | "stranger") => {
        setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), text, sender, timestamp: new Date() },
        ]);
    };

    const handleSendMessage = () => {
        if (!inputMessage.trim() || !dataChannelRef.current) return;
        if (dataChannelRef.current.readyState === "open") {
            dataChannelRef.current.send(inputMessage);
            addMessage(inputMessage, "me");
            setInputMessage("");
        }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (myVideoRef.current && localStreamRef.current)
            myVideoRef.current.srcObject = localStreamRef.current;

        if (remoteVideoRef.current && incomingStreamRef.current)
            remoteVideoRef.current.srcObject = incomingStreamRef.current;
    }, [isConnected]);

    useEffect(() => {
        if (isServerReady && isCameraReady)
            startMatching();
    }, [isServerReady, isCameraReady]);

    const handleReportSubmit = async () => {
        if (!selectedReportReason) return;

        const targetUserId = String(currentPartnerDbIdRef.current);

        if (
            !targetUserId ||
            targetUserId === "undefined" ||
            targetUserId === "null" ||
            isNaN(Number(targetUserId))
        ) {
            toast.error(`HATA: Karşı tarafın ID'si alınamadı! Lütfen tekrar deneyin.`);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('reportedId', targetUserId);
            formData.append('reason', selectedReportReason);

            if (selectedReportReason === ComplaintReason.INAPPROPRIATE_CONTENT) {
                const videoElement = remoteVideoRef.current;
                if (videoElement && videoElement.readyState === 4) {
                    const canvas = document.createElement('canvas');
                    canvas.width = videoElement.videoWidth;
                    canvas.height = videoElement.videoHeight;

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

                        const imageBlob = await new Promise<Blob | null>((resolve) => {
                            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
                        });

                        if (imageBlob) {
                            formData.append('evidence', imageBlob, `kanit-${Date.now()}.jpg`);
                        }
                    }
                } else {
                    console.warn("Kamera kapalı, kanıtsız gönderiliyor.");
                }
            }

            const response = await api.post(
                'api/complaint',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            if (response.data.success) {
                toast.success("Şikayetiniz yönetime iletildi.");
                setIsReportModalOpen(false);
                setSelectedReportReason("");
            }
        }
        catch (error: any) {
            console.log("🔥 BACKEND NE DİYOR:", error.response?.data);
            console.error("Şikayet hatası:", error);
            toast.error(error.response?.data?.message || "Şikayet gönderilirken bir hata oluştu.");
        }
    }

    return (
        <div className={`min-h-screen bg-gradient-to-br ${theme.primary} p-4`}>
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-4">
                <div className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-xl p-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleDisconnectAndBack}
                            className="text-white hover:bg-white/10 rounded-lg p-2"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div>
                            <h2 className="text-white font-semibold">
                                {university === "sau"
                                    ? "Sakarya Üniversitesi"
                                    : "Sakarya Uyg. Bilimler"}
                            </h2>
                            <p className="text-white/70 text-sm">
                                {statusText}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* 🔥 İSTATİSTİK GÖSTERGESİ (Sadece veriler 0'dan büyükse ve yetkiliyse görünür) */}
                        {stats.totalOnlineUsers > 0 && (
                            <div className="hidden md:flex items-center gap-3 bg-black/20 px-4 py-2 rounded-full border border-white/10 shadow-inner">
                                <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></div>
                                    <span>Online: {stats.totalOnlineUsers}</span>
                                </div>
                                <div className="w-px h-4 bg-white/20"></div>
                                <div className="flex items-center gap-1 text-white/70 text-xs" title="Sohbette / Sırada">
                                    <span>{stats.activeMatches * 2}</span>
                                    <span>/</span>
                                    <span>{stats.waitingUsers}</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => navigate("/settings")}
                            className="hidden md:flex text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
                        >
                            <SettingsIcon className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            className={`md:hidden ${theme.accent} text-white rounded-lg p-2`}
                        >
                            <MessageCircle className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content (Aynı şekilde duruyor) */}
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-140px)]">
                    {/* Video Section */}
                    <div className="md:col-span-2 flex flex-col gap-4">
                        {/* Main Video Area */}
                        <div className="flex-1 bg-black/30 backdrop-blur-sm rounded-xl overflow-hidden relative border border-white/10">
                            {/* Stranger Video (Main) */}
                            {!isConnected ? (
                                <div className="w-full h-full flex items-center justify-center text-white/50">
                                    <div className="flex flex-col items-center">
                                        <div className="animate-pulse mb-2 text-2xl tracking-widest">
                                            ● ● ●
                                        </div>
                                        <p className="font-medium">
                                            {isSearching
                                                ? "Öğrenci aranıyor..."
                                                : "Kamera bekleniyor..."}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                    style={{ transform: "scaleX(-1)" }}
                                />
                            )}

                            {/* Local Video (PiP) */}
                            <div className="absolute top-4 right-4 w-48 h-36 bg-black/50 backdrop-blur-sm rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl">
                                <video
                                    ref={myVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{ transform: "scaleX(-1)" }}
                                    className={`w-full h-full object-cover ${!isVideoOn ? "hidden" : ""}`}
                                />
                                {!isVideoOn && (
                                    <div className="absolute inset-0 flex items-center justify-center text-white/50">
                                        <VideoOff className="w-8 h-8" />
                                    </div>
                                )}
                                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded-full text-white text-xs font-medium">
                                    Sen
                                </div>
                            </div>

                            {/* Stranger Label */}
                            {isConnected && (
                                <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm backdrop-blur-sm font-medium">
                                    Yabancı
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/5">
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={toggleVideo}
                                    className={`${isVideoOn
                                        ? "bg-white/20"
                                        : "bg-red-500"
                                        } hover:bg-white/30 text-white rounded-full p-4 transition-all shadow-lg`}
                                >
                                    {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                                </button>
                                <button
                                    onClick={toggleAudio}
                                    className={`${isAudioOn
                                        ? "bg-white/20"
                                        : "bg-red-500"
                                        } hover:bg-white/30 text-white rounded-full p-4 transition-all shadow-lg`}
                                >
                                    {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                                </button>

                                <button
                                    onClick={() => setIsReportModalOpen(true)}
                                    disabled={!isConnected}

                                    className={`p-4 rounded-full transition-all shadow-lg group ${!isConnected
                                        ? "bg-white/10 text-gray-400 cursor-not-allowed opacity-50"
                                        : "bg-white/20 hover:bg-red-500 text-white"
                                        }`}
                                    title="Kullanıcıyı Şikayet Et"
                                >
                                    <AlertTriangle className={`w-6 h-6 ${isConnected ? "group-hover:animate-pulse" : ""}`} />
                                </button>

                                <button
                                    onClick={handleNext}
                                    disabled={isNextDisabled || !isServerReady || !isConnected}
                                    className={`${theme.accent} hover:brightness-110 text-white rounded-full px-8 py-4 flex items-center gap-2 transition-all shadow-lg shadow-black/20 ${(isNextDisabled || !isServerReady || !isConnected)
                                        ? "opacity-50 cursor-not-allowed transform scale-95"
                                        : "hover:scale-105"
                                        }`}
                                >
                                    <span className="font-semibold hidden sm:inline">Sonraki</span>
                                    <SkipForward className="w-6 h-6" />
                                </button>

                                <button
                                    onClick={() => navigate("/settings")}
                                    className="md:hidden bg-white/20 hover:bg-white/30 text-white rounded-full p-4 transition-all"
                                >
                                    <SettingsIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Chat Section */}
                    <div
                        className={`${isChatOpen ? "flex" : "hidden"
                            } md:flex flex-col bg-white/10 backdrop-blur-md rounded-xl overflow-hidden fixed md:relative inset-4 md:inset-auto z-50 md:z-auto border border-white/5 shadow-2xl md:shadow-none`}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
                            <h3 className="text-white font-medium flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-white/70" />
                                Sohbet
                            </h3>
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="md:hidden text-white hover:bg-white/10 rounded-lg p-1 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 && (
                                <div className="text-center text-white/30 mt-10">
                                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">Henüz mesaj yok.</p>
                                    <p className="text-xs mt-1">
                                        Sohbete başlamak için bir şeyler yazın
                                    </p>
                                </div>
                            )}
                            {messages.map((msg) => (
                                <ChatMessage key={msg.id} message={msg} />
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="p-4 border-t border-white/10 bg-black/10">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                                    placeholder={
                                        isConnected
                                            ? "Mesaj yaz..."
                                            : "Bağlantı bekleniyor..."
                                    }
                                    disabled={!isConnected}
                                    className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50 transition-all"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!isConnected || !inputMessage.trim()}
                                    className={`${theme.accent} text-white rounded-xl p-3 disabled:opacity-50 transition-all hover:brightness-110 active:scale-95`}
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Toaster />

            {/* ŞİKAYET MODALI (UI) */}
            {isReportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all">

                        {/* Başlık */}
                        <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <AlertTriangle className="text-red-500 w-6 h-6" />
                            Kullanıcıyı Şikayet Et
                        </h2>

                        {/* Bilgilendirme Metni */}
                        <p className="text-gray-500 mb-6 text-sm">
                            Lütfen şikayet sebebinizi seçin. <span className="font-semibold text-red-500">Uygunsuz içerik</span> bildirimlerinde sistem otomatik olarak ekran görüntüsü alacaktır.
                        </p>

                        {/* Seçenekler (Enum'lara karşılık gelen butonlar) */}
                        <div className="flex flex-col gap-3 mb-6">
                            <button
                                onClick={() => handleReasonSelect(ComplaintReason.INAPPROPRIATE_CONTENT)}
                                className={`p-3 rounded-xl border-2 text-left transition-all ${selectedReportReason === ComplaintReason.INAPPROPRIATE_CONTENT ? 'border-red-500 bg-red-50 text-red-700 font-bold' : 'border-gray-100 hover:bg-gray-50 text-gray-700'}`}
                            >
                                🚫 Uygunsuz içerik paylaşımı
                            </button>

                            <button
                                onClick={() => handleReasonSelect(ComplaintReason.INSULT)}
                                className={`p-3 rounded-xl border-2 text-left transition-all ${selectedReportReason === ComplaintReason.INSULT ? 'border-red-500 bg-red-50 text-red-700 font-bold' : 'border-gray-100 hover:bg-gray-50 text-gray-700'}`}
                            >
                                🤬 Hakaret ve küfür
                            </button>

                            <button
                                onClick={() => handleReasonSelect(ComplaintReason.SPAM)}
                                className={`p-3 rounded-xl border-2 text-left transition-all ${selectedReportReason === ComplaintReason.SPAM ? 'border-red-500 bg-red-50 text-red-700 font-bold' : 'border-gray-100 hover:bg-gray-50 text-gray-700'}`}
                            >
                                🛑 Spam ve taciz
                            </button>
                        </div>

                        {/* Aksiyon Butonları (İptal / Gönder) */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsReportModalOpen(false);
                                    setSelectedReportReason("");
                                }}
                                className="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-all font-medium"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleReportSubmit}
                                disabled={!selectedReportReason}
                                className={`px-5 py-2.5 rounded-xl text-white font-medium transition-all ${!selectedReportReason ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'}`}
                            >
                                Şikayet Et
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}