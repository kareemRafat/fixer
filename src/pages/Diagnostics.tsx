import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertTriangle,
  Info,
  Skull,
  Wrench,
  Search,
  Monitor
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { TerminalOutput } from "@/components/ui/terminal-output";

interface PortStatus {
  port: number;
  is_in_use: boolean;
  process_name: string | null;
  pid: number | null;
}

const Diagnostics = () => {
  const [mysqlPort, setMysqlPort] = useState<PortStatus | null>(null);
  const [apachePort, setApachePort] = useState<PortStatus | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Fix Dialog State
  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [targetService, setTargetService] = useState<{name: string, type: string, currentPort: number} | null>(null);
  const [newPort, setNewPort] = useState(3307);

  // Custom Port Checker State
  const [customPort, setCustomPort] = useState<string>("");
  const [customResult, setCustomResult] = useState<PortStatus | null>(null);
  const [isCheckingCustom, setIsCheckingCustom] = useState(false);
  const [terminalStep, setTerminalStep] = useState(0);

  // Quick Scan Dialog State
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanPort, setScanPort] = useState<number | null>(null);
  const [scanResult, setScanResult] = useState<PortStatus | null>(null);

  useEffect(() => {
    if (customResult || scanResult) {
      setTerminalStep(0);
      const sequence = [100, 400, 800, 1200, 1600];
      const timers = sequence.map((delay, index) => 
        setTimeout(() => setTerminalStep(index + 1), delay)
      );
      return () => timers.forEach(clearTimeout);
    }
  }, [customResult, scanResult]);

  const handleIdentify = async (port: number) => {
    setScanPort(port);
    setScanResult(null);
    setScanDialogOpen(true);
    setTerminalStep(0);
    
    try {
      const result: PortStatus = await invoke("check_port_status", { port });
      setScanResult(result);
      // Also update the main card status in the background
      if (port === 3306) setMysqlPort(result);
      else if (port === 80) setApachePort(result);
    } catch (error) {
      toast.error(`Error identifying service on port ${port}`);
      setScanDialogOpen(false);
    }
  };

  const checkSinglePort = async (port: number, silent = false) => {
    try {
      const status: PortStatus = await invoke("check_port_status", { port });
      if (port === 3306) setMysqlPort(status);
      else if (port === 80) setApachePort(status);
      
      if (!silent) {
        toast.success(`Port ${port} scan complete.`);
      }
      return status;
    } catch (error) {
      console.error(error);
      toast.error(`Failed to check port ${port}`);
      return null;
    }
  };

  const handleCheckCustomPort = async () => {
    const portNum = parseInt(customPort);
    if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
      toast.error("Please enter a valid port number (1-65535)");
      return;
    }

    setIsCheckingCustom(true);
    try {
      const result: PortStatus = await invoke("check_port_status", { port: portNum });
      setCustomResult(result);
    } catch (error) {
      toast.error(`Error checking port ${portNum}`);
    } finally {
      setIsCheckingCustom(false);
    }
  };

  const checkPorts = async () => {
    setLoading(true);
    try {
      await Promise.all([
        checkSinglePort(3306, true),
        checkSinglePort(80, true)
      ]);
      toast.success("System status updated.");
    } catch (error) {
      toast.error("Failed to check port status.");
    } finally {
      setLoading(false);
    }
  };

  const handleKillProcess = async (pid: number) => {
    try {
      await invoke("kill_process", { pid });
      toast.success(`Process ${pid} terminated.`);
      checkPorts();
    } catch (error) {
      toast.error(`Failed to kill process: ${error}`);
    }
  };

  const handleFixPort = async () => {
    if (!targetService) return;
    try {
      const result: string = await invoke("fix_port_conflict", {
        serviceType: targetService.type,
        oldPort: targetService.currentPort,
        newPort: Number(newPort)
      });
      toast.success(result);
      setFixDialogOpen(false);
      checkPorts();
    } catch (error) {
      toast.error(`Auto-fix failed: ${error}`);
    }
  };

  useEffect(() => {
    checkPorts();
  }, []);

  const PortCard = ({ title, type, status, defaultPort }: { title: string, type: string, status: PortStatus | null, defaultPort: number }) => (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <Badge variant={status?.is_in_use ? "default" : "secondary"} className="text-sm rounded-sm">
            Port {defaultPort}
          </Badge>
        </div>
        <CardDescription className="text-base">Checks if the standard port is occupied.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {!status ? (
          <div className="h-20 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-base font-medium">Status:</span>
              <div className="flex items-center gap-1.5">
                {status.is_in_use ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-base text-green-600 font-semibold">Active / In Use</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-base text-muted-foreground">Inactive / Available</span>
                  </>
                )}
              </div>
            </div>

            {status.is_in_use && (
              <>
                <div className="p-3 bg-secondary/20 rounded-lg border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Process:</span>
                    <span className="font-mono font-bold text-base">{status.process_name || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">PID:</span>
                    <span className="font-mono text-base">{status.pid || "N/A"}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="text-sm h-8 rounded-sm"
                    onClick={() => status.pid && handleKillProcess(status.pid)}
                  >
                    <Skull className="mr-1.5 h-3 w-3" />
                    Kill Process
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-sm h-8 rounded-sm"
                    onClick={() => {
                      setTargetService({name: title, type, currentPort: defaultPort});
                      setNewPort(defaultPort + 1);
                      setFixDialogOpen(true);
                    }}
                  >
                    <Wrench className="mr-1.5 h-3 w-3" />
                    Change Port
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="text-sm h-8 rounded-sm col-span-2 mt-1"
                    onClick={() => handleIdentify(defaultPort)}
                  >
                    <Search className="mr-1.5 h-3 w-3" />
                    Identify Service
                  </Button>
                </div>
              </>
            )}

            {!status.is_in_use && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-700">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-sm leading-relaxed">
                    Port {defaultPort} is not in use. If your database service should be running, check your service manager.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-sm h-8 rounded-sm"
                  onClick={() => handleIdentify(defaultPort)}
                >
                  <Search className="mr-1.5 h-3 w-3" />
                  Identify Service
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Diagnostics</h1>
          <p className="text-base text-muted-foreground">Monitor service ports and troubleshoot connection issues.</p>
        </div>
        <Button onClick={checkPorts} disabled={loading} variant="outline" className="rounded-md">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </Button>
      </div>

      <Separator />

      <div className="grid md:grid-cols-1 xl:grid-cols-2 gap-6">
        <PortCard title="Web Server (Apache/Nginx)" type="apache" status={apachePort} defaultPort={80} />
        <PortCard title="MySQL / MariaDB" type="mysql" status={mysqlPort} defaultPort={3306} />
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Troubleshooting Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-base space-y-2 text-muted-foreground list-disc pl-4">
            <li><strong>Kill Process:</strong> Forcefully stops the program using the port. Use with caution!</li>
            <li><strong>Change Port:</strong> Automatically edits your <code>my.ini</code> or <code>httpd.conf</code> to use a new port.</li>
            <li>After changing a port, you must manually restart the service (XAMPP/Laragon) for changes to take effect.</li>
          </ul>
        </CardContent>
      </Card>

      {/* New Custom Port Checker Section */}
      <Card>
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" />
            Custom Port Checker
          </CardTitle>
          <CardDescription className="text-base">Check if any other application is using a specific port.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <Input 
              type="number" 
              placeholder="Enter port (e.g., 8080)" 
              value={customPort}
              className="text-base"
              onChange={(e) => setCustomPort(e.target.value)}
            />
            <Button onClick={handleCheckCustomPort} disabled={isCheckingCustom} className="rounded-sm">
              <Search className={`mr-2 h-4 w-4 ${isCheckingCustom ? "animate-spin" : ""}`} />
              Check Port
            </Button>
          </div>

          {customResult && (
            <div className="mt-4">
              <TerminalOutput
                port={customResult.port}
                result={customResult}
                terminalStep={terminalStep}
                onKill={handleKillProcess}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fix Port Dialog */}
      <Dialog open={fixDialogOpen} onOpenChange={setFixDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Change Service Port</DialogTitle>
            <DialogDescription className="text-base">
              We will update the configuration file for {targetService?.name} to use a new port.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-base font-medium">New Port Number</label>
              <Input 
                type="number" 
                value={newPort} 
                className="text-base"
                onChange={(e) => setNewPort(Number(e.target.value))}
              />
            </div>
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Important: You will need to manually restart your {targetService?.name} service from your control panel after this.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFixDialogOpen(false)} className="text-base">Cancel</Button>
            <Button onClick={handleFixPort} className="text-base">Update Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Identification Report Dialog */}
      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent className="sm:max-w-3xl bg-slate-50 dark:bg-slate-900 border-border p-0 overflow-hidden shadow-2xl">
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-foreground flex items-center gap-3 text-2xl">
                <Search className="h-6 w-6 text-primary" />
                System Diagnostic Report
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-lg">
                Deep-scanning local network interfaces for port {scanPort}...
              </DialogDescription>
            </DialogHeader>

            <TerminalOutput
              port={scanPort}
              result={scanResult}
              terminalStep={terminalStep}
              onKill={(pid) => {
                handleKillProcess(pid);
                setScanDialogOpen(false);
              }}
              command="netstat -ano | findstr"
              headerTitle="sys-inspector"
            />
          </div>
          <div className="bg-slate-200/30 dark:bg-slate-950/50 p-6 border-t border-border flex justify-end gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setScanDialogOpen(false)} 
              className="text-muted-foreground hover:text-foreground px-6"
            >
              Terminate Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Diagnostics;
