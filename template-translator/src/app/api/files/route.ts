import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT_DIR = "d:/Documents/GitHub/ST-Card-Translation-Sky";

// GET: Recursively scan files under a target directory (or default to workspace)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetDir = searchParams.get("dir") || ROOT_DIR;

    if (!fs.existsSync(targetDir)) {
      return NextResponse.json({ error: "Folder does not exist" }, { status: 404 });
    }

    const files: string[] = [];

    function scan(dir: string) {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          // Ignore system folders to keep scanner fast and clean
          if (item === "node_modules" || item === ".git" || item === ".next" || item === "dist") {
            continue;
          }

          if (stat.isDirectory()) {
            scan(fullPath);
          } else {
            // Keep text, json, md, and html files
            const ext = path.extname(item).toLowerCase();
            if ([".txt", ".json", ".md", ".html", ".htm"].includes(ext)) {
              // Store relative paths for readability
              files.push(path.relative(ROOT_DIR, fullPath).replace(/\\/g, "/"));
            }
          }
        }
      } catch (e) {
        // ignore folder read errors
      }
    }

    scan(targetDir);

    return NextResponse.json({ root: ROOT_DIR, files: files.sort() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Read file content
export async function POST(req: NextRequest) {
  try {
    const { relativePath } = await req.json();

    if (!relativePath) {
      return NextResponse.json({ error: "relativePath is required" }, { status: 400 });
    }

    const fullPath = path.join(ROOT_DIR, relativePath);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const content = fs.readFileSync(fullPath, "utf8");
    return NextResponse.json({ content, fullPath });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
