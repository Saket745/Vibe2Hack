import { createServer } from 'http';
import triageHandler from './api/triage';
import resolveHandler from './api/resolve';
import * as fs from 'fs';
import * as path from 'path';

// Manual .env loader for local development
if (!process.env.GEMINI_API_KEY) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        if (line && !line.startsWith('#')) {
          const firstEqual = line.indexOf('=');
          if (firstEqual !== -1) {
            const key = line.substring(0, firstEqual).trim();
            const value = line.substring(firstEqual + 1).trim();
            if (key) {
              process.env[key] = value;
            }
          }
        }
      }
      console.log('Loaded env vars from .env file manually.');
    }
  } catch (err) {
    console.error('Failed to load .env file:', err);
  }
}

const server = createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Helper to build mock Vercel req/res objects and dispatch to a handler
  const dispatchToHandler = (handlerFn: any, method: string) => {
    let bodyChunks: any[] = [];
    req.on('data', (chunk: any) => bodyChunks.push(chunk));
    req.on('end', async () => {
      try {
        const bodyText = Buffer.concat(bodyChunks).toString();
        const parsedBody = bodyText ? JSON.parse(bodyText) : {};

        const vercelReq: any = {
          method,
          headers: req.headers,
          socket: req.socket,
          body: parsedBody
        };

        const vercelRes: any = {
          statusCode: 200,
          headers: {},
          setHeader(name: string, value: string) {
            res.setHeader(name, value);
            this.headers[name] = value;
            return this;
          },
          status(code: number) {
            res.statusCode = code;
            this.statusCode = code;
            return this;
          },
          json(payload: any) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
            return this;
          },
          end() {
            res.end();
            return this;
          }
        };

        await handlerFn(vercelReq, vercelRes);
      } catch (err: any) {
        console.error(`[dev-server] error in handler:`, err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal server error in dev wrapper', details: err.message }));
      }
    });
  };

  if (req.url === '/api/triage' && req.method === 'POST') {
    dispatchToHandler(triageHandler, 'POST');
  } else if (req.url === '/api/resolve' && req.method === 'POST') {
    dispatchToHandler(resolveHandler, 'POST');
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(3000, () => {
  console.log('Local API server running:');
  console.log('  → http://localhost:3000/api/triage');
  console.log('  → http://localhost:3000/api/resolve');
});
