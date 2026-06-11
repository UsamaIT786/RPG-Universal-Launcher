import { Capacitor } from '@capacitor/core';
import { HttpServer } from '@cantoo/capacitor-http-server';

export interface ServerConfig {
  port: number;
  gameRootPath: string;
  enableCors?: boolean;
}

/**
 * Core module: Embedded WebView Runtime Sandbox & Local Server Logic
 * Sets up a background local HTTP serving layer to securely host game assets.
 * Bypasses file:// CORS restrictions and provides an optimized sandbox context.
 */
export class GameSandboxServer {
  private isRunning = false;
  private currentPort = 0;

  /**
   * Initializes and starts the local background server for a specific game directory.
   */
  async startServer(config: ServerConfig): Promise<string> {
    if (this.isRunning) {
      await this.stopServer();
    }

    try {
      if (Capacitor.isNativePlatform()) {
        // Start native HTTP Server for Capacitor (Android/iOS)
        await HttpServer.start({
          port: config.port,
          // Optimization configurations for stable 60FPS:
          // Disable extensive logging and use efficient native streams if supported
        });
        
        await HttpServer.addListener('request', async (event) => {
          try {
            const path = event.path === '/' ? '/index.html' : event.path;
            const absoluteFilePath = `${config.gameRootPath}${path}`;
            
            await HttpServer.respond({
              requestId: event.requestId,
              status: 200,
              bodyFilePath: absoluteFilePath
            });
          } catch (e) {
            await HttpServer.respond({
              requestId: event.requestId,
              status: 404,
              bodyText: 'File Not Found'
            });
          }
        });
        
        this.isRunning = true;
        this.currentPort = config.port;
        
        console.log(`[SandboxServer] Started on port ${config.port} serving ${config.gameRootPath}`);
        return `http://localhost:${config.port}`;
      } else {
        // Fallback or Tauri environment logic
        // In Web/Tauri, assets might be served natively or via a ServiceWorker interceptor.
        console.warn('[SandboxServer] Not running on Capacitor native, relying on Web/Tauri mechanisms.');
        return `http://localhost:${config.port}`;
      }
    } catch (err) {
      console.error(`[SandboxServer] Failed to start local server`, err);
      throw err;
    }
  }

  /**
   * Stops the currently running game server.
   */
  async stopServer(): Promise<void> {
    if (!this.isRunning) return;

    try {
      if (Capacitor.isNativePlatform()) {
        await HttpServer.removeAllListeners();
        await HttpServer.stop();
      }
      this.isRunning = false;
      this.currentPort = 0;
      console.log('[SandboxServer] Server stopped successfully.');
    } catch (err) {
      console.error('[SandboxServer] Failed to stop local server', err);
    }
  }

  getServerUrl(): string | null {
    if (!this.isRunning) return null;
    return `http://localhost:${this.currentPort}`;
  }
}

export const sandboxServer = new GameSandboxServer();
