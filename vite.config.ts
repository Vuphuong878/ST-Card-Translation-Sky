import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import httpProxy from 'http-proxy';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// ─── Translation progress cache (filesystem, in the project folder) ───
// Stored as plain JSON files so progress survives F5 / tab close / even switching
// browsers — unlike browser storage which is per-browser. One file per card key.
const PROGRESS_DIR = path.resolve(process.cwd(), 'translation-progress');
const safeCacheName = (key: string) =>
  (key || 'default').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 200) + '.json';
const ensureProgressDir = () => { try { fs.mkdirSync(PROGRESS_DIR, { recursive: true }); } catch { /* ignore */ } };
const readJsonBody = (req: import('http').IncomingMessage): Promise<any> =>
  new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'dynamic-cors-proxy',
      configureServer(server) {
        // Create a dedicated proxy for dynamic targets
        const dynamicProxy = httpProxy.createProxyServer({
          changeOrigin: true,
          secure: false,
        });

        dynamicProxy.on('error', (err, req, res) => {
          console.error('[dynamic proxy error]', err);
          if ('writeHead' in res) {
            const response = res as import('http').ServerResponse;
            if (!response.headersSent) {
              response.writeHead(502);
              response.end('Bad Gateway');
            }
          } else {
            res.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
          }
        });

        server.middlewares.use(async (req, res, next) => {
          // ─── Translation progress cache: save / load / list / delete (filesystem) ───
          const url = req.url || '';
          if (url.startsWith('/api/progress/')) {
            try {
              ensureProgressDir();
              const sendJson = (code: number, obj: unknown) => {
                res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
                res.end(JSON.stringify(obj));
              };

              if (url === '/api/progress/save' && req.method === 'POST') {
                const body = await readJsonBody(req);
                if (!body || typeof body.key !== 'string') return sendJson(400, { ok: false, error: 'missing key' });
                const file = path.join(PROGRESS_DIR, safeCacheName(body.key));
                fs.writeFileSync(file, JSON.stringify({ key: body.key, savedAt: Date.now(), data: body.data }), 'utf8');
                return sendJson(200, { ok: true });
              }

              if (url.startsWith('/api/progress/load') && req.method === 'GET') {
                const key = new URL(url, 'http://localhost').searchParams.get('key') || '';
                const file = path.join(PROGRESS_DIR, safeCacheName(key));
                if (!fs.existsSync(file)) return sendJson(404, { ok: false });
                const raw = fs.readFileSync(file, 'utf8');
                return sendJson(200, { ok: true, ...JSON.parse(raw) });
              }

              if (url === '/api/progress/list' && req.method === 'GET') {
                const files = fs.existsSync(PROGRESS_DIR) ? fs.readdirSync(PROGRESS_DIR).filter(f => f.endsWith('.json')) : [];
                const items = files.map(f => {
                  try {
                    const raw = JSON.parse(fs.readFileSync(path.join(PROGRESS_DIR, f), 'utf8'));
                    return { key: raw.key, savedAt: raw.savedAt };
                  } catch { return null; }
                }).filter(Boolean);
                return sendJson(200, { ok: true, items });
              }

              if (url === '/api/progress/delete' && req.method === 'POST') {
                const body = await readJsonBody(req);
                if (body && typeof body.key === 'string') {
                  const file = path.join(PROGRESS_DIR, safeCacheName(body.key));
                  if (fs.existsSync(file)) fs.unlinkSync(file);
                }
                return sendJson(200, { ok: true });
              }

              return sendJson(404, { ok: false, error: 'unknown progress endpoint' });
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: err?.message || String(err) }));
              return;
            }
          }

          if (req.url === '/api/dump-config' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                fs.writeFileSync('config_dump.json', body, 'utf8');
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Dumped successfully');
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(err.message || String(err));
              }
            });
            return;
          }

          if (req.url === '/api/debug-log' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                fs.appendFileSync('translation_debug.log', body + '\n', 'utf8');
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Logged');
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(err.message || String(err));
              }
            });
            return;
          }

          // ─── Check for updates ───
          // QUAN TRỌNG: KHÔNG được nuốt lỗi git thành "đã mới nhất". Nếu không phải git clone,
          // hoặc fetch lỗi, hoặc upstream chưa set → phải BÁO ĐÚNG lý do (ok:false) để UI hiển thị,
          // nếu không client cứ tưởng đang ở bản mới nhất trong khi thực ra không kiểm tra được.
          if (req.url === '/api/check-update' && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            const fail = (error: string) => res.end(JSON.stringify({ ok: false, behind: 0, commits: [], error }));

            // B1: xác nhận là git repo + fetch origin (lấy ref mới nhất).
            exec('git rev-parse --is-inside-work-tree && git fetch --quiet origin', { timeout: 25000, cwd: process.cwd() }, (err, _o, stderr) => {
              if (err) {
                const reason = (stderr || err.message || '').trim();
                if (/not a git repository/i.test(reason)) {
                  fail('Thư mục này KHÔNG phải bản git clone (có thể bạn tải ZIP) → không thể tự cập nhật. Hãy dùng "git clone" hoặc tải lại bản mới nhất.');
                } else if (/could not resolve host|network|timed out|unable to access|connection/i.test(reason)) {
                  fail('Không kết nối được GitHub để kiểm tra cập nhật (mạng?). Chi tiết: ' + reason.slice(0, 200));
                } else {
                  fail('Không kiểm tra được cập nhật (git fetch lỗi): ' + reason.slice(0, 240));
                }
                return;
              }
              // B2: xác định nhánh so sánh — upstream nếu có, không thì fallback origin/main.
              exec('git rev-parse --abbrev-ref --symbolic-full-name "@{u}"', { cwd: process.cwd() }, (uErr, uOut) => {
                const upstream = (!uErr && uOut.trim()) ? uOut.trim() : 'origin/main';
                // B3: liệt kê commit local đang thiếu so với upstream.
                const logCmd = `git log HEAD..${upstream} --pretty=format:%h%x1f%s%x1e`;
                exec(logCmd, { timeout: 15000, cwd: process.cwd() }, (lErr, lOut, lStderr) => {
                  if (lErr) {
                    fail(`Không so sánh được với ${upstream}: ` + (lStderr || lErr.message || '').trim().slice(0, 200));
                    return;
                  }
                  const commits = String(lOut)
                    .split('\x1e').map((s) => s.trim()).filter(Boolean)
                    .map((rec) => { const [hash, subject] = rec.split('\x1f'); return { hash: (hash || '').trim(), subject: (subject || '').trim() }; });
                  let currentVersion = '';
                  try { currentVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version || ''; } catch { /* ignore */ }
                  res.end(JSON.stringify({ ok: true, behind: commits.length, commits, currentVersion, upstream }));
                });
              });
            });
            return;
          }

          if (req.url === '/api/update' && req.method === 'POST') {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            
            res.write('Đang tải bản mới nhất từ GitHub...\n');
            // Dùng "git pull origin main" (thay vì "git pull" trơn) để không phụ thuộc upstream
            // đã set hay chưa — nhánh mặc định của repo là main.
            const child = exec('git pull origin main && npm install');
            
            child.stdout?.on('data', (data) => {
              res.write(data);
            });
            child.stderr?.on('data', (data) => {
              res.write(data);
            });
            child.on('close', (code) => {
              if (code === 0) {
                res.write(`\nCập nhật hoàn tất thành công. Vui lòng tải lại trang hoặc khởi động lại app nếu cần.\n`);
              } else {
                res.write(`\nCập nhật thất bại (mã lỗi ${code}). Có thể bạn đang có thay đổi chưa commit gây xung đột.\n`);
              }
              res.end();
            });
            return;
          }

          if (req.url === '/api/downgrade' && req.method === 'POST') {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            
            res.write('Đang hạ cấp phiên bản xuống 1 commit (git reset --hard HEAD~1)...\n');
            const child = exec('git reset --hard HEAD~1 && npm install');
            
            child.stdout?.on('data', (data) => {
              res.write(data);
            });
            child.stderr?.on('data', (data) => {
              res.write(data);
            });
            child.on('close', (code) => {
              if (code === 0) {
                res.write(`\nHạ cấp hoàn tất thành công. Vui lòng tải lại trang hoặc khởi động lại app nếu cần.\n`);
              } else {
                res.write(`\nHạ cấp thất bại (mã lỗi ${code}).\n`);
              }
              res.end();
            });
            return;
          }

          const match = (req.url ?? '').match(/^\/api-proxy\/custom\/([A-Za-z0-9_-]+)\/(.*)/);
          if (match) {
            try {
              const targetOrigin = atob(match[1].replace(/-/g, '+').replace(/_/g, '/'));
              // Rewrite the URL to just the path part
              req.url = `/${match[2]}`;
              dynamicProxy.web(req, res, { target: targetOrigin });
              return; // Do not call next() since we handled it
            } catch (e) {
              console.error('[dynamic proxy] Invalid base64 origin:', e);
              res.statusCode = 400;
              res.end('Invalid proxy origin');
              return;
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    // Fixed port so the Hub (this app) is always reachable at a stable URL and the
    // combined start.bat can open it deterministically. strictPort => fail instead of
    // silently hopping to 5175/etc. (which would break the card-tool iframe URL).
    port: 5173,
    strictPort: true,
    open: true,
    // ─── CORS Proxy ───
    // These proxies let the browser call /api-proxy/openai/... etc.
    // and Vite forwards them server-side, bypassing CORS entirely.
    proxy: {
      '/api-proxy/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/openai/, ''),
        secure: true,
      },
      '/api-proxy/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/anthropic/, ''),
        secure: true,
      },
      '/api-proxy/google': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/google/, ''),
        secure: true,
      },
    },
  },
})
