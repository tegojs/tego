import { once } from 'node:events';
import { createServer } from 'node:http';

import { afterEach, describe, expect, it } from 'vitest';
import winston from 'winston';

import { requestLogger } from '../request-logger';

describe('requestLogger', () => {
  let server: ReturnType<typeof createServer> | undefined;

  afterEach(async () => {
    if (!server) return;

    const activeServer = server;
    server = undefined;
    await new Promise<void>((resolve, reject) => {
      activeServer.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('preserves ordinary request IDs and does not set headers after a downstream response is sent', async () => {
    const middleware = requestLogger('request-logger-test', {
      transports: [new winston.transports.Console({ silent: true })],
    });
    const middlewareErrors: Error[] = [];
    const middlewareCompletions: Promise<void>[] = [];
    server = createServer((req, res) => {
      const ctx = {
        reqId: 'request-123',
        path: req.url,
        url: req.url,
        method: req.method,
        status: 200,
        request: { toJSON: () => ({ method: req.method, url: req.url }) },
        response: { toJSON: () => ({ status: 200 }) },
        tego: { logger: { child: () => ({}) } },
        res,
      };
      middlewareCompletions.push(
        middleware(ctx, async () => {
          if (req.url === '/attachments/1:download') {
            res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
            res.end('attachment bytes');
            await once(res, 'finish');
          }
        }).then(
          () => {
            if (req.url === '/ordinary') res.end('ordinary response');
          },
          (error) => {
            middlewareErrors.push(error);
            res.destroy(error);
          },
        ),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind a TCP address');

    const response = await fetch(`http://127.0.0.1:${address.port}/attachments/1:download`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('attachment bytes');
    await middlewareCompletions[0];

    const ordinaryResponse = await fetch(`http://127.0.0.1:${address.port}/ordinary`);
    expect(ordinaryResponse.headers.get('x-request-id')).toBe('request-123');
    expect(await ordinaryResponse.text()).toBe('ordinary response');
    await middlewareCompletions[1];
    expect(middlewareErrors).toEqual([]);
  });
});
