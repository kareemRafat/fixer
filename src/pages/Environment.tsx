import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Server,
  Download,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ProgressPayload {
  component: String;
  progress: number;
  status: string;
}

const Environment = () => {
  const configUrl = "https://db.createivo.net/downloads/setup-config.json";
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Ready to install");
  const [currentComponent, setCurrentComponent] = useState("");

  useEffect(() => {
    const unlistenProgress = listen<ProgressPayload>(
      "install-progress",
      (event) => {
        setProgress(event.payload.progress);
        setCurrentComponent(event.payload.component as string);
      },
    );

    const unlistenStatus = listen<string>("install-status", (event) => {
      setStatus(event.payload);
    });

    return () => {
      unlistenProgress.then((f) => f());
      unlistenStatus.then((f) => f());
    };
  }, []);

  const handleInstall = async () => {
    try {
      setInstalling(true);
      setProgress(0);
      setStatus("Starting installation...");

      await invoke("start_one_click_install", {
        configUrl,
      });

      if (status !== "Cancelled") {
        toast.success("Environment setup completed successfully!");
      }
    } catch (error) {
      if (error === "Cancelled") {
        toast.info("Installation cancelled.");
        setStatus("Cancelled");
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
        setStatus(`Error: ${error}`);
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleCancel = async () => {
    try {
      await invoke("cancel_install");
      setStatus("Cancelling...");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Server className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Environment Setup
        </h1>
      </div>

      <Alert
        variant="destructive"
        className="border-2 shadow-sm animate-in fade-in zoom-in duration-300"
      >
        <div className="flex gap-3 items-center">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="text-base font-bold">
            Administrator Privileges Required
          </AlertTitle>
        </div>
        <AlertDescription className="mt-2 text-sm opacity-90 leading-relaxed font-medium">
          To successfully install Laragon and configure system-wide environment
          variables, you must run this application with elevated permissions.
          <div className="mt-3 p-2 bg-destructive-foreground/10 rounded-md border border-destructive-foreground/20">
            Please{" "}
            <span className="font-bold underline">
              close DBGuardX and right-click "Run as Administrator"
            </span>{" "}
            to continue.
          </div>
        </AlertDescription>
      </Alert>

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
              className="w-full h-12 text-lg font-bold"
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
