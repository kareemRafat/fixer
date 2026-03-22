import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Databases from "./pages/Databases";
import Backups from "./pages/Backups";
import Diagnostics from "./pages/Diagnostics";
import Schedules from "./pages/Schedules";
import Settings from "./pages/Settings";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useEffect } from "react";
import "./App.css";

function App() {
  const primaryColor = useSettingsStore((state) => state.primaryColor);

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", primaryColor);
    document.documentElement.style.setProperty("--ring", primaryColor);
    document.documentElement.style.setProperty("--accent", primaryColor);
  }, [primaryColor]);

  return (
    <Router>
      <TooltipProvider>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/databases" element={<Databases />} />
            <Route path="/backups" element={<Backups />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route path="/schedules" element={<Schedules />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </MainLayout>
        <Toaster position="top-right" />
      </TooltipProvider>
    </Router>
  );
}

export default App;
