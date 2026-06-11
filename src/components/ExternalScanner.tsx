/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Folder, Search, FileText, CheckCircle, FolderOpen, ArrowLeft, Terminal, Compass, PlusCircle } from "lucide-react";
import { VIRTUAL_SYSTEM_FOLDERS } from "../gamedata";
import { RPGGame } from "../types";

interface ExternalScannerProps {
  onGameLinked: (game: RPGGame) => void;
  linkedGameIds: string[];
}

export default function ExternalScanner({ onGameLinked, linkedGameIds }: ExternalScannerProps) {
  const [currentPath, setCurrentPath] = useState<string>("/storage/emulated/0");
  const [manualPath, setManualPath] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<any | null>(null);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<"android" | "pc" | "web">("android");

  // Keep path type and platform in sync dynamically (with override)
  useEffect(() => {
    const p = currentPath.trim().toLowerCase();
    if (p.startsWith("http://") || p.startsWith("https://") || p.includes("localhost") || p.includes("127.0.0.1") || p.endsWith(".html")) {
      setSelectedPlatform("web");
    } else if (p.includes(":") || p.includes("\\") || p.match(/^[a-z]\//) || p.startsWith("c/") || p.startsWith("d/")) {
      setSelectedPlatform("pc");
    } else {
      setSelectedPlatform("android");
    }
  }, [currentPath]);

  const handleFolderClick = (folder: any) => {
    setCurrentPath(folder.path);
    setScannedResult(null);
    setScanLog([]);
  };

  const traverseToParent = () => {
    if (currentPath === "/storage/emulated/0") return;
    const parts = currentPath.split(/[/\\]/);
    if (parts.length > 1) {
      parts.pop();
      setCurrentPath(parts.join("/") || "/");
    }
    setScannedResult(null);
    setScanLog([]);
  };

  const handleManualPathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPath.trim()) return;
    setCurrentPath(manualPath.trim());
    setScannedResult(null);
    setScanLog([]);
  };

  const executeEngineScan = async () => {
    setIsScanning(true);
    setScanLog([]);
    setScannedResult(null);

    const match = VIRTUAL_SYSTEM_FOLDERS.find((f) => f.path.toLowerCase() === currentPath.toLowerCase());

    let initialLogs: string[] = [];
    if (selectedPlatform === "web") {
      initialLogs = [
        `[LAUNCHER] Connecting packaged Web server at: ${currentPath}`,
        `[SCANNER] Send HTTP GET queries to validate responses...`,
        `[SCANNER] Detected a stable online port. Trying to load the main config file...`
      ];
    } else if (selectedPlatform === "pc") {
      initialLogs = [
        `[LAUNCHER] Windows PC virtual directory mapping at: ${currentPath}`,
        `[SCANNER] Falsely scanning specific Windows PC path characters...`,
        `[SCANNER] Searching for the file Game.exe or game.exe...`
      ];
    } else {
      initialLogs = [
        `[LAUNCHER] Starting recursive scan at: ${currentPath}`,
        `[SCANNER] Analyzing file structure tree... Waiting for permission to access external storage.`,
        `[SCANNER] Searching for RPG Maker-specific JSON files...`
      ];
    }

    for (const msg of initialLogs) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setScanLog((prev) => [...prev, msg]);
    }

    if (match && match.isRpgMaker && selectedPlatform === "android") {
      const stepLogs = [
        `[DETECTED] Structure signature detected: RPG Maker ${match.engine} Engine Folder!`,
        `[FILESYSTEM] Signature file match: ${match.signatureFiles?.join(", ")}`,
        `[METADATA] Game name determined by device: "}${match.gameTitle}" (v1.0.0)`,
        `[COMPLETED] Success: Ready to link adjacent files to the main directory.`
      ];

      for (const msg of stepLogs) {
        await new Promise((resolve) => setTimeout(resolve, 220));
        setScanLog((prev) => [...prev, msg]);
      }
      setScannedResult(match);
    } else {
      let stepLogs: string[] = [];
      let gameTitle = currentPath.split(/[/\\]/).filter(Boolean).pop() || "Custom_Game";
      if (gameTitle.toLowerCase().endsWith(".html")) {
        gameTitle = gameTitle.substring(0, gameTitle.lastIndexOf("."));
      }

      if (selectedPlatform === "web") {
        stepLogs = [
          `[DETECTED] Online RPG Maker Web server detected!`,
          `[FILESYSTEM] AJAX thread structure automatically optimizes resources via HTTP CORS.`,
          `[METADATA] Web game name identified: ""${gameTitle.replace(/_/g, " ")}"`,
          `[COMPLETED] Success: Created a Web Linker gateway for the application.`
        ];
      } else if (selectedPlatform === "pc") {
        stepLogs = [
          `[DETECTED] Detected drive containing PC games: ${currentPath}`,
          `[FILESYSTEM] The PC-Bridge emulator source code decompiler is linking the .exe file`,
          `[METADATA] Determined PC game name: "}${gameTitle.replace(/_/g, " ")}"`,
          `[COMPLETED] Success: Running under JoiPlay-PC compatible translation layer.`
        ];
      } else {
        stepLogs = [
          `[WARNING] Security bypass mode: System Virtual not matched. Reading license directly!`,
          `[FILESYSTEM] Force recognition of the directory as an External RPG Game.`,
          `[COMPLETED] Success: Created Native Bridge for this folder.`
        ];
      }

      for (const msg of stepLogs) {
        await new Promise((resolve) => setTimeout(resolve, 220));
        setScanLog((prev) => [...prev, msg]);
      }

      setScannedResult({
        path: currentPath,
        name: gameTitle,
        isRpgMaker: true,
        engine: "Custom" as any,
        gameTitle: gameTitle.replace(/_/g, " "),
      });
    }
    setIsScanning(false);
  };

  const triggerLink = () => {
    if (!scannedResult) return;

    const newGame: RPGGame = {
      id: scannedResult.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      title: scannedResult.gameTitle || scannedResult.name,
      engine: scannedResult.engine || "MV",
      version: "1.0.0",
      cover: scannedResult.engine === "MZ" ? "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800" : "https://images.unsplash.com/photo-1541562232579-512a21360020?w=800",
      desc: `The game is linked externally from the system [${selectedPlatform.toUpperCase()}] using the GameLoren intelligent scanning mechanism. Fully supports sensor assistance, virtual keys, and multi-platform compatibility optimization.`,
      size: "240 MB",
      dev: "External links",
      releaseDate: "Just linked",
      tags: ["External Scanned", selectedPlatform.toUpperCase(), scannedResult.engine || "MV"],
      isLinked: true,
      localPath: scannedResult.path,
      platform: selectedPlatform,
    };

    onGameLinked(newGame);
    setScannedResult(null);
    setScanLog([]);
    alert(`Game linked${newGame.title}" (${selectedPlatform.toUpperCase()}) successfully added to the Library!`);
  };

  const subDirectories = VIRTUAL_SYSTEM_FOLDERS.filter((f) => {
    if (f.path === currentPath) return false;
    const parentPath = f.path.substring(0, f.path.lastIndexOf("/"));
    return parentPath === currentPath;
  });

  let placeholderText = "Select the game folder or manually enter the path...";
  if (selectedPlatform === "web") {
    placeholderText = "Enter the web game server URL (e.g., http://...)";
  } else if (selectedPlatform === "pc") {
    placeholderText = "Enter the computer path (e.g., D:\Games\Name\...)";
  } else {
    placeholderText = "Enter Android path (e.g., /storage/emulated/0/...)";
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100">
      <div className="flex h-10 items-center gap-3 border-b border-slate-800 pb-3 mb-4">
        <FolderOpen className="w-5 h-5 text-emerald-400" />
        <h3 className="font-bold text-sm text-white">Scan & link games outside the Launcher</h3>
      </div>

      {/* Platform Segmented Selector Tool */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-xl mb-4 border border-slate-900/60 text-xs">
        <button
          type="button"
          onClick={() => {
            setSelectedPlatform("android");
            setCurrentPath("/storage/emulated/0");
            setScannedResult(null);
            setScanLog([]);
          }}
          className={`py-2 px-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition duration-150 ${
            selectedPlatform === "android"
              ? "bg-slate-900 text-emerald-400 shadow border border-slate-800"
              : "text-slate-500 hover:text-slate-350"
          }`}
        >
          <span>📱</span>
          <span>Android</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedPlatform("pc");
            setCurrentPath("C:\\Games\\MyRPGGame");
            setScannedResult(null);
            setScanLog([]);
          }}
          className={`py-2 px-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition duration-150 ${
            selectedPlatform === "pc"
              ? "bg-slate-900 text-sky-400 shadow border border-slate-800"
              : "text-slate-500 hover:text-slate-350"
          }`}
        >
          <span>💻</span>
          <span>PC Windows</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedPlatform("web");
            setCurrentPath("http://localhost:3000/index.html");
            setScannedResult(null);
            setScanLog([]);
          }}
          className={`py-2 px-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition duration-150 ${
            selectedPlatform === "web"
              ? "bg-slate-900 text-violet-400 shadow border border-slate-800"
              : "text-slate-500 hover:text-slate-350"
          }`}
        >
          <span>🌐</span>
          <span>Web OS</span>
        </button>
      </div>

      <div className="mb-4">
        <form onSubmit={handleManualPathSubmit} className="flex gap-2">
          <div className="relative flex flex-1 items-center gap-1">
            <div className="relative flex-1">
              <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={currentPath}
                onChange={(e) => {
                  setCurrentPath(e.target.value);
                  setScannedResult(null);
                  setScanLog([]);
                }}
                placeholder={placeholderText}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            {/* Folder Picker */}
            <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg cursor-pointer transition flex items-center justify-center">
              <FolderOpen className="w-4 h-4" title="Select folder" />
              <input 
                type="file" 
                // @ts-ignore
                webkitdirectory="" 
                directory="" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const firstFile = e.target.files[0];
                    // attempt to get path, fallback to fake if standard web
                    const path = firstFile.webkitRelativePath ? firstFile.webkitRelativePath.split('/')[0] : 'Selected_Folder';
                    setCurrentPath(`/storage/emulated/0/${path}`);
                    setScannedResult(null);
                    setScanLog([]);
                  }
                }} 
              />
            </label>
            {/* File Picker */}
            <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg cursor-pointer transition flex items-center justify-center">
              <FileText className="w-4 h-4" title="Select the file to run (index.html / .exe)" />
              <input 
                type="file" 
                accept=".html,.exe"
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const firstFile = e.target.files[0];
                    const path = firstFile.name; // Get file name
                    setCurrentPath(`/storage/emulated/0/Download/${path}`);
                    setScannedResult(null);
                    setScanLog([]);
                  }
                }} 
              />
            </label>
          </div>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-xs text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            Point to
          </button>
        </form>
      </div>

      {/* Breadcrumb nav */}
      <div className="flex items-center gap-2 mb-4 bg-slate-950/40 p-2 rounded-md border border-slate-900 text-xs">
        <button
          onClick={traverseToParent}
          disabled={currentPath === "/storage/emulated/0"}
          className="flex items-center gap-1 hover:text-emerald-400 disabled:text-slate-700 disabled:pointer-events-none text-slate-300 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Parent folder</span>
        </button>
        <span className="text-slate-600">/</span>
        <span className="font-mono text-[11px] text-slate-400 overflow-x-auto truncate">{currentPath}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Navigation list */}
        <div className="bg-slate-950/60 rounded-lg p-3 min-h-48 max-h-56 overflow-y-auto border border-slate-900/80 space-y-1.5">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-900 pb-1 mb-2">
            Scannable folder ({subDirectories.length})
          </div>

          {subDirectories.length === 0 ? (
            <div className="text-slate-600 text-xs text-center py-10 flex flex-col items-center gap-2">
              <Compass className="w-6 h-6 text-slate-800" />
              <span>The subfolder is empty or not displayed (Scan Simulated)</span>
            </div>
          ) : (
            subDirectories.map((folder) => (
              <button
                key={folder.path}
                onClick={() => handleFolderClick(folder)}
                className="w-full flex items-center justify-between text-left p-2 hover:bg-slate-900/70 rounded-md border border-transparent hover:border-slate-800 transition"
              >
                <div className="flex items-center gap-2 max-w-[80%]">
                  <Folder className={`w-4 h-4 flex-shrink-0 ${folder.isRpgMaker ? "text-violet-400" : "text-emerald-500"}`} />
                  <span className="text-xs truncate font-medium text-slate-200">{folder.name}</span>
                </div>
                {folder.isRpgMaker && (
                  <span className="text-[9px] bg-violet-950/50 text-violet-400 px-1.5 py-0.5 rounded border border-violet-800/30">
                    Ready to scan
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Console / results */}
        <div className="flex flex-col justify-between bg-slate-950 rounded-lg p-3 min-h-48 max-h-56 border border-slate-900">
          <div className="overflow-y-auto h-36 font-mono text-[10px] space-y-1 pr-1">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-900 pb-1 mb-2 flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-emerald-500" />
              <span>Analysis process</span>
            </div>
            {scanLog.map((log, i) => (
              <div key={i} className={log.includes("[DETECTED]") ? "text-violet-300" : log.includes("[WARNING]") ? "text-red-400" : "text-slate-400"}>
                {log}
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-900">
            {scannedResult ? (
              <button
                onClick={triggerLink}
                disabled={linkedGameIds.includes(scannedResult.name.toLowerCase().replace(/_/g, "-"))}
                className="w-full bg-violet-600 hover:bg-violet-700 text-slate-100 text-xs font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition active:scale-98"
              >
                <PlusCircle className="w-4 h-4" />
                <span>LINK: {scannedResult.gameTitle}</span>
              </button>
            ) : (
              <button
                onClick={executeEngineScan}
                disabled={isScanning}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-850 text-slate-950 text-xs font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition active:scale-98"
              >
                <Search className="w-4 h-4 text-slate-950" />
                <span>ANALYZE THIS CATEGORY</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
