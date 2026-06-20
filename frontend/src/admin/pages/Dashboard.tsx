import { useState, useEffect, useRef } from "react";
import { Users, VideoIcon, Clock, AlertTriangle } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { io, Socket } from "socket.io-client";

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeUsersCount: 0,
    activeMatchesCount: 0,
    queueCount: 0,
    universityStats: {} as Record<string, number>,
    genderStats: {} as Record<string, number>
  });

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
      reconnectionAttempts: 5,
      extraHeaders: {
        "ngrok-skip-browser-warning": "true",
      },
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      socket.emit("subscribe_stats");
    });

    socket.on("system_stats_updated", (data) => {
      setStats(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const sauCount = stats.universityStats["sau"] || 0;
  const subuCount = stats.universityStats["subu"] || 0;
  const totalUniCount = Object.values(stats.universityStats).reduce((a, b) => a + b, 0);
  const sauPercent = totalUniCount > 0 ? Math.round((sauCount / totalUniCount) * 100) : 0;
  const subuPercent = totalUniCount > 0 ? Math.round((subuCount / totalUniCount) * 100) : 0;

  const maleCount = stats.genderStats["male"] || 0;
  const femaleCount = stats.genderStats["female"] || 0;
  const totalGenderCount = Object.values(stats.genderStats).reduce((a, b) => a + b, 0);
  const malePercent = totalGenderCount > 0 ? Math.round((maleCount / totalGenderCount) * 100) : 0;
  const femalePercent = totalGenderCount > 0 ? Math.round((femaleCount / totalGenderCount) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Canlı Komuta Merkezi</h1>
        <p className="text-slate-400">
          Sistemin anlık durumunu ve canlı aktiviteleri izleyin
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Anlık Toplam Online"
          value={stats.activeUsersCount.toString()}
          icon={Users}
          trend="Canlı Veri"
          trendUp={true}
          color="blue"
          isLive={true}
        />
        <StatCard
          title="Aktif Eşleşmeler"
          value={stats.activeMatchesCount.toString()}
          icon={VideoIcon}
          trend={`${stats.activeMatchesCount} oda kullanımda`}
          trendUp={true}
          color="emerald"
        />
        <StatCard
          title="Sırada Bekleyenler"
          value={stats.queueCount.toString()}
          icon={Clock}
          trend="Canlı bekleme sırası"
          color="amber"
        />
        <StatCard
          title="Bugün Gelen Şikayetler"
          value="-"
          icon={AlertTriangle}
          trend="Yakında entegre edilecek"
          color="red"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Additional Metrics - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-sm text-slate-400 mb-2">Toplam Kullanıcı</h3>
              <p className="text-2xl font-bold">{stats.activeUsersCount}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-slate-800 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${sauPercent}%` }}></div>
                </div>
                <span className="text-xs text-slate-400">{sauPercent}% SAÜ</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-sm text-slate-400 mb-2">Aktif Odalar</h3>
              <p className="text-2xl font-bold">{stats.activeMatchesCount}</p>
              <p className="text-sm text-emerald-400 mt-2">Canlı Eşleşme Sayısı</p>
            </div>
          </div>

          {/* University Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Anlık Üniversite Dağılımı (Sıradakiler)</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span className="text-sm">Sakarya Üniversitesi (SAÜ)</span>
                  </div>
                  <span className="text-sm font-semibold">{sauCount} kişi</span>
                </div>
                <div className="bg-slate-800 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${sauPercent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
                    <span className="text-sm">Sakarya Uygulamalı Bilimler (SUBU)</span>
                  </div>
                  <span className="text-sm font-semibold">{subuCount} kişi</span>
                </div>
                <div className="bg-slate-800 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${subuPercent}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Gender Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Havuzdaki Cinsiyet Oranı</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Erkek ({maleCount} kişi)</span>
                  <span className="text-sm font-semibold">{malePercent}%</span>
                </div>
                <div className="bg-slate-800 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${malePercent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Kadın ({femaleCount} kişi)</span>
                  <span className="text-sm font-semibold">{femalePercent}%</span>
                </div>
                <div className="bg-slate-800 rounded-full h-2">
                  <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${femalePercent}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
