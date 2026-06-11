/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RPGGame {
  id: string;
  title: string;
  engine: "MV" | "MZ";
  version: string;
  installedVersion?: string;
  cover: string;
  desc: string;
  size: string;
  dev: string;
  releaseDate: string;
  tags: string[];
  isLinked: boolean;
  isHidden?: boolean;
  localPath?: string;
  downloadProgress?: number;
  downloadSpeed?: string;
  isDownloading?: boolean;
  editions?: GameEdition[];
  dirHandle?: any;
  gallery?: string[];
  platform?: "android" | "pc" | "web";
  sysReq?: {
    os?: string;
    cpu?: string;
    ram?: string;
    gpu?: string;
    storage?: string;
  };
}

export interface GameLorenSettings {
  externalScanPath: string;
  performancePreset: "battery" | "balanced" | "max-perf";
  frameSkip: boolean;
  resolutionScale: number; // 0.5 to 1.0
  audioUnlocker: boolean;
  gamepadOpacity: number; // 0.1 to 1.0
  gamepadSize: number; // 80% to 150%
  useCanvasOverride: boolean;
  slideshowInterval: number; // in seconds (e.g., 3, 5, 10)
  bypassMode: boolean; // Amnesty / Bypass license checks locally
  showHiddenGames: boolean;
  keepScreenOn: boolean;
  immersiveMode: boolean;
}

export interface VirtualButtonConfig {
  id: string;
  label: string;
  key: string;
  color: string;
  posX: number; // percentage from left
  posY: number; // percentage from top
}

export interface GameLorenSession {
  email: string | null;
  firebaseToken: string | null;
  refreshToken: string | null;
  fingerprintHash: string | null;
  rememberMe: boolean;
  isLoggedIn: boolean;
}

export interface GameEdition {
  id: "standard" | "complete" | "preorder" | "update_lock";
  name: string;
  price: string;
  badge: string;
  color: string;
  desc: string;
}

export interface GameLicenseInfo {
  owned: boolean;
  edition: "standard" | "complete" | "preorder" | "update_lock" | null;
  is_expired: boolean;
  expires_at?: string;
  bypassActive: boolean;
}

export interface GameReview {
  id: string;
  email: string;
  rating: number; // 1-5
  recommend: boolean;
  content: string;
  votes: number;
  createdAt: string;
}

export interface ErrorReport {
  id: string;
  gameId: string;
  gameTitle: string;
  email: string;
  errorType: "black_screen" | "no_sound" | "lag_fps" | "save_error" | "keyboard_stuck" | "other";
  description: string;
  resolutionScale: number;
  performancePreset: string;
  os: string;
  createdAt: string;
  status: "pending" | "investigating" | "resolved" | "rejected";
  adminComment?: string;
}

