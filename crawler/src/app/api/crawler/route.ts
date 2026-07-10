import { NextRequest, NextResponse } from "next/server";
import { getEventBus } from "../engine";
import fs from "fs";
import path from "path";
import { URL } from "url";

// Shared state for the background crawling process
interface CrawlStatus {
  isCrawling: boolean;
  origin: string;
  outDir: string;
  downloaded: number;
  failed: number;
  queued: number;
  presetOk: number;
  presetFailed: number;
  status: "idle" | "running" | "completed" | "failed";
  error?: string;
}

let activeCrawl: CrawlStatus = {
  isCrawling: false,
  origin: "",
  outDir: "",
  downloaded: 0,
  failed: 0,
  queued: 0,
  presetOk: 0,
  presetFailed: 0,
  status: "idle",
};

export async function GET(req: NextRequest) {
  return NextResponse.json(activeCrawl);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, allowedPrefixes = [], enableR2Presets = true } = body;

    if (!url) {
      return NextResponse.json({ error: "Missing target URL" }, { status: 400 });
    }

    if (activeCrawl.isCrawling) {
      return NextResponse.json({ error: "Another crawl job is already running" }, { status: 409 });
    }

    const eventBus = getEventBus();

    // Parse domain and resolve clean directory path in workspace
    const parsedUrl = new URL(url);
    const origin = parsedUrl.origin;
    const domain = parsedUrl.hostname;
    const workspaceRoot = "d:/Documents/GitHub/ST-Card-Translation-Sky";
    const outDir = path.join(workspaceRoot, "workspace", "crawls", domain);

    // Initialize state
    activeCrawl = {
      isCrawling: true,
      origin,
      outDir,
      downloaded: 0,
      failed: 0,
      queued: 1,
      presetOk: 0,
      presetFailed: 0,
      status: "running",
    };

    // Run the crawl asynchronously in the background
    runCrawlBackground(origin, outDir, allowedPrefixes, enableR2Presets, eventBus).catch(err => {
      eventBus.emit("log", { level: "error", message: `[CRAWLER] Fatal crash: ${err.message}` });
      activeCrawl.isCrawling = false;
      activeCrawl.status = "failed";
      activeCrawl.error = err.message;
    });

    return NextResponse.json({ success: true, outDir });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function runCrawlBackground(
  origin: string,
  outDir: string,
  allowedPrefixes: string[],
  enableR2Presets: boolean,
  eventBus: any
) {
  eventBus.emit("log", { level: "info", message: `[CRAWLER] Starting recursive crawl for: ${origin}` });
  eventBus.emit("log", { level: "info", message: `[CRAWLER] Saving files to workspace directory: ${outDir}` });

  // 1. Clean and setup output folder
  try {
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });
  } catch (e: any) {
    eventBus.emit("log", { level: "error", message: `[CRAWLER] Directory setup failed: ${e.message}` });
    throw e;
  }

  const seen = new Set<string>();
  const queued = new Set<string>(["/"]);
  const queue: string[] = ["/"];
  const downloadedRecords: any[] = [];
  const skippedHtmlFallback: any[] = [];
  const failedRecords: any[] = [];

  function badTemplate(s: string) {
    return /[$`{}<>]/.test(s) || /\$%7B/i.test(s);
  }

  function normalizePath(urlLike: string, basePath = "/") {
    if (!urlLike || badTemplate(urlLike)) return null;
    let raw = urlLike.trim();
    if (/^(assets|fonts|textures|art|r2-presets)\//.test(raw)) {
      raw = "/" + raw;
    }
    try {
      const u = new URL(raw, origin + basePath);
      if (u.origin !== origin) return null;
      u.hash = "";
      const decodedPath = decodeURIComponent(u.pathname);
      if (badTemplate(decodedPath)) return null;
      return u.pathname + u.search;
    } catch {
      return null;
    }
  }

  function cleanFilePath(pathname: string) {
    let name = decodeURIComponent(pathname.split("?")[0]);
    if (name === "/") name = "/index.html";
    name = name.replace(/^\/+/, "");
    if (name.endsWith("/")) name += "index.html";
    return path.join(outDir, ...name.split("/"));
  }

  function shouldFetch(p: string) {
    const pathname = p.split("?")[0];
    if (pathname === "/") return true;
    if (allowedPrefixes.length === 0) return true; // Default behavior
    return allowedPrefixes.some(prefix => pathname.startsWith(prefix));
  }

  function enqueueUrl(u: string, basePath: string) {
    const p = normalizePath(u.replace(/&amp;/g, "&"), basePath);
    if (!p || !shouldFetch(p) || seen.has(p) || queued.has(p)) return;
    queued.add(p);
    queue.push(p);
    activeCrawl.queued = queue.length;
  }

  function extractUrls(text: string, basePath: string) {
    for (const re of [
      /(?:src|href|poster)\s*=\s*["'`]([^"'`]+)["'`]/g,
      /url\(\s*["'`]?([^"')`]+)["'`]?\s*\)/g,
      /@import\s+["'`]([^"'`]+)["'`]/g,
      /(?:import|from)\s*["'`]([^"'`]+)["'`]/g,
      /\bimport\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
      /\bimport\s*\(\s*(?:\/\*[\s\S]*?\*\/)?\s*["'`]([^"'`]+)["'`]\s*\)/g,
      /\bnew\s+URL\(\s*["'`]([^"'`]+)["'`]\s*,\s*import\.meta\.url\s*\)/g,
      /\bnew\s+(?:Shared)?Worker\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
      /\bimportScripts\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
      /\.setAttribute\(\s*["'`](?:src|href|poster)["'`]\s*,\s*["'`]([^"'`]+)["'`]\s*\)/g,
      /\bfetch\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
    ]) {
      let m;
      while ((m = re.exec(text))) {
        enqueueUrl(m[1], basePath);
      }
    }
    const stringPath = /["'`]((?:\.\.\/|\.\/|\/)?(assets|fonts|textures|art|r2-presets)\/[^"'`\s<>\\)]+\.(?:js|css|json|png|jpg|jpeg|webp|svg|gif|woff2?|ttf|mp3|ogg|wav|mp4|gz)(?:\?[^"'`\s<>\\)]*)?)["'`]/g;
    let m;
    while ((m = stringPath.exec(text))) {
      enqueueUrl(m[1], basePath);
    }
  }

  // Loop through download queue
  for (let idx = 0; idx < queue.length; idx++) {
    const item = queue[idx];
    if (seen.has(item)) continue;
    seen.add(item);

    const url = origin + item;
    eventBus.emit("log", { level: "info", message: `[CRAWLER] Fetching: ${item} (Queue: ${idx + 1}/${queue.length})` });

    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "Codex-Upstream-Crawler/1.2" },
      });

      if (!res.ok) {
        failedRecords.push({ url, status: res.status });
        activeCrawl.failed++;
        eventBus.emit("log", { level: "warn", message: `[CRAWLER] [FAIL] HTTP ${res.status}: ${item}` });
        continue;
      }

      const type = res.headers.get("content-type") || "";
      const pathname = item.split("?")[0];

      if (pathname !== "/" && /text\/html/i.test(type) && !/\.html?$/.test(pathname)) {
        skippedHtmlFallback.push({ url, type });
        eventBus.emit("log", { level: "info", message: `[CRAWLER] [SKIP HTML FALLBACK]: ${item}` });
        continue;
      }

      const buf = Buffer.from(await res.arrayBuffer());
      const target = cleanFilePath(pathname);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buf);

      downloadedRecords.push({ path: pathname, bytes: buf.length, type });
      activeCrawl.downloaded++;

      eventBus.emit("log", { level: "info", message: `[CRAWLER] [SUCCESS] Saved (${buf.length} bytes): ${pathname}` });

      if (/text|javascript|json|svg|css|html|xml/.test(type) || /\.(?:html|js|css|json|svg|txt|xml)$/.test(pathname)) {
        extractUrls(buf.toString("utf8"), pathname);
      }
    } catch (error: any) {
      const msg = error.message || String(error);
      failedRecords.push({ url, error: msg });
      activeCrawl.failed++;
      eventBus.emit("log", { level: "error", message: `[CRAWLER] [ERROR]: ${item} -> ${msg}` });
    }
  }

  // 2. Parse R2 manifest if enabled and file exists
  let presetOk = 0;
  const presetFailed: any[] = [];
  const manifestPath = path.join(outDir, "r2-presets", "manifest.json");

  if (enableR2Presets && fs.existsSync(manifestPath)) {
    eventBus.emit("log", { level: "info", message: "[CRAWLER] Parsing R2 Presets manifest..." });
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, ""));
      const paths = new Set<string>();

      function walk(x: any) {
        if (!x || typeof x !== "object") return;
        if (typeof x.path === "string") paths.add(x.path);
        for (const v of Object.values(x)) walk(v);
      }

      walk(manifest);
      eventBus.emit("log", { level: "info", message: `[CRAWLER] Found ${paths.size} preset assets to download.` });

      for (const rel of Array.from(paths).sort()) {
        if (badTemplate(rel)) continue;
        const presetUrl = origin + "/r2-presets/" + encodeURI(rel).replace(/%2F/g, "/");
        eventBus.emit("log", { level: "info", message: `[CRAWLER] Fetching Preset: ${rel}` });

        try {
          const res = await fetch(presetUrl, { headers: { "user-agent": "Codex-Upstream-Crawler/1.2" } });
          if (!res.ok) {
            presetFailed.push({ rel, status: res.status });
            activeCrawl.presetFailed++;
            eventBus.emit("log", { level: "warn", message: `[CRAWLER] [FAIL PRESET] HTTP ${res.status}: ${rel}` });
            continue;
          }
          const buf = Buffer.from(await res.arrayBuffer());
          const file = path.join(outDir, "r2-presets", ...rel.split("/"));
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, buf);
          presetOk++;
          activeCrawl.presetOk++;
        } catch (e: any) {
          const msg = e.message || String(e);
          presetFailed.push({ rel, error: msg });
          activeCrawl.presetFailed++;
          eventBus.emit("log", { level: "error", message: `[CRAWLER] [ERROR PRESET] ${rel}: ${msg}` });
        }
      }
    } catch (e: any) {
      eventBus.emit("log", { level: "error", message: `[CRAWLER] R2 manifest walking failed: ${e.message}` });
    }
  }

  // 3. Write final report
  try {
    const reportPath = path.join(outDir, "_crawl-report.json");
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          origin,
          downloaded: downloadedRecords,
          skippedHtmlFallback,
          failed: failedRecords,
          presetOk,
          presetFailed,
          total: downloadedRecords.length,
          timestamp: Date.now(),
        },
        null,
        2
      ),
      "utf8"
    );
    eventBus.emit("log", { level: "info", message: `[CRAWLER] Crawl report generated at: ${reportPath}` });
  } catch (e) {}

  eventBus.emit("log", { level: "info", message: "[CRAWLER] Recursive crawling process completed successfully!" });

  activeCrawl.isCrawling = false;
  activeCrawl.status = "completed";
}
