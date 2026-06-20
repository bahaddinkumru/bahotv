import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: "blue" | "emerald" | "red" | "amber";
  isLive?: boolean;
}

const colorClasses = {
  blue: "bg-blue-600",
  emerald: "bg-emerald-600",
  red: "bg-red-600",
  amber: "bg-amber-600",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  color = "blue",
  isLive,
}: StatCardProps) {
  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
              {title}
              {isLive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </p>
            <p className="text-3xl font-bold mb-2">{value}</p>
            {trend && (
              <p
                className={`text-sm ${
                  trendUp ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {trend}
              </p>
            )}
          </div>
          <div className={`p-3 ${colorClasses[color]} rounded-lg`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
