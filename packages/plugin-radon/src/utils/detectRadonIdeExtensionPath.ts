import fs from "node:fs";
import path from "node:path";

export function detectRadonIdeExtensionPath(): string | undefined {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      return undefined;
    }
  
    // Check VSCode extensions
    const vscodeExtPath = path.join(homeDir, '.vscode', 'extensions');
    
    // Check Cursor extensions
    const cursorExtPaths = path.join(homeDir, '.cursor', 'extensions')
  
    const searchPaths = [vscodeExtPath, cursorExtPaths];
  
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        const entries = fs.readdirSync(searchPath);
        // Match exact version: swmansion.react-native-ide-1.14.2-{platform}
        const radonFolder = entries.find((entry) => /^swmansion\.react-native-ide-1\.14\.2-.+$/.test(entry));
        if (radonFolder) {
          const fullPath = path.join(searchPath, radonFolder);
          console.log(`[Radon] Found extension at: ${fullPath}`);
          return fullPath;
        }
      }
    }
  
    console.warn('[Radon] Extension not found');
    return undefined;
  }