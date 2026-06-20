import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const universityData = [
  { name: "SAÜ", value: 60, count: 5075 },
  { name: "SUBU", value: 40, count: 3384 },
];

const genderData = [
  { name: "Erkek", value: 70, count: 5921 },
  { name: "Kadın", value: 30, count: 2538 },
];

const weeklyData = [
  { day: "Pzt", ziyaret: 420, giris: 380 },
  { day: "Sal", ziyaret: 510, giris: 470 },
  { day: "Çar", ziyaret: 680, giris: 620 },
  { day: "Per", ziyaret: 890, giris: 840 },
  { day: "Cum", ziyaret: 1240, giris: 1150 },
  { day: "Cmt", ziyaret: 980, giris: 890 },
  { day: "Paz", ziyaret: 760, giris: 680 },
];

const COLORS = {
  SAU: "#2563EB",
  SUBU: "#059669",
  male: "#3B82F6",
  female: "#EC4899",
};

export default function Analytics() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Loglar ve İstatistikler</h1>
        <p className="text-slate-400">
          Sistemin büyümesini ve demografik yapısını analiz edin
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">Toplam Kullanıcı</p>
              <p className="text-3xl font-bold mb-2">8,459</p>
              <p className="text-sm text-emerald-400">+342 bu hafta</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">Toplam Eşleşme</p>
              <p className="text-3xl font-bold mb-2">45,231</p>
              <p className="text-sm text-blue-400">+5,234 bu hafta</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">Ortalama Oturum</p>
              <p className="text-3xl font-bold mb-2">12.4 dk</p>
              <p className="text-sm text-amber-400">+1.2 dk artış</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 - Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* University Distribution */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>Üniversite Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={universityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: %${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {universityData.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={entry.name === "SAÜ" ? COLORS.SAU : COLORS.SUBU}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${props.payload.count} kullanıcı (${value}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.SAU }}></div>
                  <span className="text-sm">Sakarya Üniversitesi</span>
                </div>
                <span className="font-semibold">5,075 kişi</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.SUBU }}></div>
                  <span className="text-sm">Sakarya Uygulamalı Bilimler</span>
                </div>
                <span className="font-semibold">3,384 kişi</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>Havuzdaki Cinsiyet Oranı</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: %${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderData.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={entry.name === "Erkek" ? COLORS.male : COLORS.female}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${props.payload.count} kişi (${value}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.male }}></div>
                  <span className="text-sm">Erkek Kullanıcılar</span>
                </div>
                <span className="font-semibold">5,921 kişi</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.female }}></div>
                  <span className="text-sm">Kadın Kullanıcılar</span>
                </div>
                <span className="font-semibold">2,538 kişi</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend Line Chart */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Haftalık Ziyaretçi ve Giriş Trendi</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="ziyaret"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Toplam Ziyaret"
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="giris"
                stroke="#10b981"
                strokeWidth={2}
                name="Aktif Giriş"
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-950 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Haftalık Toplam Ziyaret</p>
              <p className="text-2xl font-bold">5,480</p>
              <p className="text-sm text-blue-400 mt-1">Ortalama 783/gün</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Haftalık Aktif Giriş</p>
              <p className="text-2xl font-bold">5,030</p>
              <p className="text-sm text-emerald-400 mt-1">%91.8 dönüşüm oranı</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Yoğun Saatler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { hour: "00:00-04:00", percent: 5 },
              { hour: "04:00-08:00", percent: 8 },
              { hour: "08:00-12:00", percent: 35 },
              { hour: "12:00-16:00", percent: 42 },
              { hour: "16:00-20:00", percent: 78 },
              { hour: "20:00-24:00", percent: 95 },
            ].map((slot) => (
              <div key={slot.hour} className="p-3 bg-slate-950 rounded-lg">
                <p className="text-xs text-slate-400 mb-2">{slot.hour}</p>
                <div className="bg-slate-800 rounded-full h-2 mb-1">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${slot.percent}%` }}
                  ></div>
                </div>
                <p className="text-xs font-semibold">%{slot.percent}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
