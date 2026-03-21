import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Database, History, Activity, Settings, Menu } from "lucide-react";

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
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r flex flex-col">
        <div className="p-6 border-b flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl tracking-tight">BackupManager</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem to="/" icon={<LayoutDashboard className="h-5 w-5" />} label="Dashboard" />
          <SidebarItem to="/databases" icon={<Database className="h-5 w-5" />} label="Databases" />
          <SidebarItem to="/backups" icon={<History className="h-5 w-5" />} label="Backups" />
          <SidebarItem to="/diagnostics" icon={<Activity className="h-5 w-5" />} label="Diagnostics" />
          <SidebarItem to="/settings" icon={<Settings className="h-5 w-5" />} label="Settings" />
        </nav>
        <div className="p-4 border-t mt-auto">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            System Ready
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center px-6 md:hidden">
            <Menu className="h-6 w-6" />
        </header>
        <div className="flex-1 overflow-auto">
            {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
