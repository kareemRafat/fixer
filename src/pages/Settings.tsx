import { useSettingsStore } from "@/store/useSettingsStore";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Save, Shield } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const settings = useSettingsStore();

  const pickBackupPath = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") settings.setBackupPath(selected);
  };

  const pickMysqlDataPath = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") settings.setMysqlDataPath(selected);
  };

  const autoDetectXampp = async () => {
    try {
      const path: string | null = await invoke("detect_xampp_data_path");
      if (path) {
        settings.setMysqlDataPath(path);
        toast.success(`Data path detected: ${path}`);
      } else {
        toast.error("Local environment (XAMPP/Laragon/WAMP) not found in common locations.");
      }
    } catch (err) {
      toast.error(`Auto-detect failed: ${err}`);
    }
  };

  const handleSave = () => {
    toast.success("Settings saved locally.");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your backup preferences and connection details.</p>
        </div>
        <Button onClick={handleSave} className="rounded-md">
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>

      <Separator />

      <div className="grid gap-6">
        {/* Backup Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Backup Configuration</CardTitle>
            <CardDescription>Configure where and how your backups are stored.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase">Default Backup Destination</label>
              <div className="flex gap-2">
                <Input value={settings.backupPath} readOnly placeholder="No path selected" />
                <Button variant="outline" size="icon" onClick={pickBackupPath}>
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="compress" 
                checked={settings.compressBackups} 
                onCheckedChange={(checked) => settings.setCompressBackups(!!checked)} 
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="compress" className="text-sm font-medium leading-none cursor-pointer">
                  Enable Backup Compression (Gzip)
                </label>
                <p className="text-sm text-muted-foreground">
                  Automatically compress .sql files to save disk space.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MySQL Data Directory */}
        <Card>
          <CardHeader>
            <CardTitle>MySQL System Paths</CardTitle>
            <CardDescription>Required for fast physical (Raw) backups.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase">MySQL Data Directory</label>
              <div className="flex gap-2">
                <Input value={settings.mysqlDataPath} readOnly placeholder="e.g., C:\ProgramData\MySQL\MySQL Server 8.0\Data" />
                <Button variant="outline" size="icon" onClick={pickMysqlDataPath} title="Select Folder">
                  <FolderOpen className="h-4 w-4" />
                </Button>
                <Button variant="secondary" onClick={autoDetectXampp} className="text-xs font-semibold px-4 rounded-md">
                  Auto-Detect Environment
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This is typically the folder containing your database folders (e.g., `mysql`, `sys`, and your own databases).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Database Connection */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Credentials</CardTitle>
            <CardDescription>Default credentials used for all database operations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground uppercase">Host</label>
                <Input value={settings.host} onChange={(e) => settings.setHost(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground uppercase">Port</label>
                <Input type="number" value={settings.port} onChange={(e) => settings.setPort(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground uppercase">Username</label>
                <Input value={settings.user} onChange={(e) => settings.setUser(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground uppercase">Password</label>
                <Input type="password" value={settings.password} onChange={(e) => settings.setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20 text-primary">
          <Shield className="h-5 w-5" />
          <p className="text-sm font-medium">Your credentials are stored locally on your machine.</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
