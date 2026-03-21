import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Database,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { addBackup } from "@/lib/db";
import { useSettingsStore } from "@/store/useSettingsStore";

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
  const { host, port, user, password, setHost, setPort, setUser, setPassword, backupPath, setBackupPath } = useSettingsStore();
  
  const [services, setServices] = useState<DetectedService[]>([]);
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDbs, setSelectedDbs] = useState<string[]>([]);
  const [dbsToBackup, setDbsToBackup] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      
      // Filter out system databases
      const systemDbs = ["information_schema", "mysql", "performance_schema", "sys", "phpmyadmin"];
      const userDbs = result.filter(db => !systemDbs.includes(db.name.toLowerCase()));
      
      setDatabases(userDbs);
      toast.success(`Connected to ${host}`);
    } catch (err) {
      setError(String(err));
      setDatabases([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDbSelection = (dbName: string) => {
    setSelectedDbs((prev) =>
      prev.includes(dbName)
        ? prev.filter((name) => name !== dbName)
        : [...prev, dbName],
    );
  };

  const toggleSelectAll = () => {
    if (selectedDbs.length === databases.length) {
      setSelectedDbs([]);
    } else {
      setSelectedDbs(databases.map((db) => db.name));
    }
  };

  const handleRunBackup = async () => {
    if (dbsToBackup.length === 0 || !backupPath) return;
    setIsBackingUp(true);
    const suffix =
      dbsToBackup.length > 1
        ? `batch_${dbsToBackup.length}_dbs`
        : dbsToBackup[0];
    const fileName = `${suffix}_${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
    const fullPath = `${backupPath}\\${fileName}`;

    try {
      const result: string = await invoke("run_backup", {
        host,
        port,
        user,
        password,
        databases: dbsToBackup,
        destPath: fullPath,
      });

      // Get file size for logging
      let fileSize = 0;
      try {
        fileSize = await invoke("get_file_size", { path: fullPath });
      } catch (e) {
        console.error("Failed to get file size:", e);
      }

      // Log to SQLite
      await addBackup({
        database_name: dbsToBackup.length > 1 ? `${dbsToBackup.length} Databases` : dbsToBackup[0],
        databases: JSON.stringify(dbsToBackup),
        timestamp: new Date().toISOString(),
        file_size: fileSize,
        status: "Success",
        file_path: fullPath,
      });

      toast.success(result);
      setIsDialogOpen(false);
      setDbsToBackup([]);
      
      // If we backed up the exact set that was checked, clear the checks
      if (selectedDbs.length > 0 && 
          selectedDbs.length === dbsToBackup.length && 
          selectedDbs.every(db => dbsToBackup.includes(db))) {
        setSelectedDbs([]);
      }
    } catch (err) {
      toast.error(`Backup failed: ${err}`);
      
      // Log failure to SQLite
      await addBackup({
        database_name: dbsToBackup.length > 1 ? `${dbsToBackup.length} Databases` : dbsToBackup[0],
        timestamp: new Date().toISOString(),
        file_size: 0,
        status: "Failed",
        file_path: fullPath,
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const pickBackupFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === "string") setBackupPath(selected);
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
        <Button
          onClick={detectServices}
          variant="outline"
          size="sm"
          className="rounded-md"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Services Row */}
      <div className="flex items-center justify-between gap-4 py-3 px-4 bg-secondary/20 rounded-lg border">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mr-2">
          Services :
        </span>
        {services.length === 0 ? (
          <span className="text-sm text-muted-foreground italic">
            None detected
          </span>
        ) : (
          services.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-background px-5 py-1 rounded-lg border text-sm shadow-sm"
            >
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground text-sm">: {s.port}</span>
            </div>
          ))
        )}
      </div>

      {/* Connection Row */}
      <div className="gap-4 p-4 border rounded-lg shadow-sm bg-card">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1.5 flex-1 min-w-[120px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Host
            </label>
            <Input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Port
            </label>
            <Input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[120px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Username
            </label>
            <Input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[120px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="None"
              className="h-9"
            />
          </div>
        </div>
        <Button
          onClick={fetchDatabases}
          disabled={loading}
          className="w-full h-9 px-6 font-semibold"
        >
          {loading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Database className="mr-2 h-4 w-4" />
          )}
          Check Databases
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
          <div className="flex items-start justify-between gap-3 flex-col border-b pb-2">
            <h2 className="text-lg font-medium">
              Available Databases ({databases.length})
            </h2>
          </div>
          <div className="flex items-center justify-end gap-2 ">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              className="text-sm rounded-md"
            >
              {selectedDbs.length === databases.length
                ? "Deselect All"
                : "Select All"}
            </Button>
            {selectedDbs.length > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  setDbsToBackup(selectedDbs);
                  setIsDialogOpen(true);
                }}
                className="bg-primary shadow-sm rounded-md"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Database Selected ({selectedDbs.length})
              </Button>
            )}
          </div>

          <div className="border rounded-xl overflow-hidden divide-y bg-card shadow-sm">
            {databases.map((db, i) => {
              const isSelected = selectedDbs.includes(db.name);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-6">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleDbSelection(db.name)}
                      className="h-5 w-5"
                    />
                    <div className="flex items-center gap-3">
                      <Database
                        className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <span className="font-medium text-sm">{db.name}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-sm h-8 border-primary/20 text-primary hover:bg-primary transition-all rounded-md hover:text-white"
                    onClick={() => {
                      setDbsToBackup([db.name]);
                      setIsDialogOpen(true);
                    }}
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
              {dbsToBackup.length > 1
                ? `Backing up ${dbsToBackup.length} databases`
                : dbsToBackup.length === 1
                ? `Backing up ${dbsToBackup[0]}`
                : "No database selected"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Folder</label>
              <div className="flex gap-2">
                <Input
                  value={backupPath}
                  readOnly
                  placeholder="Choose folder..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={pickBackupFolder}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRunBackup}
              disabled={!backupPath || isBackingUp}
            >
              {isBackingUp ? "Processing..." : "Start Backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Databases;
