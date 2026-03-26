import { useEffect } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Save, Shield, Palette, Monitor, Minimize2, Power, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const COLOR_PRESETS = [
  { name: "Teal", value: "188.7 94.5% 30%", bg: "bg-[#047481]" },
  { name: "Blue", value: "221.2 83.2% 53.3%", bg: "bg-[#3b82f6]" },
  { name: "Indigo", value: "239 84% 67%", bg: "bg-[#818cf8]" },
  { name: "Rose", value: "346.8 77.2% 49.8%", bg: "bg-[#e11d48]" },
  { name: "Orange", value: "24.6 95% 53.1%", bg: "bg-[#f97316]" },
  { name: "Green", value: "142.1 76.2% 36.3%", bg: "bg-[#16a34a]" },
  { name: "Slate", value: "var(--user-slate)", bg: "bg-[#1e293b]" },
];

const Settings = () => {
  const settings = useSettingsStore();

  useEffect(() => {
    settings.initialize();
  }, []);

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
        {/* System & Background Settings */}
        <Card>
          <CardHeader>
            <CardTitle>System & Background</CardTitle>
            <CardDescription>Manage how the application runs on your system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="run-on-startup" 
                checked={settings.runOnStartup} 
                onCheckedChange={(checked) => {
                  settings.setRunOnStartup(!!checked);
                  if (!checked) {
                    settings.setStartMinimized(false);
                  }
                }} 
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="run-on-startup" className="cursor-pointer flex items-center gap-2">
                  <Power className="h-4 w-4 text-primary" />
                  Launch DBGuardX on system startup
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically start the application when you log in to Windows.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="minimize-to-tray" 
                checked={settings.minimizeToTray} 
                onCheckedChange={(checked) => settings.setMinimizeToTray(!!checked)} 
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="minimize-to-tray" className="cursor-pointer flex items-center gap-2">
                  <Minimize2 className="h-4 w-4 text-primary" />
                  Minimize to tray instead of closing
                </Label>
                <p className="text-sm text-muted-foreground">
                  When you click the "X" button, the app will hide in the system tray.
                </p>
              </div>
            </div>

            <div className={`flex items-center space-x-2 transition-opacity ${!settings.runOnStartup ? "opacity-50 pointer-events-none" : ""}`}>
              <Checkbox 
                id="start-minimized" 
                checked={settings.startMinimized} 
                disabled={!settings.runOnStartup}
                onCheckedChange={(checked) => settings.setStartMinimized(!!checked)} 
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="start-minimized" className="cursor-pointer flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-primary" />
                  Start minimized in tray
                </Label>
                <p className="text-sm text-muted-foreground">
                  Launch the application directly into the system tray on startup.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backup Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Backup Configuration</CardTitle>
            <CardDescription>Configure where and how your backups are stored.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase">Default Backup Destination</Label>
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
                <Label htmlFor="compress" className="cursor-pointer">
                  Enable Backup Compression (Gzip)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically compress .sql files to save disk space.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="auto-verify" 
                checked={settings.autoVerify} 
                onCheckedChange={(checked) => settings.setAutoVerify(!!checked)} 
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="auto-verify" className="cursor-pointer flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Auto-Verify backups after completion
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically run a health check on every new backup.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the application's primary theme color.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-muted-foreground uppercase flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Primary Theme Color
              </Label>
              <div className="flex flex-wrap gap-3">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => settings.setPrimaryColor(color.value)}
                    className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                      settings.primaryColor === color.value 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-transparent hover:border-muted-foreground/20"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-full ${color.bg} shadow-inner flex items-center justify-center`}>
                      {settings.primaryColor === color.value && (
                        <div className="h-2 w-2 rounded-full bg-white shadow-sm" />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${
                      settings.primaryColor === color.value ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {color.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <Label className="text-muted-foreground uppercase flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Startup Window Size
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'suitable', label: 'Suitable', desc: 'Smart size for your screen' },
                  { id: 'fixed', label: 'Fixed', desc: 'Classic 1024x768 size' },
                  { id: 'maximized', label: 'Maximized', desc: 'Fill the entire screen' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => settings.setWindowSizeMode(mode.id as any)}
                    className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 text-left transition-all ${
                      settings.windowSizeMode === mode.id 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-transparent bg-muted/50 hover:border-muted-foreground/20"
                    }`}
                  >
                    <span className={`text-sm font-bold ${
                      settings.windowSizeMode === mode.id ? "text-primary" : "text-foreground"
                    }`}>
                      {mode.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {mode.desc}
                    </span>
                  </button>
                ))}
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
              <Label className="text-muted-foreground uppercase">MySQL Data Directory</Label>
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
                <Label className="text-muted-foreground uppercase">Host</Label>
                <Input value={settings.host} onChange={(e) => settings.setHost(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase">Port</Label>
                <Input type="number" value={settings.port} onChange={(e) => settings.setPort(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase">Username</Label>
                <Input value={settings.user} onChange={(e) => settings.setUser(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase">Password</Label>
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
