// ERLY — Noor's AI gateway on Node 18+ (local development or any small server).
//   GEMINI_API_KEY=... PORT=8788 node server/noor-gateway-node.mjs
// Then point assets/js/companion/config.js gateway.url at http://localhost:8788
import http from 'node:http';
import { handle } from './gateway/handler.mjs';
const PORT = +process.env.PORT || 8788;
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) { chunks.push(c); if (chunks.reduce((s, x) => s + x.length, 0) > 25e6) { res.writeHead(413); return res.end(); } }
  const ac = new AbortController(); res.on('close', () => ac.abort());
  const request = new Request(`http://localhost${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
  const response = await handle(request, process.env, { ip: req.socket.remoteAddress, signal: ac.signal });
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (!response.body) return res.end();
  const rd = response.body.getReader();
  for (;;) { const { done, value } = await rd.read(); if (done) break; res.write(value); }
  res.end();
}).listen(PORT, () => console.log('Noor gateway on http://localhost:' + PORT));
