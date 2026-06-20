import { useEffect, useState } from "react";
import { Power } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import { Badge } from "../../components/ui/badge";
import adminApi from "../../utils/admin.api";
import toast from "react-hot-toast";

export default function Settings() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await adminApi.get('/maintenance');

        setMaintenanceMode(response.data.maintenance_mode);
      } catch (error) {
        console.error("Ayarlar çekilemedi:", error);
        toast.error("Sistem ayarları yüklenemedi!");
      }
    };

    fetchSettings();
  }, []);

  const handleMaintenanceToggle = async (checked: boolean) => {
    if (isLoading) return;

    setMaintenanceMode(checked);
    setIsLoading(true);

    try {
      const response = await adminApi.post('/maintenance', { is_active: checked });

      if (checked) {
        toast.error("🚨 " + response.data.message, {
          duration: 5000,
          style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' }
        });
      } else {
        toast.success("✅ " + response.data.message, {
          duration: 4000,
          style: { background: '#10b981', color: '#fff', fontWeight: 'bold' }
        });
      }
    } catch (error) {

      setMaintenanceMode(!checked);
      toast.error("İşlem başarısız! Yetkiniz olmayabilir.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Sistem Ayarları</h1>
        <p className="text-slate-400">
          Sistem davranışlarını ve güvenlik ayarlarını yönetin
        </p>
      </div>

      {/* Normal Settings */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Genel Ayarlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Maintenance Mode */}
          <div className="flex items-start justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-amber-950 rounded-lg">
                <Power className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">Bakım Modu</h3>
                  {maintenanceMode && (
                    <Badge className="bg-amber-600">Aktif</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  Eşleşme havuzunu durdurur ve tüm kullanıcıları sıradan atar.
                  Sistemde teknik çalışma yapılacağında kullanılır.
                </p>
                {maintenanceMode && (
                  <div className="mt-2 p-2 bg-amber-950/50 border border-amber-800 rounded text-xs text-amber-400">
                    ⚠️ Bakım modu aktif - Yeni eşleşmeler yapılamıyor
                  </div>
                )}
              </div>
            </div>
            <Switch
              checked={maintenanceMode}
              onCheckedChange={handleMaintenanceToggle}
              className="ml-4"
            />
          </div>


          {/* Rate Limit Slider */}
          {/* <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-purple-950 rounded-lg">
                <Gauge className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 text-white">Rate Limit (Hız Sınırı)</h3>
                <p className="text-sm text-slate-400">
                  Kullanıcıların 10 saniyede yapabileceği maksimum geçiş sayısını belirler.
                  Spam ve kötüye kullanımı önler.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Mevcut Limit:</span>
                <span className="font-bold text-lg">{rateLimit[0]} geçiş / 10 saniye</span>
              </div>

              <Slider
                value={rateLimit}
                onValueChange={setRateLimit}
                min={1}
                max={15}
                step={1}
                className="py-4"
              />

              <div className="flex justify-between text-xs text-slate-500">
                <span>Çok Kısıtlı (1)</span>
                <span>Dengeli (6-8)</span>
                <span>Serbest (15)</span>
              </div>
            </div>
          </div> */}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Sistem Bilgisi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Sunucu Durumu:</span>
              <span className="ml-2 text-emerald-400 font-semibold">● Online</span>
            </div>
            <div>
              <span className="text-slate-400">Aktif Bağlantı:</span>
              <span className="ml-2 font-semibold">1,247</span>
            </div>
            <div>
              <span className="text-slate-400">Sunucu Yükü:</span>
              <span className="ml-2 font-semibold">23%</span>
            </div>
            <div>
              <span className="text-slate-400">Çalışma Süresi:</span>
              <span className="ml-2 font-semibold">7 gün 14 saat</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
