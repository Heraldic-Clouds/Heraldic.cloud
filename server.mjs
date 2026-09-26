import { createServer } from 'node:http';
import { handler, mediaFiles, distDirectory, securityHeaders } from './lambda/index.mjs';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

const port = Number(process.env.PORT || 8080);
const maxBodyBytes = 80 * 1024;

const server = createServer(async (request, response) => {
  const path = new URL(request.url || '/', 'http://localhost').pathname;
  if (mediaFiles.has(path) && ['GET', 'HEAD'].includes(request.method)) {
    try {
      const file = join(distDirectory, path.slice(1));
      const { size } = await stat(file);
      const range = request.headers.range;
      const match = range && /^bytes=(\d+)-(\d*)$/.exec(range);
      const start = match ? Number(match[1]) : 0;
      const end = match && match[2] ? Number(match[2]) : size - 1;
      if (range && (!match || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || end >= size)) {
        response.writeHead(416, { ...securityHeaders, 'Content-Range': `bytes */${size}` }); response.end(); return;
      }
      response.writeHead(range ? 206 : 200, { ...securityHeaders, 'Content-Type': 'application/pdf', 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) });
      if (request.method === 'HEAD') response.end();
      else createReadStream(file, { start, end }).on('error', () => response.destroy()).pipe(response);
    } catch { response.writeHead(404, securityHeaders); response.end(); }
    return;
  }
  if (request.url === '/healthz') {
    response.writeHead(204, { 'Cache-Control': 'no-store' });
    response.end();
    return;
  }

  const chunks = [];
  let bodyBytes = 0;
  for await (const chunk of request) {
    bodyBytes += chunk.length;
    if (bodyBytes > maxBodyBytes) {
      response.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ error: 'Request is too large.' }));
      return;
    }
    chunks.push(chunk);
  }

  const event = {
    rawPath: new URL(request.url || '/', 'http://localhost').pathname,
    requestContext: { http: { method: request.method, sourceIp: request.socket.remoteAddress } },
    headers: request.headers,
    body: Buffer.concat(chunks).toString('utf8'),
  };

  try {
    const result = await handler(event);
    const headers = { ...result.headers };
    let body = result.body || '';
    if (result.isBase64Encoded) body = Buffer.from(body, 'base64');
    response.writeHead(result.statusCode || 500, headers);
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('Unable to load Heraldic');
  }
});

server.listen(port, '0.0.0.0');
