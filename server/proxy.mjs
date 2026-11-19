// Tiny pass-through proxy: the app calls it without a key, it adds the ValoTCG API key and forwards the request.
// An API key shipped inside a mobile app can be extracted, so it stays on the server.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
);
const API_BASE = env.VALO_API_BASE ?? 'https://api.valotcg.com';
const PORT = Number(env.PORT ?? 8787);
const ALLOWED = ['/vision/v1/', '/data/v1/'];
const FORWARDED_HEADERS = ['content-type', 'content-length', 'accept'];

if (!env.VALO_API_KEY) throw new Error('VALO_API_KEY is missing: copy .env.example to .env and set it.');

createServer(async (req, res) => {
  if (!ALLOWED.some((prefix) => req.url.startsWith(prefix))) {
    res.writeHead(404, { 'content-type': 'application/json' }).end('{"error":{"code":"not_found"}}');
    return;
  }
  const headers = { authorization: `Bearer ${env.VALO_API_KEY}` };
  for (const name of FORWARDED_HEADERS) if (req.headers[name]) headers[name] = req.headers[name];
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  try {
    const upstream = await fetch(API_BASE + req.url, {
      method: req.method,
      headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? 'half' : undefined,
    });
    console.log(`${req.method} ${req.url} -> ${upstream.status}`);
    res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/json' });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error(`${req.method} ${req.url} failed: ${error.message}`);
    res.writeHead(502, { 'content-type': 'application/json' }).end('{"error":{"code":"upstream_unreachable","message":"The API could not be reached."}}');
  }
}).listen(PORT, () => console.log(`Proxy on http://localhost:${PORT} -> ${API_BASE}`));
