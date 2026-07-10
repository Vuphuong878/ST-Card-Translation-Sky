import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import http from "http";

// Memory storage for the active dynamic server
interface LiveServerStatus {
  isRunning: boolean;
  folderName: string;
  port: number;
  url: string;
}

let activeServer: http.Server | null = null;
let currentStatus: LiveServerStatus = {
  isRunning: false,
  folderName: "",
  port: 8086,
  url: "",
};

// Map file extensions to correct standard MIME types
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
};

const CRAWLS_ROOT = path.resolve("d:/Documents/GitHub/ST-Card-Translation-Sky/workspace/crawls");

export async function GET(req: NextRequest) {
  try {
    // List all folder names inside the crawls directory
    let folders: string[] = [];
    if (fs.existsSync(CRAWLS_ROOT)) {
      folders = fs.readdirSync(CRAWLS_ROOT).filter((file) => {
        const fullPath = path.join(CRAWLS_ROOT, file);
        return fs.statSync(fullPath).isDirectory();
      });
    }

    return NextResponse.json({
      folders,
      status: currentStatus,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, folderName } = body;

    if (action === "start") {
      if (!folderName) {
        return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
      }

      const targetPath = path.join(CRAWLS_ROOT, folderName);
      if (!fs.existsSync(targetPath)) {
        return NextResponse.json({ error: "Target crawl folder does not exist" }, { status: 404 });
      }

      // If a server is already running, shut it down first
      if (activeServer) {
        await stopActiveServer();
      }

      const port = 8086;
      const url = `http://localhost:${port}`;

      // Initialize Node's native HTTP server
      activeServer = http.createServer((request, response) => {
        // Enforce CORS so requests can be proxied easily if needed
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "*");

        if (request.method === "OPTIONS") {
          response.writeHead(200);
          response.end();
          return;
        }

        // Parse path name safely
        const rawUrl = request.url || "/";
        const parsedPath = new URL(rawUrl, url).pathname;
        let filePath = path.join(targetPath, decodeURIComponent(parsedPath));

        // Serve index.html if pointing to directory roots
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, "index.html");
        }

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          // Serve index.html for Single Page Applications (SPA) fallback
          const rootIndex = path.join(targetPath, "index.html");
          if (fs.existsSync(rootIndex)) {
            filePath = rootIndex;
          } else {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("404 Not Found");
            return;
          }
        }

        // Read and output the static asset
        try {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || "application/octet-stream";
          const fileBuffer = fs.readFileSync(filePath);

          response.writeHead(200, { "Content-Type": contentType });
          response.end(fileBuffer);
        } catch (e: any) {
          response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          response.end(`Server Error: ${e.message}`);
        }
      });

      // Listen on designated port
      await new Promise<void>((resolve, reject) => {
        activeServer!.listen(port, () => {
          resolve();
        });
        activeServer!.on("error", (err) => {
          reject(err);
        });
      });

      currentStatus = {
        isRunning: true,
        folderName,
        port,
        url,
      };

      return NextResponse.json({ success: true, status: currentStatus });
    }

    if (action === "stop") {
      await stopActiveServer();
      return NextResponse.json({ success: true, status: currentStatus });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Safely close the active server connection
async function stopActiveServer(): Promise<void> {
  return new Promise((resolve) => {
    if (activeServer) {
      activeServer.close(() => {
        activeServer = null;
        currentStatus = {
          isRunning: false,
          folderName: "",
          port: 8086,
          url: "",
        };
        resolve();
      });
    } else {
      resolve();
    }
  });
}
