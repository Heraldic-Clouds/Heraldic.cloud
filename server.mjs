import { createServer } from 'node:http';
import { handler } from './lambda/index.mjs';

const port = Number(process.env.PORT || 8080);
const maxBodyBytes = 80 * 1024;

const server = createServer(async (request, response) => {
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
