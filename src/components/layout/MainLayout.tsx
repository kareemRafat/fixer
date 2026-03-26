import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Database, History, Activity, Settings, Menu, ClipboardClock, Clock } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";
import { getActiveSchedulesCount } from "@/lib/db";

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
  const [activeSchedules, setActiveSchedules] = useState<number | null>(null);

  useEffect(() => {
    const checkSchedules = async () => {
        try {
            const count = await getActiveSchedulesCount();
            setActiveSchedules(Number(count));
        } catch (e) {
            console.error(e);
            setActiveSchedules(0);
        }
    };
    checkSchedules();
    const interval = setInterval(checkSchedules, 2000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="px-4 py-4 border-t mt-auto shrink-0 bg-muted/5">
          <div className="flex flex-col gap-4">
            {activeSchedules === null ? (
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-muted/10 border border-border/10 opacity-50 animate-pulse">
                    <div className="p-1.5 bg-background/50 rounded-lg border border-border shadow-sm">
                        <ClipboardClock className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="h-3 w-20 bg-muted-foreground/20 rounded" />
                        <div className="h-2 w-16 bg-muted-foreground/10 rounded" />
                    </div>
                </div>
            ) : activeSchedules > 0 ? (
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-secondary/40 border border-border/40 transition-all hover:bg-secondary/60">
                    <div className="relative flex items-center justify-center">
                        <div className="p-1.5 bg-background rounded-lg border border-border shadow-sm">
                            <ClipboardClock className="h-4 w-4 text-primary" />
                        </div>
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground/90 leading-none mb-1">Scheduler Active</span>
                        <span className="text-xs text-muted-foreground font-medium leading-none tracking-tight">{activeSchedules} active {activeSchedules === 1 ? 'task' : 'tasks'}</span>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-muted/40 border border-border/10 opacity-60">
                    <div className="flex items-center justify-center">
                        <div className="p-1.5 bg-background/50 rounded-lg border border-border/50 shadow-sm">
                            <Clock className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-muted-foreground/70 leading-none mb-1">Scheduler Idle</span>
                        <span className="text-xs text-muted-foreground/50 font-medium leading-none italic">No active tasks</span>
                    </div>
                </div>
            )}
            
            <div className="flex items-center justify-between px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-none mb-1">System Engine</span>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                        <span className="text-[10px] text-primary/70 font-mono leading-none">v1.2.0-stable</span>
                    </div>
                </div>
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
