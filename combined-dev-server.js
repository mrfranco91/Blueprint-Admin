import http from 'http';
import url from 'url';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a unified server that handles both API and Vite
const createCombinedServer = async () => {
  let vite;
  try {
    vite = await createViteServer({
      server: {
        middlewareMode: true,
      }
    });
    console.log('✓ Vite server initialized');
  } catch (err) {
    console.error('Failed to initialize Vite:', err);
    throw err;
  }

  class MockRequest {
    constructor(nodeReq) {
      this.method = nodeReq.method;
      this.url = nodeReq.url;
      this.headers = nodeReq.headers;
      this.query = {};
      this.body = null;

      const parsed = url.parse(nodeReq.url, true);
      this.query = parsed.query;
    }

    async json() {
      if (!this.body) {
        this.body = '';
      }
      return JSON.parse(this.body);
    }

    async text() {
      if (!this.body) {
        this.body = '';
      }
      return this.body;
    }
  }

  class MockResponse {
    constructor(nodeRes) {
      this.nodeRes = nodeRes;
      this.statusCode = 200;
      this.headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-square-access-token',
      };
    }

    setHeader(key, value) {
      this.headers[key] = value;
    }

    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      if (headers) {
        Object.assign(this.headers, headers);
      }
    }

    status(code) {
      this.statusCode = code;
      return this;
    }

    json(data) {
      this.setHeader('Content-Type', 'application/json');
      this.nodeRes.writeHead(this.statusCode, this.headers);
      this.nodeRes.end(JSON.stringify(data));
    }

    end(data) {
      this.nodeRes.writeHead(this.statusCode, this.headers);
      this.nodeRes.end(data);
    }

    redirect(code, url) {
      this.statusCode = code;
      this.setHeader('Location', url);
      this.nodeRes.writeHead(this.statusCode, this.headers);
      this.nodeRes.end();
    }
  }

  const server = http.createServer(async (nodeReq, nodeRes) => {
    // CORS preflight
    if (nodeReq.method === 'OPTIONS') {
      nodeRes.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-square-access-token',
      });
      nodeRes.end();
      return;
    }

    const pathname = url.parse(nodeReq.url, true).pathname;

    // Handle API routes
    if (pathname.startsWith('/api/')) {
      const req = new MockRequest(nodeReq);
      const res = new MockResponse(nodeRes);

      let body = '';
      nodeReq.on('data', (chunk) => {
        body += chunk.toString();
      });

      return nodeReq.on('end', async () => {
        req.body = body;

        try {
          let handler;

          if (pathname === '/api/square/team') {
            handler = await vite.ssrLoadModule('./api/square/team.ts');
          } else if (pathname === '/api/square/clients') {
            handler = await vite.ssrLoadModule('./api/square/clients.ts');
          } else if (pathname === '/api/square/proxy') {
            handler = await vite.ssrLoadModule('./api/square/proxy.ts');
          } else if (pathname === '/api/square/oauth/start') {
            handler = await vite.ssrLoadModule('./api/square/oauth/start.ts');
          } else if (pathname === '/api/square/oauth/token') {
            handler = await vite.ssrLoadModule('./api/square/oauth/token.ts');
          } else if (pathname === '/api/square/get-token') {
            handler = await vite.ssrLoadModule('./api/square/get-token.ts');
          } else if (pathname === '/api/square/has-merchant') {
            handler = await vite.ssrLoadModule('./api/square/has-merchant.ts');
          } else if (pathname === '/api/square/create-session') {
            handler = await vite.ssrLoadModule('./api/square/create-session.ts');
          } else {
            res.statusCode = 404;
            return res.json({ message: `API endpoint ${pathname} not found` });
          }

          const handlerFn = handler?.default || handler;
          if (typeof handlerFn === 'function') {
            return handlerFn(req, res);
          } else {
            res.statusCode = 500;
            return res.json({ message: 'Handler is not a function' });
          }
        } catch (error) {
          console.error(`Error handling API ${pathname}:`, error.message);
          res.statusCode = 500;
          res.json({ message: error.message || 'API server error' });
        }
      });
    }

    // Handle everything else through Vite middleware
    if (vite && vite.middlewares) {
      vite.middlewares(nodeReq, nodeRes, () => {
        nodeRes.writeHead(404);
        nodeRes.end('Not found');
      });
    } else {
      console.error('Vite middleware not available');
      nodeRes.writeHead(500);
      nodeRes.end('Internal server error: Vite not initialized');
    }
  });

  let port = 3000;

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      port = 3001;
      console.log(`Port 3000 in use, trying 3001...`);
      setTimeout(() => server.listen(port, '0.0.0.0'), 1000);
    } else {
      throw err;
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`\n⚡ Combined dev server running at http://localhost:${port}/\n`);
  });
};

createCombinedServer().catch((err) => {
  console.error('Failed to start combined server:', err);
  process.exit(1);
});
