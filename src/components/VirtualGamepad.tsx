/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sliders, ChevronUp, ChevronDown, CheckCircle } from "lucide-react";
import { VirtualButtonConfig } from "../types";

interface VirtualGamepadProps {
  opacity: number;
  scale: number;
  onPressKey: (key: string) => void;
  onReleaseKey: (key: string) => void;
  onConfigChange?: (opacity: number, scale: number) => void;
}

const DEFAULT_BUTTONS: VirtualButtonConfig[] = [
  { id: "btn-z", label: "OK (Z)", key: "z", color: "bg-red-600 active:bg-red-800 shadow-red-500/50", posX: 82, posY: 65 },
  { id: "btn-x", label: "ESC (X)", key: "escape", color: "bg-amber-600 active:bg-amber-800 shadow-amber-500/50", posX: 70, posY: 78 },
  { id: "btn-shift", label: "DASH", key: "shift", color: "bg-slate-700 active:bg-slate-900 shadow-slate-500/50", posX: 57, posY: 78 },
  { id: "btn-q", label: "PgUp (Q)", key: "q", color: "bg-emerald-600 active:bg-emerald-800 shadow-emerald-500/50", posX: 70, posY: 50 },
  { id: "btn-w", label: "PgDn (W)", key: "w", color: "bg-emerald-600 active:bg-emerald-800 shadow-emerald-500/50", posX: 82, posY: 37 },
];

