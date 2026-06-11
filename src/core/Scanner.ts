import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import type { RPGGame } from '../types';

export interface ScanOptions {
  baseDirectory: Directory;
  basePath: string;
  maxDepth?: number;
}

/**
 * Core module: Local Game Scanner System
 * Recursively scans local storage for RPG Maker MV/MZ projects.
 * Identifies games via `package.json` or engine-specific folders like `www/data/`.
 */
export class GameScanner {
  /**
   * Scans a target directory recursively and returns all found RPG Maker games.
   *
   * @param options Scan constraints including start path and max depth.
   * @returns Array of metadata objects ready to be registered in the launcher state.
   */
  static async scanForGames(options: ScanOptions): Promise<RPGGame[]> {
    const foundGames: RPGGame[] = [];
    const maxDepth = options.maxDepth ?? 5; // Prevent infinitely deep scanning

    await this._scanRecursive(
      options.baseDirectory,
      options.basePath,
      maxDepth,
      0,
      foundGames
    );

    return foundGames;
  }

  private static async _scanRecursive(
    directory: Directory,
    path: string,
    maxDepth: number,
    currentDepth: number,
    results: RPGGame[]
  ): Promise<void> {
    if (currentDepth > maxDepth) return;

    try {
      // Normalize path to prevent empty string issues
      const normalizedPath = path === '' ? '' : path.replace(/^\/+|\/+$/g, '');
      
      const dirContents = await Filesystem.readdir({
        directory,
        path: normalizedPath,
      });

      let hasPackageJson = false;
      let hasWwwDir = false;
      let hasDataDir = false;

      for (const file of dirContents.files) {
        if (file.type === 'file' && file.name === 'package.json') {
          hasPackageJson = true;
        } else if (file.type === 'directory' && file.name === 'www') {
          hasWwwDir = true;
        } else if (file.type === 'directory' && file.name === 'data') {
          hasDataDir = true;
        }
      }

      // Heuristic: A game root usually contains either a package.json, or a www folder, or a data folder natively.
      const isGameDir = hasPackageJson || hasWwwDir || hasDataDir;

      if (isGameDir) {
        const gameMeta = await this.extractGameMetadata(directory, normalizedPath, hasWwwDir);
        if (gameMeta) {
          results.push(gameMeta);
        }
        // Stop recursing into game data folders to improve performance
        return;
      }

      // Recurse deeper if no game was found here
      for (const file of dirContents.files) {
        if (file.type === 'directory') {
          // Skip common non-game folders
          if (['Android', 'DCIM', 'Alarms', 'Movies', 'Music', 'Notifications', 'Pictures', 'Podcasts', 'Ringtones'].includes(file.name)) {
             continue;
          }

          const nextPath = normalizedPath === '' ? file.name : `${normalizedPath}/${file.name}`;
          await this._scanRecursive(directory, nextPath, maxDepth, currentDepth + 1, results);
        }
      }
    } catch (error) {
      console.warn(`[Scanner] Permission denied or failed to read dir: ${path}`, error);
    }
  }

  private static async extractGameMetadata(
    directory: Directory,
    path: string,
    hasWww: boolean
  ): Promise<RPGGame | null> {
    try {
      let title = path.split('/').pop() || 'Unknown Game';
      let version = '1.0.0';
      let engine: 'MV' | 'MZ' = 'MV';

      // 1. Try to parse package.json if it exists
      try {
        const pkgResult = await Filesystem.readFile({
          directory,
          path: `${path}/package.json`,
          encoding: Encoding.UTF8,
        });
        const pkgData = typeof pkgResult.data === 'string' ? JSON.parse(pkgResult.data) : null;
        if (pkgData) {
          if (pkgData.name) title = pkgData.name;
          if (pkgData.version) version = pkgData.version;
        }
      } catch (e) {
        // Ignored
      }

      // 2. Identify Engine Version (MV vs MZ)
      // MZ games usually have 'rmmz_core.js' in their js folder.
      const jsPath = hasWww ? `${path}/www/js` : `${path}/js`;
      try {
        const jsDir = await Filesystem.readdir({ directory, path: jsPath });
        if (jsDir.files.some(f => f.name === 'rmmz_core.js')) {
          engine = 'MZ';
        }
      } catch (e) {
        // Ignored, defaults to MV
      }

      // Prepare metadata mapping for Launcher state
      return {
        id: `local_scan_${Math.random().toString(36).substring(2, 10)}`,
        title,
        engine,
        version,
        cover: '/assets/placeholder-cover.jpg', // Should be extracted from game files if possible
        desc: `Local game automatically scanned and registered from device storage.`,
        size: 'Local',
        dev: 'Unknown Local Developer',
        releaseDate: new Date().toISOString(),
        tags: ['Local', engine],
        isLinked: false,
        localPath: path,
        platform: 'android' // Default assumption for Capacitor
      };
    } catch (e) {
      console.error(`[Scanner] Failed to construct metadata for ${path}`, e);
      return null;
    }
  }
}
