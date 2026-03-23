import React from "react";
import { Skull } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortStatus {
  port: number;
  is_in_use: boolean;
  process_name: string | null;
  pid: number | null;
}

interface TerminalOutputProps {
  port: number | null;
  result: PortStatus | null;
  terminalStep: number;
  onKill: (pid: number) => void;
  command?: string;
  headerTitle?: string;
  target?: string;
  expectedService?: string;
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({
  port,
  result,
  terminalStep,
  onKill,
  command = "scan",
  headerTitle = "port-inspector",
  target = "127.0.0.1",
  expectedService,
}) => {
  if (!port) return null;

  const isExpectedService = React.useMemo(() => {
    if (!result || !result.process_name || !expectedService) return false;
    const name = result.process_name.toLowerCase();
    if (expectedService === "mysql") {
      return name.includes("mysql") || name.includes("mariadb");
    }
    if (expectedService === "apache") {
      return name.includes("httpd") || name.includes("apache") || name.includes("nginx");
    }
    return false;
  }, [result, expectedService]);

  const hasConflict = result?.is_in_use && (!expectedService || !isExpectedService);

  return (
    <div className="rounded-md bg-slate-900 p-6 font-mono text-sm text-zinc-300 border border-slate-700/50 shadow-2xl min-h-[320px] flex flex-col transition-all duration-500">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-700/50 pb-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]" />
          <div className="h-3 w-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.2)]" />
          <div className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.2)]" />
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest ml-2">
          {headerTitle} --target {target}:{port}
        </span>
      </div>

      <div className="space-y-2 flex-grow">
        {terminalStep >= 1 && (
          <p className="animate-in fade-in slide-in-from-left-2 duration-300">
            <span className="text-emerald-500">$</span> {command} --port {port}
          </p>
        )}
        {terminalStep >= 2 && (
          <p className="text-slate-500 italic animate-in fade-in slide-in-from-left-2 duration-300">
            Initializing diagnostic sequence on 0.0.0.0:{port}...
          </p>
        )}

        {terminalStep >= 3 && (
          !result ? (
            <p className="text-primary animate-pulse italic">Establishing secure kernel connection...</p>
          ) : result.is_in_use ? (
            <>
              {hasConflict ? (
                <p className="text-red-400 font-bold mt-4 underline decoration-red-900/50 underline-offset-4 animate-in fade-in zoom-in-95 duration-500">
                  [!] CONFLICT DETECTED: PORT OCCUPIED
                </p>
              ) : (
                <p className="text-emerald-400 font-bold mt-4 underline decoration-emerald-900/50 underline-offset-4 animate-in fade-in zoom-in-95 duration-500">
                  [✓] NO CONFLICT: SERVICE IS RUNNING NORMALLY
                </p>
              )}
              
              {terminalStep >= 4 && (
                <div className="pl-4 border-l-2 border-slate-700 mt-4 space-y-2 bg-slate-800/30 p-4 rounded-r-md animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-lg">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-slate-500">PORT ID   :</span>
                    <span className="text-white">{port}</span>
                    <span className="text-slate-500">PROCESS   :</span>
                    <span className="text-white font-bold uppercase tracking-wider">{result.process_name || "UNKNOWN_APP"}</span>
                    <span className="text-slate-500">PID       :</span>
                    <span className="text-white font-mono">{result.pid || "N/A"}</span>
                    <span className="text-slate-500">STATUS    :</span>
                    <span className={hasConflict ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                      {hasConflict ? "CONFLICT" : "HEALTHY"}
                    </span>
                  </div>
                </div>
              )}
              {terminalStep >= 5 && hasConflict && (
                <div className="pt-5 border-t border-slate-700/50 mt-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <p className="text-slate-500 text-[10px] mb-3 tracking-widest uppercase font-bold">Administrator Override Required:</p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9 px-4 shadow-lg shadow-red-900/20 transition-all active:scale-95"
                    onClick={() => result.pid && onKill(result.pid)}
                  >
                    <Skull className="mr-2 h-4 w-4" />
                    EXEC KILL --FORCE {result.pid}
                  </Button>
                </div>
              )}
              {terminalStep >= 5 && !hasConflict && (
                <div className="pt-5 border-t border-slate-700/50 mt-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <p className="text-slate-500 text-[10px] mb-3 tracking-widest uppercase font-bold">System Status:</p>
                  <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-widest">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Operational Integrity Verified
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-emerald-400 font-bold mt-4 underline decoration-emerald-900/50 underline-offset-4 animate-in fade-in zoom-in-95 duration-500">
                [✓] SCAN COMPLETE: PORT IS CLEAR
              </p>
              {terminalStep >= 4 && (
                <p className="text-slate-500 italic bg-slate-800/20 p-4 rounded-md border border-slate-700/30 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  Reliability verification complete. Port {port} is ready for binding.
                </p>
              )}
            </>
          )
        )}
      </div>

      <div className="pt-4 flex items-center gap-1 border-t border-slate-700/10 mt-4">
        <span className="text-emerald-500">$</span>
        <span className="h-4 w-2 bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      </div>
    </div>
  );
};
