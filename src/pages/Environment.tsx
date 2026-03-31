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
  XCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
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
    detectedEnvironments,
    checkEnvironments,
    startInstall,
    cancelInstall,
  } = useEnvironmentStore();

  useEffect(() => {
    checkEnvironments();
  }, [checkEnvironments]);

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

  const hasAnyEnvironment = detectedEnvironments?.laragon || detectedEnvironments?.xampp || detectedEnvironments?.wamp;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 relative min-h-[100vh]">
      {/* Redesigned Full Page Overlay when any environment is Detected */}
      {hasAnyEnvironment && showOverlay && !installing && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 overflow-hidden rounded-xl">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-tr from-green-500/5 via-transparent to-primary/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative max-w-3xl w-full animate-in fade-in zoom-in duration-500 slide-in-from-bottom-8">
            <div className="text-center space-y-8">
              {/* Icon Section */}
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl scale-150 animate-pulse" />
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-b from-green-400 to-green-600 rounded-3xl flex items-center justify-center transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                  <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground p-2 rounded-xl shadow-lg animate-bounce">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>

              {/* Text Content */}
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                  Environments <span className="text-green-500">Detected.</span>
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  We've scanned your system and found existing development environments. DBGuardX can work with any of these.
                </p>
              </div>

              {/* Environment List */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                 <div className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${detectedEnvironments?.laragon ? "bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-300 shadow-lg shadow-green-500/10" : "bg-muted/50 border-border/50 opacity-40 grayscale"}`}>
                    {detectedEnvironments?.laragon ? <CheckCircle2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    <span className="font-bold text-sm">Laragon</span>
                 </div>
                 <div className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${detectedEnvironments?.xampp ? "bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-300 shadow-lg shadow-green-500/10" : "bg-muted/50 border-border/50 opacity-40 grayscale"}`}>
                    {detectedEnvironments?.xampp ? <CheckCircle2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    <span className="font-bold text-sm">XAMPP</span>
                 </div>
                 <div className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${detectedEnvironments?.wamp ? "bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-300 shadow-lg shadow-green-500/10" : "bg-muted/50 border-border/50 opacity-40 grayscale"}`}>
                    {detectedEnvironments?.wamp ? <CheckCircle2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    <span className="font-bold text-sm">WAMP</span>
                 </div>
              </div>

              {/* Action Cards/Buttons */}
              <div className="grid gap-4 sm:grid-cols-2 pt-4">
                <Link to="/" className="group flex flex-col items-start p-6 bg-card border border-border/50 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left">
                    <div className="p-2 bg-primary/10 rounded-lg mb-4 group-hover:scale-110 transition-transform">
                        <Server className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="font-semibold text-lg mb-1 flex items-center gap-2">
                        Go to Dashboard
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-sm text-muted-foreground">Everything is ready. Start managing your databases now.</p>
                </Link>

                <button 
                    onClick={() => setShowOverlay(false)}
                    className="group flex flex-col items-start p-6 bg-card border border-border/50 rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left"
                >
                    <div className="p-2 bg-blue-500/10 rounded-lg mb-4 group-hover:scale-110 transition-transform">
                        <RefreshCw className="h-5 w-5 text-blue-500" />
                    </div>
                    <h4 className="font-semibold text-lg mb-1 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        Setup Laragon
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-sm text-muted-foreground">You can still install Laragon to use our optimized engine.</p>
                </button>
              </div>

              {/* Status Footer */}
              <div className="pt-4 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    System Healthy
                </div>
                <div className="h-px w-8 bg-border/50" />
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                    <AlertCircle className="h-3 w-3" />
                    Automatic Link Active
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
        <Card className="border-border shadow-md animate-in fade-in slide-in-from-bottom-2">
          <CardContent className="pt-6 space-y-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                  <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">{status}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-tight font-medium">Installing Components...</div>
                </div>
              </div>
              <div className="text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {progress}%
              </div>
            </div>

            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div
                className={`flex items-center justify-center gap-2 p-2 rounded-md border text-[11px] font-bold transition-colors ${
                  currentComponent === "laragon" 
                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300" 
                    : "bg-muted/50 border-transparent text-muted-foreground"
                }`}
              >
                {currentComponent === "laragon" && <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />}
                Laragon
              </div>
              <div
                className={`flex items-center justify-center gap-2 p-2 rounded-md border text-[11px] font-bold transition-colors ${
                  currentComponent === "php" 
                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300" 
                    : "bg-muted/50 border-transparent text-muted-foreground"
                }`}
              >
                {currentComponent === "php" && <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />}
                PHP 8.3
              </div>
              <div
                className={`flex items-center justify-center gap-2 p-2 rounded-md border text-[11px] font-bold transition-colors ${
                  currentComponent === "phpmyadmin" 
                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300" 
                    : "bg-muted/50 border-transparent text-muted-foreground"
                }`}
              >
                {currentComponent === "phpmyadmin" && <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />}
                phpMyAdmin
              </div>
            </div>

            <div className="pt-2">
                <Button 
                  variant="outline" 
                  className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all font-bold" 
                  onClick={handleCancel}
                >
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
