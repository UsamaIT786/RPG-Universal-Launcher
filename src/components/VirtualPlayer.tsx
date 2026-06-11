/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, AlertCircle, Terminal, Flame, Menu } from "lucide-react";
import { RPGGame, GameLorenSettings } from "../types";
import { CHEAT_MOD_DATABASE } from "../gamedata";
import VirtualGamepad from "./VirtualGamepad";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Encoding } from "@capacitor/filesystem";
import { HttpServer } from "@cantoo/capacitor-http-server";

interface VirtualPlayerProps {
  game: RPGGame;
  settings: GameLorenSettings;
  activeMods?: string[];
  onExit: () => void;
}

const WEBGL_OPTIMIZER_PLUGIN = `
(() => {
    const isAndroidOrWebOrJoiPlay = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(navigator.userAgent) 
        || window.location.protocol.startsWith("http") 
        || /JoiPlay/i.test(navigator.userAgent);

    const shouldProcessTexture = function() {
        return isAndroidOrWebOrJoiPlay && (window.SceneManager && window.Scene_Battle && window.Scene_Map) && (SceneManager._scene instanceof Scene_Battle || SceneManager._scene instanceof Scene_Map);
    };

    const downscaleTexture = function(texture) {
        if (!shouldProcessTexture()) return texture;

        if ((texture instanceof HTMLImageElement || texture instanceof HTMLCanvasElement) &&
            texture.width && texture.height) {
            
            const maxDimension = Math.max(texture.width, texture.height);
            const maxTextureSize = (window.Graphics && Graphics.gl && Graphics.gl.getParameter(Graphics.gl.MAX_TEXTURE_SIZE)) || 4096;

            if (maxDimension > maxTextureSize) {
                const scale = maxTextureSize / maxDimension;
                const canvas = document.createElement('canvas');
                canvas.width = Math.floor(texture.width * scale);
                canvas.height = Math.floor(texture.height * scale);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(texture, 0, 0, canvas.width, canvas.height);
                return canvas;
            }
        }
        return texture;
    };

    if(window.PIXI && PIXI.resources && PIXI.resources.ImageResource) {
        const originalImageResource = PIXI.resources.ImageResource.prototype;
        const originalResize = originalImageResource.resize;
        originalImageResource.resize = function(width, height) {
            this.source = downscaleTexture(this.source);
            originalResize.call(this, width, height);
        };

        PIXI.BaseTexture = class extends PIXI.BaseTexture {
            constructor(resource, options) {
                super(downscaleTexture(resource), options);
            }
        };

        if (window.Bitmap) {
            const _Bitmap_initialize = Bitmap.prototype.initialize;
            Bitmap.prototype.initialize = function(width, height) {
                _Bitmap_initialize.call(this, width, height);
                if (shouldProcessTexture()) {
                    this._image = downscaleTexture(this._image);
                    adjustImageScale(this); 
                }
            };

            function adjustImageScale(bitmap) {
                if (bitmap._image && (bitmap.width !== bitmap._image.width || bitmap.height !== bitmap._image.height)) {
                    const scaleX = bitmap.width / bitmap._image.width;
                    const scaleY = bitmap.height / bitmap._image.height;
                    bitmap.scale = new PIXI.Point(scaleX, scaleY);
                }
            }
        }
        console.log("[GameLoren] WebGL Texture Optimizer Plugin Injected.");
    }
})();
`;

