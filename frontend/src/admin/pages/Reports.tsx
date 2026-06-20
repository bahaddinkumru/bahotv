import { useEffect, useState } from "react";
import { AlertTriangle, User, Ban, AlertCircle, X, Eye, EyeOff, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import api from "../../utils/api";
import toast, { Toaster } from 'react-hot-toast';
import { io, Socket } from "socket.io-client";

export enum ComplaintStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED'
}

export enum ComplaintReason {
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  INSULT = 'INSULT',
  SPAM = 'SPAM'
}

export enum ComplaintAction {
  BAN = 'BAN',
  PERMA_BAN = 'PERMA_BAN',
  WARN = 'WARN',
  REJECT = 'REJECT'
}

const ReasonTranslations: Record<ComplaintReason, string> = {
  [ComplaintReason.INAPPROPRIATE_CONTENT]: "🚫 Uygunsuz içerik paylaşımı",
  [ComplaintReason.INSULT]: "🤬 Hakaret ve küfür",
  [ComplaintReason.SPAM]: "🛑 Spam ve taciz",
};

const StatusTranslations: Record<ComplaintStatus, string> = {
  [ComplaintStatus.PENDING]: "Bekliyor",
  [ComplaintStatus.RESOLVED]: "Çözüldü",
  [ComplaintStatus.REJECTED]: "Reddedildi",
};

const ActionTranslations: Record<ComplaintAction, string> = {
  [ComplaintAction.BAN]: "Kullanıcıyı Banla",
  [ComplaintAction.PERMA_BAN]: "Kullanıcıyı Kalıcı Banla",
  [ComplaintAction.WARN]: "Uyarı Gönder",
  [ComplaintAction.REJECT]: "Şikayeti Reddet",
};

interface UserShortInfo {
  id: number;
  name: string;
  surname: string;
  email: string;
}

