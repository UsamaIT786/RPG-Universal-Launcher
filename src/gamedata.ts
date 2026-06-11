import { RPGGame } from "./types";

export const INITIAL_GAMES: RPGGame[] = [];
export const VIRTUAL_SYSTEM_FOLDERS: any[] = [];
export const CHEAT_MOD_DATABASE: any[] = [];
export const LAUNCHER_PLUGINS: any[] = [
  {
    id: "case_bypass",
    name: "Bypass License & Region",
    desc: "Bypass DRM copyright requirements and enable cloud region to play pirated games without internet."
  },
  {
    id: "fast_audio",
    name: "WebAudio HTML5 Fix",
    desc: "Create a virtual AudioContext, helping RPG Maker Web games have smooth sound on WebView."
  },
  {
    id: "fps_lock",
    name: "60 FPS Frame Lock",
    desc: "Lock the frame rate at 60 to maximize battery saving for the Native device and reduce micro-stutter."
  },
  {
    id: "cheat_hook",
    name: "VFS Cheat Engine Hook",
    desc: "Allows loading cheat codes directly into the WebGL memory of the Game. May cause crashes."
  },
  {
    id: "trans_patch",
    name: "Auto-Translate Hook (G-Translate)",
    desc: "Automatically translate text content in the game from Japanese/Chinese to Vietnamese. Requires internet connection."
  },
  {
    id: "webgl_texture_optimize",
    name: "WebGL Texture Optimizer",
    desc: "Automatically downscale large textures to help prevent memory overflow for phones/web with weak VRAM. (Bug fix for RPG Maker MZ)."
  }
];
export const GAME_EDITIONS: any[] = [];
export const INITIAL_REVIEWS: any[] = [];
