import { LogOut } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";

export function Header() {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">BahoTV Admin Dashboard</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* System Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950 border border-emerald-800 rounded-lg">
          <div className="relative">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
          </div>
          <span className="text-sm text-emerald-400">Sistem Durumu: Canlı</span>
        </div>

        {/* Admin Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium">Admin</div>
            <div className="text-xs text-slate-400">admin@bahotv.com</div>
          </div>
          <Avatar>
            <AvatarFallback className="bg-blue-600 text-white">A</AvatarFallback>
          </Avatar>
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Çıkış
        </Button>
      </div>
    </header>
  );
}
