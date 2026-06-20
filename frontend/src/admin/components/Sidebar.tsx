import { useState } from "react";
import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";

const menuItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/reports", label: "Şikayetler", icon: AlertTriangle, badge: 12 },
  { path: "/admin/users", label: "Kullanıcılar", icon: Users },
  { path: "/admin/settings", label: "Sistem Ayarları", icon: Settings },
  { path: "/admin/analytics", label: "İstatistikler", icon: BarChart3 },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={`bg-slate-900 border-r border-slate-800 transition-all duration-300 ${collapsed ? "w-16" : "w-64"
        } flex flex-col`}
    >
      {/* Logo & Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-lg flex items-center justify-center font-bold">
              B
            </div>
            <span className="font-bold text-lg">BahoTV</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-slate-800 rounded-md transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${isActive
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge className="bg-red-600 text-white hover:bg-red-600">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Admin Info */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500">Admin Panel v1.0</div>
          <div className="text-xs text-slate-600 mt-1">BahoTV Dashboard</div>
        </div>
      )}
    </aside>
  );
}
