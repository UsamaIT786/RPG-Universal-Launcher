import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Gamepad2, 
  Tv, 
  HelpCircle, 
  Settings, 
  Search, 
  Download, 
  CloudLightning, 
  Play, 
  X, 
  Folder,
  FolderOpen,
  Sparkles, 
  Terminal, 
  FolderSearch, 
  Cpu, 
  ChevronsUpDown,
  BookOpen, 
  PlusCircle, 
  Trash2,
  Sliders,
  CheckCircle,
  FileText,
  User,
  LogOut,
  Lock,
  Mail,
  Shield,
  Key,
  Star,
  ThumbsUp,
  MessageSquare,
  BadgeAlert,
  Info,
  ChevronLeft,
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Clock,
  Heart,
  Filter,
  SortAsc,
  Image as ImageIcon
} from "lucide-react";
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { CapacitorZip as Zip } from '@capgo/capacitor-zip';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { StatusBar, Style } from '@capacitor/status-bar';

import { RPGGame, GameLorenSettings, GameLorenSession, GameLicenseInfo, GameEdition, GameReview, ErrorReport } from "./types";
import { GAME_EDITIONS, CHEAT_MOD_DATABASE, LAUNCHER_PLUGINS } from "./gamedata";
import VirtualPlayer from "./components/VirtualPlayer";
import ConflictFixerPanel from "./components/ConflictFixerPanel";
import ExternalScanner from "./components/ExternalScanner";
import PerformanceSettingsPanel from "./components/PerformanceSettingsPanel";
import JSZip from "jszip";

const FIREBASE_API_KEY = "AIzaSyDu8t9B68L-vx6_v6eZ5K4KbPYAiZ1TlOg";
const SUNCORE_API = "https://suncore.master-viethiepho.workers.dev/";

const getPlatformLabel = () => {
  if (typeof navigator === "undefined") return "WEB";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "ANDROID";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "IOS";
  if (ua.includes("windows")) return "WINDOWS";
  if (ua.includes("mac os")) return "MACOS";
  if (ua.includes("linux")) return "LINUX";
  return "WEB";
};

