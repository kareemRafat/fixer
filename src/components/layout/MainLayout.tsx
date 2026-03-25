import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Database, History, Activity, Settings, Menu, ClipboardClock } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const SidebarItem = ({ to, icon, label }: SidebarItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? "bg-secondary text-secondary-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r flex flex-col shrink-0">
        <div className="p-6 border-b flex items-center gap-3">
          <img src="/logo.png" alt="DBGuardX Logo" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-bold text-xl tracking-wide text-[#226694]">DBGuardX</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarItem to="/" icon={<LayoutDashboard className="h-5 w-5" />} label="Dashboard" />
          <SidebarItem to="/databases" icon={<Database className="h-5 w-5" />} label="Databases" />
          <SidebarItem to="/backups" icon={<History className="h-5 w-5" />} label="Backups" />
          <SidebarItem to="/diagnostics" icon={<Activity className="h-5 w-5" />} label="Diagnostics" />
          <SidebarItem to="/schedules" icon={<ClipboardClock className="h-5 w-5" />} label="Schedules" />
          <SidebarItem to="/settings" icon={<Settings className="h-5 w-5" />} label="Settings" />
        </nav>
        <div className="p-4 border-t mt-auto shrink-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 px-3 py-1 text-xs text-muted-foreground uppercase font-bold tracking-widest">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Scheduler Active
                </div>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-1">
                <span className="text-xs text-muted-foreground">System Engine</span>
                <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b flex shrink-0 items-center px-6 md:hidden">
            <Menu className="h-6 w-6" />
        </header>
        <div className="flex-1 overflow-y-auto">
            {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
