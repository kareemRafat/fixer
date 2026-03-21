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
import { Trash2 } from "lucide-react";
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

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const Backups = () => {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [recordToDelete, setRecordToDelete] = useState<BackupRecord | null>(null);

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
      // 1. Delete the physical file
      await invoke("delete_file", { path: recordToDelete.file_path });
      
      // 2. Delete the record from SQLite
      await deleteBackupRecord(recordToDelete.id);
      
      toast.success(`Backup for ${recordToDelete.database_name} deleted.`);
      fetchBackups(); // Refresh the list
    } catch (error) {
      toast.error("Failed to delete backup.");
      console.error(error);
    } finally {
      setRecordToDelete(null);
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRecordToDelete(backup)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
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
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Backups;
