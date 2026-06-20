import { Outlet } from "react-router";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