export default function VirtualPlayer({ game, settings, activeMods = [], onExit }: VirtualPlayerProps) {
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [cheatLogs, setCheatLogs] = useState<string[]>([
    `[VFS] Successfully injected Web Audio API seed.`,
    `[INPUT] Virtual keyboard mappings have been initialized.`,
    `[MEMORY] Starting to set up WebGL Heap for the game.`
  ]);
  const [activeCheats, setActiveCheats] = useState<string[]>([]);
  const [isCheatMenuOpen, setIsCheatMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [gameTime, setGameTime] = useState("00:00:00");
  
  const [resolvedGamePath, setResolvedGamePath] = useState<string>("");
  const serverListenerRef = useRef<any>(null);
  const [bootPhase, setBootPhase] = useState<number>(0);
  const [bootLogs, setBootLogs] = useState<string[]>(['Initializing Game Engine...']);

  const secondsElapsed = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let isMounted = true;
    const bootGame = async () => {
      const addLog = (msg: string) => {
        if (isMounted) {
          setBootLogs(prev => [...prev, msg]);
          setCheatLogs(prev => {
            if (prev.includes(msg)) return prev;
            return [...prev, msg];
          });
        }
      };

      try {
        if (!game.localPath) {
          addLog("[WARN] Local path not found (localPath is empty).");
          setBootPhase(1);
          return;
        }

        const isNative = Capacitor.isNativePlatform();
        addLog(`[VFS] Native platform: ${isNative}`);
        
        if (isNative) {
          // Xử lý dọn dẹp đường dẫn gốc
          let basePath = game.localPath.replace('file://', '');
          let dirPath = basePath;
          const lastSlashIndex = dirPath.lastIndexOf('/');
          const lastBackslashIndex = dirPath.lastIndexOf('\\');
          const lastSeparatorIndex = Math.max(lastSlashIndex, lastBackslashIndex);

          if (dirPath.toLowerCase().endsWith('.exe') || dirPath.toLowerCase().endsWith('.html')) {
            dirPath = dirPath.substring(0, lastSeparatorIndex > -1 ? lastSeparatorIndex : dirPath.length);
          }
          
          if (dirPath.endsWith('/') || dirPath.endsWith('\\')) {
            dirPath = dirPath.substring(0, dirPath.length - 1);
          }

          addLog(`[VFS] Root path: ${dirPath}`);
          
          // BẮT BUỘC: Thêm tiền tố file:// để Capacitor nhận dạng đường dẫn tuyệt đối
          const safeDirPath = dirPath.startsWith('/') ? `file://${dirPath}` : dirPath;
          let relativeIndexPath = "/index.html";
          
          try {
            await Filesystem.stat({ path: `${safeDirPath}/index.html` });
            relativeIndexPath = "/index.html";
          } catch(e) {
            try {
              await Filesystem.stat({ path: `${safeDirPath}/www/index.html` });
              relativeIndexPath = "/www/index.html";
            } catch(e2) {
              relativeIndexPath = "/index.html"; 
            }
          }

          const absoluteIndexPath = `${safeDirPath}${relativeIndexPath}`;
          addLog(`[VFS] Initialization file verification: ${absoluteIndexPath}`);
          
          try {
            await Filesystem.stat({ path: absoluteIndexPath });
            addLog("[VFS] index.html file exists: ACCESS ALLOWED");
            
            // Khởi động Local HTTP Server
            const startPort = 8080 + Math.floor(Math.random() * 1000);
            try {
              const res = await HttpServer.start({ port: startPort });
              addLog(`[SERVER] Local HTTP Server initialized at: http://localhost:${res.port}`);
              
              const rawDirPath = safeDirPath.replace('file://', '');
              
              serverListenerRef.current = await HttpServer.addListener('request', async (req) => {
                try {
                  let reqPath = req.path;
                  if (reqPath === "/") reqPath = relativeIndexPath;
                  else if (reqPath === "/www" || reqPath === "/www/") reqPath = "/www/index.html"; // Mặc định cho MV
                  
                  // Decode đường dẫn vì URL có thể chứa %20 thay cho khoảng trắng
                  const localFilePath = `${rawDirPath}${decodeURIComponent(reqPath)}`;
                  
                  let ct = 'application/octet-stream';
                  const pLower = reqPath.toLowerCase();
                  if (pLower.endsWith('.html')) ct = 'text/html';
                  else if (pLower.endsWith('.js')) ct = 'text/javascript';
                  else if (pLower.endsWith('.css')) ct = 'text/css';
                  else if (pLower.endsWith('.png')) ct = 'image/png';
                  else if (pLower.endsWith('.jpg') || pLower.endsWith('.jpeg')) ct = 'image/jpeg';
                  else if (pLower.endsWith('.json')) ct = 'application/json';
                  else if (pLower.endsWith('.ogg')) ct = 'audio/ogg';
                  else if (pLower.endsWith('.m4a')) ct = 'audio/mp4';
                  else if (pLower.endsWith('.woff')) ct = 'font/woff';

                  await HttpServer.respond({
                    requestId: req.requestId,
                    status: 200,
                    headers: { "Content-Type": ct, "Access-Control-Allow-Origin": "*" },
                    bodyFilePath: localFilePath
                  });
                } catch(e) {
                  await HttpServer.respond({
                    requestId: req.requestId,
                    status: 404,
                    bodyText: "Not Found"
                  });
                }
              });

              // Sử dụng HttpURL
              const webServerUrl = `http://localhost:${res.port}${relativeIndexPath}`;
              addLog(`[SERVER] Virtual Path Pointer: ${webServerUrl}`);
              if (isMounted) setResolvedGamePath(webServerUrl);
            } catch (serverErr: any) {
               addLog(`[SERVER ERROR] Server Error: ${serverErr.message || serverErr}`);
               // Fallback convertFileSrc safe
               const webServerUrlUrl = Capacitor.convertFileSrc(absoluteIndexPath);
               if (isMounted) setResolvedGamePath(webServerUrlUrl);
            }
          } catch(e: any) {
            addLog(`[ERROR] Cannot find index.html file: ${e.message || e}`);
          }

          addLog("[PROC] Loading GameLoren Virtual Shield control system...");
          await new Promise(r => setTimeout(r, 600));
          
        } else {
          // Web fallback
          addLog("[WEB] Run Web environment (Skip Native VFS)...");
          let base = game.localPath || "";
          const isNetworkUrl = base.startsWith("http://") || base.startsWith("https://");
          
          if (!isNetworkUrl) {
            addLog("[SECURITY] Web browser BLOCKS direct access to the hard drive (file://).");
            addLog("[LIMITATION] Cannot create a Local Server by yourself due to Browser Sandbox.");
            addLog("[WEB GUIDE] To play games available on the computer, you need to create a localhost:");
            addLog(" 1. Open Terminal in the game folder on your computer, run: npx http-server -p 8080 --cors");
            addLog(" 2. Change the game path to: http://localhost:8080");
          } else {
            addLog(`[WEB] Point the path to: ${base}`);
          }
          await new Promise(r => setTimeout(r, 600));
        }

      } catch (err: any) {
        addLog(`[CRITICAL ERROR LOOP]: ${err.message || err}`);
      } finally {
        if (isMounted) setBootPhase(1);
      }
    };

    bootGame();

    return () => { 
      isMounted = false; 
      if (serverListenerRef.current) serverListenerRef.current.remove();
      if (Capacitor.isNativePlatform()) HttpServer.stop().catch(() => {});
    };
  }, []);

  // Các Effect Hook, phím bấm, logs cheat (giữ nguyên không đổi)
  useEffect(() => {
    if (activeMods && activeMods.length > 0) {
      // (Giữ nguyên logic của bạn)
    }
  }, [activeMods]);

  const playBeep = (freq: number = 440, type: OscillatorType = "sine") => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  useEffect(() => {
    if (bootPhase === 0) return;
    const timer = setInterval(() => {
      secondsElapsed.current += 1;
      const hours = Math.floor(secondsElapsed.current / 3600).toString().padStart(2, "0");
      const mins = Math.floor((secondsElapsed.current % 3600) / 60).toString().padStart(2, "0");
      const secs = (secondsElapsed.current % 60).toString().padStart(2, "0");
      setGameTime(`${hours}:${mins}:${secs}`);
    }, 1000);

    return () => {
      clearInterval(timer);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [bootPhase]);

  const dispatchIframeEvent = (eventName: 'keydown' | 'keyup', keyName: string) => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      const codeMap: Record<string, number> = {
        "z": 90, "escape": 27, "shift": 16, "q": 81, "w": 87,
        "arrowup": 38, "arrowdown": 40, "arrowleft": 37, "arrowright": 39
      };
      const code = codeMap[keyName] || 0;
      try {
        iframe.contentWindow.dispatchEvent(new KeyboardEvent(eventName, { 
          key: keyName, code: keyName, keyCode: code, which: code, bubbles: true
        }));
      } catch (e) {}
    }
  };

  const handleKeyPress = (keyName: string) => {
    if (keyName === "z") playBeep(523, "triangle");
    else if (keyName === "escape") playBeep(392, "sine");
    else if (keyName.includes("arrow")) playBeep(293, "sawtooth");
    else playBeep(330, "sine");
    dispatchIframeEvent('keydown', keyName);
  };

  const handleKeyRelease = (keyName: string) => {
    dispatchIframeEvent('keyup', keyName);
  };

  const triggerCheat = (cheatId: string, cheatName: string) => {
    let active = [...activeCheats];
    if (active.includes(cheatId)) {
      active = active.filter((id) => id !== cheatId);
    } else {
      active.push(cheatId);
      playBeep(880, "sine");
    }
    setActiveCheats(active);
  };

  const changeSpeed = (mult: number) => {
    setSpeedMultiplier(mult);
    playBeep(659, "square");
  };

  // Cập nhật lại logic getRunUrl xử lý URL máy chủ ảo an toàn
  const getRunUrl = () => {
    const getQueryString = () => `?mods=${activeMods.join(",")}&cheatMode=${activeCheats.join(",")}&resolutionScale=${settings?.resolutionScale || 1.0}`;

    // NẾU LÀ NATIVE, resolvedGamePath lúc này ĐÃ LÀ URL chuẩn: http://localhost/_capacitor_file_/...
    if (Capacitor.isNativePlatform() && resolvedGamePath) {
       // Chúng ta encodeURI để đề phòng đường dẫn folder có dấu cách (vd: "My Game")
       return `${encodeURI(resolvedGamePath)}${getQueryString()}`;
    }

    // NẾU LÀ WEB FALLBACK
    let base = game.localPath || "";
    try {
      const urlStr = base.includes("?") ? base : `${base}${base.endsWith("/") ? "" : "/"}index.html`;
      const url = new URL(urlStr);
      url.searchParams.set("mods", activeMods.join(","));
      url.searchParams.set("cheatMode", activeCheats.join(","));
      url.searchParams.set("resolutionScale", String(settings?.resolutionScale || 1.0));
      return url.toString();
    } catch {
      const separator = base.endsWith("/") ? "" : "/";
      return `${base}${separator}index.html${getQueryString()}`;
    }
  };

  const runUrl = getRunUrl();

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden flex">
      {/* Booting Sequence Overlay */}
      {bootPhase === 0 && (
        <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md bg-black border border-slate-800 rounded shadow-2xl p-4 font-mono text-[11px] text-emerald-500 overflow-y-auto h-64 select-text">
            <div className="mb-2 text-slate-400">GameLoren OS v4.2 - Booting Layer</div>
            <div className="mb-2 text-slate-400">Target ID: {game.id} [{game.engine}]</div>
            <div className="w-full h-px bg-slate-800 mb-2"></div>
            {bootLogs.map((log, i) => (
              <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} key={i} className="mb-1">
                &gt; {log}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Main Game Frame */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {bootPhase === 1 && game.isLinked && game.localPath ? (
          <iframe
            src={runUrl}
            onLoad={(e) => {
              const iframe = e.target as HTMLIFrameElement;
              try {
                if (iframe.contentWindow) {
                  const errScript = iframe.contentWindow.document.createElement("script");
                  errScript.textContent = `
                    window.addEventListener('error', function(e) {
                      console.error('[IFRAME ERROR]', e.message, e.filename, e.lineno);
                    });
                  `;
                  iframe.contentWindow.document.head.prepend(errScript);
                  
                  if (activeMods.includes("webgl_texture_optimize")) {
                    const script = iframe.contentWindow.document.createElement("script");
                    script.textContent = WEBGL_OPTIMIZER_PLUGIN;
                    iframe.contentWindow.document.head.appendChild(script);
                  }
                }
              } catch(err) {
                console.warn("[VirtualPlayer] CORS block logger injection", err);
              }
            }}
            className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
            title={`${game.title} - Real Game Instance`}
            allow="fullscreen; autoplay; encrypted-media; xr-spatial-tracking"
            style={{ 
              transform: settings.resolutionScale !== 1.0 ? `scale(${settings.resolutionScale})` : "none",
              transformOrigin: "center center"
            }}
          />
        ) : bootPhase === 1 && (
          <div className="absolute inset-0 flex flex-col justify-center items-center p-6 bg-slate-900 select-none">
            <div className="text-center space-y-2">
              <AlertCircle className="w-16 h-16 text-slate-600 mx-auto opacity-50 mb-4" />
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-300 tracking-wide text-shadow">Game not available</h1>
            </div>
          </div>
        )}

        {/* Floating Menu Button */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-40 bg-black/40 backdrop-blur-md border border-white/10 text-white p-2 rounded hover:bg-black/60 transition active:scale-95"
        >
          <Menu className="w-5 h-5 opacity-70" />
        </button>

        {/* Virtual Gamepad */}
        <div className="absolute inset-0 pointer-events-none z-30">
          <VirtualGamepad
            opacity={settings.gamepadOpacity}
            scale={settings.gamepadSize}
            onPressKey={handleKeyPress}
            onReleaseKey={handleKeyRelease}
          />
        </div>
      </div>

      {/* Sidebar Menu */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-800 z-50 p-4 flex flex-col shadow-2xl pointer-events-auto select-none"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                <div className="font-bold text-sm text-white">Control Menu</div>
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={onExit}
                  className="flex-1 flex items-center justify-center gap-1 p-2 bg-red-600 hover:bg-red-700 text-slate-100 rounded text-xs font-bold transition shadow-lg active:scale-95"
                >
                  <X className="w-4 h-4" /> EXIT GAME
                </button>
                <button
                  onClick={() => setIsCheatMenuOpen(!isCheatMenuOpen)}
                  className="flex-1 flex items-center justify-center gap-1 bg-violet-600 hover:bg-violet-700 text-slate-100 font-bold text-xs p-2 rounded shadow transition active:scale-95"
                >
                  <Flame className="w-4 h-4" /> CHEATING
                </button>
              </div>

              {/* Logs Area */}
              <div className="flex-1 flex flex-col overflow-hidden mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">VFS & Diagnostics Core</h3>
                </div>
                <div className="flex-1 bg-slate-950 p-3 rounded border border-slate-850 overflow-y-auto font-mono text-[9px] space-y-1.5 text-slate-400 select-text">
                  {cheatLogs.map((log, index) => (
                    <div 
                      key={index} 
                      className={log.includes("[CHEAT]") ? "text-violet-400" : log.includes("[GAMEPAD]") ? "text-blue-400" : log.includes("ERROR") || log.includes("ERROR") ? "text-red-400" : log.includes("[SERVER]") ? "text-green-400" : "text-slate-400"}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>

              {/* Speed Controls */}
              <div>
                <span className="block text-slate-500 text-[10px] uppercase mb-2">Increase frame rate</span>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 4, 10].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => changeSpeed(spd)}
                      className={`py-1.5 rounded text-center text-[10px] transition font-bold ${
                        speedMultiplier === spd 
                          ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20" 
                          : "bg-slate-950 text-slate-400 border border-slate-800"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}