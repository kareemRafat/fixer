import { useEffect, useState } from "react";
import { getBackups, BackupRecord } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, History, AlertCircle, CheckCircle2 } from "lucide-react";

const Dashboard = () => {
  const [backups, setBackups] = useState<BackupRecord[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const records = await getBackups();
      setBackups(records);
    };
    fetchStats();
  }, []);

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
            <div className="text-2xl font-bold text-destructive">{failedBackups}</div>
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
              {backups.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{b.database_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(b.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className={`text-xs font-bold ${b.status === "Success" ? "text-green-600" : "text-destructive"}`}>
                    {b.status}
                  </div>
                </div>
              ))}
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
