import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

import xpipe from 'xpipe';

import { AppSupervisor } from '../app-supervisor';
import { writeJSON } from './ipc-socket-client';

export class IPCSocketServer {
  socketServer: net.Server;

  constructor(server: net.Server) {
    this.socketServer = server;
  }

  static buildServer(socketPath: string) {
    if (fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath);
    }

    const dir = path.dirname(socketPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const socketServer = net.createServer((c) => {
      c.on('end', () => {
        // noop
      });

      c.on('data', (data) => {
        const dataAsString = data.toString();
        const messages = dataAsString.split('\n');

        for (const message of messages) {
          if (message.length === 0) {
            continue;
          }

          const reqId = randomUUID();
          const dataObj = JSON.parse(message);

          IPCSocketServer.handleClientMessage({ reqId, ...dataObj })
            .then((result) => {
              writeJSON(c, {
                reqId,
                type: result === false ? 'not_found' : 'success',
                payload: result,
              });
            })
            .catch((err) => {
              writeJSON(c, {
                reqId,
                type: 'error',
                payload: {
                  message: err.message,
                  stack: err.stack,
                },
              });
            });
        }
      });
    });

    socketServer.listen(xpipe.eq(socketPath));

    return new IPCSocketServer(socketServer);
  }

  static async handleClientMessage({ reqId, type, payload }) {
    const supervisor = AppSupervisor.getInstance();
    const app = supervisor.getApp('main');

    if (!app) {
      return false;
    }

    if (type === 'appReady') {
      return supervisor.getAppStatus('main');
    }

    if (type === 'passCliArgv') {
      const argv = payload.argv;
      if (!app.cli.hasCommand(argv[2])) {
        await app.pm.loadCommands();
      }
      const cli = app.cli;
      if (
        !cli.parseHandleByIPCServer(argv, {
          from: 'node',
        })
      ) {
        app.logger.debug('Not handled by ipc server');
        return false;
      }

      return app.runAsCLI(argv, {
        reqId,
        from: 'node',
        throwError: true,
      });
    }

    throw new Error(`Unknown message type ${type}`);
  }

  close() {
    this.socketServer.close();
  }
}
