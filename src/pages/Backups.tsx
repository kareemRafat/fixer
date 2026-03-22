import { useState, useEffect, Fragment } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getBackups, deleteBackupRecord, BackupRecord } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Database as DbIcon,
  Zap,
  FileCode,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSettingsStore } from "@/store/useSettingsStore";

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const Backups = () => {
  const { host, port, user, password, mysqlDataPath } = useSettingsStore();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [recordToDelete, setRecordToDelete] = useState<BackupRecord | null>(
    null,
  );
  const [recordToRestore, setRecordToRestore] = useState<BackupRecord | null>(
    null,
  );
  const [isRestoring, setIsRestoring] = useState(false);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const fetchBackups = async () => {
    try {
      const records = await getBackups();
      console.log("Fetched backups:", records); // Debug log
      setBackups(records);
    } catch (error) {
      toast.error("Failed to fetch backup history.");
      console.error(error);
    }
  };

  const toggleRow = (id: number) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id],
    );
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;

    try {
      // 1. Attempt to delete the physical file
      // We wrap this in its own try/catch so that if it fails (e.g. file already gone),
      // we still proceed to delete the database record.
      try {
        await invoke("delete_file", { path: recordToDelete.file_path });
      } catch (e) {
        console.warn("Physical file could not be deleted or was already missing:", e);
        // We don't throw here, just log it.
      }

      // 2. Delete the record from SQLite history
      await deleteBackupRecord(recordToDelete.id);

      toast.success(`Backup record for ${recordToDelete.database_name} deleted.`);
      fetchBackups(); // Refresh the list
    } catch (error) {
      toast.error("Failed to remove the record from history.");
      console.error("Database deletion error:", error);
    } finally {
      setRecordToDelete(null);
    }
  };

  const handleRestore = async () => {
    if (!recordToRestore) return;

    setIsRestoring(true);
    try {
      // 1. Validate file exists and is a valid dump (Only for SQL backups)
      // For Raw backups (directories), we skip the SQL header validation
      if (recordToRestore.backup_type !== "raw") {
        await invoke("validate_backup_file", {
          filePath: recordToRestore.file_path,
        });
      }

      // 2. Run restore
      const result: string = await invoke("run_restore", {
        host,
        port,
        user,
        password,
        dbName: recordToRestore.database_name,
        filePath: recordToRestore.file_path,
        mysqlDataPath, // Added Milestone 7 parameter
      });

      toast.success(result);
    } catch (error) {
      // error will be the Arabic string from backend if validation failed
      toast.error(`خطأ: ${error}`);
      console.error(error);
    } finally {
      setIsRestoring(false);
      setRecordToRestore(null);
    }
  };

  useEffect(() => {
    fetchBackups();

    const unlisten = listen("backup-finished", () => {
      fetchBackups();
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Backup History
        </h1>
        <Button
          onClick={fetchBackups}
          variant="outline"
          size="sm"
          className="rounded-md"
        >
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Database</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backups.length > 0 ? (
              backups.map((backup) => {
                const isExpanded = expandedRows.includes(backup.id);
                let dbList: string[] = [];

                // Parse the databases list if it exists
                if (backup.databases) {
                  try {
                    dbList = JSON.parse(backup.databases);
                  } catch (e) {
                    console.error("Failed to parse databases list", e);
                  }
                }

                // Fallback for older records or failed parses
                if (dbList.length === 0) {
                  dbList = [backup.database_name];
                }

                return (
                  <Fragment key={backup.id}>
                    <TableRow
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => toggleRow(backup.id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {backup.database_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize font-normal",
                            backup.trigger_type === "scheduled"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          )}
                        >
                          {backup.trigger_type || "manual"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(backup.timestamp).toLocaleDateString(
                          "en-GB",
                          {
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                          },
                        )}
                      </TableCell>
                      <TableCell>{formatBytes(backup.file_size)}</TableCell>
                      <TableCell>
                        <Badge
                          className="rounded-sm"
                          variant={
                            backup.status === "Success"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {backup.status}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-2">
                          {!backup.file_path.toLowerCase().endsWith(".gz") && 
                           !backup.file_path.toLowerCase().endsWith(".zip") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Restore"
                              onClick={() => setRecordToRestore(backup)}
                              disabled={backup.status !== "Success"}
                            >
                              <RotateCcw className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => setRecordToDelete(backup)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={7} className="py-0">
                          <div className="p-4 pl-12 grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {dbList.length > 1
                                  ? "Databases in this backup:"
                                  : "Target Database:"}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {dbList.map((db, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-1.5 bg-background border rounded-md px-2 py-1 text-sm shadow-sm"
                                  >
                                    <DbIcon className="h-3 w-3 text-primary" />
                                    <span>{db}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  Backup Type:
                                </h4>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="capitalize bg-background">
                                    {backup.backup_type === "raw" ? (
                                      <span className="flex items-center gap-1.5 text-amber-600">
                                        <Zap className="h-3 w-3" /> Raw Copy (Physical)
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5 text-blue-600">
                                        <FileCode className="h-3 w-3" /> SQL Dump
                                      </span>
                                    )}
                                  </Badge>

                                  {(backup.file_path.toLowerCase().endsWith(".gz") || 
                                    backup.file_path.toLowerCase().endsWith(".zip")) && (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                                      <Archive className="h-3 w-3 mr-1" /> Compressed
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No backup history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog
        open={recordToDelete !== null}
        onOpenChange={() => setRecordToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the backup file and its record. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation */}
      <AlertDialog
        open={recordToRestore !== null}
        onOpenChange={() => !isRestoring && setRecordToRestore(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Database?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the current data in{" "}
              <strong>{recordToRestore?.database_name}</strong> with the
              contents of the backup from{" "}
              {recordToRestore &&
                new Date(recordToRestore.timestamp).toLocaleString()}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleRestore}
              disabled={isRestoring}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Restore Now"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Backups;
