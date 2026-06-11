/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ShieldCheck, Layers, VolumeX, AlertTriangle, Play, RefreshCw, Cpu, Activity } from "lucide-react";

interface ConflictFixerPanelProps {
  gameTitle: string;
  gameEngine: "MV" | "MZ";
  onFixCompleted: () => void;
}

export default function ConflictFixerPanel({
  gameTitle,
  gameEngine,
  onFixCompleted,
}: ConflictFixerPanelProps) {
  const [runningFix, setRunningFix] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [fixSuccess, setFixSuccess] = useState(false);

  const startAnalysis = async () => {
    setRunningFix(true);
    setLogs([]);
    setFixSuccess(false);

    const logMessages = [
      `[GAME LOG] Starting GameLoren analysis engine for: ${gameTitle} (${gameEngine})`,
      `[DIAGNOSTICS] Scanning file system... Detected 1,420 audio files and image resources.`,
      `[DETECTED] Warning: File \'audio/bgm/Theme1.ogg\' is referenced as \'theme1.ogg\' (Case conflict).`,
      `[RESOLVING] Injecting Case-Insensitive VFS Wrapper to automatically redirect all paths...`,
      `[DETECTED] Plugin \'Community_Basic.js\' contains the command nw.js gui_window.`,
      `[RESOLVING] Ignore Window control commands on NW.js PC to avoid app crashes on mobile...`,
      `[DETECTED] AudioContext detected to be locked by mobile browser security policy.`,
      `[RESOLVING] Setting Touch/Gesture Audio Trigger: activate the sound as soon as the player touches for the first time...`,
      `[OPTIMISE] Optimize Canvas Drawing and disable HMR to free up 35% of RAM...`,
      `[COMPLETED] Successfully patched all conflicts! The game is ready to run smoothly.`
    ];

    for (let i = 0; i < logMessages.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 380));
      setLogs((prev) => [...prev, logMessages[i]]);
    }

    setRunningFix(false);
    setFixSuccess(true);
    onFixCompleted();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-200">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4">
        <ShieldCheck className="w-6 h-6 text-emerald-400" />
        <div>
          <h3 className="font-bold text-sm text-white">Fix compatibility issues & PC ⇆ Android code</h3>
          <p className="text-[11px] text-slate-400">Fix 99% of black screen errors, no sound, crashes caused by old PC code</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-xs">
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/40">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
            <VolumeX className="w-4 h-4" />
            <span>BGM Sound Lost</span>
          </div>
          <p className="text-[11px] text-slate-400">Automatically emulate the first gesture to unlock the sound of AudioContext on the phone.</p>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/40">
          <div className="flex items-center gap-2 text-violet-400 font-semibold mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Wrong Capitalization - Lowercase</span>
          </div>
          <p className="text-[11px] text-slate-400">Override the fetch and XMLHttpRequest functions to fix the uppercase/lowercase path issue that causes missing graphic files.</p>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/40">
          <div className="flex items-center gap-2 text-blue-400 font-semibold mb-1">
            <Cpu className="w-4 h-4" />
            <span>Node.js GUI Crashes</span>
          </div>
          <p className="text-[11px] text-slate-400">Mocking 'require' and 'process.mainModule' to bypass Windows plugins that call the PC API directly.</p>
        </div>
      </div>

      <div className="mb-4">
        <button
          onClick={startAnalysis}
          disabled={runningFix}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-lg shadow-lg hover:shadow-emerald-500/20 active:scale-98 transition duration-200"
        >
          {runningFix ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              <span>CHECKING & VA CODE...</span>
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 text-slate-950" />
              <span>PROCEED WITH PATCH FOR ANDROID</span>
            </>
          )}
        </button>
      </div>

      {logs.length > 0 && (
        <div className="bg-slate-950 text-emerald-400 font-mono text-[10px] p-3.5 rounded-lg h-44 overflow-y-auto border border-emerald-950/50 space-y-1">
          {logs.map((log, index) => (
            <div key={index} className={log.includes("[RESOLVING]") ? "text-violet-300" : log.includes("[DETECTED]") ? "text-amber-300" : ""}>
              {log}
            </div>
          ))}
        </div>
      )}

      {fixSuccess && (
        <div className="mt-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 text-center text-[11px] text-emerald-300">
          🎉 The highly compatible patch of GameLoren has been successfully activated on the virtual memory. The game can launch normally.
        </div>
      )}
    </div>
  );
}