interface Report {
  id: number;
  reporter: UserShortInfo;
  reported: UserShortInfo;
  reason: ComplaintReason;
  createdAt: string;
  status: ComplaintStatus;
  proofImageUrl?: string | null;
  adminNote?: string; // İleride çözülmüşleri listelerken okumak için
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [imageBlurred, setImageBlurred] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ComplaintAction | null>(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    const fetchPendingReports = async () => {
      try {
        const response = await api.get("/api/complaint/pending");
        const reportsData = Array.isArray(response.data)
          ? response.data
          : (response.data?.data || response.data?.complaints || []);
        setReports(reportsData);
        if (reportsData.length > 0) setSelectedReport(reportsData[0]);
      } catch (error) {
        console.error("İSTEK SIRASINDA HATA:", error);
        toast.error("Şikayetler yüklenemedi!");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPendingReports();
  }, []);

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("connect", () => socket.emit("join_admin_room"));
    socket.on("new_complaint", (newReport: Report) => {
      toast('🚨 YENİ ŞİKAYET GELDİ!', {
        style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' },
      });
      setReports((prev) => [...prev, newReport]);
    });

    return () => {
      socket.emit("leave_admin_room");
      socket.disconnect();
    };
  }, []);

  const getImageUrl = (url?: string | null) => {
    if (!url) return "https://via.placeholder.com/400x300/1e293b/cbd5e1?text=Görsel+Yok";
    if (url.startsWith('http')) return url;
    return `http://localhost:4000${url}`;
  };

  const openConfirmModal = (action: ComplaintAction) => {
    setPendingAction(action);
    setAdminNote("");
    setIsModalOpen(true);
  };

  const executeAction = async () => {
    if (!selectedReport || !pendingAction) return;

    try {
      const payload = {
        reportId: selectedReport.id,
        action: pendingAction,
        adminNote: adminNote.trim() !== "" ? adminNote : null
      };
      await api.post("/api/complaint/action", payload);

      console.log("🔥 BACKEND'E GİDEN VERİ:", payload);
      toast.success("Aksiyon başarıyla uygulandı.");

      const updatedReports = reports.filter((r) => r.id !== selectedReport.id);
      setReports(updatedReports);
      setSelectedReport(updatedReports.length > 0 ? updatedReports[0] : null);
      setImageBlurred(true);
    } catch (error) {
      toast.error("Aksiyon alınırken bir hata oluştu.");
    } finally {
      setIsModalOpen(false);
      setPendingAction(null);
      setAdminNote("");
    }
  };

  if (isLoading) return <div className="p-6 text-white flex justify-center items-center h-full">Yükleniyor...</div>;

  return (
    <div className="relative p-6 h-full">
      <Toaster />
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Şikayet ve İnfaz Modülü</h1>
        <p className="text-slate-400">Kullanıcı şikayetlerini inceleyin ve hızlı aksiyon alın</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* SOL TARAF - LİSTE */}
        <div className="lg:col-span-1">
          <Card className="bg-slate-900 border-slate-800 h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Şikayet Biletleri</span>
                <Badge className="bg-red-600">{reports.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-340px)]">
                <div className="space-y-2">
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => {
                        setSelectedReport(report);
                        setImageBlurred(true);
                      }}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${selectedReport?.id === report.id
                        ? "bg-slate-800 border-blue-600"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 truncate">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="font-semibold text-sm shrink-0 text-white">#{report.id}</span>
                          {/* 🔥 ÇÖZÜM 1: report.reported?.name diyerek zırhladık! */}
                          <span className="text-xs text-slate-400 truncate ml-1">
                            ({report.reported?.name || "Bilinmeyen"} {report.reported?.surname || "Kullanıcı"})
                          </span>
                        </div>
                        <Badge className="bg-amber-600 text-xs shrink-0">
                          {StatusTranslations[report.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-300 mb-1">{ReasonTranslations[report.reason] || report.reason}</p>
                      <p className="text-xs text-slate-500">{new Date(report.createdAt).toLocaleString('tr-TR')}</p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* SAĞ TARAF - DETAYLAR */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <Card className="bg-slate-900 border-slate-800 h-full">
              <CardHeader>
                <CardTitle>Şikayet Detayı #{selectedReport.id}</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-340px)]">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Şikayet Eden */}
                      <div className="bg-blue-950 border border-blue-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-semibold text-blue-400">Şikayet Eden</span>
                        </div>
                        {/* 🔥 ÇÖZÜM 2: selectedReport.reporter?.name diyerek zırhladık! */}
                        <p className="font-semibold text-white">
                          {selectedReport.reporter?.name || "Bilinmeyen"} {selectedReport.reporter?.surname || "Kullanıcı"}
                        </p>
                        <p className="text-sm text-blue-300 mb-2 truncate" title={selectedReport.reporter?.email || "Email Yok"}>
                          {selectedReport.reporter?.email || "Email Yok"}
                        </p>
                        <Badge variant="outline" className="border-blue-700 text-blue-400 text-xs">
                          ID: {selectedReport.reporter?.id || "?"}
                        </Badge>
                      </div>

                      {/* Şikayet Edilen */}
                      <div className="bg-red-950 border border-red-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-semibold text-red-400">Şikayet Edilen (Şüpheli)</span>
                        </div>
                        {/* 🔥 ÇÖZÜM 3: selectedReport.reported?.name diyerek zırhladık! */}
                        <p className="font-semibold text-white">
                          {selectedReport.reported?.name || "Bilinmeyen"} {selectedReport.reported?.surname || "Kullanıcı"}
                        </p>
                        <p className="text-sm text-red-300 mb-2 truncate" title={selectedReport.reported?.email || "Email Yok"}>
                          {selectedReport.reported?.email || "Email Yok"}
                        </p>
                        <Badge variant="outline" className="border-red-700 text-red-400 text-xs">
                          ID: {selectedReport.reported?.id || "?"}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-white mb-2">Şikayet Nedeni</h3>
                      <p className="text-slate-300 bg-slate-950 p-4 rounded-lg border border-slate-800">
                        {ReasonTranslations[selectedReport.reason] || selectedReport.reason}
                      </p>
                    </div>

                    {selectedReport.proofImageUrl && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-white">Kanıt Görseli</h3>
                          <Button variant="outline" size="sm" onClick={() => setImageBlurred(!imageBlurred)} className="text-xs">
                            {imageBlurred ? <><Eye className="w-3 h-3 mr-1" /> Görseli Göster</> : <><EyeOff className="w-3 h-3 mr-1" /> Görseli Gizle</>}
                          </Button>
                        </div>
                        <div className="relative rounded-lg overflow-hidden border border-slate-800">
                          <img src={getImageUrl(selectedReport.proofImageUrl)} alt="Kanıt Görseli" className={`w-full max-h-[400px] object-contain bg-black transition-all duration-300 ${imageBlurred ? "blur-2xl" : "blur-none"}`} />
                          {imageBlurred && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50">
                              <div className="text-center">
                                <EyeOff className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                                <p className="text-sm text-slate-400">Hassas içerik bulanıklaştırıldı</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                        Aksiyon Al
                        <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Lütfen dikkatli seçin</span>
                      </h3>

                      {/* ÜST SATIR: Standart İşlemler (3 Sütun) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <Button onClick={() => openConfirmModal(ComplaintAction.REJECT)} variant="outline" className="border-slate-700 text-black hover:bg-slate-700 hover:text-white">
                          <X className="w-4 h-4 mr-2" /> Şikayeti Reddet
                        </Button>

                        <Button onClick={() => openConfirmModal(ComplaintAction.WARN)} className="bg-amber-600 hover:bg-amber-700 text-white">
                          <AlertCircle className="w-4 h-4 mr-2" /> Uyarı Gönder
                        </Button>

                        <Button onClick={() => openConfirmModal(ComplaintAction.BAN)} className="bg-red-600 hover:bg-red-700 text-white">
                          <Ban className="w-4 h-4 mr-2" /> Süreli Banla
                        </Button>
                      </div>

                      {/* ALT SATIR: Nükleer Seçenek (Tam Genişlik) */}
                      <Button
                        onClick={() => openConfirmModal(ComplaintAction.PERMA_BAN)}
                        className="w-full bg-red-950 border border-red-600 text-red-400 hover:bg-red-900 hover:text-red-300 transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        <span className="font-bold tracking-wider">KULLANICIYI KALICI OLARAK BANLA (SİL)</span>
                      </Button>
                    </div>

                    <div className="text-xs text-slate-500 pt-4 border-t border-slate-800">
                      Şikayet Zamanı: {new Date(selectedReport.createdAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900 border-slate-800 h-full flex items-center justify-center">
              <div className="text-center text-slate-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Bekleyen şikayet bulunmamaktadır. Harika iş çıkardınız!</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 🔥 ZENGİNLEŞTİRİLMİŞ ONAY MODALI 🔥 */}
      {
        isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                <h2 className="text-xl font-bold text-white">Emin misiniz?</h2>
              </div>

              <p className="text-slate-300 mb-4">
                Seçili şikayet için <strong className="text-white">{pendingAction && ActionTranslations[pendingAction]}</strong> işlemini onaylıyor musunuz?
              </p>

              {/* 🔥 YENİ: ADMIN NOTU TEXTAREA 🔥 */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-2">
                  <FileText className="w-4 h-4" /> Admin Notu (İsteğe Bağlı)
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Bu aksiyonu neden aldığınızı buraya yazabilirsiniz..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-all"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setPendingAction(null);
                    setAdminNote("");
                  }}
                  className="border-slate-700 hover:bg-slate-300 text-black"
                >
                  İptal
                </Button>
                <Button
                  onClick={executeAction}
                  className={`${pendingAction === ComplaintAction.BAN ? "bg-red-600 hover:bg-red-700" :
                    pendingAction === ComplaintAction.WARN ? "bg-amber-600 hover:bg-amber-700" :
                      "bg-blue-600 hover:bg-blue-700"
                    } text-white`}
                >
                  Evet, Onaylıyorum
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}