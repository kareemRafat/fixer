import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getBackups, deleteBackupRecord, BackupRecord } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw, Loader2 } from "lucide-react";
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
  const { host, port, user, password } = useSettingsStore();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [recordToDelete, setRecordToDelete] = useState<BackupRecord | null>(null);
  const [recordToRestore, setRecordToRestore] = useState<BackupRecord | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const fetchBackups = async () => {
    try {
      const records = await getBackups();
      setBackups(records);
    } catch (error) {
      toast.error("Failed to fetch backup history.");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;

    try {
      // 1. Delete the physical file (silently fail if file not found)
      try {
        await invoke("delete_file", { path: recordToDelete.file_path });
      } catch (e) {
        console.warn("Could not delete physical file:", e);
      }
      
      // 2. Delete the record from SQLite
      await deleteBackupRecord(recordToDelete.id);
      
      toast.success(`Backup for ${recordToDelete.database_name} record deleted.`);
      fetchBackups(); // Refresh the list
    } catch (error) {
      toast.error("Failed to delete record.");
      console.error(error);
    } finally {
      setRecordToDelete(null);
    }
  };

  const handleRestore = async () => {
    if (!recordToRestore) return;

    setIsRestoring(true);
    try {
      // 1. Validate file exists and is a valid dump
      const isValid: boolean = await invoke("validate_backup_file", { 
        filePath: recordToRestore.file_path 
      });

      if (!isValid) {
        toast.error("Invalid backup file format.");
        setIsRestoring(false);
        setRecordToRestore(null);
        return;
      }

      // 2. Run restore
      // Note: If multiple databases were backed up, we might need more logic here
      // For now, use the database_name from the record
      const result: string = await invoke("run_restore", {
        host,
        port,
        user,
        password,
        dbName: recordToRestore.database_name,
        filePath: recordToRestore.file_path,
      });

      toast.success(result);
    } catch (error) {
      toast.error(`Restore failed: ${error}`);
      console.error(error);
    } finally {
      setIsRestoring(false);
      setRecordToRestore(null);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Backup History</h1>
        <Button onClick={fetchBackups} variant="outline" size="sm" className="rounded-md">
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Database</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backups.length > 0 ? (
              backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell className="font-medium">{backup.database_name}</TableCell>
                  <TableCell>{new Date(backup.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{formatBytes(backup.file_size)}</TableCell>
                  <TableCell>
                    <Badge className="rounded-sm" variant={backup.status === "Success" ? "default" : "destructive"}>
                      {backup.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Restore"
                        onClick={() => setRecordToRestore(backup)}
                        disabled={backup.status !== "Success"}
                      >
                        <RotateCcw className="h-4 w-4 text-blue-500" />
                      </Button>
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No backup history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={recordToDelete !== null} onOpenChange={() => setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the backup file and its record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation */}
      <AlertDialog open={recordToRestore !== null} onOpenChange={() => !isRestoring && setRecordToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Database?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the current data in <strong>{recordToRestore?.database_name}</strong> with the contents of the backup from {recordToRestore && new Date(recordToRestore.timestamp).toLocaleString()}.
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
