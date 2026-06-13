import { Filesystem, Directory, PermissionStatus } from '@capacitor/filesystem';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Capacitor } from '@capacitor/core';
import { HttpServer } from '@cantoo/capacitor-http-server';

export interface GameInfo {
  absolutePath: string;
  name: string;
}

export class LauncherEngine {
  /**
   * 1. Explicit Scoped Storage Scan
   * Implements runtime checkPermissions() and requestPermissions().
   * Deep-scans physical device root directories recursively for RPG Maker signature structures.
   */
  public async scanForGames(): Promise<GameInfo[]> {
    // 4. Device Wake State Lifecycles: programmatically chain at exact moment
    await KeepAwake.keepAwake();
    try {
      // Runtime check and request permissions
      let status: PermissionStatus = await Filesystem.checkPermissions();
      if (status.publicStorage !== 'granted') {
        status = await Filesystem.requestPermissions();
        if (status.publicStorage !== 'granted') {
          throw new Error('Storage permission denied by user.');
        }
      }

      const foundGames: GameInfo[] = [];

      // Deep-scan physical device root directories
      await this.recursiveScan(Directory.Documents, '', foundGames);
      await this.recursiveScan(Directory.External, '', foundGames);

      return foundGames;
    } finally {
      // Cleanly invoke allowSleep the moment file search ends
      await KeepAwake.allowSleep();
    }
  }

  /**
   * True recursive loop checking folder structures
   */
  private async recursiveScan(directory: Directory, path: string, foundGames: GameInfo[]): Promise<void> {
    try {
      const result = await Filesystem.readdir({ directory, path });
      
      let hasIndexHtml = false;
      let hasPackageJson = false;
      let hasDataFolder = false;
      let hasWwwFolder = false;

      // Check explicit presence of RPG Maker signature structures
      for (const file of result.files) {
        if (file.type === 'file') {
          if (file.name === 'index.html') hasIndexHtml = true;
          if (file.name === 'package.json') hasPackageJson = true;
        } else if (file.type === 'directory') {
          if (file.name === 'data') hasDataFolder = true;
          if (file.name === 'www') hasWwwFolder = true;
        }
      }

      // index.html combined with either package.json, a data/ folder, or www/ directory
      if (hasIndexHtml && (hasPackageJson || hasDataFolder || hasWwwFolder)) {
        // Resolve absolute local file path of the selected game folder
        const stat = await Filesystem.stat({ directory, path: path || '/' });
        
        // Remove file:// prefix if present to get exact absolute local file path
        let absolutePath = stat.uri;
        if (absolutePath.startsWith('file://')) {
          absolutePath = absolutePath.replace('file://', '');
        }

        foundGames.push({
          absolutePath,
          name: path.split('/').pop() || 'Unknown RPG Game',
        });
        
        // Stop recursing further inside the game directory
        return;
      }

      // Recurse into subdirectories
      for (const file of result.files) {
        if (file.type === 'directory') {
          // Skip known non-game heavy system folders to optimize scan
          if (['Android', 'DCIM', 'Movies', 'Music', 'Pictures'].includes(file.name) && path === '') {
            continue;
          }
          const nextPath = path ? `${path}/${file.name}` : file.name;
          await this.recursiveScan(directory, nextPath, foundGames);
        }
      }
    } catch (e) {
      // Silently ignore directories that cannot be read (e.g. strict system permissions)
    }
  }

  /**
   * 2. Background Local HTTP Server Bridge & CORS Bypass
   */
  public async startGameSession(absoluteGamePath: string): Promise<string> {
    // Initialization script for the local HTTP Server
    if (!Capacitor.isNativePlatform()) {
      console.warn('CapacitorHttpServer plugin is typically only available on native platforms.');
    }

    // Programmatically chain KeepAwake at the exact moment active game session is initialized
    await KeepAwake.keepAwake();

    const port = 8080;

    // Start the server with just the port
    await HttpServer.start({ port });

    // The @cantoo/capacitor-http-server plugin does not natively take a 'webroot' parameter.
    // Instead, we manually bind the incoming HTTP requests to our exact absolute local file path.
    await HttpServer.addListener('request', async (event) => {
      try {
        const requestPath = event.path === '/' ? '/index.html' : event.path;
        
        // Dynamically bind to the exact absolute local file path found during the storage sweep
        const filePath = `${absoluteGamePath}${requestPath}`;
        
        await HttpServer.respond({
          requestId: event.requestId,
          status: 200,
          bodyFilePath: filePath
        });
      } catch (err) {
        await HttpServer.respond({
          requestId: event.requestId,
          status: 404,
          bodyText: 'File Not Found'
        });
      }
    });

    // Bind to port 8080 so local resource paths handle content delivery smoothly to bypass CORS
    return `http://localhost:${port}/`;
  }

  /**
   * Terminates the game session and cleans up resources
   */
  public async terminateGameSession(): Promise<void> {
    try {
      await HttpServer.stop();
    } catch (e) {
      console.warn('Failed to stop game server', e);
    }
    
    // Cleanly invoke allowSleep the moment the game instance is terminated
    await KeepAwake.allowSleep();
  }

  /**
   * 3. VFS Mock & Dynamic IFrame Runtime Script Injector
   * Virtual File System bridging layer.
   * Extracts the document context from the running iframe window and appends a script.
   */
  public injectRuntimeScript(iframe: HTMLIFrameElement, scriptContent: string): void {
    // Extract document context from the running iframe window
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!iframeDocument) {
      console.error('Failed to extract document context from the iframe.');
      return;
    }

    // Append newly created script node directly into the iframe's DOM head context
    const scriptNode = iframeDocument.createElement('script');
    scriptNode.type = 'text/javascript';
    scriptNode.textContent = scriptContent;

    const headContext = iframeDocument.head || iframeDocument.documentElement;
    headContext.appendChild(scriptNode);
  }


// React UI Layer Compatibility Aliases
  public async scanForLocalGames(): Promise<GameInfo[]> { return this.scanForGames(); }
  public async launchGame(game: { absolutePath: string }): Promise<string> { return this.startGameSession(game.absolutePath); }
  public async stopCurrentGame(): Promise<void> { return this.terminateGameSession(); }
}

export const launcherEngine = new LauncherEngine();
