import { useEffect, useState } from "react";
import { getBackups, BackupRecord } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, History, AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const records = await getBackups();
      setBackups(records);
    };
    fetchStats();
  }, []);

  const toggleRow = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const successfulBackups = backups.filter(b => b.status === "Success").length;
  const failedBackups = backups.filter(b => b.status !== "Success").length;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your local database backup system.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
            <History className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successfulBackups}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive dark:text-red-400">{failedBackups}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {backups.length > 0 ? (
            <div className="space-y-4">
              {backups.slice(0, 5).map((b) => {
                const isFailed = b.status !== "Success";
                const isExpanded = expandedId === b.id;
                const statusText = isFailed ? b.status.split(":")[0] : b.status;
                const failureReason = isFailed ? b.status.split(": ").slice(1).join(": ") : "";

                return (
                  <div key={b.id} className="flex flex-col border rounded-lg overflow-hidden transition-all">
                    <div 
                      className={cn(
                        "flex items-center justify-between p-3 transition-colors",
                        isFailed && "cursor-pointer hover:bg-muted/50"
                      )}
                      onClick={() => isFailed && toggleRow(b.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center">
                          {isFailed ? (
                            isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground mr-1" /> : <ChevronRight className="w-4 h-4 text-muted-foreground mr-1" />
                          ) : (
                            <div className="w-5" />
                          )}
                          <Database className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{b.database_name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(b.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className={`text-xs font-bold px-2 py-1 rounded-full ${b.status === "Success" ? "text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400" : "text-destructive bg-destructive/10 dark:bg-red-500/10 dark:text-red-400"}`}>
                        {statusText}
                      </div>
                    </div>
                    {isFailed && isExpanded && (
                      <div className="px-11 pb-3 pt-4 bg-muted/20">
                        <div className="flex items-start gap-2 text-xs text-destructive dark:text-red-400 bg-destructive/5 dark:bg-red-500/5 p-2 rounded border border-destructive/10 dark:border-red-500/20">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <p className="font-medium leading-relaxed">
                            {failureReason || "No specific error reason recorded."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent backup activity.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
