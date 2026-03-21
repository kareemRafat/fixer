import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Database, RefreshCw, AlertCircle, CheckCircle2, Server, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

  // Connection settings
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(3306);
  const [user, setUser] = useState("root");
  const [password, setPassword] = useState("");

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
    } catch (err) {
      setError(String(err));
      setDatabases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    detectServices();
  }, []);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Databases</h1>
          <p className="mt-2 text-muted-foreground">Manage and detect local database instances.</p>
        </div>
        <Button onClick={detectServices} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Detection
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Service Detection Card */}
        <Card className="col-span-full lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              Detected Services
            </CardTitle>
            <CardDescription>Local services found on your system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No services detected. Try refreshing.</p>
            ) : (
              services.map((service, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <PlayCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{service.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">Port: {service.port}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-xs font-medium uppercase">{service.status}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Connection Settings Card */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>Manual Connection</CardTitle>
            <CardDescription>Enter credentials to list and manage databases.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Host</label>
                <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="localhost" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Port</label>
                <Input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} placeholder="3306" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="root" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/10 px-6 py-4">
            <Button onClick={fetchDatabases} disabled={loading} className="w-full sm:w-auto">
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              Connect & List Databases
            </Button>
          </CardFooter>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {databases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Databases</CardTitle>
            <CardDescription>Select a database to start a backup or view details.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {databases.map((db, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-xl hover:border-primary/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/5 rounded-xl group-hover:bg-primary/10 transition-colors">
                      <Database className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{db.name}</p>
                      <p className="text-xs text-muted-foreground">Ready for backup</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/5">
                    Select
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Databases;
