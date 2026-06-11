import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

declare global {
  interface XMLHttpRequest {
    _vfs_method?: string;
    _vfs_url?: string;
    _vfs_async?: boolean;
    _vfs_user?: string;
    _vfs_password?: string;
    _vfs_originalOpenArgs?: IArguments;
  }
}

export interface VFSConfig {
  gameRootUrl: string; // The local HTTP server URL serving the game
  modRootPath: string; // The local path to the mods directory
}

/**
 * Core module: Virtual File System (VFS) & Mod Override System
 * Intercepts asset requests from the WebView runtime.
 * Implements a resolution hierarchy: checks '/Mods' directory first,
 * seamlessly serving the override if present, otherwise falls back to the original.
 */
export class VirtualFileSystem {
  private config: VFSConfig | null = null;
  private isInitialized = false;

  /**
   * Initializes the VFS layer and injects interceptors into the global fetch/XHR.
   * Note: In a production sandbox, this logic is often injected as a preload script
   * into the game's iframe/webview context.
   */
  init(config: VFSConfig) {
    this.config = config;
    if (this.isInitialized) return;
    
    this.patchFetch();
    this.patchXHR();
    this.isInitialized = true;
    console.log('[VFS] Virtual File System initialized with mod path:', config.modRootPath);
  }

  /**
   * Resolves a URL to a potentially modded URL or native file path.
   * If the file exists in the mod directory, it returns the modded path/URL.
   * Otherwise, it returns the original URL.
   */
  private async resolveAssetUrl(originalUrl: string): Promise<string> {
    if (!this.config) return originalUrl;
    
    // Only intercept requests directed to our local game server
    if (!originalUrl.startsWith(this.config.gameRootUrl) && !originalUrl.startsWith('/')) {
      return originalUrl;
    }

    try {
      // Extract the relative path from the request URL
      const urlObj = new URL(originalUrl, window.location.origin);
      let relativePath = urlObj.pathname;
      if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);

      // We only want to intercept game assets, generally within common folders
      const interceptable = ['img', 'audio', 'data', 'fonts', 'movies', 'js', 'maps'].some(folder => relativePath.includes(folder));
      if (!interceptable) return originalUrl;

      // Construct path to check in the Mods directory
      const modFilePath = `${this.config.modRootPath}/${relativePath}`;

      // Check if file exists in the mod directory
      try {
        const stat = await Filesystem.stat({ path: modFilePath });
        if (stat && stat.type === 'file') {
          console.debug(`[VFS] Mod override applied for: ${relativePath}`);
          // Use Capacitor's custom scheme or convert file path to native local URL
          // Convert internal file path to web-accessible URL
          return Capacitor.convertFileSrc(stat.uri);
        }
      } catch (e) {
        // File does not exist in mods directory, fallback to original
      }

    } catch (e) {
      console.error('[VFS] Error resolving asset URL:', e);
    }

    // Fallback to original
    return originalUrl;
  }

  /**
   * Monkey-patches the global window.fetch to route through our VFS resolver.
   */
  private patchFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      let urlStr = '';
      if (typeof input === 'string') {
        urlStr = input;
      } else if (input instanceof URL) {
        urlStr = input.toString();
      } else if (input instanceof Request) {
        urlStr = input.url;
      }

      if (urlStr) {
        const resolvedUrl = await this.resolveAssetUrl(urlStr);
        if (input instanceof Request) {
          input = new Request(resolvedUrl, input);
        } else {
          input = resolvedUrl;
        }
      }
      return originalFetch(input, init);
    };
  }

  /**
   * Monkey-patches the global window.XMLHttpRequest to route through our VFS resolver.
   */
  private patchXHR() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const self = this;

    // @ts-ignore
    XMLHttpRequest.prototype.open = function(
      method: string,
      url: string | URL,
      async?: boolean,
      user?: string,
      password?: string
    ) {
      const urlStr = typeof url === 'string' ? url : url.toString();
      
      // We must store the original arguments and call the original open
      // AFTER we resolve the URL asynchronously.
      // However, XHR.open is synchronous. If we must resolve asynchronously,
      // we have to intercept send() instead, or block (which is impossible in modern browsers).
      // Since File System checks are async, we hook into send() to delay execution.
      
      this._vfs_method = method;
      this._vfs_url = urlStr;
      this._vfs_async = async !== false; // default true
      this._vfs_user = user;
      this._vfs_password = password;
      this._vfs_originalOpenArgs = arguments;
      
      // We don't call original open here. We wait for send()
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
      if (this._vfs_url) {
        self.resolveAssetUrl(this._vfs_url).then(resolvedUrl => {
          // Now call original open with the resolved URL
          originalOpen.call(
            this,
            this._vfs_method || 'GET',
            resolvedUrl,
            this._vfs_async ?? true,
            this._vfs_user,
            this._vfs_password
          );
          originalSend.call(this, body);
        }).catch(err => {
          console.error('[VFS] XHR Intercept failed', err);
          if (this._vfs_originalOpenArgs) {
            originalOpen.apply(this, this._vfs_originalOpenArgs as any);
          }
          originalSend.call(this, body);
        });
      } else {
        originalSend.call(this, body);
      }
    };
  }
}

export const vfs = new VirtualFileSystem();
