import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Server,
  Download,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  XCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEnvironmentStore } from "@/store/useEnvironmentStore";
import { Link } from "react-router-dom";

const Environment = () => {
  const configUrl = "https://db.createivo.net/downloads/setup-config.json";
  const [showOverlay, setShowOverlay] = useState(true);
  
  const {
    installing,
    progress,
    status,
    currentComponent,
    isLaragonInstalled,
    checkLaragon,
    startInstall,
    cancelInstall,
  } = useEnvironmentStore();

  useEffect(() => {
    checkLaragon();
  }, [checkLaragon]);

  const handleInstall = async () => {
    try {
      setShowOverlay(false);
      await startInstall(configUrl);
      if (status !== "Cancelled") {
        toast.success("Environment setup completed successfully!");
      }
    } catch (error) {
      if (error === "Cancelled") {
        toast.info("Installation cancelled.");
      } else {
        console.error(error);
        const errorMsg = String(error);
        if (
          errorMsg.includes("Access is denied") ||
          errorMsg.includes("os error 5")
        ) {
          toast.error(
            "Permission Denied: Please run this application as Administrator!",
          );
        } else {
          toast.error(`Installation failed: ${error}`);
        }
      }
    }
  };

  const handleCancel = async () => {
    await cancelInstall();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 relative min-h-[100vh]">
      {/* Redesigned Full Page Overlay when Laragon is Detected */}
      {isLaragonInstalled && showOverlay && !installing && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 overflow-hidden rounded-xl">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-tr from-green-500/5 via-transparent to-primary/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative max-w-2xl w-full animate-in fade-in zoom-in duration-500 slide-in-from-bottom-8">
            <div className="text-center space-y-8">
              {/* Icon Section */}
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl scale-150 animate-pulse" />
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-b from-green-400 to-green-600 rounded-3xl flex items-center justify-center  transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                  <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground p-2 rounded-xl shadow-lg animate-bounce">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>

              {/* Text Content */}
              <div className="space-y-4">
                <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                  System <span className="text-green-500">Ready.</span>
                </h2>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  We've detected Laragon on your machine. Your environment is perfectly configured and optimized for DBGuardX.
                </p>
              </div>

              {/* Action Cards/Buttons */}
              <div className="grid gap-4 sm:grid-cols-2 pt-4">
                <Link to="/" className="group flex flex-col items-start p-6 bg-card border border-border/50 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left">
                    <div className="p-2 bg-primary/10 rounded-lg mb-4 group-hover:scale-110 transition-transform">
                        <Server className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                        Go to Dashboard
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-sm text-muted-foreground">Start managing your databases and backups now.</p>
                </Link>

                <button 
                    onClick={() => setShowOverlay(false)}
                    className="group flex flex-col items-start p-6 bg-card border border-border/50 rounded-2xl hover:border-green-500/50 hover:bg-green-500/5 transition-all text-left"
                >
                    <div className="p-2 bg-green-500/10 rounded-lg mb-4 group-hover:scale-110 transition-transform">
                        <RefreshCw className="h-5 w-5 text-green-500" />
                    </div>
                    <h4 className="font-bold text-lg mb-1 flex items-center gap-2 text-green-600 dark:text-green-400">
                        Environment Settings
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-sm text-muted-foreground">Reinstall or modify your existing environment setup.</p>
                </button>
              </div>

              {/* Status Footer */}
              <div className="pt-8 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    Local Engine Active
                </div>
                <div className="h-px w-8 bg-border/50" />
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    Secure Connection
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <Server className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Environment Setup
        </h1>
      </div>
      <p className="text-muted-foreground">
        Configure your development environment with one click. This will install
        Laragon, PHP, and phpMyAdmin.
      </p>

      <Card className="border-border/40 shadow-sm">
        <CardHeader>
          <CardTitle>Automatic Installation</CardTitle>
          <CardDescription>
            The app will download the installer and guide you through the process.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-2">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              How it works:
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
              <li>Downloads the official Laragon Installer.</li>
              <li>Runs the installer (you can choose any folder).</li>
              <li>Automatically detects the folder after you finish.</li>
              <li>Installs PHP 8.3 and phpMyAdmin into that folder.</li>
              <li>Updates your Windows PATH variables.</li>
            </ul>
          </div>

          <div className="pt-2">
            <Button
              className="w-full h-10 text-lg font-bold"
              onClick={handleInstall}
              disabled={installing}
            >
              {installing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Installation in Progress...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Start Full Setup
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {installing && (
        <Card className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-bottom-4">
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                {progress < 100 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <span>{status}</span>
              </div>
              <span className="text-sm font-mono">{progress}%</span>
            </div>

            <div className="relative h-4 w-full bg-secondary overflow-hidden rounded-full">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div
                className={`p-2 rounded-lg border ${currentComponent === "laragon" ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-transparent opacity-50"}`}
              >
                Laragon
              </div>
              <div
                className={`p-2 rounded-lg border ${currentComponent === "php" ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-transparent opacity-50"}`}
              >
                PHP
              </div>
              <div
                className={`p-2 rounded-lg border ${currentComponent === "phpmyadmin" ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-transparent opacity-50"}`}
              >
                phpMyAdmin
              </div>
            </div>

            <div className="pt-2">
                <Button variant="outline" className="w-full border-destructive/20 text-destructive hover:bg-destructive/10" onClick={handleCancel}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Installation
                </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!installing && progress === 100 && status !== "Cancelled" && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">
            Installation completed successfully! You can now start using
            Laragon.
          </span>
        </div>
      )}
    </div>
  );
};

export default Environment;
