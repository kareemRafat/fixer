import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Database, Server, Lock } from "lucide-react";

const SplashScreen = () => {
  const [status, setStatus] = useState("Initializing DBGuardX...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Show window as soon as component mounts
    invoke("show_splashscreen").catch(console.error);

    const steps = [
      { message: "Connecting to database services...", progress: 20 },
      { message: "Verifying security protocols...", progress: 45 },
      { message: "Loading backup configurations...", progress: 70 },
      { message: "Optimizing dashboard...", progress: 90 },
      { message: "Ready", progress: 100 },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setStatus(steps[currentStep].message);
        setProgress(steps[currentStep].progress);
        currentStep++;
      } else {
        clearInterval(interval);
        // Small delay before closing splash
        setTimeout(() => {
          invoke("close_splashscreen").catch(console.error);
        }, 500);
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f8fafc] text-[#020817] overflow-hidden select-none border border-slate-200/50 rounded-lg shadow-2xl p-8">
      <div className="relative flex items-center justify-center mb-12">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
        <div className="relative z-10 p-4 bg-white rounded-2xl border border-slate-200 shadow-inner">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        
        <div className="absolute -top-4 -right-4 p-2 bg-white rounded-lg border border-slate-200 shadow-sm animate-bounce delay-75">
          <Database className="w-5 h-5 text-primary/70" />
        </div>
        <div className="absolute -bottom-4 -left-4 p-2 bg-white rounded-lg border border-slate-200 shadow-sm animate-bounce delay-300">
          <Server className="w-5 h-5 text-primary/70" />
        </div>
        <div className="absolute top-1/2 -left-12 -translate-y-1/2 p-2 bg-white rounded-lg border border-slate-200 shadow-sm animate-pulse">
          <Lock className="w-5 h-5 text-primary/50" />
        </div>
      </div>

      <div className="w-full max-w-xs space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-[#020817] to-[#020817]/60 bg-clip-text text-transparent">
            DBGuardX
          </h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
            Data Integrity & Security
          </p>
        </div>

        <div className="space-y-3">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center text-slate-500 animate-pulse">
            {status}
          </p>
        </div>
      </div>

      <div className="mt-12 text-[10px] text-slate-400/60 font-mono">
        v1.0.0 | SECURE BOOT ENABLED
      </div>
    </div>
  );
};

export default SplashScreen;
