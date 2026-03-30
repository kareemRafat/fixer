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
  Zap,
  FileCode,
  Table2,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { addBackup, getBackups, updateBackupVerification } from "@/lib/db";
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

interface TableInfo {
  name: string;
  row_count: number;
  data_size_mb: number;
}

const Databases = () => {
  const {
    host,
    port,
    user,
    password,
    setHost,
    setPort,
    setUser,
    setPassword,
    backupPath,
    setBackupPath,
    compressBackups,
    mysqlDataPath,
    autoVerify,
  } = useSettingsStore();

  const [services, setServices] = useState<DetectedService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDbs, setSelectedDbs] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<TableInfo[]>([]);
  const [isTablesModalOpen, setIsTablesModalOpen] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [currentDbName, setCurrentDbName] = useState("");

  const [dbsToBackup, setDbsToBackup] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // New Milestone 7 Options
  const [backupMode, setBackupMode] = useState<"sql" | "raw">("sql");
  const [shouldCompress, setShouldCompress] = useState(compressBackups);

  const detectServices = async () => {
    setServicesLoading(true);
    try {
      // Ensure spinner shows for at least 500ms for a smoother transition
      const [result] = await Promise.all([
        invoke("detect_services"),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
      setServices(result as DetectedService[]);
    } catch (err) {
      console.error("Failed to detect services:", err);
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchDatabases = async () => {
    setLoading(true);
    setError(null);
    try {
      const [result] = await Promise.all([
        invoke("list_databases", {
          host,
          port,
          user,
          password,
        }),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);

      const systemDbs = [
        "information_schema",
        "mysql",
        "performance_schema",
        "sys",
        "phpmyadmin",
      ];
      const userDbs = (result as DatabaseInfo[]).filter(
        (db) => !systemDbs.includes(db.name.toLowerCase()),
      );

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

  const handleTableDetails = async (dbName: string) => {
    setCurrentDbName(dbName);
    setIsLoadingTables(true);
    setIsTablesModalOpen(true);
    try {
      const result: TableInfo[] = await invoke("list_tables", {
        host,
        port,
        user,
        password,
        dbName,
      });
      setSelectedTables(result);
    } catch (err) {
      toast.error(`Failed to fetch tables: ${err}`);
      setIsTablesModalOpen(false);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const handleRunBackup = async () => {
    if (dbsToBackup.length === 0 || !backupPath) return;
    setIsBackingUp(true);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const summaryName =
        dbsToBackup.length > 1
          ? `${dbsToBackup.length} Databases`
          : dbsToBackup[0];
      const suffix =
        dbsToBackup.length > 1
          ? `batch_${dbsToBackup.length}_dbs`
          : dbsToBackup[0];

      let finalPath = "";
      let result = "";

      if (backupMode === "sql") {
        const sqlFileName = `${suffix}_${timestamp}.sql`;
        const sqlPath = `${backupPath}\\${sqlFileName}`;

        // 1. Run standard backup
        result = await invoke("run_backup", {
          host,
          port,
          user,
          password,
          databases: dbsToBackup,
          destPath: sqlPath,
        });

        finalPath = sqlPath;

        // 2. Optional compression
        if (shouldCompress) {
          const gzPath = `${sqlPath}.gz`;
          await invoke("compress_file", {
            sourcePath: sqlPath,
            destPath: gzPath,
          });
          // Remove original SQL file after compression
          await invoke("delete_file", { path: sqlPath });
          finalPath = gzPath;
        }
      } else {
        // Raw Mode (Physical Directory Copy)
        // We handle one DB at a time for raw backup to keep it simple
        const destDir = `${backupPath}\\RAW_${suffix}_${timestamp}`;
        const sourceDir = `${mysqlDataPath}\\${dbsToBackup[0]}`;

        result = await invoke("run_raw_backup", {
          sourceDir,
          destDir,
        });
        finalPath = destDir;
      }

      // Get file size for logging
      let fileSize = 0;
      try {
        fileSize = await invoke("get_file_size", { path: finalPath });
      } catch (e) {
        console.error("Failed to get file size:", e);
      }

      // Log to SQLite
      await addBackup({
        database_name: summaryName,
        databases: JSON.stringify(dbsToBackup),
        backup_type: backupMode,
        timestamp: new Date().toISOString(),
        file_size: fileSize,
        status: "Success",
        file_path: finalPath,
        trigger_type: "manual",
      });

      toast.success(result);

      // Auto-Verify if enabled and it's an SQL backup
      if (autoVerify && backupMode === "sql") {
        toast.info("Starting automatic integrity verification...");
        try {
          // We need the ID of the backup we just added. 
          // getBackups() returns them sorted by ID DESC, so the first one is our newest.
          const allBackups = await getBackups();
          const latestBackup = allBackups[0];
          
          if (latestBackup) {
            const verifyResult: { success: boolean; message: string; tables_count: number } = await invoke("verify_backup", {
              host,
              port,
              user,
              password,
              filePath: finalPath,
            });

            await updateBackupVerification(latestBackup.id, verifyResult.success, verifyResult.message);
            
            if (verifyResult.success) {
              toast.success(`Auto-Verify: ${verifyResult.message}`);
            } else {
              toast.error(`Auto-Verify: ${verifyResult.message}`);
            }
          }
        } catch (vErr) {
          console.error("Auto-verification failed:", vErr);
        }
      }

      setIsDialogOpen(false);
      setDbsToBackup([]);
      setSelectedDbs([]);
    } catch (err) {
      toast.error(`Backup failed: ${err}`);
      await addBackup({
        database_name:
          dbsToBackup.length > 1
            ? `${dbsToBackup.length} Databases`
            : dbsToBackup[0],
        databases: JSON.stringify(dbsToBackup),
        backup_type: backupMode,
        timestamp: new Date().toISOString(),
        file_size: 0,
        status: `Failed: ${err}`,
        file_path: "N/A",
        trigger_type: "manual",
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
    setShouldCompress(compressBackups);
  }, [compressBackups]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Databases</h1>
        <Button
          onClick={detectServices}
          disabled={servicesLoading}
          variant="outline"
          size="sm"
          className="rounded-md"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${servicesLoading ? "animate-spin" : ""}`} />
          {servicesLoading ? "Scanning..." : "Refresh Services"}
        </Button>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4 py-4 px-5 bg-secondary/20 rounded-lg border min-h-[66px]">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Services
        </span>
        {servicesLoading ? (
          <div className="flex items-center gap-2 px-5 py-1.5 animate-pulse">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground font-medium">Scanning services...</span>
          </div>
        ) : services.length === 0 ? (
          <span className="text-sm text-muted-foreground italic">
            None detected
          </span>
        ) : (
          <div className="flex flex-wrap gap-3">
            {services.map((s, i) => {
              const displayName = s.name.includes(" (") ? s.name.split(" (")[0] : s.name;
              if (s.service_type === "apache") {
                const protocol = s.port === 443 ? "HTTPS" : s.port === 80 ? "HTTP" : "WEB";
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-muted/10 px-4 py-2 rounded-lg border text-sm shadow-sm cursor-default"
                  >
                    <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    <span className="font-semibold text-xs tracking-tight">
                      {displayName} <span className="text-muted-foreground font-normal">: {s.port}</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] font-black h-5 px-2 bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400">
                      {protocol}
                    </Badge>
                  </div>
                );
              }
              return (
                <button
                  key={i}
                  onClick={() => {
                    setPort(s.port);
                    toast.info(`Set port to ${s.port} for ${s.name}`);
                  }}
                  className="flex items-center gap-3 bg-background hover:bg-muted/50 px-4 py-2 rounded-lg border text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] group"
                >
                  <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                  <span className="font-semibold text-xs tracking-tight">
                    {displayName} <span className="text-muted-foreground font-normal">: {s.port}</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-black h-5 px-2 bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400">
                    SQL
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="gap-4 p-4 border rounded-lg shadow-sm bg-card">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1.5 flex-1">
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
          <div className="space-y-1.5 flex-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Username
            </label>
            <Input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5 flex-1">
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
          disabled={loading || servicesLoading}
          className="h-9 font-semibold"
        >
          {(loading || servicesLoading) ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Database className="mr-2 h-4 w-4" />
          )}
          {servicesLoading ? "Detecting Environment..." : loading ? "Connecting..." : "Check Databases"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          </div>
          <AlertDescription className="dark:text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Database List Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/20 animate-in fade-in zoom-in duration-300">
          <div className="relative">
            <Database className="h-12 w-12 text-primary/20" />
            <RefreshCw className="h-6 w-6 animate-spin text-primary absolute -bottom-1 -right-1" />
          </div>
          <span className="mt-4 text-sm font-semibold text-muted-foreground animate-pulse">
            Establishing connection and fetching databases...
          </span>
        </div>
      )}

      {databases.length > 0 && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-medium">
              Available Databases ({databases.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
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
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Backup Selected ({selectedDbs.length})
              </Button>
            )}
          </div>

          <div className="border rounded-xl overflow-hidden divide-y bg-card shadow-sm">
            {databases.map((db, i) => {
              const isSelected = selectedDbs.includes(db.name);
              return (
                <div
                  key={i}
                  className="group flex items-center justify-between p-4 hover:bg-muted/30 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleDbSelection(db.name)}
                      className="h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg transition-colors ${isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Database className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <button 
                          onClick={() => handleTableDetails(db.name)}
                          className="font-semibold text-sm tracking-tight text-left hover:text-primary hover:underline transition-colors"
                        >
                          {db.name}
                        </button>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                            <Table2 className="h-3 w-3" />
                            {db.tables_count} tables
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium uppercase tracking-wider border-l pl-3">
                            <HardDrive className="h-3 w-3" />
                            {db.size_mb.toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                        Selected
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 px-3 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setDbsToBackup([db.name]);
                        setIsDialogOpen(true);
                      }}
                    >
                      Backup <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Backup Configuration</DialogTitle>
            <DialogDescription>
              {dbsToBackup.length > 1
                ? `Backing up ${dbsToBackup.length} databases`
                : `Backing up ${dbsToBackup[0]}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Backup Mode */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Backup Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={backupMode === "sql" ? "default" : "outline"}
                  className="h-16 flex-col gap-1 rounded-xl"
                  onClick={() => setBackupMode("sql")}
                >
                  <FileCode className="h-5 w-5" />
                  <span className="text-sm">SQL Dump</span>
                </Button>
                <Button
                  variant={backupMode === "raw" ? "default" : "outline"}
                  className="h-16 flex-col gap-1 rounded-xl"
                  disabled={dbsToBackup.length > 1}
                  onClick={() => setBackupMode("raw")}
                >
                  <Zap className="h-5 w-5" />
                  <span className="text-sm">Raw Copy</span>
                </Button>
              </div>
              {backupMode === "raw" && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/10 p-2 rounded border border-amber-100 dark:border-amber-900/30">
                  Raw mode performs a fast directory copy. Ensure the database
                  is not in active use for best consistency.
                </p>
              )}
            </div>

            <Separator />

            {/* Destination */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Folder</label>
              <div className="flex gap-2">
                <Input
                  value={backupPath}
                  readOnly
                  placeholder="Choose folder..."
                  className={`flex-1 ${!backupPath ? "border-amber-500 bg-amber-50/50" : ""}`}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={pickBackupFolder}
                  className={!backupPath ? "border-amber-500 text-amber-600 hover:bg-amber-100" : ""}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
              {!backupPath && (
                <p className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1 animate-pulse">
                  <AlertCircle className="h-3 w-3" />
                  Destination folder is required
                </p>
              )}
            </div>

            {/* Compression Toggle (Only for SQL) */}
            {backupMode === "sql" && (
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="compress-dialog"
                  checked={shouldCompress}
                  onCheckedChange={(checked) => setShouldCompress(!!checked)}
                />
                <label
                  htmlFor="compress-dialog"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Compress with Gzip (.gz)
                </label>
              </div>
            )}
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

      <Dialog open={isTablesModalOpen} onOpenChange={setIsTablesModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Database Explorer</DialogTitle>
                <DialogDescription>
                  Viewing tables in <span className="font-bold text-foreground">{currentDbName}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 pt-2">
            {isLoadingTables ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <RefreshCw className="h-10 w-10 animate-spin text-primary/40" />
                <p className="text-sm text-muted-foreground font-medium animate-pulse">Analyzing table structures...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Tables</span>
                    <div className="text-2xl font-bold mt-1">{selectedTables.length}</div>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Rows</span>
                    <div className="text-2xl font-bold mt-1">
                      {selectedTables.reduce((acc, t) => acc + t.row_count, 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Size</span>
                    <div className="text-2xl font-bold mt-1">
                      {selectedTables.reduce((acc, t) => acc + t.data_size_mb, 0).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">MB</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground border-b">
                      <tr>
                        <th className="px-4 py-3 font-semibold uppercase text-[10px]">Table Name</th>
                        <th className="px-4 py-3 font-semibold uppercase text-[10px] text-right">Rows</th>
                        <th className="px-4 py-3 font-semibold uppercase text-[10px] text-right">Data Size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-card">
                      {selectedTables.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground italic">
                            No tables found in this database.
                          </td>
                        </tr>
                      ) : (
                        selectedTables.map((table, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                            <td className="px-4 py-3 flex items-center gap-3">
                              <Table2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              <span className="font-medium">{table.name}</span>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground group-hover:text-foreground transition-colors font-semibold">
                              {table.row_count.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground font-medium">
                              {table.data_size_mb.toFixed(2)} MB
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="p-4 bg-muted/30 border-t flex items-center justify-end">
            <Button 
              variant="secondary"
              className="px-6 mx-4 mb-4"
              onClick={() => setIsTablesModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Databases;
