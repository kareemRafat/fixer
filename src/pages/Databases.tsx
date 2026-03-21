import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Database, RefreshCw, AlertCircle, Server, PlayCircle, FolderOpen, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface DetectedService {
  name: string;
  status: string;
  port: number;
  service_type: string;
}

interface DatabaseInfo {
  name: string;
  tables_count: number;
  size_mb: number;
}

const Databases = () => {
  const [services, setServices] = useState<DetectedService[]>([]);
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(3306);
  const [user, setUser] = useState("root");
  const [password, setPassword] = useState("");

  const [selectedDbs, setSelectedDbs] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [backupDest, setBackupDest] = useState("");
  const [isBackingUp, setIsBackingUp] = useState(false);

  const detectServices = async () => {
    try {
      const result: DetectedService[] = await invoke("detect_services");
      setServices(result);
    } catch (err) {
      console.error("Failed to detect services:", err);
    }
  };

  const fetchDatabases = async () => {
    setLoading(true);
    setError(null);
    try {
      const result: DatabaseInfo[] = await invoke("list_databases", {
        host,
        port,
        user,
        password,
      });
      setDatabases(result);
      toast.success(`Connected to ${host}`);
    } catch (err) {
      setError(String(err));
      setDatabases([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDbSelection = (dbName: string) => {
    setSelectedDbs(prev => 
      prev.includes(dbName) 
        ? prev.filter(name => name !== dbName)
        : [...prev, dbName]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDbs.length === databases.length) {
      setSelectedDbs([]);
    } else {
      setSelectedDbs(databases.map(db => db.name));
    }
  };

  const handleRunBackup = async () => {
    if (selectedDbs.length === 0 || !backupDest) return;
    setIsBackingUp(true);
    const suffix = selectedDbs.length > 1 ? `batch_${selectedDbs.length}_dbs` : selectedDbs[0];
    const fileName = `${suffix}_${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
    const fullPath = `${backupDest}\\${fileName}`;

    try {
      const result: string = await invoke("run_backup", {
        host,
        port,
        user,
        password,
        databases: selectedDbs,
        destPath: fullPath,
      });
      toast.success(result);
      setIsDialogOpen(false);
      setSelectedDbs([]);
    } catch (err) {
      toast.error(`Backup failed: ${err}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const pickBackupFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === "string") setBackupDest(selected);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    detectServices();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Databases</h1>
        <Button onClick={detectServices} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Services Row */}
      <div className="flex items-center gap-4 py-3 px-4 bg-secondary/20 rounded-lg border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">Services:</span>
        {services.length === 0 ? (
          <span className="text-sm text-muted-foreground italic">None detected</span>
        ) : (
          services.map((s, i) => (
            <div key={i} className="flex items-center gap-2 bg-background px-3 py-1 rounded-full border text-sm shadow-sm">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground text-xs">:{s.port}</span>
            </div>
          ))
        )}
      </div>

      {/* Connection Row */}
      <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg shadow-sm bg-card">
        <div className="space-y-1.5 flex-1 min-w-[120px]">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Host</label>
          <Input value={host} onChange={(e) => setHost(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1.5 w-24">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Port</label>
          <Input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} className="h-9" />
        </div>
        <div className="space-y-1.5 flex-1 min-w-[120px]">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Username</label>
          <Input value={user} onChange={(e) => setUser(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1.5 flex-1 min-w-[120px]">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="None" className="h-9" />
        </div>
        <Button onClick={fetchDatabases} disabled={loading} className="h-9 px-6 font-semibold">
          {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          Fetch Databases
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Databases List */}
      {databases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-medium">Available Databases ({databases.length})</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-xs">
                {selectedDbs.length === databases.length ? "Deselect All" : "Select All"}
              </Button>
              {selectedDbs.length > 0 && (
                <Button size="sm" onClick={() => setIsDialogOpen(true)} className="bg-primary shadow-sm">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Backup Selected ({selectedDbs.length})
                </Button>
              )}
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden divide-y bg-card shadow-sm">
            {databases.map((db, i) => {
              const isSelected = selectedDbs.includes(db.name);
              return (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-6">
                    <Checkbox 
                      checked={isSelected} 
                      onCheckedChange={() => toggleDbSelection(db.name)}
                      className="h-5 w-5"
                    />
                    <div className="flex items-center gap-3">
                      <Database className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="font-medium text-sm">{db.name}</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary transition-all"
                    onClick={() => { setSelectedDbs([db.name]); setIsDialogOpen(true); }}
                  >
                    Select <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Backup Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Backup Configuration</DialogTitle>
            <DialogDescription>
              {selectedDbs.length > 1 ? `Backing up ${selectedDbs.length} databases` : `Backing up ${selectedDbs[0]}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Folder</label>
              <div className="flex gap-2">
                <Input value={backupDest} readOnly placeholder="Choose folder..." className="flex-1" />
                <Button variant="outline" size="icon" onClick={pickBackupFolder}><FolderOpen className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRunBackup} disabled={!backupDest || isBackingUp}>
              {isBackingUp ? "Processing..." : "Start Backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Databases;