export default function VirtualGamepad({
  opacity,
  scale,
  onPressKey,
  onReleaseKey,
  onConfigChange,
}: VirtualGamepadProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [gamepadOpacity, setGamepadOpacity] = useState(opacity);
  const [gamepadScale, setGamepadScale] = useState(scale);
  const [activeDpad, setActiveDpad] = useState<string | null>(null);

  const handleDpadPress = (dir: string, key: string) => {
    setActiveDpad(dir);
    onPressKey(key);
  };

  const handleDpadRelease = (key: string) => {
    setActiveDpad(null);
    onReleaseKey(key);
  };

  const updateOpacity = (val: number) => {
    setGamepadOpacity(val);
    if (onConfigChange) onConfigChange(val, gamepadScale);
  };

  const updateScale = (val: number) => {
    setGamepadScale(val);
    if (onConfigChange) onConfigChange(gamepadOpacity, val);
  };

  return (
    <div 
      className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-between"
      style={{ opacity: gamepadOpacity }}
    >
      {/* Top action header */}
      <div className="p-3 flex justify-between items-center pointer-events-auto w-full bg-slate-900/10 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded shadow-sm">
            AUTO KEY MATCH
          </span>
          <span className="text-[11px] text-emerald-400 font-mono">D-Pad / TouchInput Active</span>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-1 text-[11px] bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-medium px-2.5 py-1 rounded-md border border-slate-700 transition"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span>Customize key</span>
          {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Adjuster panel overlay */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-12 right-3 pointer-events-auto bg-slate-900/95 border border-slate-700/80 rounded-lg p-3 w-64 shadow-xl z-50 text-slate-200"
          >
            <div className="flex items-center gap-2 font-semibold text-xs border-b border-slate-800 pb-1.5 mb-2">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Edit virtual gamepad</span>
            </div>

            <div className="space-y-3 text-[11px]">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Transparency:</span>
                  <span className="font-mono text-emerald-400">{(gamepadOpacity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={gamepadOpacity}
                  onChange={(e) => updateOpacity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Key size:</span>
                  <span className="font-mono text-emerald-400">{(gamepadScale * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.4"
                  step="0.05"
                  value={gamepadScale}
                  onChange={(e) => updateScale(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="pt-1 text-[10px] text-slate-500 leading-relaxed">
                * You can swipe the D-pad and action buttons simultaneously to activate the Dash / Action feature smoothly (Multi-touch Enabled).
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Control Layout area */}
      <div className="relative flex-1 w-full flex items-end justify-between p-4 md:p-8 pb-6 md:pb-10 select-none">
        
        {/* Left Side: Classic Circular D-pad */}
        <div 
          className="pointer-events-auto relative bg-slate-900/60 backdrop-blur-xs rounded-full border border-slate-700/50 flex items-center justify-center select-none shadow-2xl"
          style={{ 
            width: `${160 * gamepadScale}px`, 
            height: `${160 * gamepadScale}px`,
          }}
        >
          {/* Inner circle anchor */}
          <div className="absolute w-1/3 h-1/3 bg-slate-800 rounded-full border border-slate-700/60 shadow-inner z-10 flex items-center justify-center">
            <span className="text-[9px] font-mono text-slate-500">RPG</span>
          </div>

          {/* UP Button */}
          <button
            onMouseDown={() => handleDpadPress("up", "arrowup")}
            onMouseUp={() => handleDpadRelease("arrowup")}
            onTouchStart={() => handleDpadPress("up", "arrowup")}
            onTouchEnd={() => handleDpadRelease("arrowup")}
            onMouseLeave={() => activeDpad === "up" && handleDpadRelease("arrowup")}
            className={`absolute top-0 left-1/3 w-1/3 h-1/3 flex items-center justify-center rounded-t-lg transition-colors border-t border-x border-slate-800/40 ${
              activeDpad === "up" ? "bg-emerald-500/40 text-emerald-300" : "hover:bg-slate-800/30 text-slate-400"
            }`}
          >
            ▲
          </button>

          {/* DOWN Button */}
          <button
            onMouseDown={() => handleDpadPress("down", "arrowdown")}
            onMouseUp={() => handleDpadRelease("arrowdown")}
            onTouchStart={() => handleDpadPress("down", "arrowdown")}
            onTouchEnd={() => handleDpadRelease("arrowdown")}
            onMouseLeave={() => activeDpad === "down" && handleDpadRelease("arrowdown")}
            className={`absolute bottom-0 left-1/3 w-1/3 h-1/3 flex items-center justify-center rounded-b-lg transition-colors border-b border-x border-slate-800/40 ${
              activeDpad === "down" ? "bg-emerald-500/40 text-emerald-300" : "hover:bg-slate-800/30 text-slate-400"
            }`}
          >
            ▼
          </button>

          {/* LEFT Button */}
          <button
            onMouseDown={() => handleDpadPress("left", "arrowleft")}
            onMouseUp={() => handleDpadRelease("arrowleft")}
            onTouchStart={() => handleDpadPress("left", "arrowleft")}
            onTouchEnd={() => handleDpadRelease("arrowleft")}
            onMouseLeave={() => activeDpad === "left" && handleDpadRelease("arrowleft")}
            className={`absolute left-0 top-1/3 w-1/3 h-1/3 flex items-center justify-center rounded-l-lg transition-colors border-l border-y border-slate-800/40 ${
              activeDpad === "left" ? "bg-emerald-500/40 text-emerald-300" : "hover:bg-slate-800/30 text-slate-400"
            }`}
          >
            ◀
          </button>

          {/* RIGHT Button */}
          <button
            onMouseDown={() => handleDpadPress("right", "arrowright")}
            onMouseUp={() => handleDpadRelease("arrowright")}
            onTouchStart={() => handleDpadPress("right", "arrowright")}
            onTouchEnd={() => handleDpadRelease("arrowright")}
            onMouseLeave={() => activeDpad === "right" && handleDpadRelease("arrowright")}
            className={`absolute right-0 top-1/3 w-1/3 h-1/3 flex items-center justify-center rounded-r-lg transition-colors border-r border-y border-slate-800/40 ${
              activeDpad === "right" ? "bg-emerald-500/40 text-emerald-300" : "hover:bg-slate-800/30 text-slate-400"
            }`}
          >
            ▶
          </button>
        </div>

        {/* Right Side: RPG Buttons (OK, ESC, PgUp, PgDn, Shift) */}
        <div 
          className="pointer-events-auto relative flex flex-wrap gap-3 justify-end items-end w-56 md:w-64 max-h-52 select-none"
          style={{ transform: `scale(${gamepadScale})`, transformOrigin: "bottom right" }}
        >
          {DEFAULT_BUTTONS.map((btn) => (
            <button
              key={btn.id}
              onMouseDown={() => onPressKey(btn.key)}
              onMouseUp={() => onReleaseKey(btn.key)}
              onTouchStart={() => onPressKey(btn.key)}
              onTouchEnd={() => onReleaseKey(btn.key)}
              className={`flex flex-col items-center justify-center font-bold px-3 py-3 h-12 min-w-[50px] text-[11px] rounded-full border border-white/10 text-white shadow-md active:scale-95 select-none transition ${btn.color}`}
            >
              <span>{btn.label}</span>
            </button>
          ))}
        </div>

      </div>

      {/* Floating Cheat / Assist Bar bottom left center */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 p-1 px-3 bg-slate-900/80 backdrop-blur-xs border border-slate-800 rounded-full flex gap-3 pointer-events-auto">
        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
          <CheckCircle className="w-3 h-3 text-emerald-400" /> Auto-Fix Active
        </span>
      </div>
    </div>
  );
}
