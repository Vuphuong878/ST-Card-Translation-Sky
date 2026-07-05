import { defineConfig } from 'vite'
import type { ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { exec } from 'child_process'
import { request as httpRequest } from 'http'
import { request as httpsRequest } from 'https'
import type { IncomingMessage, ServerResponse } from 'http'

// ─── CORS Proxy Plugin ──────────────────────────────────────────────────────
// Forwards /api/cors-proxy/<encoded-url> to the real URL, bypassing CORS.
const corsProxyPlugin = () => ({
  name: 'cors-proxy',
  configureServer(server: ViteDevServer) {
    server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const prefix = '/api/cors-proxy/';
      if (!req.url?.startsWith(prefix)) return next();

      const targetUrl = decodeURIComponent(req.url.slice(prefix.length));
      let parsed: URL;
      try {
        parsed = new URL(targetUrl);
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid target URL' }));
        return;
      }

      // Read the incoming body
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const body = Buffer.concat(chunks);
        const isHttps = parsed.protocol === 'https:';
        const reqFn = isHttps ? httpsRequest : httpRequest;

        // Forward headers, removing host/origin/referer to avoid leaking
        const forwardHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.headers)) {
          const lk = key.toLowerCase();
          if (['host', 'origin', 'referer', 'connection', 'transfer-encoding'].includes(lk)) continue;
          if (value) forwardHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
        }
        if (body.length > 0 && !forwardHeaders['content-length']) {
          forwardHeaders['content-length'] = String(body.length);
        }

        const proxyReq = reqFn(
          {
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: req.method || 'POST',
            headers: forwardHeaders,
            timeout: 1800000, // 30 min — match AI client timeout
          },
          (proxyRes) => {
            // Set CORS headers so the browser accepts the response
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');

            // Forward status + response headers (excluding problematic ones)
            res.statusCode = proxyRes.statusCode || 500;
            for (const [key, value] of Object.entries(proxyRes.headers)) {
              const lk = key.toLowerCase();
              if (['transfer-encoding', 'connection', 'access-control-allow-origin'].includes(lk)) continue;
              if (value) res.setHeader(key, value);
            }

            proxyRes.pipe(res);
          },
        );

        proxyReq.on('error', (err) => {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `Proxy error: ${err.message}` }));
        });

        if (body.length > 0) proxyReq.write(body);
        proxyReq.end();
      });
    });
  },
});

// Custom plugin to handle Git commands
const appUpdaterPlugin = () => ({
  name: 'app-updater',
  configureServer(server: ViteDevServer) {
    server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
      // Handle CORS preflight for proxy
      if (req.method === 'OPTIONS' && req.url?.startsWith('/api/cors-proxy/')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url === '/api/app/upgrade') {
        exec('git pull origin main', (err, stdout, stderr) => {
          res.setHeader('Content-Type', 'application/json');
          if (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: stderr || err.message }));
          } else {
            res.end(JSON.stringify({ success: true, message: stdout }));
          }
        });
        return;
      }
      
      if (req.method === 'POST' && req.url === '/api/app/downgrade') {
        exec('git reset --hard HEAD~1', (err, stdout, stderr) => {
          res.setHeader('Content-Type', 'application/json');
          if (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: stderr || err.message }));
          } else {
            res.end(JSON.stringify({ success: true, message: stdout }));
          }
        });
        return;
      }
      
      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), corsProxyPlugin(), appUpdaterPlugin()],
  server: {
    // Fixed port so the Hub (Dịch Card app) can embed this tool at a stable iframe URL.
    // strictPort => fail loudly instead of hopping ports and breaking the iframe.
    port: 5174,
    strictPort: true,
    fs: {
      strict: true,
      allow: ['.']
    }
  }
})