// Hàm phụ trợ Format Timestamp thành DD/MM/YYYY
const formatTimestamp = (ts?: number | string) => {
  if (!ts) return "Not updated";
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return String(ts);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// Hàm đổi dung lượng Bytes sang chuẩn MB/GB
const formatBytes = (bytes: number, decimals = 1) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// Giải mã Content URI của Android thành đường dẫn vật lý (Absolute Path)
const decodeAndroidUri = (pathStr: string) => {
  if (!pathStr) return pathStr;
  try {
    const decoded = decodeURIComponent(pathStr);
    const primaryMatch = decoded.match(/^content:\/\/com\.android\.externalstorage\.documents\/(?:document|tree)\/primary:(.*)$/i);
    if (primaryMatch) return "/storage/emulated/0/" + primaryMatch[1];
    const sdMatch = decoded.match(/^content:\/\/com\.android\.externalstorage\.documents\/(?:document|tree)\/([a-zA-Z0-9-]+):(.*)$/i);
    if (sdMatch) return `/storage/${sdMatch[1]}/` + sdMatch[2];
  } catch (e) {}
  return pathStr;
};

export default function App() {
  const [games, setGames] = useState<any[]>([]); 
  const [activeTab, setActiveTab] = useState<"store" | "library" | "scan" | "performance" | "user" | "admin">("store");
  
  // Advanced Filter & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [engineFilter, setEngineFilter] = useState<"ALL" | "MV" | "MZ">("ALL");
  const [sortBy, setSortBy] = useState<"release_desc" | "name_asc" | "price_asc" | "score_desc">("release_desc");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [ownershipFilter, setOwnershipFilter] = useState<"ALL" | "OWNED" | "UNOWNED">("ALL");
  
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Administration and error reports states
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [reportGameId, setReportGameId] = useState("");
  const [reportErrorType, setReportErrorType] = useState<ErrorReport["errorType"]>("black_screen");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccessMessage, setReportSuccessMessage] = useState("");

  // Publisher tool states (Suncore API mapping)
  const [pubSelectedGameId, setPubSelectedGameId] = useState("");
  const [pubVersion, setPubVersion] = useState("");
  const [pubUpdateType, setPubUpdateType] = useState<"patch" | "major" | "full">("patch");
  const [pubUpdateSize, setPubUpdateSize] = useState("");
  const [pubChangelog, setPubChangelog] = useState("");
  const [pubSecret, setPubSecret] = useState("");
  const [publishingUpdate, setPublishingUpdate] = useState(false);
  const [pubSuccessMessage, setPubSuccessMessage] = useState("");
  const [pubErrorMessage, setPubErrorMessage] = useState("");

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [adminCommentInput, setAdminCommentInput] = useState("");

  const [settings, setSettings] = useState<GameLorenSettings>({
    externalScanPath: "/storage/emulated/0",
    performancePreset: "balanced",
    frameSkip: false,
    resolutionScale: 0.75,
    audioUnlocker: true,
    gamepadOpacity: 0.85,
    gamepadSize: 1.0,
    useCanvasOverride: true,
    slideshowInterval: 5,
    bypassMode: false,
    showHiddenGames: false,
    keepScreenOn: false,
    immersiveMode: false
  });

  const [session, setSession] = useState<GameLorenSession>({
    email: null,
    firebaseToken: null,
    refreshToken: null,
    fingerprintHash: null,
    rememberMe: true,
    isLoggedIn: false
  });

  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" | "info" } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (message: string, type: "success" | "warning" | "error" | "info" = "success") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const gamesRef = useRef(games);
  useEffect(() => {
    gamesRef.current = games;
  }, [games]);

  useEffect(() => {
    const requestStoragePermission = async () => {
      if (Capacitor.getPlatform() === 'android') {
        try {
          const status = await Filesystem.requestPermissions();
          if (status.publicStorage === 'granted') {
            console.log("Memory access granted!");
          }
        } catch (e) {}
      }
    };
    requestStoragePermission();
  }, []);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTosModal, setShowTosModal] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register" | "forgot">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [showUserEmail, setShowUserEmail] = useState(false);

  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [activeGalleryImage, setActiveGalleryImage] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"store" | "reviews">("store");
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);
  const [activePlayGame, setActivePlayGame] = useState<any | null>(null);
  const [isModdedSession, setIsModdedSession] = useState(false);
  const [downloadingGame, setDownloadingGame] = useState<string | null>(null);
  const [deletingGame, setDeletingGame] = useState<any | null>(null);

  const [reviewsDB, setReviewsDB] = useState<Record<string, GameReview[]>>({});
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewRecommend, setReviewRecommend] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);

  const [licenseChecking, setLicenseChecking] = useState<Record<string, boolean>>({});
  const [gameLicenses, setGameLicenses] = useState<Record<string, GameLicenseInfo>>({});

  const [wizardPath, setWizardPath] = useState("");
  const [wizardPlatform, setWizardPlatform] = useState<"android" | "pc" | "web">("android");
  const [wizardFileType, setWizardFileType] = useState<"index.html" | "game.exe" | "custom">("index.html");
  const [wizardCustomFile, setWizardCustomFile] = useState("");
  const [wizardFolderState, setWizardFolderState] = useState<"empty" | "has_game">("empty");
  const [isFSExtraOpen, setIsFSExtraOpen] = useState(false);
  const [isScanningFolder, setIsScanningFolder] = useState(false);

  // Xử lý Click Outside để đóng Dropdown menu
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSortMenu(false);
      setShowFilterMenu(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const isAdmin = session.isLoggedIn && (
    session.email === "admin@gameloren.com" ||
    (session.email ? (
      session.email.toLowerCase().startsWith("admin") ||
      session.email === localStorage.getItem("gameloren_admin_email") ||
      localStorage.getItem("gameloren_is_admin") === "true"
    ) : false)
  );

  useEffect(() => {
    if (selectedGame) {
      const p = selectedGame.localPath || `/storage/emulated/0/Download/${selectedGame.id}`;
      setWizardPath(p);
      
      const pLower = p.toLowerCase();
      let dPlatform: "android" | "pc" | "web" = "android";
      if (pLower.startsWith("http://") || pLower.startsWith("https://") || pLower.includes("localhost") || pLower.includes("127.0.0.1")) {
        dPlatform = "web";
      } else if (pLower.includes(":") || pLower.includes("\\") || pLower.match(/^[a-z]\//) || pLower.startsWith("c/") || pLower.startsWith("d/")) {
        dPlatform = "pc";
      }
      setWizardPlatform(dPlatform);

      if (pLower.endsWith(".exe")) {
        setWizardFileType("game.exe");
      } else if (pLower.endsWith(".html")) {
        setWizardFileType("index.html");
      } else {
        setWizardFileType("index.html");
      }
      
      setWizardFolderState(selectedGame.isLinked ? "has_game" : "empty");
    }
  }, [selectedGame]);

  // REAL-TIME FOLDER VALIDATOR: Quét ổ cứng thực tế
  useEffect(() => {
    const scanRealDirectory = async () => {
      if (!wizardPath || wizardPlatform === "web") return;
      
      let dirPath = wizardPath;
      if (dirPath.endsWith('.html') || dirPath.endsWith('.exe') || wizardFileType === 'custom') {
        const lastSlash = Math.max(dirPath.lastIndexOf('/'), dirPath.lastIndexOf('\\'));
        if (lastSlash > 0) dirPath = dirPath.substring(0, lastSlash);
      }

      try {
        setIsScanningFolder(true);
        const result = await Filesystem.readdir({ path: dirPath });
        
        if (result.files && result.files.length > 0) {
          setWizardFolderState("has_game");
          const fileNames = result.files.map(f => f.name.toLowerCase());
          if (fileNames.includes('game.exe')) setWizardFileType('game.exe');
          else if (fileNames.includes('index.html')) setWizardFileType('index.html');
        } else {
          setWizardFolderState("empty");
        }
      } catch (e) {
        setWizardFolderState("empty");
      } finally {
        setIsScanningFolder(false);
      }
    };

    const timeoutId = setTimeout(() => scanRealDirectory(), 500);
    return () => clearTimeout(timeoutId);
  }, [wizardPath, wizardPlatform]);


  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState<any[]>([]);

  const EDITION_TIER: Record<string, number> = { 
    "update_lock": 1, 
    "standard": 2, 
    "complete": 3, 
    "preorder": 4 
  };

  const getEditionPriceNumber = (price: any): number => {
    if (typeof price === "number") return price;
    if (!price) return 0;
    const cleaned = String(price).replace(/[^0-9.]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const formatEditionPrice = (price: any): string => {
    if (typeof price === "number") {
      return price === 0 ? "FREE" : price.toLocaleString("vi-VN") + " d";
    }
    if (!price) return "FREE";
    const num = getEditionPriceNumber(price);
    if (String(price).toLowerCase().includes("usd") || String(price).includes("$")) {
      return price;
    }
    return num === 0 ? "FREE" : num.toLocaleString("vi-VN") + " d";
  };

  const [gameBackups, setGameBackups] = useState<Record<string, { id: string; name: string; date: string; size: string; realPath?: string }[]>>(() => {
    try {
      const saved = localStorage.getItem("gameloren_backups_v1");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeModPlugins, setActiveModPlugins] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem("gameloren_mod_plugins_v1");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveBackups = (newBackups: Record<string, { id: string; name: string; date: string; size: string; realPath?: string }[]>) => {
    setGameBackups(newBackups);
    localStorage.setItem("gameloren_backups_v1", JSON.stringify(newBackups));
  };

  const saveModPlugins = (newPlugins: Record<string, string[]>) => {
    setActiveModPlugins(newPlugins);
    localStorage.setItem("gameloren_mod_plugins_v1", JSON.stringify(newPlugins));
  };

  const handleCreateBackup = async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || !game.localPath) {
      showToast("The game has not been downloaded or the folder is not linked, cannot back up!", "error");
      return;
    }
    
    try {
      let basePath = game.localPath;
      if (basePath.endsWith('.html') || basePath.endsWith('.exe')) {
        basePath = basePath.substring(0, Math.max(basePath.lastIndexOf('/'), basePath.lastIndexOf('\\')));
      }
      const savePath = `${basePath}/${game.engine === 'MV' ? 'www/save' : 'save'}`;
      
      await Filesystem.readdir({ path: savePath });

      const backupId = "backup-" + Date.now();
      const backupFolder = `/storage/emulated/0/Download/GameLoren_Backups/${gameId}/${backupId}`;
      
      await Filesystem.mkdir({ path: backupFolder, recursive: true });
      await Filesystem.copy({ from: savePath, to: backupFolder });

      const dateStr = new Date().toLocaleString("vi-VN");
      const count = (gameBackups[gameId] || []).length + 1;
      const newBackupList = [
        ...(gameBackups[gameId] || []),
        { id: backupId, name: `Storage Point ${count} (Physics)`, date: dateStr, size: "OK", realPath: backupFolder }
      ];

      saveBackups({ ...gameBackups, [gameId]: newBackupList });
      showToast(`Has backed up VFS Save physically for ${game.title} success to the drive!`);
      
    } catch (e: any) {
      showToast(`Original Save folder not found or memory write permission not granted.`, "warning");
    }
  };

  const handleRestoreBackup = async (gameId: string, backupName: string, realPath?: string) => {
    if (!realPath) {
      showToast("The virtual (old) backup cannot be actually restored on the new system.", "error");
      return;
    }
    const game = games.find(g => g.id === gameId);
    if (!game || !game.localPath) return;

    try {
      let basePath = game.localPath;
      if (basePath.endsWith('.html') || basePath.endsWith('.exe')) {
        basePath = basePath.substring(0, Math.max(basePath.lastIndexOf('/'), basePath.lastIndexOf('\\')));
      }
      const savePath = `${basePath}/${game.engine === 'MV' ? 'www/save' : 'save'}`;

      try { await Filesystem.mkdir({ path: savePath, recursive: true }); } catch (e) {}
      await Filesystem.copy({ from: realPath, to: savePath });
      showToast(`Save restoration completed!
Physically restored from:
[${backupName}]`);
    } catch (e) {
      showToast("Error occurred during physical save recovery.", "error");
    }
  };

  const handleDeleteBackup = async (gameId: string, backupId: string, realPath?: string) => {
    if (realPath) {
      try {
        await Filesystem.rmdir({ path: realPath, recursive: true });
      } catch (e) {}
    }
    const filtered = (gameBackups[gameId] || []).filter(b => b.id !== backupId);
    saveBackups({
      ...gameBackups,
      [gameId]: filtered
    });
    showToast("The selected backup has been deleted.");
  };

  const toggleModPlugin = (gameId: string, pluginId: string) => {
    const current = activeModPlugins[gameId] || [];
    let updated;
    if (current.includes(pluginId)) {
      updated = current.filter(id => id !== pluginId);
    } else {
      updated = [...current, pluginId];
    }
    saveModPlugins({
      ...activeModPlugins,
      [gameId]: updated
    });
  };

  const fetchFingerprint = async (): Promise<string> => {
    try {
      const payload = [
        navigator.userAgent,
        navigator.language,
        window.screen.width,
        window.screen.height,
        navigator.hardwareConcurrency || 4
      ].join("|");
      
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch {
       return "gameloren_client_fingerprint_892dc47a";
    }
  };

  const syncWithSuncore = async (email: string, token: string, fingerprint: string) => {
    try {
      const res = await fetch(SUNCORE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'launcher_login',
          email,
          fingerprint_hash: fingerprint,
          firebase_token: token
        })
      });
      if (res.ok) {
        const cfData = await res.json();
        if (cfData.status === "success") {
          const library = cfData.library || {};
          localStorage.setItem("sun_offline_library", JSON.stringify(library));
          localStorage.setItem("sun_offline_email", email);
          
          if (cfData.admin_email) {
            localStorage.setItem("gameloren_admin_email", cfData.admin_email);
          }
          if (cfData.is_admin === true || cfData.is_admin === "true" || (cfData.admin_email && email === cfData.admin_email)) {
            localStorage.setItem("gameloren_is_admin", "true");
          } else {
            localStorage.removeItem("gameloren_is_admin");
          }
          
          const updatedLicenses: Record<string, GameLicenseInfo> = {};
          Object.keys(library).forEach(gameId => {
            const ownedInfo = library[gameId];
            updatedLicenses[gameId] = {
              owned: true,
              edition: ownedInfo.edition || "standard",
              is_expired: ownedInfo.is_expired || false,
              expires_at: ownedInfo.expires_at,
              bypassActive: false
            };
          });
          setGameLicenses(prev => ({
            ...prev,
            ...updatedLicenses
          }));
        }
      }
    } catch (e) {
      console.warn("Worker synchronizer network error", e);
    }
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      if (settings.keepScreenOn) {
        KeepAwake.keepAwake().catch(() => {});
      } else {
        KeepAwake.allowSleep().catch(() => {});
      }

      if (settings.immersiveMode) {
        StatusBar.hide().catch(() => {});
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      } else {
        StatusBar.show().catch(() => {});
        StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      }
    }
  }, [settings.keepScreenOn, settings.immersiveMode]);

  useEffect(() => {
    const cachedGames = localStorage.getItem("gameloren_games_v4");
    if (cachedGames) {
      try {
        const parsed = JSON.parse(cachedGames);
        if (Array.isArray(parsed)) {
          setGames(parsed);
        }
      } catch {}
    } else {
      setGames([]);
    }

    const cachedSettings = localStorage.getItem("gameloren_settings");
    if (cachedSettings) {
      try {
        setSettings(JSON.parse(cachedSettings));
      } catch {}
    }

    const restoreSessionAndData = async () => {
      const fingerprint = await fetchFingerprint();
      const savedEmail = localStorage.getItem("gameloren_email");
      const savedRefreshToken = localStorage.getItem("gameloren_refresh_token");
      const savedToken = localStorage.getItem("gameloren_token");

      const isAdminSession = savedEmail && (
        savedEmail.toLowerCase().startsWith("admin") ||
        savedEmail === localStorage.getItem("gameloren_admin_email") ||
        localStorage.getItem("gameloren_is_admin") === "true"
      );

      if (isAdminSession) {
        try {
          const repRes = await fetch(SUNCORE_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "admin_get_reports" })
          });
          if (repRes.ok) {
            const repData = await repRes.json();
            if (repData.status === "success" && Array.isArray(repData.reports)) {
              setErrorReports(repData.reports);
              localStorage.setItem("gameloren_error_reports_v2", JSON.stringify(repData.reports));
            }
          }
        } catch (e) {
          const cachedReports = localStorage.getItem("gameloren_error_reports_v2");
          if (cachedReports) {
            try { setErrorReports(JSON.parse(cachedReports)); } catch {}
          }
        }
      }

      if (savedEmail && savedRefreshToken) {
        setSession({
          email: savedEmail,
          firebaseToken: savedToken || null,
          refreshToken: savedRefreshToken,
          fingerprintHash: fingerprint,
          rememberMe: true,
          isLoggedIn: true
        });

        const cachedLib = localStorage.getItem("sun_offline_library");
        if (cachedLib) {
          try {
            const library = JSON.parse(cachedLib);
            const updatedLicenses: Record<string, GameLicenseInfo> = {};
            Object.keys(library).forEach(gameId => {
              const ownedInfo = library[gameId];
              updatedLicenses[gameId] = {
                owned: true,
                edition: ownedInfo.edition || "standard",
                is_expired: ownedInfo.is_expired || false,
                expires_at: ownedInfo.expires_at,
                bypassActive: false
              };
            });
            setGameLicenses(updatedLicenses);
          } catch {}
        }
        
        try {
          const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: savedRefreshToken
            })
          });
          const data = await res.json();
          if (data && data.access_token) {
            localStorage.setItem("gameloren_token", data.access_token);
            localStorage.setItem("gameloren_refresh_token", data.refresh_token);
            setSession(prev => ({
              ...prev,
              firebaseToken: data.access_token,
              refreshToken: data.refresh_token
            }));
            await syncWithSuncore(savedEmail, data.access_token, fingerprint);
          }
        } catch (e) {}
      } else {
        setSession(prev => ({ ...prev, fingerprintHash: fingerprint }));
      }
    };

    const fetchOnlineGames = async () => {
      try {
        const res = await fetch(SUNCORE_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_store_meta" })
        });

        if (res.ok) {
          const cloudData = await res.json();
          if (cloudData.status === "success" && Array.isArray(cloudData.games)) {
            const mapped = cloudData.games.map((g: any) => {
              const mappedReviews: GameReview[] = (g.reviews || []).map((r: any) => ({
                id: String(r.id || r.review_id || Math.random()),
                email: r.user || r.email || "gamelover@gameloren.com",
                rating: r.rating || (r.is_rec === 1 ? 5 : 2),
                recommend: r.is_rec === 1 || r.recommend === true,
                content: r.text || r.content || "",
                votes: r.upvotes || r.votes || 0,
                createdAt: r.date || r.createdAt || new Date().toISOString().split("T")[0]
              }));

              setReviewsDB(prev => ({
                ...prev,
                [g.id || g.game_id]: mappedReviews
              }));

              return {
                id: g.id || g.game_id || String(Math.random()),
                title: g.title || g.name,
                engine: g.engine || "MV",
                version: g.version || "1.0.0",
                cover: g.cover || "rgba(16, 185, 129, 0.1)",
                desc: g.desc || g.description || '{\"short_desc\": \"Updating\"}',
                size: g.size || "Cloud Data", // Được tính từ Worker
                dev: g.dev || g.developer || "Unknown",
                releaseDate: g.date && g.date !== "N/A" ? g.date : formatTimestamp(g.release_ts), 
                release_ts: g.release_ts || 0, 
                rev_pos: g.rev_pos || 0,
                rev_total: g.rev_total || 0,
                tags: g.tags || [],
                isLinked: false,
                editions: g.editions || undefined,
                gallery: g.gallery || [g.cover || "https://images.unsplash.com/photo-1541562232579-512a21360020?w=800"],
                sysReq: g.sysReq || g.sys_req || {
                  os: "Android 8.0+ / Windows 10",
                  cpu: "Snapdragon 665 / Core i3",
                  ram: "4 GB RAM",
                  gpu: "OpenGL ES 3.1",
                  storage: g.size || "1 GB free"
                }
              };
            });

            setGames(prev => {
              const merged = [...prev];
              mapped.forEach((cg: any) => {
                const existIdx = merged.findIndex(mx => mx.id === cg.id);
                if (existIdx >= 0) {
                  merged[existIdx] = {
                    ...cg,
                    isLinked: merged[existIdx].isLinked,
                    localPath: merged[existIdx].localPath,
                    localSize: merged[existIdx].localSize,
                    isDownloading: merged[existIdx].isDownloading,
                    downloadProgress: merged[existIdx].downloadProgress,
                    editions: cg.editions || merged[existIdx].editions,
                    installedVersion: merged[existIdx].installedVersion,
                    isHidden: merged[existIdx].isHidden
                  };
                } else {
                  merged.push(cg);
                }
              });
              localStorage.setItem("gameloren_games_v4", JSON.stringify(merged));
              return merged;
            });

            if (Array.isArray(cloudData.banners) && cloudData.banners.length > 0) {
              setBanners(cloudData.banners);
            }
          }
        }
      } catch (err) {}
    };

    restoreSessionAndData();
    fetchOnlineGames();
  }, []);

  useEffect(() => {
    const totalCount = banners.length > 0 ? banners.length : games.length;
    if (totalCount === 0) return;
    const intervalTime = (settings.slideshowInterval || 5) * 1000;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % totalCount);
    }, intervalTime);
    return () => clearInterval(timer);
  }, [settings.slideshowInterval, games.length, banners.length]);

  const saveGames = (updatedGames: any[]) => {
    setGames(updatedGames);
    gamesRef.current = updatedGames;
    localStorage.setItem("gameloren_games_v4", JSON.stringify(updatedGames));
  };

  const handleLinkGame = (newGame: any) => {
    const exists = games.find((g) => g.id === newGame.id);
    if (exists) {
      showToast("This game has already been linked or installed in the Library!");
      return;
    }
    const updated = [...games, newGame];
    saveGames(updated);
  };

  const handleUnlinkGame = (id: string) => {
    const updated = gamesRef.current.map((g) => {
      if (g.id === id) {
        return {
          ...g,
          isLinked: false,
          localPath: undefined,
          localSize: undefined,
          platform: undefined
        };
      }
      return g;
    });
    saveGames(updated);
    
    if (downloadingGame === id) {
      setDownloadingGame(null);
    }
    
    if (selectedGame?.id === id) {
      setSelectedGame({
        ...selectedGame,
        isLinked: false,
        localPath: undefined,
        localSize: undefined,
        platform: undefined
      });
    }

    showToast("Game unlinking successful! The configuration has been cleared.", "success");
  };

  const handleZipBackup = async (game: any) => {
    if (!game.localPath) {
      showToast("The game has not been loaded, cannot perform file compression.", "error");
      return;
    }
    showToast(`Currently gathering the game's core files (Saves/Data) ${game.title} to a ZIP file...`, "info");
    
    try {
      let basePath = game.localPath;
      if (basePath.endsWith('.html') || basePath.endsWith('.exe')) {
        basePath = basePath.substring(0, Math.max(basePath.lastIndexOf('/'), basePath.lastIndexOf('\\')));
      }

      const zip = new JSZip();
      let fileCount = 0;

      const foldersToBackup = game.engine === 'MV' ? ['www/save', 'www/data'] : ['save', 'data'];

      for (const fld of foldersToBackup) {
        const fullPath = `${basePath}/${fld}`;
        try {
          const dirRes = await Filesystem.readdir({ path: fullPath });
          for (const file of dirRes.files) {
            if (file.type === 'file') {
              const fileData = await Filesystem.readFile({ path: `${fullPath}/${file.name}` });
              zip.file(`${fld}/${file.name}`, fileData.data, { base64: true });
              fileCount++;
            }
          }
        } catch (e) {}
      }

      if (fileCount === 0) {
        showToast("No Save or Data was found to compress.", "warning");
        return;
      }

      const zipBase64 = await zip.generateAsync({ type: "base64" });
      const destZip = `/storage/emulated/0/Download/${game.id}_Backup_${Date.now()}.zip`;
      
      await Filesystem.writeFile({
        path: destZip,
        data: zipBase64,
        recursive: true
      });

      showToast(`Successfully compressed ${fileCount} file.
Saved at: ${destZip}`, "success");
    } catch (e: any) {
      showToast("An error occurred during the file compression: " + e.message, "error");
    }
  };

  const handleVerifyIntegrity = async (game: any) => {
    if (!game.localPath) return;
    let basePath = game.localPath;
    if (basePath.endsWith('.html') || basePath.endsWith('.exe')) {
      basePath = basePath.substring(0, Math.max(basePath.lastIndexOf('/'), basePath.lastIndexOf('\\')));
    }
    try {
      const res = await Filesystem.readdir({ path: basePath });
      const fileCount = res.files.length;
      showToast(`Entire system:
Directory ${basePath} existing and containing ${fileCount} subdirectory/file structure.`, "success");
    } catch (e) {
      showToast(`Folder ${basePath} Cannot access or has been moved from the device!`, "error");
    }
  };

  const handleInitModFolder = async (gameId: string) => {
    const modPath = `/storage/emulated/0/Mods/${gameId}`;
    try {
      await Filesystem.mkdir({ path: modPath, recursive: true });
      showToast(`Successfully created the Mod directory at:
${modPath}
Please copy the file here.`, "success");
    } catch (e: any) {
      if (e.message?.includes("exists")) {
        showToast(`The Mod folder is already available at:
${modPath}`, "info");
      } else {
        showToast("Cannot create Mod folder. Please grant system permissions.", "error");
      }
    }
  };

  const checkGameLicense = async (gameId: string) => {
    if (settings.bypassMode) {
      setGameLicenses(prev => ({
        ...prev,
        [gameId]: { owned: true, edition: "complete", is_expired: false, bypassActive: true }
      }));
      return;
    }

    setLicenseChecking(prev => ({ ...prev, [gameId]: true }));
    try {
      const cachedLib = localStorage.getItem("sun_offline_library");
      if (cachedLib) {
        const library = JSON.parse(cachedLib);
        if (library[gameId]) {
          const ownedInfo = library[gameId];
          setGameLicenses(prev => ({
            ...prev,
            [gameId]: {
              owned: true,
              edition: ownedInfo.edition || "standard",
              is_expired: ownedInfo.is_expired || false,
              expires_at: ownedInfo.expires_at,
              bypassActive: false
            }
          }));
          return;
        }
      }

      const defaultEdition = session.isLoggedIn ? "standard" : null;
      setGameLicenses(prev => ({
        ...prev,
        [gameId]: prev[gameId] || {
          owned: session.isLoggedIn,
          edition: defaultEdition,
          is_expired: false,
          bypassActive: false
        }
      }));
    } catch {
      const defaultEdition = session.isLoggedIn ? "standard" : null;
      setGameLicenses(prev => ({
        ...prev,
        [gameId]: {
          owned: session.isLoggedIn,
          edition: defaultEdition as any,
          is_expired: false,
          bypassActive: false
        }
      }));
    } finally {
      setLicenseChecking(prev => ({ ...prev, [gameId]: false }));
    }
  };

  const handleSubmitReview = async (gameId: string) => {
    if (!session.isLoggedIn) {
      showToast("Please log in to your GameLoren account to post a review.");
      return;
    }
    if (!reviewText.trim()) {
      showToast("The review content cannot be left blank.");
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await fetch(SUNCORE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_review",
          firebase_token: session.firebaseToken,
          game_id: gameId,
          is_recommended: reviewRecommend,
          review_text: reviewText
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        const storeRes = await fetch(SUNCORE_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_store_meta" })
        });
        if (storeRes.ok) {
          const cloudData = await storeRes.json();
          if (cloudData.status === "success" && Array.isArray(cloudData.games)) {
            const currentG = cloudData.games.find((gx: any) => gx.id === gameId);
            if (currentG && Array.isArray(currentG.reviews)) {
              const mappedReviews: GameReview[] = currentG.reviews.map((r: any) => ({
                id: String(r.id || r.review_id || Math.random()),
                email: r.user || r.email || "gamelover@gameloren.com",
                rating: r.rating || (r.is_rec === 1 ? 5 : 2),
                recommend: r.is_rec === 1 || r.recommend === true,
                content: r.text || r.content || "",
                votes: r.upvotes || r.votes || 0,
                createdAt: r.date || r.createdAt || new Date().toISOString().split("T")[0]
              }));
              setReviewsDB(prev => ({ ...prev, [gameId]: mappedReviews }));
            }
          }
        }
      }
    } catch (e) {}

    const newReview: GameReview = {
      id: "user-" + Date.now(),
      email: session.email || "anonymous@gameloren.com",
      rating: reviewRating,
      recommend: reviewRecommend,
      content: reviewText,
      votes: 0,
      createdAt: new Date().toISOString().split("T")[0]
    };

    setReviewsDB(prev => ({
      ...prev,
      [gameId]: [newReview, ...(prev[gameId] || [])]
    }));

    setReviewText("");
    setSubmittingReview(false);
    showToast("Your comment has been successfully posted and synchronized on the cloud server!");
  };

  const handleVoteReview = async (gameId: string, reviewId: string) => {
    try {
      await fetch(SUNCORE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote_review",
          firebase_token: session.firebaseToken,
          review_id: reviewId
        })
      });
    } catch {}

    setReviewsDB(prev => {
      const gReviews = prev[gameId] || [];
      const updated = gReviews.map(r => r.id === reviewId ? { ...r, votes: r.votes + 1 } : r);
      return { ...prev, [gameId]: updated };
    });
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportGameId) {
      showToast("Please select the faulty game!");
      return;
    }
    if (!reportDescription.trim()) {
      showToast("Please describe the error in detail!");
      return;
    }

    setSubmittingReport(true);
    
    const selectedG = games.find(g => g.id === reportGameId);
    const newReport: ErrorReport = {
      id: "rep-" + Date.now(),
      gameId: reportGameId,
      gameTitle: selectedG ? selectedG.title : reportGameId,
      email: session.email || "guest@gameloren.com",
      errorType: reportErrorType,
      description: reportDescription,
      resolutionScale: settings.resolutionScale,
      performancePreset: settings.performancePreset,
      os: navigator.userAgent.includes("Android") ? "Android JoiPlay OS (VFS v1.20)" : "Web OS System (Vessel Chromium)",
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      status: "pending"
    };

    try {
      const res = await fetch(SUNCORE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_error_report",
          report: newReport,
          firebase_token: session.firebaseToken
        })
      });
      
      const data = await res.json();
      if (data.status === "success") {
        setReportSuccessMessage("Error report sent successfully! Recorded on Cloud Worker.");
      } else {
        setReportSuccessMessage("Locally saved error (Worker responded with error).");
      }
    } catch (err) {
      setReportSuccessMessage("Saved offline successfully (No network).");
    }

    const updated = [newReport, ...errorReports];
    setErrorReports(updated);
    localStorage.setItem("gameloren_error_reports_v2", JSON.stringify(updated));

    setSubmittingReport(false);
    setReportDescription("");
    setTimeout(() => setReportSuccessMessage(""), 4000);
  };

  const handleAdminCommentSubmit = async (reportId: string) => {
    if (!adminCommentInput.trim()) {
      showToast("The feedback content cannot be empty.");
      return;
    }

    try {
      await fetch(SUNCORE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_reply_report",
          report_id: reportId,
          comment: adminCommentInput,
          admin_secret: pubSecret || "SuncoreAdminSecretKeyV2"
        })
      });
    } catch (e) {}

    const updated = errorReports.map(rep => {
      if (rep.id === reportId) {
        return {
          ...rep,
          adminComment: adminCommentInput,
          status: rep.status === "pending" ? "investigating" : rep.status
        } as ErrorReport;
      }
      return rep;
    });

    setErrorReports(updated);
    localStorage.setItem("gameloren_error_reports_v2", JSON.stringify(updated));
    setAdminCommentInput("");
    showToast("Feedback for error handling has been sent successfully.");
  };

  const handleAdminUpdateStatus = async (reportId: string, status: ErrorReport["status"]) => {
    try {
      await fetch(SUNCORE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_update_report_status",
          report_id: reportId,
          status: status,
          admin_secret: pubSecret || "SuncoreAdminSecretKeyV2"
        })
      });
    } catch (e) {}

    const updated = errorReports.map(rep => {
      if (rep.id === reportId) {
        return { ...rep, status } as ErrorReport;
      }
      return rep;
    });

    setErrorReports(updated);
    localStorage.setItem("gameloren_error_reports_v2", JSON.stringify(updated));
  };

  const handleAdminPublishUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubSelectedGameId || !pubVersion || !pubUpdateSize || !pubChangelog) {
      setPubErrorMessage("Please fill in all the upgrade information.");
      return;
    }

    setPublishingUpdate(true);
    setPubSuccessMessage("");
    setPubErrorMessage("");

    try {
      const res = await fetch(SUNCORE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_publish_update",
          admin_secret: pubSecret || "SuncoreAdminSecretKeyV2",
          game_id: pubSelectedGameId,
          update_version: pubVersion,
          update_type: pubUpdateType,
          update_size: pubUpdateSize,
          changelog: pubChangelog
        })
      });

      const responseData = await res.json();
      if (responseData.status === "success") {
        setPubSuccessMessage(responseData.message || `Update game ${pubSelectedGameId} successfully updated to version v${pubVersion}!`);
        
        const updatedGames = games.map(g => {
          if (g.id === pubSelectedGameId) {
            return { ...g, version: pubVersion, size: pubUpdateSize };
          }
          return g;
        });
        setGames(updatedGames);
        localStorage.setItem("gameloren_games_v4", JSON.stringify(updatedGames));

        setPubVersion("");
        setPubUpdateSize("");
        setPubChangelog("");
      } else {
        setPubErrorMessage(responseData.message || "Unable to fulfill request. Authentication error.");
      }
    } catch (e: any) {
      setPubErrorMessage("Cannot connect to the Worker API server.");
    } finally {
      setPublishingUpdate(false);
    }
  };

  const performUninstall = async (game: any, willDeleteDisk: boolean) => {
    if (willDeleteDisk && game.localPath) {
      try {
        let pathToRemove = game.localPath;
        if (pathToRemove.endsWith('.html') || pathToRemove.endsWith('.exe')) {
          const lastSlash = Math.max(pathToRemove.lastIndexOf('/'), pathToRemove.lastIndexOf('\\'));
          if (lastSlash > 0) pathToRemove = pathToRemove.substring(0, lastSlash);
        }
        await Filesystem.rmdir({ path: pathToRemove, recursive: true });
        console.log("Successfully deleted physical folder:", pathToRemove);
      } catch (e: any) {}
    }

    const finalGames = games.map(g => {
      if (g.id === game.id) {
        return {
          ...g,
          isLinked: false,
          localPath: undefined,
          localSize: undefined,
          platform: undefined,
          installedVersion: undefined,
          isHidden: false
        };
      }
      return g;
    });
    
    saveGames(finalGames);
    setDeletingGame(null);
    
    if (selectedGame?.id === game.id) {
      setSelectedGame({
        ...selectedGame,
        isLinked: false,
        localPath: undefined,
        localSize: undefined,
        platform: undefined,
        installedVersion: undefined,
        isHidden: false
      });
    }
    
    showToast(
      willDeleteDisk 
        ? `Game deleted ${game.title} from the library and permanently clean up the files on the drive.`
        : `Game has been uninstalled ${game.title} remove from the collection but still keep the file directory.`
    );
  };

  const handlePlayGame = async (game: any, useMods: boolean = false) => {
    // Override local custom games or bypass mode first
    const isCustomOrBypass = settings.bypassMode;

    if (isCustomOrBypass) {
      showToast(useMods ? "Bypass Mode: Licensed to launch with GameLoren Virtual Shield (MOD Mode)." : "Bypass Mode: Licensed to launch by GameLoren Virtual Shield.", "success");
      setIsModdedSession(useMods);
      if (Capacitor.getPlatform() === 'android') {
        try {
          const status = await Filesystem.requestPermissions();
          if (status.publicStorage === 'granted') {
            setActivePlayGame(game);
          } else {
            showToast("You must grant storage permission for the app to be able to read game files!", "error");
          }
        } catch (e) {
          setActivePlayGame(game); 
        }
      } else {
        setActivePlayGame(game);
      }
      return;
    }

    if (!session.isLoggedIn) {
      // Allow purely offline (no-ID/custom) games even without login
      if (game.localPath && (!game.editions || game.editions.length === 0)) {
        showToast("Switched to Offline mode for the external game.", "success");
        setIsModdedSession(useMods);
        setActivePlayGame(game);
        return;
      }

      showToast("Please log in before playing.", "warning");
      setShowAuthModal(true);
      return;
    }
    
    showToast("Connecting to Suncore Worker to verify license...", "info");
    
    try {
      const emailParam = session.email || "";
      const tokenParam = session.firebaseToken || "";

      const resStage1 = await fetch(SUNCORE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_firebase_stage1",
          game_id: game.id,
          email: emailParam,
          firebase_token: tokenParam
        })
      });
      const data1 = await resStage1.json();

      if (data1.status === "no_license") {
        showToast("You do not own or have not purchased the license for this game.", "error");
        return;
      }
      
      // If the game doesn't exist on server but is locally linked, allow offline fallback
      if (data1.status === "error" || !data1.status) {
        if (game.localPath && data1.message?.includes("does not exist")) {
           showToast("Run offline games using GameLoren Virtual Shield.", "success");
           setIsModdedSession(useMods);
           setActivePlayGame(game);
           return;
        }
        showToast(`Access denied: ${data1.message || data1.status}`, "error");
        return;
      }

      const resStage2 = await fetch(SUNCORE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auth_with_firebase",
          game_id: game.id,
          email: emailParam,
          firebase_token: tokenParam,
          fingerprint_hash: session.fingerprintHash || "unknown",
          client_version: game.version || "1.0.0"
        })
      });
      const data2 = await resStage2.json();
      
      if (data2.status === "authorized") {
        showToast(useMods ? "Launch authorized with GameLoren Virtual Shield (MOD Mode)." : "Launch authorized by GameLoren Virtual Shield.", "success");
        setIsModdedSession(useMods);

        if (Capacitor.getPlatform() === 'android') {
          try {
            const status = await Filesystem.requestPermissions();
            if (status.publicStorage === 'granted') {
              setActivePlayGame(game);
            } else {
              showToast("You must grant storage permission for the app to be able to read game files!", "error");
            }
          } catch (e) {
            setActivePlayGame(game); 
          }
        } else {
          setActivePlayGame(game);
        }
      } else if (data2.status === "version_expired") {
        showToast("This game version has exceeded the upgrade period compared to the package you are purchasing (Update Lock).", "warning");
      } else if (data2.status === "limit_reached") {
        showToast("The number of devices has exceeded the allowed limit. Please set up device removal.", "error");
      } else {
        showToast(`Refuse to play the game: ${data2.message || data2.status}`, "error");
      }
    } catch (e: any) {
      if (game.localPath && (!game.editions || game.editions.length === 0)) {
         showToast("Server connection error, automatically switching to Offline Mode.", "success");
         setIsModdedSession(useMods);
         setActivePlayGame(game);
         return;
      }
      showToast("Connection error while authenticating the Cloud Worker server. Please try again.", "error");
    }
  };

  const handleDownload = async (
    id: string, 
    targetPath?: string, 
    keepPanelOpen: boolean = true, 
    isFullGame: boolean = true, 
    explicitVersion?: string
  ) => {
    if (downloadingGame) return;
    setDownloadingGame(id);

    const updated = gamesRef.current.map((g) => {
      if (g.id === id) {
        return { ...g, isDownloading: true, downloadProgress: 0, downloadSpeed: "0 MB/s" };
      }
      return g;
    });
    setGames(updated);
    
    const curActive = updated.find(g => g.id === id);
    if (keepPanelOpen && curActive && selectedGame?.id === id) {
      setSelectedGame(curActive);
    }

    try {
      const emailParam = session.email || "guest@gameloren.com";
      const tokenParam = session.firebaseToken || "";
      const targetVersion = explicitVersion || curActive?.version || "1.0";
      const platform = Capacitor.getPlatform();

      if (platform === 'android' || platform === 'ios') {
        const zipFileName = `GameLoren_${id}_temp.zip`;
        const actionPayload = {
          action: "download_update",
          game_id: id,
          target_version: targetVersion,
          is_full_game: isFullGame,
          email: emailParam,
          firebase_token: tokenParam
        };
        
        try {
          // Clear any old temp file
          try { await Filesystem.deleteFile({ path: zipFileName, directory: Directory.Cache }); } catch(e){}

          let lastUiUpdate = 0;
          const progressListener = await Filesystem.addListener('progress', (progress: any) => {
            if (progress.url === SUNCORE_API && progress.bytes) {
              const now = Date.now();
              if (now - lastUiUpdate > 300) {
                lastUiUpdate = now;
                let pct = 0;
                if (progress.contentLength && progress.contentLength > 0) {
                  pct = Math.min(99, Math.floor((progress.bytes / progress.contentLength) * 100));
                } else {
                  // Fallback for large files
                  pct = Math.min(99, Math.floor((progress.bytes / (1024 * 1024 * 1024)) * 100));
                }
                const speed = `${(progress.bytes / (1024 * 1024)).toFixed(1)} MB`;
                
                const currentGames = gamesRef.current.map((g) => g.id === id ? { ...g, downloadProgress: pct, downloadSpeed: speed } : g);
                setGames(currentGames);
                
                const progressActive = currentGames.find(g => g.id === id);
                if (keepPanelOpen && progressActive && selectedGame?.id === id) {
                    setSelectedGame(progressActive);
                }
              }
            }
          });

          const downloadRes = await Filesystem.downloadFile({
            url: SUNCORE_API,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(actionPayload),
            path: zipFileName,
            directory: Directory.Cache,
            progress: true
          });

          progressListener.remove();

          // Check if the downloaded file is a tiny JSON error
          const fileStat = await Filesystem.stat({ path: zipFileName, directory: Directory.Cache });
          if (fileStat.size < 1000) {
            const errStrRes = await Filesystem.readFile({ path: zipFileName, directory: Directory.Cache, encoding: Encoding.UTF8 });
            if (typeof errStrRes.data === 'string' && (errStrRes.data.includes('error') || errStrRes.data.includes('message'))) {
              await Filesystem.deleteFile({ path: zipFileName, directory: Directory.Cache });
              let msg = "Error from the game server!";
              try { msg = JSON.parse(errStrRes.data).message || msg } catch(e){}
              throw new Error(msg);
            }
          }
          
          const extractingGames = gamesRef.current.map((g) => g.id === id ? { ...g, downloadProgress: 99, downloadSpeed: "Extracting Native..." } : g);
          setGames(extractingGames);

          // Force Safe Extraction to App's External Data folder to bypass Android 11 Scoped Storage limits
          const relDestPath = `Games/${id}`;
          try { await Filesystem.mkdir({ path: relDestPath, directory: Directory.External, recursive: true }); } catch (e) {}

          let rawSourceUri = downloadRes.path || "";
          if (!rawSourceUri) {
            const zipUriRes = await Filesystem.getUri({ path: zipFileName, directory: Directory.Cache });
            rawSourceUri = zipUriRes.uri;
          }
          const destUriRes = await Filesystem.getUri({ path: relDestPath, directory: Directory.External });

          const absoluteZipPath = rawSourceUri.replace(/^file:\/\//i, '');
          const absoluteDestPath = destUriRes.uri.replace(/^file:\/\//i, '');

          if (!absoluteZipPath) {
            throw new Error(`Empty path. Raw URI: ${rawSourceUri}`);
          }

          await Zip.unzip({
            source: absoluteZipPath,
            destination: absoluteDestPath
          });

          await Filesystem.deleteFile({ path: zipFileName, directory: Directory.Cache });

          const finalGames = gamesRef.current.map((g) => {
            if (g.id === id) {
              return { 
                ...g, 
                isDownloading: false, 
                isLinked: true, 
                downloadProgress: undefined, 
                downloadSpeed: undefined,
                localPath: `${absoluteDestPath}/index.html`,
                platform: 'android',
                installedVersion: targetVersion
              };
            }
            return g;
          });
          saveGames(finalGames);
          
          const finalActive = finalGames.find(g => g.id === id);
          if (keepPanelOpen && finalActive && selectedGame?.id === id) setSelectedGame(finalActive);

          setDownloadingGame(null);
          showToast(`🎉 Installation complete! Extracted to:
${absoluteDestPath}`, "success");
        } catch (err: any) {
          throw err;
        }

      } else {
        // --- JSZIP FOR PC / WEB ---
        const startTime = Date.now();
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", SUNCORE_API);
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.responseType = "arraybuffer";

          let errorHandled = false;

          xhr.onload = () => {
            const contentType = xhr.getResponseHeader("Content-Type") || "";
            if (contentType.includes("application/json")) {
              const enc = new TextDecoder("utf-8");
              try {
                const str = enc.decode(xhr.response);
                const data = JSON.parse(str);
                if (data.status === "error") {
                  errorHandled = true;
                  reject(new Error(data.message || "Error loading game from the cloud server."));
                  return;
                }
              } catch (e) {}
            }

            if (xhr.status === 200 && !errorHandled) {
              resolve(xhr.response);
            } else if (!errorHandled) {
              const enc = new TextDecoder("utf-8");
              try {
                const str = enc.decode(xhr.response);
                if (str.includes("Forbidden")) {
                  reject(new Error(`Server refused (HTTP ${xhr.status}): You do not own it or the version has expired.`));
                  return;
                }
                if (str.includes("Not Found")) {
                  reject(new Error(`The game file has not been prepared on the R2 storage system.`));
                  return;
                }
              } catch (e) {}
              reject(new Error(`Failed to download ZIP file (HTTP ${xhr.status})`));
            }
          };

          xhr.onprogress = (event) => {
            if (event.lengthComputable && event.total > 0) {
              const progress = Math.min(99, Math.floor((event.loaded / event.total) * 100));
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = elapsed > 0 ? (event.loaded / (1024 * 1024) / elapsed).toFixed(1) + " MB/s" : "0.0 MB/s";

              const currentGames = gamesRef.current.map((g) => {
                if (g.id === id) {
                  return { ...g, downloadProgress: progress, downloadSpeed: speed };
                }
                return g;
              });
              setGames(currentGames);

              const progressActive = currentGames.find(g => g.id === id);
              if (keepPanelOpen && progressActive && selectedGame?.id === id) {
                setSelectedGame(progressActive);
              }
            }
          };

          xhr.onerror = () => {
            reject(new Error("Network error when downloading ZIP game file from the linked server."));
          };

          xhr.send(JSON.stringify({
            action: "download_update",
            game_id: id,
            target_version: targetVersion,
            is_full_game: isFullGame,
            email: emailParam,
            firebase_token: tokenParam
          }));
        });

        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error("The downloaded game file is empty or has content errors.");
        }

        const extractingGames = gamesRef.current.map((g) => {
          if (g.id === id) {
            return { ...g, downloadProgress: 99, downloadSpeed: "Unzipping..." };
          }
          return g;
        });
        setGames(extractingGames);

        const zip = await JSZip.loadAsync(arrayBuffer);
        const extractedFiles: string[] = [];
        const destPath = targetPath || curActive?.localPath || `/storage/emulated/0/Download/GameLoren/${id}`;
        
        try { await Filesystem.mkdir({ path: destPath, recursive: true }); } catch (e) { }

        const zipFiles = Object.keys(zip.files);
        for (const relativePath of zipFiles) {
          const zipEntry = zip.files[relativePath];
          const fullPath = `${destPath}/${relativePath}`;

          if (zipEntry.dir) {
            try { await Filesystem.mkdir({ path: fullPath, recursive: true }); } catch (e) {}
          } else {
            const base64Data = await zipEntry.async("base64");
            await Filesystem.writeFile({ path: fullPath, data: base64Data, recursive: true });
            extractedFiles.push(relativePath);
          }
        }

        const finalGames = gamesRef.current.map((g) => {
          if (g.id === id) {
            return { 
              ...g, 
              isDownloading: false, 
              isLinked: true, 
              downloadProgress: undefined, 
              downloadSpeed: undefined,
              localPath: `${destPath}/index.html`,
              platform: 'pc',
              installedVersion: targetVersion
            };
          }
          return g;
        });
        saveGames(finalGames);
        
        const finalActive = finalGames.find(g => g.id === id);
        if (keepPanelOpen && finalActive && selectedGame?.id === id) {
          setSelectedGame(finalActive);
        }

        setDownloadingGame(null);
        showToast(`🎉 Installation successful! Physical unpacking completed ${extractedFiles.length} file into:
${destPath}`, "success");
      }
    } catch (err: any) {
      showToast(`⚠️ Game loading error: ${err.message || err}. Please try again later!`, "error");
      
      const failedGames = gamesRef.current.map((g) => {
        if (g.id === id) {
          return { ...g, isDownloading: false, downloadProgress: undefined, downloadSpeed: undefined };
        }
        return g;
      });
      setGames(failedGames);
      const failedActive = failedGames.find(g => g.id === id);
      if (keepPanelOpen && failedActive && selectedGame?.id === id) {
        setSelectedGame(failedActive);
      }
      setDownloadingGame(null);
    }
  };

  const handleRequestOTP = async () => {
    setAuthError(""); setAuthSuccess("");
    if(!authEmail) {
       setAuthError("Please enter the email address to get the code.");
       return;
    }
    setAuthLoading(true);
    try {
        const res = await fetch(SUNCORE_API, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "request_reset", email: authEmail })
        });
        const data = await res.json();
        if (data.status === "reset_requested") {
           setAuthSuccess("The OTP code has been sent to the email device linked in the system.");
        } else {
           setAuthError(data.message || "Request failed or email does not exist.");
        }
    } catch(e: any) {
        setAuthError(e.message || "Communication error with Suncore API.");
    } finally {
        setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    
    if (authTab === "forgot") {
        if (!authEmail || !authPassword || !authOtp) {
           setAuthError("Please enter your email, new password, and OTP code.");
           return;
        }
        setAuthLoading(true);
        try {
           const res = await fetch(SUNCORE_API, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "confirm_reset", email: authEmail, otp: authOtp, new_password: authPassword })
           });
           const data = await res.json();
           if (data.status === "reset_success") {
              setAuthSuccess("The old device has been removed and the password has been successfully reset. Please log in again.");
              setTimeout(() => {
                 setAuthTab("login");
                 setAuthOtp("");
                 setAuthSuccess("");
                 setAuthPassword("");
              }, 2500);
           } else {
              throw new Error(data.message || "The OTP code is incorrect or the system is busy.");
           }
        } catch (e: any) {
           setAuthError(e.message);
        } finally {
           setAuthLoading(false);
        }
        return;
    }

    if (!authEmail || !authPassword) {
      setAuthError("Burial the heart, fill in your email and password.");
      return;
    }

    setAuthLoading(true);
    try {
      const endpoint = authTab === "login" 
        ? `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`
        : `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          returnSecureToken: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "An error occurred during the authentication process!");
      }

      const fingerprint = await fetchFingerprint();
      
      if (session.rememberMe) {
        localStorage.setItem("gameloren_email", data.email);
        localStorage.setItem("gameloren_token", data.idToken);
        localStorage.setItem("gameloren_refresh_token", data.refreshToken);
      }

      setSession({
        email: data.email,
        firebaseToken: data.idToken,
        refreshToken: data.refreshToken,
        fingerprintHash: fingerprint,
        rememberMe: session.rememberMe,
        isLoggedIn: true
      });

      await syncWithSuncore(data.email, data.idToken, fingerprint);
      setAuthSuccess(authTab === "login" ? "Login successful!" : "Account registration successful!");
      
      setTimeout(() => {
        setShowAuthModal(false);
        setAuthEmail("");
        setAuthPassword("");
        setAuthSuccess("");
      }, 1000);

    } catch (err: any) {
      let friendlyError = err.message;
      if (friendlyError === "EMAIL_NOT_FOUND" || friendlyError === "INVALID_PASSWORD") {
        friendlyError = "Email or password is incorrect.";
      } else if (friendlyError === "EMAIL_EXISTS") {
        friendlyError = "This email address already exists in the system.";
      } else if (friendlyError === "WEAK_PASSWORD : Password should be at least 6 characters") {
        friendlyError = "The password is too weak, it must be at least 6 characters long.";
      }
      setAuthError(friendlyError);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("gameloren_email");
    localStorage.removeItem("gameloren_token");
    localStorage.removeItem("gameloren_refresh_token");
    localStorage.removeItem("gameloren_admin_email");
    localStorage.removeItem("gameloren_is_admin");
    setSession({
      email: null,
      firebaseToken: null,
      refreshToken: null,
      fingerprintHash: null,
      rememberMe: true,
      isLoggedIn: false
    });
    showToast("Logged out of the GameLoren account.");
  };

  const handleGameSelect = (game: any) => {
    setSelectedGame(game);
    setActiveGalleryImage(game.gallery?.[0] || game.cover || "");
    setActiveDetailTab("store");
    checkGameLicense(game.id);
  };

  const handleBuyEdition = async (gameId: string, editionId: string, customPrice?: number) => {
    if (!session.isLoggedIn) {
      showToast("Please log in to your GameLoren account before proceeding with the purchase.");
      setShowAuthModal(true);
      return;
    }

    const edNames: Record<string, string> = {
      standard: "Standard Edition",
      complete: "Complete Collection",
      preorder: "Deluxe Preorder",
      update_lock: "Update Lock Bypass"
    };

    const priceTextDisplay = customPrice !== undefined 
      ? formatEditionPrice(customPrice) 
      : "at the listed price";

    let confirmPayment = true;
    try {
      confirmPayment = confirm(`Account: ${session.email}
Do you agree to pay for purchasing/upgrading to the package [${edNames[editionId] || editionId}] with the cost [${priceTextDisplay}] for this game?`);
    } catch (e) {
      confirmPayment = true;
    }
    if (!confirmPayment) return;

    try {
      const res = await fetch(SUNCORE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "buy_game",
          firebase_token: session.firebaseToken,
          game_id: gameId,
          edition: editionId
        })
      });
      
      if (res.ok) {
        const buyRes = await res.json();
        if (buyRes.status === "success") {
          if (session.email && session.firebaseToken && session.fingerprintHash) {
            await syncWithSuncore(session.email, session.firebaseToken, session.fingerprintHash);
          }
          
          showToast(`Payment Successful! License granted for use [${edNames[editionId] || editionId}] has been successfully synchronized & recorded on the cloud server.`, "success");
          
          setGameLicenses(prev => ({
            ...prev,
            [gameId]: { owned: true, edition: editionId as any, is_expired: false, bypassActive: false }
          }));
          
          await checkGameLicense(gameId);
        } else {
          showToast(`Payment failed: ${buyRes.message || "License loading error"}`, "error");
        }
      } else {
        showToast("The payment server responded with an HTTP error.", "error");
      }
    } catch {
      showToast("Network error when connecting to the server.", "error");
    }
  };

  // Tính toán TẤT CẢ các Tag đang có trong hệ thống Cửa hàng
  const allAvailableTags = Array.from(new Set(games.flatMap((g) => g.tags || []))) as string[];
  allAvailableTags.sort();

  // Toggle Tag cho Filter
  const toggleFilterTag = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // =============== PHÂN LOẠI, TÌM KIẾM VÀ SẮP XẾP =================
  let filteredGames = games.filter((game) => {
    // Check Ẩn Game
    if (activeTab === "library" && game.isHidden && !settings.showHiddenGames) return false;

    // Tìm Kiếm Text
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Bộ lọc Engine
    if (engineFilter !== "ALL" && game.engine !== engineFilter) return false;

    // Bộ lọc Sở hữu
    const activeLicense = gameLicenses[game.id];
    const gEditions = (game as any).editions || [];
    const minPrice = gEditions.length > 0 ? Math.min(...gEditions.map((ed: any) => typeof ed.price === 'number' ? ed.price : 0)) : 0;
    const isOwned = activeLicense?.owned || minPrice === 0 || settings.bypassMode;

    if (ownershipFilter === "OWNED" && !isOwned) return false;
    if (ownershipFilter === "UNOWNED" && isOwned) return false;

    // Bộ lọc Tags
    if (activeTags.length > 0) {
      const hasAllSelectedTags = activeTags.every(t => (game.tags || []).includes(t));
      if (!hasAllSelectedTags) return false;
    }

    return true;
  });

  // Thuật toán Sắp xếp
  filteredGames.sort((a, b) => {
    if (sortBy === "release_desc") {
      return (b.release_ts || 0) - (a.release_ts || 0);
    }
    if (sortBy === "name_asc") {
      return (a.title || "").localeCompare(b.title || "");
    }
    if (sortBy === "price_asc") {
      const priceA = a.editions && a.editions.length > 0 ? Math.min(...a.editions.map((e:any)=>e.price||0)) : 0;
      const priceB = b.editions && b.editions.length > 0 ? Math.min(...b.editions.map((e:any)=>e.price||0)) : 0;
      return priceA - priceB;
    }
    if (sortBy === "score_desc") {
      let scoreA = 0; let scoreB = 0;
      try { scoreA = parseFloat(JSON.parse(a.desc || "{}").score || "0"); } catch(e){}
      try { scoreB = parseFloat(JSON.parse(b.desc || "{}").score || "0"); } catch(e){}
      if (scoreA === 0 && a.rev_total > 0) scoreA = (a.rev_pos / a.rev_total) * 10;
      if (scoreB === 0 && b.rev_total > 0) scoreB = (b.rev_pos / b.rev_total) * 10;
      return scoreB - scoreA;
    }
    return 0;
  });

  const featured = games[currentSlide] || games[0];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-emerald-500 selection:text-slate-950 antialiased">
      
      {/* Top Header Section */}
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between" style={{ minHeight: '60px' }}>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-emerald-600 to-teal-400 p-2 rounded-xl shadow-lg shadow-emerald-500/10 hidden sm:block">
            <Gamepad2 className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300">
                GAMELOREN
              </h1>
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold hidden md:inline-block">
                v1.2-{getPlatformLabel()}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden lg:block">RPG Launcher & Optimizer</p>
          </div>
        </div>

                {/* Dynamic Header Actions */}
        <div className="flex-1 flex justify-end items-center gap-2 ml-2">
          {selectedGame ? (
            <button
              onClick={() => setSelectedGame(null)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg transition active:scale-95 shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold font-mono hidden sm:block">GO BACK</span>
            </button>
          ) : (
            (activeTab === "store" || activeTab === "library") && (
              <div className="flex items-center gap-2 flex-1 max-w-xl justify-end">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-xs md:max-w-sm ml-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                {/* Sắp xếp */}
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 border ${
                      showSortMenu ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <SortAsc className="w-4 h-4" /> <span className="hidden sm:inline">Arrange</span>
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 mt-1.5 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 flex flex-col py-1 overflow-hidden">
                      {[
                        { id: "release_desc", label: "Newest release" },
                        { id: "name_asc", label: "Game Name (A-Z)" },
                        { id: "price_asc", label: "Lowest selling price" },
                        { id: "score_desc", label: "Highly rated" }
                      ].map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => { setSortBy(item.id as any); setShowSortMenu(false); }}
                          className={`px-3 py-2 text-xs cursor-pointer transition ${sortBy === item.id ? "bg-emerald-500/15 text-emerald-400 font-bold" : "text-slate-300 hover:bg-slate-800"}`}
                        >
                          {item.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bộ Lọc */}
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 border ${
                      showFilterMenu || activeTags.length > 0 || ownershipFilter !== "ALL" ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Filter</span>
                  </button>
                  {showFilterMenu && (
                    <div className="absolute right-0 mt-1.5 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 flex flex-col py-1 max-h-[60vh] overflow-y-auto">
                      <div className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950">Status</div>
                      <div onClick={() => setOwnershipFilter(ownershipFilter === "OWNED" ? "ALL" : "OWNED")} className={`px-3 py-2 text-xs flex justify-between cursor-pointer ${ownershipFilter === "OWNED" ? "text-emerald-400 font-bold bg-emerald-500/5" : "text-slate-300 hover:bg-slate-800"}`}>
                        <span>Already owned</span>{ownershipFilter === "OWNED" && <span>✓</span>}
                      </div>
                      <div onClick={() => setOwnershipFilter(ownershipFilter === "UNOWNED" ? "ALL" : "UNOWNED")} className={`px-3 py-2 text-xs flex justify-between cursor-pointer ${ownershipFilter === "UNOWNED" ? "text-emerald-400 font-bold bg-emerald-500/5" : "text-slate-300 hover:bg-slate-800"}`}>
                        <span>Not owned yet</span>{ownershipFilter === "UNOWNED" && <span>✓</span>}
                      </div>

                      <div className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 mt-1 border-t border-slate-800">Genre (Tags)</div>
                      {allAvailableTags.map(tag => (
                        <div 
                          key={tag} 
                          onClick={() => toggleFilterTag(tag)}
                          className={`px-3 py-1.5 text-[11px] flex justify-between cursor-pointer transition ${activeTags.includes(tag) ? "text-emerald-400 font-bold bg-emerald-500/5" : "text-slate-300 hover:bg-slate-800"}`}
                        >
                          <span>{tag}</span>
                          <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center ${activeTags.includes(tag) ? "border-emerald-500 bg-emerald-500" : "border-slate-600"}`}>
                            {activeTags.includes(tag) && <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto pb-16 md:pb-0">
        
        {/* Desktop Navigation Sidebar Area */}
        <nav className="hidden md:flex w-60 bg-slate-900/10 border-r border-slate-900 p-4 flex-col gap-2.5 shrink-0 select-none">
          <button
            onClick={() => { setActiveTab("store"); }}
            className={`flex items-center gap-2.5 py-2 px-3 text-sm font-semibold rounded-lg transition duration-150 shrink-0 ${
              activeTab === "store" 
                ? "bg-slate-900 border-l-2 border-emerald-500 text-white shadow-xl" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CloudLightning className="w-5 h-5 text-emerald-500" />
            <span>Cloud Store</span>
          </button>

          <button
            onClick={() => { setActiveTab("library"); }}
            className={`flex items-center gap-2.5 py-2 px-3 text-sm font-semibold rounded-lg transition duration-150 shrink-0 ${
              activeTab === "library"
                ? "bg-slate-900 border-l-2 border-emerald-500 text-white shadow-xl"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Tv className="w-5 h-5 text-emerald-500" />
            <span>Game Library</span>
          </button>

          <button
            onClick={() => { setActiveTab("scan"); }}
            className={`flex items-center gap-2.5 py-2 px-3 text-sm font-semibold rounded-lg transition duration-150 shrink-0 ${
              activeTab === "scan"
                ? "bg-slate-900 border-l-2 border-emerald-500 text-white shadow-xl"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FolderSearch className="w-5 h-5 text-emerald-500" />
            <span>Scan External Game</span>
          </button>

          <button
            onClick={() => { setActiveTab("performance"); }}
            className={`flex items-center gap-2.5 py-2 px-3 text-sm font-semibold rounded-lg transition duration-150 shrink-0 ${
              activeTab === "performance"
                ? "bg-slate-900 border-l-2 border-emerald-500 text-white shadow-xl"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Cpu className="w-5 h-5 text-emerald-500" />
            <span>Display Optimization</span>
          </button>

          <button
            onClick={() => { setActiveTab("user"); }}
            className={`flex items-center gap-2.5 py-2 px-3 text-sm font-semibold rounded-lg transition duration-150 shrink-0 ${
              activeTab === "user"
                ? "bg-slate-900 border-l-2 border-emerald-500 text-white shadow-xl"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <User className="w-5 h-5 text-emerald-500" />
            <span>Account & Help</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => { setActiveTab("admin"); }}
              className={`flex items-center gap-2.5 py-2 px-3 text-sm font-semibold rounded-lg transition duration-150 shrink-0 border border-emerald-500/20 ${
                activeTab === "admin"
                  ? "bg-slate-900 border-l-2 border-emerald-500 text-white shadow-xl shadow-emerald-500/5"
                  : "text-emerald-400 hover:text-white bg-emerald-950/20"
              }`}
            >
              <Shield className="w-5 h-5 text-emerald-400" />
              <span>Administration [ADMIN]</span>
            </button>
          )}

        </nav>

        {/* Mobile Bottom Navigation Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 border-t border-slate-800 backdrop-blur-md z-40 pb-[env(safe-area-inset-bottom,0.5rem)]">
          <nav className="flex justify-around items-center px-2 py-2">
            <button
              onClick={() => { setActiveTab("store"); }}
              className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[64px] ${
                activeTab === "store" ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <CloudLightning className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-semibold">Store</span>
            </button>
            <button
              onClick={() => { setActiveTab("library"); }}
              className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[64px] ${
                activeTab === "library" ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Tv className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-semibold">Library</span>
            </button>
            <button
              onClick={() => { setActiveTab("scan"); }}
              className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[64px] ${
                activeTab === "scan" ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <FolderSearch className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-semibold">Sweep</span>
            </button>
            <button
              onClick={() => { setActiveTab("performance"); }}
              className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[64px] ${
                activeTab === "performance" ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Cpu className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-semibold">Optimize</span>
            </button>
            
            {/* User Icon Mobile Bottom Navbar */}
            <button
              onClick={() => { setActiveTab("user"); }}
              className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[56px] ${
                activeTab === "user" ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
               {session.isLoggedIn ? (
                  <>
                     <div className={`w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold font-mono mb-1 shrink-0 ${activeTab === 'user' ? 'border-emerald-400 ring-2 ring-emerald-500/50' : ''}`}>
                        {session.email?.substring(0, 2).toUpperCase()}
                     </div>
                     <span className="text-[10px] font-semibold">Personal</span>
                  </>
               ) : (
                  <>
                     <User className="w-6 h-6 mb-1" />
                     <span className="text-[10px] font-semibold">Personal</span>
                  </>
               )}
            </button>
          </nav>
        </div>

        {/* Dynamic Functional View Blocks */}
        <main className="flex-1 p-4 flex flex-col md:p-6 pb-24 md:pb-6 overflow-y-auto relative">
          <div className={selectedGame ? "hidden" : "space-y-6"}>

          {/* BANNER SLIDESHOW - Dynamic Carousel showcasing featured products */}
          {(activeTab === "store" || activeTab === "library") && (banners.length > 0 || featured) && (
            (() => {
              const hasBanners = banners.length > 0;
              const currentSlideIndex = currentSlide % (hasBanners ? banners.length : games.length);
              const activeBanner = hasBanners ? banners[currentSlideIndex] : null;
              
              const title = activeBanner ? activeBanner.title : featured?.title;
              let sub = activeBanner ? activeBanner.sub : "";
              if (!activeBanner && featured?.desc) {
                try {
                  sub = JSON.parse(featured.desc).short_desc || "";
                } catch (e) {
                  sub = featured.desc;
                }
              }
              const bannerImg = activeBanner ? activeBanner.img : null;
              
              // Find matching game for details button when clicking banner
              const matchedGame = activeBanner ? games.find(g => g.id === activeBanner.id) : featured;

              return (
                <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden border border-slate-900/60 shadow-2xl flex flex-col justify-end p-5 md:p-8 bg-cover bg-center transition-all duration-700 animate-fade-in"
                  style={{
                    backgroundImage: bannerImg 
                      ? `linear-gradient(180deg, rgba(15, 23, 42, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%), url(${bannerImg})`
                      : `linear-gradient(180deg, rgba(15, 23, 42, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%), radial-gradient(circle at center, rgba(16, 185, 129, 0.08) 0%, rgba(2, 6, 23, 0.95) 100%)`
                  }}
                >
                  <div className="absolute top-4 right-4 flex gap-1 z-10 animate-pulse">
                    {(hasBanners ? banners : games).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`w-2.5 h-1 md:w-4 rounded-full transition-all ${currentSlideIndex === idx ? "bg-emerald-500" : "bg-slate-700"}`}
                      />
                    ))}
                  </div>

                  <div className="space-y-1.5 md:space-y-2.5 max-w-xl z-10 text-left select-none">
                    <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      HOT TOP FEATURED • RPG {matchedGame?.engine || "Maker"}
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-white leading-tight drop-shadow-md">
                      {title}
                    </h2>
                    <p className="text-[11px] leading-relaxed md:text-xs text-slate-400 line-clamp-2 md:line-clamp-3">
                      {sub}
                    </p>
                    
                    {matchedGame && (
                      <div className="pt-2 flex items-center gap-3">
                        <button 
                          onClick={() => handleGameSelect(matchedGame)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-2xs md:text-xs font-bold py-1.5 md:py-2 px-4 rounded-lg flex items-center gap-1 transition"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Speed interval: {settings.slideshowInterval || 5}s
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}

          {/* STORE & LIBRARY INTEGRATED GRID VIEW */}
          {(activeTab === "store" || activeTab === "library") && (
            <div className="space-y-6">
              
              {/* Page Title Header banner */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-950 border-t border-b sm:border border-slate-900 sm:rounded-xl px-4 py-4 sm:p-5 shadow-inner">
                <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span>{activeTab === "store" ? "Cloud Loren RPG Store" : "Loren Game Library"}</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  {activeTab === "store" 
                    ? "Quickly download the best pre-packaged and well-compressed PC RPG Maker game packs. Mobile-compatible plugins have been bypassed."
                    : "Manage file data, edit code conflict logs, and configure exclusive virtual hotkey settings for the RPG Maker MV and MZ game series."
                  }
                </p>
              </div>

              {/* Game cards grid block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredGames.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-500 text-xs">
                    No suitable games were found in your category.
                  </div>
                ) : (
                  filteredGames.map((game) => {
                    const isDownSim = game.isDownloading;
                    const activeLicense = gameLicenses[game.id];
                    
                    const gEditions = (game as any).editions;
                    const minEditionPrice = (Array.isArray(gEditions) && gEditions.length > 0)
                      ? Math.min(...gEditions.map((ed: any) => typeof ed.price === 'number' ? ed.price : 0))
                      : 0;
                    
                    const isOwned = activeLicense?.owned || minEditionPrice === 0 || settings.bypassMode;
                    const priceText = minEditionPrice === 0 ? "FREE" : minEditionPrice.toLocaleString('vi-VN') + " d";

                    return (
                      <div 
                        key={game.id}
                        className="bg-slate-900/60 border border-slate-900 rounded-xl hover:border-slate-800 transition duration-300 flex flex-col justify-between group shadow-lg relative"
                      >
                        {/* Upper display layout cover */}
                        <div 
                          onClick={() => handleGameSelect(game)}
                          className="w-full h-36 relative px-4 py-3 flex flex-col justify-between cursor-pointer rounded-t-xl"
                          style={{ 
                            backgroundImage: game.cover ? `linear-gradient(to bottom, rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.9)), url(${game.cover})` : `linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.15) 100%)`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        >
                          {/* Absolute 3-Dots Quick Settings Menu */}
                          <div className="absolute right-2 top-2 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCardMenuId(activeCardMenuId === game.id ? null : game.id);
                              }}
                              className="w-7 h-7 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-800 hover:border-slate-600 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95"
                              title="Quick option"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="12" cy="5" r="1"></circle>
                                <circle cx="12" cy="19" r="1"></circle>
                              </svg>
                            </button>
                            
                            {activeCardMenuId === game.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl p-1 z-30 font-semibold text-slate-300 text-[11px] flex flex-col gap-0.5">
                                {isOwned ? (
                                  <>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setActiveCardMenuId(null);
                                        
                                        try {
                                          const result = await FilePicker.pickDirectory();
                                          if (result && result.path) {
                                            const realPath = decodeAndroidUri(result.path);
                                            let detectedPlatform: "android" | "pc" | "web" = Capacitor.getPlatform() === 'android' ? 'android' : 'pc';
                                            const finalGames = games.map((g) => g.id === game.id ? { ...g, isLinked: true, localPath: realPath, platform: detectedPlatform } : g);
                                            saveGames(finalGames);
                                            showToast(`Folder linked successfully:
${realPath}`);
                                          }
                                        } catch (e: any) {
                                          if (e.message !== 'User cancelled.') {
                                            let defaultPath = game.localPath || `/storage/emulated/0/Download/${game.id}`;
                                            const manualPath = prompt(`The device does not support automatic folder selection. Please enter the path manually: \n(Android: /storage/emulated/0/Download/GameName)\n(PC: C:/Games/GameName)`, defaultPath);
                                            if (manualPath) {
                                              let detectedPlatform: "android" | "pc" | "web" = "android";
                                              const p = manualPath.trim().toLowerCase();
                                              if (p.includes(":") || p.includes("\\") || p.match(/^[a-z]\//) || p.startsWith("c/") || p.startsWith("d/")) {
                                                detectedPlatform = "pc";
                                              }
                                              const finalGames = games.map((g) => g.id === game.id ? { ...g, isLinked: true, localPath: manualPath, platform: detectedPlatform } : g);
                                              saveGames(finalGames);
                                              showToast(`Manually linked the folder: ${manualPath}`);
                                            }
                                          }
                                        }
                                      }}
                                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer"
                                    >
                                      <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                      <span>Folder Link</span>
                                    </button>
                                    
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveCardMenuId(null);
                                        handleCreateBackup(game.id);
                                      }}
                                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer"
                                    >
                                      <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                      <span>Backup Save VFS</span>
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveCardMenuId(null);
                                        handleInitModFolder(game.id);
                                      }}
                                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer"
                                    >
                                      <svg className="w-3.5 h-3.5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                      <span>Initialize Mod resources</span>
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveCardMenuId(null);
                                        handleVerifyIntegrity(game);
                                      }}
                                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer"
                                    >
                                      <svg className="w-3.5 h-3.5 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                      <span>Check file integrity</span>
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveCardMenuId(null);
                                        handleZipBackup(game);
                                      }}
                                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer"
                                    >
                                      <svg className="w-3.5 h-3.5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                      <span>Game file backup</span>
                                    </button>

                                    {(game.isLinked || game.localPath) && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveCardMenuId(null);
                                          showToast(`Archive folder:
${game.localPath}`, "info");
                                        }}
                                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer"
                                      >
                                        <svg className="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                        <span>Open the containing folder</span>
                                      </button>
                                    )}

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveCardMenuId(null);
                                        const finalGames = games.map((g) => g.id === game.id ? { ...g, isHidden: !g.isHidden } : g);
                                        saveGames(finalGames);
                                        showToast(game.isHidden ? `Game has appeared ${game.title} to the library.` : `Game has been hidden ${game.title}.`);
                                      }}
                                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer text-slate-400"
                                    >
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                      <span>{game.isHidden ? "Show this game again" : "Hide from the library"}</span>
                                    </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveCardMenuId(null);
                                          setDeletingGame(game);
                                        }}
                                        className="w-full text-left px-2.5 py-2 rounded-lg text-red-500 hover:bg-red-950/40 hover:text-red-400 transition flex items-center gap-2 cursor-pointer"
                                      >
                                        <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 5v6m4-6v6"></path></svg>
                                        <span>Uninstall</span>
                                      </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveCardMenuId(null);
                                      handleGameSelect(game);
                                    }}
                                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer"
                                  >
                                    <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                    <span>View Copyright</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[9px] font-mono text-emerald-400 px-2 py-0.5 rounded font-bold">
                                RPG {game.engine}
                              </span>
                              {game.isLinked ? (
                                <span className="bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[8px] font-mono px-1.5 py-0.25 rounded font-extrabold uppercase">
                                  INSTALLED
                                </span>
                              ) : isOwned ? (
                                <span className="bg-green-500/20 border border-green-500/30 text-green-400 text-[8px] font-mono px-1.5 py-0.25 rounded font-extrabold uppercase">
                                  ✓ OWNED
                                </span>
                              ) : (
                                <span className="bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[8px] font-mono px-1.5 py-0.25 rounded font-extrabold uppercase">
                                  COPYRIGHT
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                {game.isLinked ? (game.localSize || "Installed") : (game.size || "Online")}
                              </span>
                              {!isOwned && (
                                <span className="text-[9px] bg-slate-950/80 border border-slate-800 px-1.5 py-0.25 text-amber-400 font-mono font-extrabold rounded">
                                  {priceText}
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <h3 className="font-extrabold text-sm md:text-base text-white tracking-wide leading-tight line-clamp-1 group-hover:text-emerald-400 transition">
                              {game.title}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {game.tags.slice(0, 3).map((tg: string) => (
                                <span key={tg} className="bg-slate-950/90 text-slate-500 font-semibold text-[9px] px-1.5 py-0.25 rounded border border-slate-900">
                                  {tg}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Card Options Actions footer */}
                        <div className="p-3 bg-slate-950/40 border-t border-slate-900/60 rounded-b-xl">
                          {isDownSim ? (
                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-emerald-400 mb-1">
                                <span>Loading game package...</span>
                                <span>{game.downloadProgress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-1">
                                <div className="h-full bg-emerald-500" style={{ width: `${game.downloadProgress}%` }} />
                              </div>
                              <span className="text-[9px] font-mono text-slate-500 block text-right">{game.downloadSpeed}</span>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              {game.isLinked ? (
                                <div className="w-full flex gap-1.5">
                                  {game.installedVersion && game.installedVersion !== game.version ? (
                                    <button
                                      onClick={() => handleDownload(game.id, undefined, true, false, game.version)}
                                      className="flex-[0.8] bg-fuchsia-600 hover:bg-fuchsia-500 text-slate-100 font-bold text-xs py-2.5 px-2 rounded flex items-center justify-center gap-1 transition active:scale-98 relative"
                                    >
                                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-fuchsia-500"></span>
                                      </span>
                                      <Download className="w-3.5 h-3.5 shrink-0" />
                                      <span>UPDATE (v{game.version})</span>
                                    </button>
                                  ) : null}
                                  <button
                                    onClick={() => handlePlayGame(game, false)}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 text-slate-950 font-bold text-xs py-2.5 px-3 rounded flex items-center justify-center gap-1 transition active:scale-98"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                                    <span>PLAY NOW</span>
                                  </button>
                                  
                                  <button
                                    onClick={() => handleGameSelect(game)}
                                    className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs py-1.5 px-2.5 rounded transition"
                                    title="Emulation options"
                                  >
                                    Install
                                  </button>
                                </div>
                              ) : activeTab === "library" ? (
                                <div className="w-full flex gap-1.5">
                                  {isOwned && (
                                    <button
                                      onClick={() => handleDownload(game.id)}
                                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 text-slate-950 font-extrabold text-[11.5px] py-2.5 px-2 rounded flex items-center justify-center gap-1 transition active:scale-[0.97]"
                                    >
                                      <Download className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                                      <span>Reload</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleGameSelect(game)}
                                    className={`${isOwned ? 'flex-[0.95]' : 'w-full'} bg-amber-600 hover:bg-amber-500 text-slate-100 font-extrabold text-[11px] py-2.5 px-2 rounded flex items-center justify-center gap-1 shrink-0 transition active:scale-98`}
                                  >
                                    <FolderOpen className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                                    <span>LINK</span>
                                  </button>
                                </div>
                              ) : isOwned ? (
                                <button
                                  onClick={() => handleDownload(game.id)}
                                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 font-semibold text-xs py-2.5 px-4 rounded flex items-center justify-center gap-1.5 transition active:scale-98"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-400" />
                                  <span>DOWNLOAD & INSTALL</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleGameSelect(game)}
                                  className="w-full bg-slate-900/80 hover:bg-slate-850/90 text-slate-300 border border-slate-850 hover:border-slate-800 font-semibold text-xs py-2.5 px-4 rounded flex items-center justify-center gap-1.5 transition active:scale-98"
                                >
                                  <Info className="w-3.5 h-3.5 text-slate-400" />
                                  <span>View Details</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* EXTERNAL DIRECTORY SCAN MOUNT */}
          {activeTab === "scan" && (
            <div className="space-y-6">
              <ExternalScanner 
                onGameLinked={handleLinkGame} 
                linkedGameIds={games.map(g => g.id)}
              />

              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl text-xs text-slate-400 space-y-2">
                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>File compression and external linking mechanism</span>
                </div>
                <p className="leading-relaxed">
                  GameLoren's memory neighborhood scanner detects all structure file formats of MV/MZ including JSON data files in subdirectories.
                </p>
                <p className="leading-relaxed">
                  When the linking process is complete, GameLoren will create a cross-compatible virtual gateway for each Android, PC, or Web system.
                </p>
              </div>
            </div>
          )}

          {/* USER & HELP PAGE */}
          {activeTab === "user" && (
            <div className="space-y-6">
              
              {/* User Profile Card */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-5 shadow-lg">
                <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                  <User className="w-6 h-6 text-emerald-400" />
                  <span>Your Profile</span>
                </h2>
                
                {session.isLoggedIn ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/30 flex items-center justify-center text-2xl font-bold font-mono shrink-0">
                      {session.email?.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left w-full overflow-hidden">
                      <div className="text-sm font-mono font-bold text-slate-300 w-full flex items-center gap-2" title={session.email || ""}>
                        <span className="truncate">{showUserEmail ? session.email : (session.email?.replace(/(.{1,3})(.*)(@.*)/, "$1***$3") || "******")}</span>
                        <button onClick={() => setShowUserEmail(!showUserEmail)} className="text-slate-500 hover:text-emerald-400 shrink-0">
                           {showUserEmail ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="text-xs flex items-center gap-1 text-emerald-400 font-extrabold uppercase mt-1">
                        <Shield className="w-3.5 h-3.5" />
                        <span>{isAdmin ? "Admin" : "Member"}</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-sm py-2 px-6 rounded-lg transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-lg">
                    <div className="text-center sm:text-left">
                      <p className="text-sm text-slate-300 font-semibold mb-1">Not Logged In</p>
                      <p className="text-xs text-slate-500">Log in to sync your data across multi-platform libraries and receive the best game bug support.</p>
                    </div>
                    <button 
                      onClick={() => setShowAuthModal(true)}
                      className="w-full sm:w-auto flex flex-shrink-0 items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm py-2 px-6 rounded-lg shadow-lg shadow-emerald-500/10 transition active:scale-95"
                    >
                      <User className="w-4 h-4" />
                      <span>LOG IN NOW</span>
                    </button>
                  </div>
                )}
              </div>

              {/* FAQ HELP SECTION */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-900 border border-slate-850 rounded-xl">
                <h3 className="font-bold text-sm text-white mb-2 flex items-center gap-1.5">
                  <Tv className="w-4.5 h-4.5 text-emerald-400" />
                  <span>How to play RPG Maker games most smoothly on Android?</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  To experience the game without lag, it is recommended to turn on <b>Canvas resolution 75%</b> on mid-range mobile devices, or <b>50%</b> For low-end machines. Lowering the resolution helps reduce sudden CPU heat when rendering.
                </p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-850 rounded-xl">
                <h3 className="font-bold text-sm text-white mb-2 flex items-center gap-1.5">
                  <Cpu className="w-4.5 h-4.5 text-emerald-400" />
                  <span>How to fix uppercase and lowercase letter errors on the Android operating system?</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Windows PCs consider paths with uppercase or lowercase letters as the same, but Android considers them different. GameLoren automatically simulates an intermediate distribution system (Case-Match Linker VFS) to automatically accurately identify every scenario of audio and image loading errors.
                </p>
              </div>

              {/* USER BUG REPORT CENTER */}
              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-850 rounded-xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
                  <BadgeAlert className="w-4.5 h-4.5 text-emerald-400 animate-bounce" />
                  <div>
                    <h3 className="font-bold text-sm text-white">Send System Error Report & Game Script</h3>
                    <p className="text-[10px] text-slate-500">The emulated hardware configuration information will be automatically attached to support error monitoring on Cloud Worker.</p>
                  </div>
                </div>

                {!session.isLoggedIn ? (
                  <div className="text-center py-4 bg-slate-900/40 rounded-lg p-3 border border-dashed border-slate-800">
                    <p className="text-xs text-slate-400 mb-2.5">You need to log in to your GameLoren account to use the automatic bug report system.</p>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs py-1.5 px-4 rounded transition active:scale-95 shadow-md shadow-emerald-500/10"
                    >
                      LOG IN NOW
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReport} className="space-y-4 pt-1">
                    {reportSuccessMessage && (
                      <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{reportSuccessMessage}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">The game is broken</label>
                        <select
                          value={reportGameId}
                          onChange={(e) => setReportGameId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                        >
                          <option value="">-- Select a faulty game --</option>
                          {games.map((g) => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Type of issue / Bug</label>
                        <select
                          value={reportErrorType}
                          onChange={(e) => setReportErrorType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                        >
                          <option value="black_screen">Completely black screen (Black Screen)</option>
                          <option value="no_sound">Lost background music BGM/SE (Audio Glitch)</option>
                          <option value="lag_fps">FPS drop/Extreme frame latency</option>
                          <option value="save_error">Error reading/writing Save game script File (VFS Corrupted)</option>
                          <option value="keyboard_stuck">Virtual Joipad key cluster is heavily stuck</option>
                          <option value="other">Belongs to other issues / incidents...</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Detailed error description (Behavior & Incident scenario)</label>
                      <textarea
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        placeholder="Please describe clearly which part of the script you encountered the error, what actions you performed beforehand, ..."
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-emerald-500 resize-none leading-relaxed"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-900 text-[10px] text-slate-500">
                      <div className="flex gap-4 font-mono">
                        <div>Resolution: <span className="text-emerald-400">{(settings.resolutionScale * 100).toFixed(0)}%</span></div>
                        <div>CPU preset: <span className="text-emerald-400 capitalize">{settings.performancePreset}</span></div>
                        <div>Auth ID: <span className="text-emerald-400">{session.email?.split("@")[0]}</span></div>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingReport}
                        className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-2 p-4 px-6 rounded-lg transition duration-150 flex items-center gap-1.5 active:scale-95 shadow-md shadow-emerald-500/10 cursor-pointer"
                      >
                        {submittingReport ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                            <span>SENDING REPORT...</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5" />
                            <span>SEND ERROR REPORT</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
          )}

          {/* PERFORMANCE TAB */}
          {activeTab === "performance" && (
            <div className="space-y-6">
              <PerformanceSettingsPanel
                settings={settings}
                onUpdateSettings={(updated) => {
                  setSettings(updated);
                  localStorage.setItem("gameloren_settings", JSON.stringify(updated));
                }}
              />
            </div>
          )}

          {/* SYSTEM ADMINISTRATION PANEL */}
          {activeTab === "admin" && isAdmin && (
            <div className="space-y-6 text-left">
              
              {/* Header section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-950/20 to-slate-900 border border-slate-800 rounded-2xl">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2 text-left">
                    <Shield className="w-5.5 h-5.5 text-emerald-400" />
                    <span>CENTRAL MANAGEMENT SYSTEM (ADMIN DASHBOARD)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-sans">
                    Manage game patch releases, control intermediate VFS configurations, and handle hardware incident reports.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] text-slate-400 font-mono">
                    Edge Server: <span className="text-emerald-400 font-bold">ONLINE</span>
                  </div>
                  <div className="bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] text-slate-400 font-mono">
                    Gateway D1: <span className="text-emerald-400 font-bold">STABLE</span>
                  </div>
                </div>
              </div>

              {/* Stat summary cards - Bento grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Stat 1 */}
                <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CloudLightning className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Cloud Library</span>
                    <span className="text-base font-black text-white font-mono">{games.length} game</span>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-500">
                    <BadgeAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Unhandled Error</span>
                    <span className="text-base font-black text-white font-mono">
                      {errorReports.filter(r => r.status === "pending").length} / {errorReports.length}
                    </span>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Bypass / Amnesty DRM</span>
                    <span className="text-base font-black text-white font-mono">
                      {settings.bypassMode ? "ACTIVATE" : "HARD LOCK"}
                    </span>
                  </div>
                </div>

                {/* Stat 4 */}
                <div className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Monitoring Device</span>
                    <span className="text-xs font-bold text-slate-300 font-mono text-ellipsis overflow-hidden block max-w-[150px]">
                      {session.fingerprintHash || "LOREN-VFS-2026"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Split Column Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 mt-2">
                
                {/* COLUMN LEFT (5/12 width) - Publisher patch form */}
                <div className="lg:col-span-5 col-span-1 space-y-4">
                  <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl space-y-4">
                    <div className="pb-2 border-b border-slate-850 flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-bold text-sm text-white flex items-center gap-1.5 font-sans">
                        <PlusCircle className="w-4.5 h-4.5 text-emerald-400" />
                        <span>Release Game Update</span>
                      </h3>
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded font-mono font-bold tracking-wider uppercase">Auto Sync DCOS</span>
                    </div>

                    <form onSubmit={handleAdminPublishUpdate} className="space-y-3.5 text-xs">
                      {pubSuccessMessage && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-2.5 rounded-lg font-sans">
                          ✓ {pubSuccessMessage}
                        </div>
                      )}

                      {pubErrorMessage && (
                        <div className="bg-red-500/10 border border-red-500/35 text-red-400 p-2.5 rounded-lg font-sans">
                          ⚠ {pubErrorMessage}
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Choose upgrade game</label>
                        <select
                          value={pubSelectedGameId}
                          onChange={(e) => setPubSelectedGameId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                        >
                          <option value="">-- Choose a game from the warehouse --</option>
                          {games.map(g => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">New version</label>
                          <input
                            type="text"
                            placeholder="e.g. 1.5.0"
                            value={pubVersion}
                            onChange={(e) => setPubVersion(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">File size</label>
                          <input
                            type="text"
                            placeholder="e.g. 450 MB"
                            value={pubUpdateSize}
                            onChange={(e) => setPubUpdateSize(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Patch Structure</label>
                          <select
                            value={pubUpdateType}
                            onChange={(e) => setPubUpdateType(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                          >
                            <option value="patch">Small patch</option>
                            <option value="major">Major expansion (DLC)</option>
                            <option value="full">Entire compressed file (Full)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Admin Secret Lock</label>
                          <input
                            type="password"
                            placeholder="Blank form = SimulMode"
                            value={pubSecret}
                            onChange={(e) => setPubSecret(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Script update information (Changelogs)</label>
                        <textarea
                          rows={3}
                          placeholder="Enter details of fixed bugs, improved graphics, compressed sound, ..."
                          value={pubChangelog}
                          onChange={(e) => setPubChangelog(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500 leading-relaxed resize-none font-sans"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={publishingUpdate}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-500/10 cursor-pointer"
                      >
                        {publishingUpdate ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                            <span>SINKING SERVER ENGINE...</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-4 h-4" />
                            <span>ACTIVATE UPGRADE ON WORKER</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                {/* COLUMN RIGHT (7/12 width) - User Bug Reports lists and quick triage comments */}
                <div className="lg:col-span-7 col-span-1 space-y-4">
                  <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl space-y-4 flex flex-col">
                    <div className="pb-2 border-b border-slate-850 flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-bold text-sm text-white flex items-center gap-1.5 font-sans">
                        <BadgeAlert className="w-4.5 h-4.5 text-emerald-400" />
                        <span>Player Error Report Log List</span>
                      </h3>
                      <button
                        onClick={() => {
                          if (confirm("Delete the entire current bug report list?")) {
                            setErrorReports([]);
                            localStorage.setItem("gameloren_error_reports_v2", JSON.stringify([]));
                            setSelectedReportId(null);
                          }
                        }}
                        className="text-[10px] text-red-400 hover:text-red-300 transition underline cursor-pointer"
                      >
                        Reset data
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 select-none scrollbar-thin scrollbar-thumb-slate-800">
                      {errorReports.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 font-sans">
                          There have been no error reports recorded from players.
                        </div>
                      ) : (
                        errorReports.map((rep) => {
                          const isSelected = selectedReportId === rep.id;
                          return (
                            <div
                              key={rep.id}
                              onClick={() => {
                                setSelectedReportId(isSelected ? null : rep.id);
                                setAdminCommentInput(rep.adminComment || "");
                              }}
                              className={`p-3.5 rounded-xl border transition text-left cursor-pointer ${
                                isSelected 
                                  ? "bg-slate-950 border-emerald-500/60 shadow-md shadow-emerald-500/5" 
                                  : "bg-slate-950/50 border-slate-850 hover:bg-slate-950 hover:border-slate-800"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap text-left">
                                    <span className="font-bold text-white text-xs truncate block max-w-[200px] text-left">{rep.gameTitle}</span>
                                    <span className="text-[9px] text-slate-500 font-mono">{rep.createdAt}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono max-w-[340px] truncate text-left">
                                    Sender: <span className="text-slate-300 font-bold">{rep.email}</span>
                                  </div>
                                </div>

                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  rep.status === "pending"
                                    ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                    : rep.status === "investigating"
                                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse"
                                      : rep.status === "resolved"
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "bg-red-500/10 text-red-500 border border-red-500/30"
                                }`}>
                                  {rep.status === "pending" ? "Pending" : rep.status === "investigating" ? "Debugging..." : rep.status === "resolved" ? "Fixed the bug" : "Refuse"}
                                </span>
                              </div>

                              <p className="text-2xs text-slate-400 text-left line-clamp-2 mt-2 leading-relaxed bg-slate-950/80 p-2 rounded border border-slate-900/60">
                                {rep.description}
                              </p>

                              {/* Detailed Dropdown Inline information */}
                              {isSelected && (
                                <div className="mt-3 pt-3 border-t border-slate-900 space-y-3 block text-[10px]" onClick={(e) => e.stopPropagation()}>
                                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono bg-slate-900/40 p-2 rounded">
                                    <div>CPU Mode: <span className="text-indigo-300 capitalize">{rep.performancePreset}</span></div>
                                    <div>Canvas Scale: <span className="text-indigo-300">{rep.resolutionScale * 100}%</span></div>
                                    <div className="col-span-2 truncate">Platform/Operating System: <span className="text-indigo-300">{rep.os}</span></div>
                                    <div>ErrorReport ID: <span className="text-indigo-300 font-mono">{rep.id}</span></div>
                                    <div>Type: <span className="text-indigo-300 capitalize">{rep.errorType}</span></div>
                                  </div>

                                  {/* Update State Panel */}
                                  <div className="space-y-1.5">
                                    <span className="block text-[9px] text-slate-500 font-bold uppercase text-left">Quickly review status</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {(["pending", "investigating", "resolved", "rejected"] as const).map(st => (
                                        <button
                                          key={st}
                                          onClick={() => handleAdminUpdateStatus(rep.id, st)}
                                          className={`py-1 px-2 text-[8px] rounded uppercase font-bold transition border cursor-pointer ${
                                            rep.status === st
                                              ? st === "pending"
                                                ? "bg-yellow-500/20 border-yellow-500 text-yellow-300"
                                                : st === "investigating"
                                                  ? "bg-purple-500/20 border-purple-500 text-purple-300"
                                                  : st === "resolved"
                                                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                                    : "bg-red-500/20 border-red-500 text-red-300"
                                              : "bg-slate-900 border-slate-850 text-slate-505 hover:text-slate-400"
                                          }`}
                                        >
                                          {st === "pending" ? "Just received" : st === "investigating" ? "Searching for errors" : st === "resolved" ? "Fixed the bug" : "Refuse"}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Reply Comment Section */}
                                  <div className="space-y-1.5">
                                    <label className="block text-[9px] text-slate-500 font-bold uppercase text-left">Response plan (Admin Comment)</label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="For example: Fixed bugs in the VFS patch or suggested configuration changes..."
                                        value={adminCommentInput}
                                        onChange={(e) => setAdminCommentInput(e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-850 rounded px-2 text-[10px] text-slate-200 outline-none focus:border-emerald-500 font-sans"
                                      />
                                      <button
                                        onClick={() => handleAdminCommentSubmit(rep.id)}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-2.5 rounded transition text-center cursor-pointer text-xs"
                                      >
                                        Send
                                      </button>
                                    </div>
                                    {rep.adminComment && (
                                      <div className="text-[10px] text-emerald-400 bg-emerald-950/20 p-2 rounded border border-emerald-900/30 italic block text-left">
                                        <b className="not-italic block text-left">Admin Response:</b> {rep.adminComment}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div> {/* End of !selectedGame wrapper */}

      {/* GAME DETAIL / SETTINGS OVERLAY PANEL inside Main Component */}
      <AnimatePresence>
        {selectedGame && (
          <div className="w-full h-full flex items-start justify-center pb-20 md:pb-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-slate-900 border border-slate-800/80 rounded-2xl max-w-5xl w-full shadow-xl relative flex flex-col p-4 md:p-6 text-left shrink-0"
            >

              {/* Bento Grid 2 Columns Container */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 text-left mt-2">
                
                {/* COLUMN LEFT (7/12 width) - Media visualizer, Info, Description and requirements */}
                <div className="md:col-span-12 lg:col-span-7 col-span-1 space-y-4">
                  
                  {/* Title & Engine Badges */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                        RPG Maker {selectedGame.engine} Engine
                      </span>

                      {selectedGame.isLinked && (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          selectedGame.platform === "web"
                            ? "bg-purple-500/15 border border-purple-500/30 text-purple-400"
                            : selectedGame.platform === "pc"
                              ? "bg-sky-500/15 border border-sky-500/30 text-sky-400"
                              : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                        }`}>
                          {selectedGame.platform === "web" ? "🌐 WEB OS" : selectedGame.platform === "pc" ? "💻 PC WINDOWS" : "📱 ANDROID VFS"}
                        </span>
                      )}
                      
                      {licenseChecking[selectedGame.id] ? (
                        <span className="text-[8px] font-mono text-slate-400 animate-pulse">Scanning DRM...</span>
                      ) : gameLicenses[selectedGame.id]?.owned ? (
                        <span className="text-[8px] bg-green-500/15 border border-green-500/30 text-green-400 font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          ✓ OWNED ({gameLicenses[selectedGame.id]?.edition?.toUpperCase()})
                        </span>
                      ) : (
                        <span className="text-[8px] bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          ⚠ Emergency Trial Use
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white tracking-wide leading-snug">
                      {selectedGame.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-1 break-all">
                      File status: {selectedGame.localPath ? `📁 [${selectedGame.platform?.toUpperCase() || "ANDROID"}] ${selectedGame.localPath}` : "☁️ Online Package"}
                    </p>
                  </div>

                  {/* Main Visual Media Display */}
                  <div className="w-full aspect-video rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950 relative shadow-inner">
                    <img 
                      src={activeGalleryImage || selectedGame.cover} 
                      alt={selectedGame.title} 
                      className="w-full h-full object-cover transition-all duration-300 select-none"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent p-3 flex justify-between items-end pointer-events-none">
                      <span className="text-[9px] font-mono text-slate-400">Preview Visualizer Zone</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-1">{selectedGame.isLinked ? "Installed" : (selectedGame.size || "Online")}</span>
                    </div>
                  </div>

                  {/* Image Gallery Horizontal Slider (Chúng ta lấy thumbnails) */}
                  {selectedGame.gallery && selectedGame.gallery.length > 0 && (
                    <div className="flex gap-2 items-center overflow-x-auto pb-1.5 no-scrollbar">
                      {selectedGame.gallery.map((imgUrl: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setActiveGalleryImage(imgUrl)}
                          className={`w-20 md:w-24 aspect-video rounded-lg overflow-hidden border-2 transition-all shrink-0 active:scale-95 ${
                            activeGalleryImage === imgUrl ? "border-emerald-500 scale-102 opacity-100" : "border-slate-800/80 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img src={imgUrl} alt={`Thumb ${idx}`} className="w-full h-full object-cover select-none" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Specs & Score Summary Bento */}
                  {(() => {
                    let descData;
                    try {
                      descData = JSON.parse(selectedGame.desc);
                    } catch {
                      descData = { short_desc: selectedGame.desc, sections: [] };
                    }
                    
                    let editorScore = descData.score || 0;
                    if (editorScore === 0 && selectedGame.rev_total > 0) {
                      editorScore = ((selectedGame.rev_pos / selectedGame.rev_total) * 10).toFixed(1);
                    }

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-850/60 text-xs">
                          <div>
                            <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">Develop</span>
                            <span className="font-semibold text-slate-300 truncate block mt-0.5">{selectedGame.dev}</span>
                          </div>
                          <div>
                            <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">Update date</span>
                            <span className="font-semibold text-slate-300 block mt-0.5">{selectedGame.releaseDate}</span>
                          </div>
                          <div>
                            <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">Resources</span>
                            <span className="font-semibold text-slate-300 block mt-0.5">{selectedGame.isLinked ? (selectedGame.localSize || "Installed") : (selectedGame.size || "Online")}</span>
                          </div>
                          <div>
                            <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">Rating</span>
                            <span className="font-extrabold text-emerald-400 flex items-center gap-1 block mt-0.5">
                              <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                              <span>{editorScore > 0 ? `${editorScore} / 10` : "Not yet available"}</span>
                            </span>
                          </div>
                        </div>

                        {/* Editor review score block */}
                        {editorScore > 0 && (
                          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                            <span className="text-3xl font-black text-emerald-400 font-mono leading-none">{editorScore}</span>
                            <div className="text-[10px] leading-tight text-slate-400 font-medium">
                              <span className="font-bold text-white block uppercase tracking-wide">User Feedback</span>
                              <span>Confirmed by the GameLoren censorship system</span>
                            </div>
                          </div>
                        )}

                        {/* Description content */}
                        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3">
                          <p className="text-xs text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                            {descData.short_desc}
                          </p>
                          {Array.isArray(descData.sections) && descData.sections.map((sec: any, idx: number) => (
                            <div key={idx} className="space-y-1 mt-2.5">
                              <h4 className="text-xs font-bold text-emerald-400 border-b border-slate-800 pb-1 flex items-center gap-1.5">
                                {sec.title}
                              </h4>
                              <div 
                                className="text-[11px] text-slate-400 leading-relaxed space-y-1 prose prose-invert max-w-none prose-xs"
                                dangerouslySetInnerHTML={{ __html: sec.content }}
                              />
                            </div>
                          ))}
                        </div>

                        {/* SYSTEM REQUIREMENTS - CẤU HÌNH TỰ ĐỘNG ĐỌC TỪ SERVER */}
                        {selectedGame.sysReq && (
                          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 text-xs space-y-3">
                            <div className="font-bold text-slate-200 border-b border-slate-900 pb-1.5 flex items-center gap-1.5 uppercase text-[10px] tracking-wider font-mono">
                              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                              Recommended Configuration (From Server)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300 text-[11px]">
                              <div><span className="text-[9px] text-slate-500 uppercase block font-bold">Operating system</span> {selectedGame.sysReq.os || "Android 8.0 / Windows 10"}</div>
                              <div><span className="text-[9px] text-slate-500 uppercase block font-bold">Microprocessor (CPU)</span> {selectedGame.sysReq.cpu || "Snapdragon 665 / Core i3"}</div>
                              <div><span className="text-[9px] text-slate-500 uppercase block font-bold">Cache memory (RAM)</span> {selectedGame.sysReq.ram || "4 GB RAM"}</div>
                              <div><span className="text-[9px] text-slate-500 uppercase block font-bold">Graphics (GPU)</span> {selectedGame.sysReq.gpu || "OpenGL ES 3.1 compatible"}</div>
                              <div className="sm:col-span-2"><span className="text-[9px] text-slate-500 uppercase block font-bold">Available disk space</span> {selectedGame.sysReq.storage || (selectedGame.size || "1 GB free")}</div>
                            </div>
                          </div>
                        )}

                        {/* Meta Tags Row */}
                        <div className="flex flex-wrap gap-1.5">
                          {selectedGame.tags.map((tg: string) => (
                            <span key={tg} className="bg-slate-950 border border-slate-900 text-slate-400 text-[10px] font-medium px-2.5 py-0.5 rounded-full">
                              {tg}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                </div>

                {/* COLUMN RIGHT (5/12 width) - Tabs Switcher for Licenses/Editions/Mods & Reviews */}
                <div className="md:col-span-12 lg:col-span-5 col-span-1 space-y-4">
                  
                  {/* Detailed Tabs Header */}
                  <div className="flex border-b border-slate-800 select-none">
                    <button
                      onClick={() => setActiveDetailTab("store")}
                      className={`flex-1 text-center pb-2.5 font-bold text-xs md:text-sm uppercase border-b-2 transition ${
                        activeDetailTab === "store" 
                          ? "border-emerald-500 text-slate-100" 
                          : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Management & Settings
                    </button>
                    <button
                      onClick={() => setActiveDetailTab("reviews")}
                      className={`flex-1 text-center pb-2.5 font-bold text-xs md:text-sm uppercase border-b-2 transition ${
                        activeDetailTab === "reviews" 
                          ? "border-emerald-500 text-slate-100" 
                          : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Community ({reviewsDB[selectedGame.id]?.length || 0})
                    </button>
                  </div>

                  {activeDetailTab === "store" ? (
                    <div className="space-y-4">
                      
                      {/* MAIN GAME BOOT ACTION CARD - CHẠY GAME HOẶC LIÊN KẾT */}
                      {(() => {
                        const activeLicense = gameLicenses[selectedGame.id];
                        const gEditions = (selectedGame as any).editions;
                        const minEditionPrice = (Array.isArray(gEditions) && gEditions.length > 0)
                          ? Math.min(...gEditions.map((ed: any) => typeof ed.price === 'number' ? ed.price : 0))
                          : 0;
                        const isOwned = activeLicense?.owned || minEditionPrice === 0 || settings.bypassMode;

                        if (!isOwned) {
                          return (
                            <div className="bg-slate-950/80 p-4 rounded-xl border border-amber-500/20 text-center space-y-3.5">
                              <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                                <Lock className="w-4 h-4" />
                                Copyright Not Unlocked
                              </h4>
                              <p className="text-[10.5px] text-slate-400 leading-normal max-w-xs mx-auto">
                                This game is distributed in a limited manner. Please choose to purchase or renew one of the edition packages (License) below to activate the game resources.
                              </p>
                              <button
                                disabled
                                className="w-full bg-slate-900 border border-slate-800 text-slate-500 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition opacity-65 cursor-not-allowed"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>NO LICENSE</span>
                              </button>
                            </div>
                          );
                        }

                        if (selectedGame.isLinked) {
                          return (
                            <div className="bg-slate-950/90 p-4 border border-emerald-500/30 rounded-xl space-y-3 text-center shadow-lg shadow-emerald-500/5">
                              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                                <CheckCircle className="w-4 h-4" />
                                Ready to Start
                              </h4>
                              <p className="text-[10px] text-slate-500 font-mono break-all leading-tight">
                                Folder: {selectedGame.localPath}
                              </p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                <button
                                  onClick={() => {
                                    const tgt = selectedGame;
                                    setSelectedGame(null);
                                    handlePlayGame(tgt, false); // Standard Boot
                                  }}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition active:scale-95 duration-150 shadow-md shadow-emerald-500/10 cursor-pointer"
                                >
                                  <Play className="w-4 h-4 fill-slate-950" />
                                  <span>RELEASE HARD GAME</span>
                                </button>
                                
                                <button
                                  onClick={() => {
                                    const tgt = selectedGame;
                                    setSelectedGame(null);
                                    handlePlayGame(tgt, true); // Modded Boot
                                  }}
                                  className="bg-violet-600 hover:bg-violet-700 text-slate-100 font-extrabold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition active:scale-95 duration-150 shadow-md shadow-violet-500/10 cursor-pointer"
                                >
                                  <Sliders className="w-4 h-4" />
                                  <span>PLAY MODS VERSION</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900/60 mt-1.5">
                                <button
                                  onClick={() => handleInitModFolder(selectedGame.id)}
                                  className="py-1.5 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-400 text-center font-bold text-[10px] rounded-lg transition overflow-hidden"
                                >
                                  Create Mod Folder
                                </button>
                                <button
                                  onClick={() => handleUnlinkGame(selectedGame.id)}
                                  className="py-1.5 bg-red-950/20 hover:bg-red-950/50 border border-red-500/10 hover:border-red-500/30 text-red-400 text-center font-bold text-[10px] rounded-lg transition"
                                >
                                  Unlink
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // Chưa được cài đặt/liên kết
                        return (
                          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 text-left space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-850/70">
                              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Connection Settings & Game Folder</h4>
                            </div>
                            
                            <p className="text-[10.5px] text-slate-400 leading-relaxed">
                              Locate the storage path, select the main boot file (<code className="text-amber-400">index.html</code> or <code className="text-sky-400">game.exe</code>), and set the state of the local virtual folder.
                            </p>

                            {/* Section 1: Path Input */}
                            <div className="space-y-1.5">
                              <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest text-[9px]">Folder or File Path</label>
                              <div className="relative flex items-center gap-2">
                                <div className="relative flex-1">
                                  <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                  <input
                                    type="text"
                                    value={wizardPath}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setWizardPath(val);
                                      const pLower = val.toLowerCase();
                                      
                                      let dPlatform: "android" | "pc" | "web" = "android";
                                      if (pLower.startsWith("http://") || pLower.startsWith("https://") || pLower.includes("localhost") || pLower.includes("127.0.0.1")) {
                                        dPlatform = "web";
                                      } else if (pLower.includes(":") || pLower.includes("\\") || pLower.match(/^[a-z][\/\\]/) || pLower.startsWith("c/") || pLower.startsWith("d/")) {
                                        dPlatform = "pc";
                                      }
                                      setWizardPlatform(dPlatform);

                                      if (pLower.endsWith(".exe") || pLower.includes("game.exe")) {
                                        setWizardFileType("game.exe");
                                        setWizardFolderState("has_game");
                                      } else if (pLower.endsWith(".html") || pLower.includes("index.html")) {
                                        setWizardFileType("index.html");
                                        setWizardFolderState("has_game");
                                      } else if (val.trim() && !val.endsWith("/") && !val.endsWith("\\")) {
                                        setWizardFolderState("has_game");
                                      } else {
                                        setWizardFolderState("empty");
                                      }
                                    }}
                                    placeholder={
                                      wizardPlatform === "web"
                                        ? "Enter Web URL: http://..."
                                        : wizardPlatform === "pc"
                                          ? "C:\\Games\\RpgGame\\"
                                          : "/storage/emulated/0/"
                                    }
                                    className="w-full bg-slate-950/90 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-[10.5px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition-colors duration-200"
                                  />
                                </div>
                                
                                <div className="flex gap-1">
                                  {/* Native Directory Picker */}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const result = await FilePicker.pickDirectory();
                                        if (result && result.path) {
                                          const realPath = decodeAndroidUri(result.path);
                                          setWizardPath(realPath);
                                          
                                          let detectedPlatform: "android" | "pc" | "web" = Capacitor.getPlatform() === 'android' ? 'android' : 'pc';
                                          setWizardPlatform(detectedPlatform);
                                          setWizardFileType("index.html");
                                          setWizardFolderState("has_game");
                                        }
                                      } catch (e: any) {
                                        if (e.message !== 'User cancelled.') {
                                          showToast("Error when opening the Native folder picker.", "error");
                                        }
                                      }
                                    }}
                                    className="bg-slate-950 hover:bg-slate-850 border border-slate-800 p-2 rounded-lg cursor-pointer transition flex items-center justify-center shrink-0 hover:text-emerald-400 text-slate-400" 
                                    title="Locate Folder"
                                  >
                                    <FolderOpen className="w-4 h-4 text-slate-400" />
                                  </button>
                                  
                                  {/* Native File Picker */}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const result = await FilePicker.pickFiles({
                                          readData: false 
                                        });
                                        
                                        if (result.files && result.files.length > 0) {
                                          const file = result.files[0];
                                          const realPath = decodeAndroidUri(file.path || ""); 
                                          const fileSize = file.size ? formatBytes(file.size) : undefined;
                                          const pName = file.name.toLowerCase();
                                          
                                          if (realPath) {
                                            let detectedPlatform: "android" | "pc" | "web" = "android";
                                            if (pName.endsWith(".exe")) {
                                              detectedPlatform = "pc";
                                              setWizardFileType("game.exe");
                                            } else if (pName.endsWith(".html")) {
                                              detectedPlatform = "android";
                                              setWizardFileType("index.html");
                                            } else {
                                              detectedPlatform = Capacitor.getPlatform() === 'pc' ? 'pc' : 'android';
                                              setWizardFileType("custom");
                                              setWizardCustomFile(file.name);
                                            }
                                            
                                            setWizardPath(realPath);
                                            setWizardPlatform(detectedPlatform);
                                            setWizardFolderState("has_game");

                                            // Lưu dung lượng file vào game hiện tại
                                            const updatedGames = games.map(g => g.id === selectedGame.id ? { ...g, localSize: fileSize } : g);
                                            setGames(updatedGames);
                                            setSelectedGame({ ...selectedGame, localSize: fileSize });

                                          } else {
                                             showToast("The device does not return the physical path for this file.", "warning");
                                          }
                                        }
                                      } catch (e: any) {
                                        if (e.message !== 'User cancelled.') {
                                          showToast("Error when opening the file selection dialog.", "error");
                                        }
                                      }
                                    }}
                                    className="bg-slate-950 hover:bg-slate-850 border border-slate-800 p-2 rounded-lg cursor-pointer transition flex items-center justify-center shrink-0 hover:text-emerald-400 text-slate-400" 
                                    title="Select File"
                                  >
                                    <FileText className="w-4 h-4 text-slate-400" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Platform selector */}
                            <div className="space-y-1.5">
                              <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest text-[9px]">Simulation system</label>
                              <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-850 text-[10px]">
                                {(["android", "pc", "web"] as const).map((plat) => (
                                  <button
                                    key={plat}
                                    type="button"
                                    onClick={() => {
                                      setWizardPlatform(plat);
                                      if (plat === "web" && !wizardPath.startsWith("http")) {
                                        setWizardPath(`http://localhost:3000/${selectedGame.id}/index.html`);
                                      } else if (plat === "pc" && wizardPath.startsWith("/storage")) {
                                        setWizardPath(`C:\\Games\\${selectedGame.id}`);
                                        setWizardFileType("game.exe");
                                      } else if (plat === "android" && wizardPath.startsWith("C:")) {
                                        setWizardPath(`/storage/emulated/0/Download/${selectedGame.id}`);
                                        setWizardFileType("index.html");
                                      }
                                    }}
                                    className={`py-1.5 rounded-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                      wizardPlatform === plat
                                        ? plat === "android"
                                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm"
                                          : plat === "pc"
                                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/25 shadow-sm"
                                            : "bg-violet-500/10 text-violet-400 border border-violet-500/25 shadow-sm"
                                        : "text-slate-500 hover:text-slate-300"
                                    }`}
                                  >
                                    <span>{plat === "android" ? "📱" : plat === "pc" ? "💻" : "🌐"}</span>
                                    <span className="capitalize">{plat}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Section 3: Launch Executable / Html Config */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest text-[9px]">Main executable file</label>
                                <span className="text-[8.5px] text-slate-500 font-mono italic">
                                  {wizardFileType === "game.exe" ? "Windows PC executable (.exe)" : "Web/HTML5 Template (.html)"}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-850 text-[10px]">
                                {["index.html", "game.exe", "custom"].map((type) => {
                                  const displayLabel = type === "index.html" ? "index.html" : type === "game.exe" ? "game.exe" : "Customize";
                                  const isSelected = wizardFileType === type;
                                  return (
                                    <button
                                      key={type}
                                      type="button"
                                      onClick={() => {
                                        setWizardFileType(type as any);
                                      }}
                                      className={`py-1.5 rounded-md font-extrabold transition cursor-pointer ${
                                        isSelected
                                          ? "bg-slate-800 text-slate-150 border border-slate-700 shadow-sm"
                                          : "text-slate-500 hover:text-slate-400"
                                      }`}
                                    >
                                      {displayLabel}
                                    </button>
                                  );
                                })}
                              </div>

                              {wizardFileType === "custom" && (
                                <input
                                  type="text"
                                  value={wizardCustomFile}
                                  onChange={(e) => setWizardCustomFile(e.target.value)}
                                  placeholder="Enter the custom file name (e.g., main.js, default.html)"
                                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-[10.5px] text-slate-200 placeholder-slate-700 font-mono mt-1 focus:outline-none focus:border-slate-600"
                                />
                              )}
                            </div>

                            {/* Section 4: Physical Directory empty check vs load existing preset */}
                            <div className="p-3 bg-slate-950 border border-slate-850/80 rounded-xl space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 text-[10px]">
                                <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Directory Validation Test</span>
                                <span className="text-[8px] bg-emerald-900/40 px-1.5 py-0.5 rounded text-emerald-400 font-mono font-bold uppercase border border-emerald-500/30">
                                  {isScanningFolder ? "Scanning disk..." : "Real-time I/O"}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setWizardFolderState("empty")}
                                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                                    wizardFolderState === "empty"
                                      ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                                      : "bg-slate-900/40 border-transparent text-slate-500 hover:border-slate-800"
                                  }`}
                                >
                                  <span className="font-extrabold text-[10.5px] block leading-none">Empty Folder</span>
                                  <span className="text-[9px] text-slate-500 block leading-tight mt-1 truncate">Waiting to extract new resources</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setWizardFolderState("has_game")}
                                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                                    wizardFolderState === "has_game"
                                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                                      : "bg-slate-900/40 border-transparent text-slate-500 hover:border-slate-800"
                                  }`}
                                >
                                  <span className="font-extrabold text-[10.5px] block leading-none">The folder already has a Game</span>
                                  <span className="text-[9px] text-slate-500 block leading-tight mt-1 truncate">Load the original game, save data</span>
                                </button>
                              </div>

                              {/* Instructive feedback text to user */}
                              <div className="text-[10px] leading-relaxed pt-1 select-none">
                                {wizardFolderState === "empty" ? (
                                  <span className="text-amber-500/90 font-medium whitespace-pre-line">
                                    ⚠️ <strong>Download & Overwrite:</strong> The folder does not contain any data. The system will proceed to download the full package and install it directly onto the drive.
                                  </span>
                                ) : (
                                  <span className="text-emerald-500/90 font-medium whitespace-pre-line">
                                    ✅ <strong>Local Recharge:</strong> Detected an executable file in the specified folder. The scanner will load the available game, absolutely preserve progress, allow offline saving & no overwriting on load.
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Section 5: Dynamic Action Submission Panel */}
                            <div className="pt-3 border-t border-slate-850/50 flex flex-col gap-2">
                              {wizardFolderState === "has_game" ? (
                                <button
                                  onClick={() => {
                                    if (!wizardPath.trim()) {
                                      showToast("Please enter the folder path before saving the link.");
                                      return;
                                    }
                                    
                                    let finalPath = wizardPath.trim();
                                    
                                    if (wizardFileType === "game.exe" && !finalPath.toLowerCase().endsWith(".exe")) {
                                      if (!finalPath.endsWith("/") && !finalPath.endsWith("\\")) {
                                        finalPath += wizardPlatform === "pc" ? "\\" : "/";
                                      }
                                      finalPath += "game.exe";
                                    } else if (wizardFileType === "index.html" && !finalPath.toLowerCase().endsWith(".html") && wizardPlatform !== "web") {
                                      if (!finalPath.endsWith("/") && !finalPath.endsWith("\\")) {
                                        finalPath += wizardPlatform === "pc" ? "\\" : "/";
                                      }
                                      finalPath += "index.html";
                                    } else if (wizardFileType === "custom" && wizardCustomFile.trim()) {
                                      if (!finalPath.endsWith("/") && !finalPath.endsWith("\\")) {
                                        finalPath += wizardPlatform === "pc" ? "\\" : "/";
                                      }
                                      finalPath += wizardCustomFile.trim();
                                    }

                                    const finalGames = games.map((g) => g.id === selectedGame.id ? { ...g, isLinked: true, localPath: finalPath, platform: wizardPlatform } : g);
                                    saveGames(finalGames);
                                    setSelectedGame({ ...selectedGame, isLinked: true, localPath: finalPath, platform: wizardPlatform });
                                    showToast(`Game top-up successful! Directly use the system's executable file ${wizardPlatform.toUpperCase()}: [${finalPath}]`);
                                  }}
                                  className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer shadow-lg shadow-emerald-500/10"
                                >
                                  <CheckCircle className="w-4 h-4 text-slate-950" />
                                  <span>ORIGINAL GAME TOP-UP & LIBRARY LINK</span>
                                </button>
                              ) : (
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => {
                                      if (!wizardPath.trim()) {
                                        showToast("Please enter the folder path before saving an empty-type link.");
                                        return;
                                      }
                                      
                                      let finalPath = wizardPath.trim();
                                      
                                      if (wizardFileType === "game.exe" && !finalPath.toLowerCase().endsWith(".exe")) {
                                        if (!finalPath.endsWith("/") && !finalPath.endsWith("\\")) {
                                          finalPath += wizardPlatform === "pc" ? "\\" : "/";
                                        }
                                        finalPath += "game.exe";
                                      } else if (wizardFileType === "index.html" && !finalPath.toLowerCase().endsWith(".html") && wizardPlatform !== "web") {
                                        if (!finalPath.endsWith("/") && !finalPath.endsWith("\\")) {
                                          finalPath += wizardPlatform === "pc" ? "\\" : "/";
                                        }
                                        finalPath += "index.html";
                                      } else if (wizardFileType === "custom" && wizardCustomFile.trim()) {
                                        if (!finalPath.endsWith("/") && !finalPath.endsWith("\\")) {
                                          finalPath += wizardPlatform === "pc" ? "\\" : "/";
                                        }
                                        finalPath += wizardCustomFile.trim();
                                      }

                                      const finalGames = games.map((g) => g.id === selectedGame.id ? { ...g, isLinked: true, localPath: finalPath, platform: wizardPlatform } : g);
                                      saveGames(finalGames);
                                      setSelectedGame({ ...selectedGame, isLinked: true, localPath: finalPath, platform: wizardPlatform });
                                      showToast(`Completed configuration of the empty folder awaiting additional setup: ${finalPath}`);
                                    }}
                                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-[10px] py-2 px-2.5 rounded-lg transition text-center cursor-pointer"
                                  >
                                    Empty configuration
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (!wizardPath.trim()) {
                                        showToast("Please select the game save folder before proceeding with the full download.");
                                        return;
                                      }
                                      
                                      let finalPath = wizardPath.trim();
                                      
                                      if (wizardFileType === "game.exe" && !finalPath.toLowerCase().endsWith(".exe")) {
                                        if (!finalPath.endsWith("/") && !finalPath.endsWith("\\")) {
                                          finalPath += wizardPlatform === "pc" ? "\\" : "/";
                                        }
                                        finalPath += "game.exe";
                                      } else if (wizardFileType === "index.html" && !finalPath.toLowerCase().endsWith(".html") && wizardPlatform !== "web") {
                                        if (!finalPath.endsWith("/") && !finalPath.endsWith("\\")) {
                                          finalPath += wizardPlatform === "pc" ? "\\" : "/";
                                        }
                                        finalPath += "index.html";
                                      } else if (wizardFileType === "custom" && wizardCustomFile.trim()) {
                                        if (!finalPath.endsWith("/") && !finalPath.endsWith("\\")) {
                                          finalPath += wizardPlatform === "pc" ? "\\" : "/";
                                        }
                                        finalPath += wizardCustomFile.trim();
                                      }

                                      const targetGameId = selectedGame.id;
                                      setSelectedGame(null);
                                      handleDownload(targetGameId, finalPath, false);
                                    }}
                                    className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold text-[10.5px] py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 transition select-none tracking-wide cursor-pointer shadow-md shadow-emerald-500/10"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download the full version</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* GAME EDITION CARDS SELECTOR TIER */}
                      <div className="space-y-3 text-left">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-1.5 border-b border-slate-900">
                          <Star className="w-3.5 h-3.5 text-emerald-400 hover:scale-110 transition-transform" />
                          <span>Edition & License</span>
                        </h4>

                        <div className="space-y-2.5 mt-2">
                          {(() => {
                            const editionsToRender = (selectedGame && Array.isArray((selectedGame as any).editions) && (selectedGame as any).editions.length > 0)
                              ? (selectedGame as any).editions.map((ed: any) => ({
                                  id: ed.id,
                                  name: ed.name,
                                  price: ed.price,
                                  badge: ed.id === 'update_lock' ? "Update Lock" : ed.id === 'complete' ? "Complete Set" : ed.id === 'preorder' ? "Deluxe" : "Normal Version",
                                  color: ed.id === 'complete' ? "from-emerald-600 to-teal-600" : ed.id === 'preorder' ? "from-amber-500 to-orange-600" : ed.id === 'update_lock' ? "from-purple-600 to-fuchsia-600" : "from-blue-600 to-indigo-600",
                                  desc: ed.desc
                                }))
                              : GAME_EDITIONS;

                            const activeLicense = gameLicenses[selectedGame.id];
                            const currentEditionId = activeLicense?.owned ? (activeLicense.edition || "standard") : null;
                            const currentTier = currentEditionId ? (EDITION_TIER[currentEditionId] || 0) : 0;

                            // Compute current paid price
                            let currentPaidPrice = 0;
                            if (currentEditionId) {
                              const currentEdObj = editionsToRender.find((ed: any) => ed.id === currentEditionId);
                              if (currentEdObj) {
                                currentPaidPrice = getEditionPriceNumber(currentEdObj.price);
                              }
                            }

                            const getEditionIcon = (id: string) => {
                              switch (id) {
                                case "complete":
                                  return <Sparkles className="w-4 h-4 text-emerald-400" />;
                                case "preorder":
                                  return <Star className="w-4 h-4 text-amber-500" />;
                                case "update_lock":
                                  return <Key className="w-4 h-4 text-purple-400" />;
                                default:
                                  return <Shield className="w-4 h-4 text-blue-400" />;
                              }
                            };

                            return editionsToRender.map((ed: any) => {
                              const edTier = EDITION_TIER[ed.id] || 0;
                              const isEditionOwnedExactly = currentEditionId === ed.id;
                              const isDowngrade = currentEditionId && (edTier < currentTier);
                              
                              // Price difference processing style
                              let priceLabel = formatEditionPrice(ed.price);
                              let buttonLabel = "Buy this version";
                              let upgradePrice: number | null = null;
                              let actionToRun = () => handleBuyEdition(selectedGame.id, ed.id);

                              if (isEditionOwnedExactly) {
                                buttonLabel = "OWNERSHIP";
                              } else if (isDowngrade) {
                                buttonLabel = "ALREADY HAVE";
                              } else if (currentEditionId) {
                                // User is upgrading to a higher tier
                                const fullPrice = getEditionPriceNumber(ed.price);
                                if (currentEditionId === "update_lock") {
                                  upgradePrice = fullPrice;
                                } else {
                                  upgradePrice = Math.max(0, fullPrice - currentPaidPrice);
                                }
                                
                                priceLabel = `Compensating lift: ${formatEditionPrice(upgradePrice)}`;
                                buttonLabel = "Upgrade";
                                actionToRun = () => handleBuyEdition(selectedGame.id, ed.id, upgradePrice !== null ? upgradePrice : undefined);
                              }

                              return (
                                <div 
                                  key={ed.id}
                                  className={`bg-slate-900/60 p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                                    isEditionOwnedExactly 
                                      ? "border-emerald-500/80 bg-emerald-950/20 shadow-lg shadow-emerald-950/20" 
                                      : isDowngrade 
                                        ? "border-slate-850/50 bg-slate-950/20 opacity-60" 
                                        : "border-slate-850 hover:border-slate-700/80 hover:bg-slate-900"
                                  }`}
                                >
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className={`p-2 rounded-lg shrink-0 ${
                                      isEditionOwnedExactly 
                                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                                        : "bg-slate-950 text-slate-400 border border-slate-900"
                                    }`}>
                                      {getEditionIcon(ed.id)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h5 className="font-bold text-xs text-slate-100 truncate">{ed.name}</h5>
                                        <span className={`text-[8.5px] text-white px-1.5 py-0.25 rounded-md font-mono font-black scale-90 ${
                                          ed.id === 'complete' ? "bg-emerald-600" : ed.id === 'preorder' ? "bg-amber-500" : ed.id === 'update_lock' ? "bg-purple-600" : "bg-blue-600"
                                        }`}>
                                          {ed.badge}
                                        </span>
                                      </div>
                                      <p className="text-[10.5px] text-slate-400 leading-normal block mt-1">
                                        {ed.desc}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end shrink-0 gap-1.5">
                                    <span className="text-[11px] font-extrabold font-mono text-emerald-400 leading-none">{priceLabel}</span>
                                    {isEditionOwnedExactly ? (
                                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-[9px] px-2 py-0.5 rounded-lg flex items-center gap-1 scale-95 animate-pulse">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span>On</span>
                                      </span>
                                    ) : isDowngrade ? (
                                      <span className="bg-slate-950 border border-slate-900 text-slate-400 font-bold text-[9px] px-2 py-0.5 rounded-lg flex items-center gap-0.5 scale-95 opacity-80">
                                        <span>✓ Already have</span>
                                      </span>
                                    ) : (
                                      <button
                                        onClick={actionToRun}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[9.5px] py-1 px-3 rounded-lg transition-all scale-95 hover:scale-100 uppercase tracking-widest cursor-pointer shadow-md shadow-emerald-500/5 active:scale-95"
                                      >
                                        {buttonLabel}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* CONFLICT SOLVER & SAVE BACKUP ZONE - HIỂN THỊ NHAU TỜ MOD PANEL */}
                      {(() => {
                        const activeLicense = gameLicenses[selectedGame.id];
                        const gEditions = (selectedGame as any).editions;
                        const minEditionPrice = (Array.isArray(gEditions) && gEditions.length > 0)
                          ? Math.min(...gEditions.map((ed: any) => typeof ed.price === 'number' ? ed.price : 0))
                          : 0;
                        const isOwned = activeLicense?.owned || minEditionPrice === 0 || settings.bypassMode;

                        if (!isOwned) return null;

                        const backups = gameBackups[selectedGame.id] || [];
                        const activePlugins = activeModPlugins[selectedGame.id] || [];

                        return (
                          <div className="space-y-4">
                            
                            {/* Advanced Mods configs */}
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/70 space-y-3 font-sans">
                              <div className="flex items-center gap-2 border-b border-slate-900 pb-2 justify-between">
                                <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
                                  <Sliders className="w-4 h-4 text-emerald-400 font-bold" />
                                  Plugin and Emulator Mod
                                </span>
                                <span className="text-[9px] bg-slate-900 px-2 py-0.5 rounded-full text-emerald-400 font-mono font-bold border border-emerald-500/10">
                                  {activePlugins.length} On
                                </span>
                              </div>

                              <div className="space-y-2 max-h-[900px] overflow-y-auto pr-1 select-none scrollbar-thin scrollbar-thumb-slate-800">
                                {LAUNCHER_PLUGINS.map((pl) => {
                                  const isChecked = activePlugins.includes(pl.id);
                                  
                                  // Pick a beautiful color and custom icon for each plugin
                                  let plIcon = <Cpu className="w-4 h-4 text-slate-400" />;
                                  if (pl.id === "case_bypass") plIcon = <FolderSearch className="w-4 h-4 text-sky-400" />;
                                  if (pl.id === "fast_audio") plIcon = <Sliders className="w-4 h-4 text-teal-400" />;
                                  if (pl.id === "fps_lock") plIcon = <Clock className="w-4 h-4 text-yellow-400" />;
                                  if (pl.id === "cheat_hook") plIcon = <Terminal className="w-4 h-4 text-pink-400" />;
                                  if (pl.id === "trans_patch") plIcon = <BookOpen className="w-4 h-4 text-indigo-400" />;
                                  if (pl.id === "webgl_texture_optimize") plIcon = <ImageIcon className="w-4 h-4 text-orange-400" />;

                                  return (
                                    <div
                                      key={pl.id}
                                      onClick={() => toggleModPlugin(selectedGame.id, pl.id)}
                                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all duration-200 active:scale-[0.99] ${
                                        isChecked 
                                          ? "bg-slate-900 border-emerald-500 bg-gradient-to-r from-slate-900 via-emerald-950/10 to-emerald-950/20 shadow shadow-emerald-500/5 text-slate-100" 
                                          : "bg-slate-900/40 border-slate-900/60 hover:border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200"
                                      }`}
                                    >
                                      <div className={`p-2 rounded-lg transition-colors duration-150 ${isChecked ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-slate-950 border border-slate-900"} shrink-0`}>
                                        {plIcon}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-extrabold text-xs text-slate-200 leading-none">{pl.name}</span>
                                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                            isChecked ? "border-emerald-500 bg-emerald-500" : "border-slate-800 bg-transparent"
                                          }`}>
                                            {isChecked && <div className="w-2 h-2 bg-slate-950 rounded-full" />}
                                          </div>
                                        </div>
                                        <span className="text-[10px] text-slate-500 block leading-relaxed mt-1">{pl.desc}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* VFS Saves Manager */}
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/70 space-y-3">
                              <div className="flex items-center gap-2 pb-2 justify-between border-b border-slate-900">
                                <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
                                  <Cpu className="w-4 h-4 text-emerald-400" />
                                  VFS Snapshot Storage Management
                                </span>
                                <button
                                  onClick={() => handleCreateBackup(selectedGame.id)}
                                  className="text-[9px] bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold px-2.5 py-1 rounded-lg uppercase cursor-pointer transition"
                                >
                                  + New Snapshot
                                </button>
                              </div>

                              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                                {backups.length === 0 ? (
                                  <div className="text-center py-5 text-slate-600 text-[11px] border border-dashed border-slate-900 rounded-lg bg-slate-900/10">
                                    No VFS save snapshot has been created. Please back up your progress offline to protect your data.
                                  </div>
                                ) : (
                                  backups.map((bu) => (
                                    <div key={bu.id} className="bg-slate-900 border border-slate-850/80 p-3 rounded-xl flex items-center justify-between gap-3 text-xs text-left transition hover:border-slate-800">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-850/80">
                                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                                        </div>
                                        <div className="min-w-0">
                                          <span className="font-bold block text-slate-200 truncate leading-tight">{bu.name}</span>
                                          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono mt-0.5">
                                            <span>⏱ {bu.date}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 shrink-0">
                                        <button
                                          onClick={() => handleRestoreBackup(selectedGame.id, bu.name, bu.realPath)}
                                          className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold text-[10px] rounded-lg border border-emerald-500/20 active:scale-95 transition cursor-pointer"
                                        >
                                          Load Save
                                        </button>
                                        <button
                                          onClick={() => handleDeleteBackup(selectedGame.id, bu.id, bu.realPath)}
                                          className="p-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-500/10 hover:border-red-500/20 text-red-04 rounded-lg transition active:scale-95 cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })()}

                      {/* Conflict Solver panel */}
                      <ConflictFixerPanel
                        gameTitle={selectedGame.title}
                        gameEngine={selectedGame.engine}
                        onFixCompleted={() => {}}
                      />

                    </div>
                  ) : (
                    
                    // REVIEWS SYSTEM IN COMMUNITY TAB
                    <div className="space-y-3 text-left">
                      
                      {/* Review Score overview */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center gap-4">
                        {(() => {
                          const totalRevCount = selectedGame.gallery ? (reviewsDB[selectedGame.id]?.length || 0) : 0;
                          const posReviews = (reviewsDB[selectedGame.id] || []).filter(r => r.recommend).length;
                          let pct = totalRevCount > 0 ? Math.round((posReviews / totalRevCount) * 100) : 0;
                          let label = "No reviews yet";
                          let color = "text-slate-500";
                          if (totalRevCount > 0) {
                            if (pct >= 90) { label = "Extremely positive"; color = "text-green-400"; }
                            else if (pct >= 75) { label = "Very positive"; color = "text-emerald-400"; }
                            else if (pct >= 50) { label = "Opposite"; color = "text-amber-400"; }
                            else { label = "Not very promising"; color = "text-red-400"; }
                          }

                          return (
                            <>
                              <div className="text-3xl font-black text-slate-100 font-mono tracking-tighter shrink-0">{pct}%</div>
                              <div>
                                <h4 className={`font-black text-xs uppercase ${color}`}>{label}</h4>
                                <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Have <b>{totalRevCount}</b> reviews from the community of users who own DRM on GameLoren.</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Post review form */}
                      {(() => {
                        const activeLicense = gameLicenses[selectedGame.id];
                        const gEditions = (selectedGame as any).editions;
                        const minEditionPrice = (Array.isArray(gEditions) && gEditions.length > 0)
                          ? Math.min(...gEditions.map((ed: any) => typeof ed.price === 'number' ? ed.price : 0))
                          : 0;
                        const isOwned = activeLicense?.owned || minEditionPrice === 0 || settings.bypassMode;

                        if (!isOwned) {
                          return (
                            <div className="text-center p-5 bg-slate-950/60 rounded-xl border border-slate-900 border-dashed text-slate-500 text-[11px]">
                              You need to own a license for this game to unlock the comment feature on the Store.
                            </div>
                          );
                        }

                        return (
                          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850 space-y-2.5">
                            <div className="flex gap-2 items-center justify-between flex-wrap">
                              <span className="text-[10.5px] font-bold text-slate-200">Do you recommend playing?</span>
                              
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setReviewRecommend(true)}
                                  className={`text-[10px] font-black py-1 px-3 rounded-full border transition active:scale-95 ${
                                    reviewRecommend 
                                      ? "bg-green-500/10 border-green-500 text-green-400" 
                                      : "bg-slate-900 border-slate-800 text-slate-500"
                                  }`}
                                >
                                  Advising to Play
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewRecommend(false)}
                                  className={`text-[10px] font-black py-1 px-3 rounded-full border transition active:scale-95 ${
                                    !reviewRecommend 
                                      ? "bg-red-500/10 border-red-500 text-red-400" 
                                      : "bg-slate-900 border-slate-800 text-slate-500"
                                  }`}
                                >
                                  Terrible warning
                                </button>
                              </div>
                            </div>

                            <div className="relative">
                              <textarea
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                maxLength={500}
                                placeholder="Your actual feeling when playing on the virtual keyboard..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                                rows={2}
                              />
                              <span className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-600">{reviewText.length} / 500</span>
                            </div>

                            <div className="flex justify-between items-center">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((st) => (
                                  <button key={st} onClick={() => setReviewRating(st)} className="p-0.5">
                                    <Star className={`w-3.5 h-3.5 ${reviewRating >= st ? "fill-emerald-400 text-emerald-400" : "text-slate-700"}`} />
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() => handleSubmitReview(selectedGame.id)}
                                disabled={submittingReview}
                                className="bg-emerald-500 hover:bg-emerald-600 font-extrabold text-[10px] py-1.5 px-3.5 rounded text-slate-950 uppercase cursor-pointer"
                              >
                                {submittingReview ? "Sending..." : "Post Comment"}
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Reviews listing under Community tab */}
                      <div className="space-y-2 max-h-[20rem] overflow-y-auto pr-1 no-scrollbar">
                        {(reviewsDB[selectedGame.id] || []).length === 0 ? (
                          <div className="text-center py-10 text-slate-600 text-xs">
                            This game has no comments yet. Be the first to share your experience!
                          </div>
                        ) : (
                          (reviewsDB[selectedGame.id] || []).map((rev) => (
                            <div key={rev.id} className="bg-slate-950/40 p-3 border border-slate-850 rounded-lg flex flex-col gap-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-bold text-[10px] text-slate-300 block">{rev.email}</span>
                                  <span className="text-[8px] text-slate-500 font-mono block mt-0.5">Recorded date: {rev.createdAt}</span>
                                </div>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${
                                  rev.recommend 
                                    ? "bg-green-500/10 border border-green-500/20 text-green-400" 
                                    : "bg-red-500/10 border-red-500/20 text-red-500"
                                }`}>
                                  {rev.recommend ? "Excellent evaluation" : "Not completed"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed font-normal whitespace-pre-line">{rev.content}</p>
                              
                              <div className="flex justify-end pt-1 border-t border-slate-900/40 mt-1">
                                <button
                                  onClick={() => handleVoteReview(selectedGame.id, rev.id)}
                                  className="text-[9px] hover:text-emerald-400 text-slate-500 font-mono font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                  <span>Vote as helpful ({rev.votes})</span>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  )}

                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </main>
      </div>

      {/* FIREBASE AUTHENTICATION POPUP OVERLAY */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-left max-h-[100dvh] overflow-y-auto"
            >
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthError("");
                  setAuthSuccess("");
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-5 flex flex-col items-center">
                <h3 className="font-extrabold text-base text-white tracking-[0.15em] uppercase text-center">GameLoren Launcher</h3>
                <div className="w-8 h-1 bg-emerald-500 rounded-full mt-2"></div>
              </div>

              {/* Tabs login vs signup */}
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850 mb-4 select-none">
                <button
                  type="button"
                  onClick={() => { setAuthTab("login"); setAuthError(""); setAuthSuccess(""); }}
                  className={`py-1.5 rounded font-bold text-[10px] sm:text-xs transition ${authTab === "login" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthTab("register"); setAuthError(""); setAuthSuccess(""); }}
                  className={`py-1.5 rounded font-bold text-[10px] sm:text-xs transition ${authTab === "register" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthTab("forgot"); setAuthError(""); setAuthSuccess(""); }}
                  className={`py-1.5 rounded font-bold text-[10px] sm:text-xs transition ${authTab === "forgot" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Reset
                </button>
              </div>

              {/* Status messages alert banners */}
              {authError && (
                <div className="p-2.5 bg-red-950/40 border border-red-500/20 text-red-400 text-2xs font-bold rounded-lg mb-4 flex items-center gap-1.5">
                  <BadgeAlert className="w-4.5 h-4.5" />
                  <span>{authError}</span>
                </div>
              )}
              {authSuccess && (
                <div className="p-2.5 bg-green-950/40 border border-green-500/30 text-green-400 text-2xs font-slate-600 font-bold rounded-lg mb-4 flex items-center gap-1.5">
                  <CheckCircle className="w-4.5 h-4.5 text-green-400" />
                  <span>{authSuccess}</span>
                </div>
              )}

              {/* Native Auth Forms */}
              <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1.5">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="email@gameloren.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 pl-9 text-xs focus:outline-none focus:border-emerald-500 text-white placeholder-slate-700"
                    />
                    <Mail className="w-4 h-4 text-slate-700 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1.5 mt-2">{authTab === "forgot" ? "New Password" : "Password"}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 pl-9 pr-9 text-xs focus:outline-none focus:border-emerald-500 text-white placeholder-slate-700 font-mono"
                    />
                    <Lock className="w-4 h-4 text-slate-700 absolute left-3 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authTab === "forgot" && (
                  <div className="pt-2 border-t border-slate-800">
                     <label className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1.5 mt-2">OTP Verification Code</label>
                     <div className="flex items-center gap-2">
                       <div className="relative flex-1">
                         <input
                           type="text"
                           required={authTab === "forgot"}
                           placeholder="Enter OTP code..."
                           value={authOtp}
                           onChange={(e) => setAuthOtp(e.target.value)}
                           className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 pl-9 text-xs focus:outline-none focus:border-emerald-500 text-emerald-400 placeholder-slate-700 font-mono tracking-widest"
                         />
                         <Key className="w-4 h-4 text-slate-700 absolute left-3 top-1/2 -translate-y-1/2" />
                       </div>
                       <button
                         type="button"
                         onClick={handleRequestOTP}
                         className="px-3 md:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg shrink-0 font-bold text-xs shadow-md active:scale-95 transition"
                       >
                         Get Code
                       </button>
                     </div>
                  </div>
                )}

                {/* Secure checks and cookies remember persistence toggles */}
                <div className="flex items-center justify-between py-1 select-none">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-400">
                    <input
                      type="checkbox"
                      checked={session.rememberMe}
                      onChange={(e) => setSession(prev => ({ ...prev, rememberMe: e.target.checked }))}
                      className="accent-emerald-500"
                    />
                    <span className="text-[10px]">Remember login</span>
                  </label>
                  
                  {authTab !== "forgot" && (
                    <button
                      type="button"
                      onClick={() => { setAuthTab("forgot"); setAuthError(""); setAuthSuccess(""); }}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer transition"
                    >
                      Forgot password / Device?
                    </button>
                  )}
                </div>

                {/* Submittal Button */}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 font-bold uppercase rounded-lg text-slate-950 bg-emerald-500 hover:bg-emerald-600 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                >
                  {authLoading ? (
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{authTab === "login" ? "Permission Verification" : authTab === "register" ? "CREATE NEW ACCOUNT" : "DELETE DEVICE & RESET PASSWORD"}</span>
                  )}
                </button>
              </form>

              {/* Terms of Service Link in Footer */}
              <div className="mt-5 border-t border-slate-850 pt-4 text-[10px] text-slate-500 leading-relaxed text-center">
                Continue synonym you accept <button type="button" onClick={() => setShowTosModal(true)} className="text-emerald-400 font-bold hover:underline mb-0.5">Terms of Service</button> of Rose Team.<br />
                The system will automatically lock the account if fraud is detected.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTosModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative text-left flex flex-col max-h-[90dvh]"
            >
               <h3 className="font-extrabold text-lg text-white mb-4 text-center border-b border-slate-800 pb-3 uppercase tracking-widest">SERVICE TERMS</h3>
               
               <div className="flex-1 overflow-y-auto pr-2 pb-4 text-xs text-slate-300 leading-relaxed space-y-4 custom-scrollbar">
                  <p>Hello everyone,<br/>To improve the quality of the experience and ensure the rights of both the authors and the users, the Rose Team would like to announce:</p>
                  
                  <div>
                    <h4 className="text-emerald-400 font-bold mb-1.5 border-b border-slate-800/50 pb-1">1. CONTENT & SERVICE FEE</h4>
                    <ul className="list-disc pl-4 space-y-1.5 marker:text-slate-600">
                      <li>Rose not only provides translations but also invests in developing versions <b className="text-white">Content mods, exclusive DLC</b>.</li>
                      <li><b className="text-white">The cost includes:</b> Copyright fees paid to the author (for paid games) and Rose's development maintenance fees.</li>
                      <li><b className="text-white">Multi-platform:</b> Supports smooth parallel play on both PC and Android with the same account.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-emerald-400 font-bold mb-1.5 border-b border-slate-800/50 pb-1">2. SECURITY & COPYRIGHT</h4>
                    <ul className="list-disc pl-4 space-y-1.5 marker:text-slate-600">
                      <li><b className="text-white">Automatic Ban system:</b> Any act of intentionally bypassing barriers or modifying files to crack the game will be permanently banned by the system immediately.</li>
                      <li><b className="text-white">Blacklist (Black list):</b> Violating devices will be recorded. If you intentionally create a new account, you will be placed in "isolation mode" (unable to update to the new version).</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-emerald-400 font-bold mb-1.5 border-b border-slate-800/50 pb-1">3. USER OPTIONS</h4>
                    <p className="mb-1.5">Rose understands that currently there are many AI translation tools and other translation groups. You are completely entitled to choose the method of approaching the game that suits your financial capability (purchasing the original license, translating it yourself...).</p>
                    <p>Rose focuses on providing <b className="text-white">Translation + Mod</b> For those who want the most complete experience. For those in difficult circumstances but still passionate, Rose always has discount policies to support.</p>
                  </div>

                  <div>
                    <h4 className="text-emerald-400 font-bold mb-1.5 border-b border-slate-800/50 pb-1">4. NOTES TO AVOID ACCOUNT LOCKING</h4>
                    <ul className="list-disc pl-4 space-y-1.5 marker:text-slate-600">
                      <li><span className="text-emerald-400 mr-1">✅</span> <b className="text-white">BE:</b> Regular player (Download {`->`} Extract {`->`} Experience).</li>
                      <li><span className="text-red-400 mr-1">❌</span> <b className="text-white">SHOULD NOT:</b> Copy files from another version, edit the code, or share unlawfully.</li>
                      <li><span className="text-red-400 mr-1">❌</span> <b className="text-white">DO NOT USE MTool:</b> Deep intervention tools will trigger the anti-crack system. Rose has it integrated. <b className="text-white">Cheat Menu</b> exclusive in the game so you can comfortably experience it.</li>
                    </ul>
                  </div>

                  <p className="pt-2 text-center italic text-slate-400 text-[11px] border-t border-slate-800">
                     🙏 Your support is the only source of income for us to pay the copyright fees to the authors on behalf of everyone. Sincerely!
                  </p>
               </div>
               
               <div className="mt-4 pt-4 border-t border-slate-800 flex justify-center">
                 <button
                    onClick={() => setShowTosModal(false)}
                    className="w-full sm:w-auto px-8 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition"
                 >
                    Understood and Go Back
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GAME DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingGame && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-left"
            >
              <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                <span>Confirm Game Deletion</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Are you sure you want to delete the game <span className="font-bold text-white">"{deletingGame.title}"</span> removed from your system library? Any shortcuts or links will be deleted.
              </p>

              <div className="flex items-center gap-2 mb-6 p-3 bg-red-950/20 border border-red-900/30 rounded-lg">
                <input 
                  type="checkbox" 
                  id="deleteDiskFiles" 
                  className="accent-red-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="deleteDiskFiles" className="text-xs text-red-200 cursor-pointer font-medium select-none">
                  Also delete the original downloaded content from the drive (Permanently delete)
                </label>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeletingGame(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const cb = document.getElementById('deleteDiskFiles') as HTMLInputElement;
                    const willDeleteDisk = cb?.checked || false;
                    performUninstall(deletingGame, willDeleteDisk);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition font-bold text-xs shadow-lg shadow-red-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Agree to Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INTUITIVE EMULATOR VIRTUAL PLAYER DISPLAY */}
      <AnimatePresence>
        {activePlayGame && (
          <VirtualPlayer
            game={activePlayGame}
            settings={settings}
            activeMods={isModdedSession ? (activeModPlugins[activePlayGame.id] || []) : []}
            onExit={() => { setActivePlayGame(null); setIsModdedSession(false); }}
          />
        )}
      </AnimatePresence>

      {/* Beautiful Toast Alert System overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-55 max-w-xs sm:max-w-sm w-[calc(100%-3rem)] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 shadow-2xl flex items-start gap-3"
            id="gameloren-toast"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 mt-1.5" />
            <div className="flex-1 space-y-0.5">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                {toast.type === "success" ? "⚡ SUCCESS" : toast.type === "warning" ? "⚠ WARNING" : toast.type === "error" ? "❌ SYSTEM ERROR" : "ℹ INFORMATION"}
              </p>
              <p className="text-[11px] text-slate-200 leading-relaxed font-semibold">
                {toast.message}
              </p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-slate-500 hover:text-slate-350 text-[9px] font-bold p-1 bg-slate-950/40 rounded hover:bg-slate-950 transition shrink-0"
              title="Close notification"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}