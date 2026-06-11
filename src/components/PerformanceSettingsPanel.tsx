import React, { useState } from "react";
import { Sliders, Cpu, Zap, BatteryCharging, Check, ToggleLeft, ToggleRight, HelpCircle, Heart, Film } from "lucide-react";
import { GameLorenSettings } from "../types";

interface PerformanceSettingsPanelProps {
  settings: GameLorenSettings;
  onUpdateSettings: (settings: GameLorenSettings) => void;
}

export default function PerformanceSettingsPanel({
  settings,
  onUpdateSettings,
}: PerformanceSettingsPanelProps) {
  const [frameSkip, setFrameSkip] = useState(settings.frameSkip);
  const [scale, setScale] = useState(settings.resolutionScale);
  const [preset, setPreset] = useState<"battery" | "balanced" | "max-perf">(settings.performancePreset);
  const [audioUnblock, setAudioUnblock] = useState(settings.audioUnlocker);
  const [slideshowInterval, setSlideshowInterval] = useState(settings.slideshowInterval || 5);
  const [bypassMode, setBypassMode] = useState(settings.bypassMode || false);
  const [showHiddenGames, setShowHiddenGames] = useState(settings.showHiddenGames || false);

  const saveSettings = (updated: Partial<GameLorenSettings>) => {
    onUpdateSettings({
      ...settings,
      ...updated,
    });
  };

  const handlePresetSelect = (pr: "battery" | "balanced" | "max-perf") => {
    setPreset(pr);
    let updatedScale = scale;
    let fs = frameSkip;
    if (pr === "battery") {
      updatedScale = 0.5;
      fs = true;
    } else if (pr === "balanced") {
      updatedScale = 0.75;
      fs = false;
    } else {
      updatedScale = 1.0;
      fs = false;
    }
    setScale(updatedScale);
    setFrameSkip(fs);
    saveSettings({ performancePreset: pr, resolutionScale: updatedScale, frameSkip: fs });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-5">
        <Cpu className="w-5 h-5 text-emerald-400" />
        <div>
          <h3 className="font-bold text-sm text-white">Optimize performance (JoiPlay Mode)</h3>
          <p className="text-[11px] text-slate-400">Reduce stuttering, save battery & maintain stable 60 FPS</p>
        </div>
      </div>

      <div className="space-y-5 text-xs">
        {/* Preset configuration */}
        <div>
          <label className="block text-slate-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">
            Hardware optimization mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handlePresetSelect("battery")}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border font-semibold transition ${
                preset === "battery"
                  ? "bg-amber-500/20 border-amber-500 text-amber-300"
                  : "bg-slate-950 border-slate-800/60 text-slate-400 hover:text-slate-300"
              }`}
            >
              <BatteryCharging className="w-4 h-4" />
              <span>Battery saving</span>
            </button>

            <button
              onClick={() => handlePresetSelect("balanced")}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border font-semibold transition ${
                preset === "balanced"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                  : "bg-slate-950 border-slate-800/60 text-slate-400 hover:text-slate-300"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Balance</span>
            </button>

            <button
              onClick={() => handlePresetSelect("max-perf")}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border font-semibold transition ${
                preset === "max-perf"
                  ? "bg-rose-500/20 border-rose-500 text-rose-300"
                  : "bg-slate-950 border-slate-800/60 text-slate-400 hover:text-slate-300"
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Extremely top</span>
            </button>
          </div>
        </div>

        {/* Resolution Scaler */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-slate-400 font-medium">Canvas Resolution (Screen Ratio)</span>
            <span className="font-mono text-emerald-400 font-bold">{(scale * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.0"
            step="0.05"
            value={scale}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setScale(val);
              saveSettings({ resolutionScale: val });
            }}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <p className="mt-1 text-[10px] text-slate-500">
            * Downscaling Canvas helps optimize the GPU on weak machines. 50% to 75% runs twice as smoothly as 100%.
          </p>
        </div>

        {/* Slideshow scrolling interval */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-emerald-400" />
              <span>Banner Image Transition Speed (Slideshow Interval)</span>
            </span>
            <span className="font-mono text-emerald-400 font-bold">{slideshowInterval} second</span>
          </div>
          <div className="flex gap-2">
            {[3, 5, 10, 15].map((secs) => (
              <button
                key={secs}
                onClick={() => {
                  setSlideshowInterval(secs);
                  saveSettings({ slideshowInterval: secs });
                }}
                className={`flex-1 py-1 px-2.5 rounded font-mono text-[11px] font-bold transition border ${
                  slideshowInterval === secs
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-400"
                }`}
              >
                {secs} Second
              </button>
            ))}
          </div>
        </div>

        {/* Frame Skipping Toggle */}
        <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-lg border border-slate-850">
          <div className="max-w-[75%]">
            <div className="font-semibold text-slate-200">Skip frames (Auto Frame-Skip)</div>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
              Automatically reduce animation rendering speed when FPS drops below 30, prioritizing smooth game performance.
            </p>
          </div>
          <button
            onClick={() => {
              const fs = !frameSkip;
              setFrameSkip(fs);
              saveSettings({ frameSkip: fs });
            }}
            className="text-slate-400 hover:text-emerald-400 transition"
          >
            {frameSkip ? (
              <ToggleRight className="w-10 h-10 text-emerald-400" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-slate-600" />
            )}
          </button>
        </div>

        {/* Audio Buffer optimization */}
        <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-lg border border-slate-850">
          <div className="max-w-[75%]">
            <div className="font-semibold text-slate-200">Fast audio unlocking (Web Audio API)</div>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
              Force the BGM sound system to reactivate right on the first startup screen without waiting to tap.
            </p>
          </div>
          <button
            onClick={() => {
              const ab = !audioUnblock;
              setAudioUnblock(ab);
              saveSettings({ audioUnlocker: ab });
            }}
            className="text-slate-400 hover:text-emerald-400 transition"
          >
            {audioUnblock ? (
              <ToggleRight className="w-10 h-10 text-emerald-400" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-slate-600" />
            )}
          </button>
        </div>

        {/* Amnesty / Bypass licensing validation mode */}
        <div className="flex items-center justify-between bg-purple-950/25 p-3 rounded-lg border border-purple-900/30">
          <div className="max-w-[75%]">
            <div className="font-semibold text-purple-300 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-purple-400 fill-purple-400" />
              <span>Copyright Bypass Mode (Bypass Mode / Amnesty)</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
              Skip all online hardware license (DRM) checks. Extremely convenient for offline game research or when the server is blocked.
            </p>
          </div>
          <button
            onClick={() => {
              const bp = !bypassMode;
              setBypassMode(bp);
              saveSettings({ bypassMode: bp });
            }}
            className="text-slate-400 hover:text-purple-400 transition"
          >
            {bypassMode ? (
              <ToggleRight className="w-10 h-10 text-purple-400" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-slate-600" />
            )}
          </button>
        </div>

        {/* Global show hidden games toggle */}
        <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-lg border border-slate-850">
          <div className="max-w-[75%]">
            <div className="font-semibold text-slate-200">Show hidden games</div>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
              Force all games that have been marked as hidden to show up again in your library.
            </p>
          </div>
          <button
            onClick={() => {
              const shg = !showHiddenGames;
              setShowHiddenGames(shg);
              saveSettings({ showHiddenGames: shg });
            }}
            className="text-slate-400 hover:text-emerald-400 transition"
          >
            {showHiddenGames ? (
              <ToggleRight className="w-10 h-10 text-emerald-400" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-slate-600" />
            )}
          </button>
        </div>

        {/* Keep Screen On */}
        <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-lg border border-slate-850">
          <div className="max-w-[75%]">
            <div className="font-semibold text-slate-200">Always keep the screen on (Keep Awake)</div>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
              Prevent the device from automatically turning off the screen, suitable when playing games. (Native app only)
            </p>
          </div>
          <button
            onClick={() => {
              const keepOn = !settings.keepScreenOn;
              saveSettings({ keepScreenOn: keepOn });
            }}
            className="text-slate-400 hover:text-emerald-400 transition"
          >
            {settings.keepScreenOn ? (
              <ToggleRight className="w-10 h-10 text-emerald-400" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-slate-600" />
            )}
          </button>
        </div>

        {/* Immersive Mode */}
        <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-lg border border-slate-850">
          <div className="max-w-[75%]">
            <div className="font-semibold text-slate-200">Full-screen mode (Immersive)</div>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
              Hide the status bar to have a full-screen experience. (Native apps only)
            </p>
          </div>
          <button
            onClick={() => {
              const im = !settings.immersiveMode;
              saveSettings({ immersiveMode: im });
            }}
            className="text-slate-400 hover:text-emerald-400 transition"
          >
            {settings.immersiveMode ? (
              <ToggleRight className="w-10 h-10 text-emerald-400" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-slate-600" />
            )}
          </button>
        </div>

        <div className="mt-2 text-[10px] text-slate-500 flex items-start gap-1">
          <HelpCircle className="w-4 h-4 flex-shrink-0 text-slate-600" />
          <span>Performance conflicts often stem from WebGL Heap memory leaks. It is recommended to use "Balanced" for all games.</span>
        </div>
      </div>
    </div>
  );
}
