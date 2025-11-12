import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

import xpipe from 'xpipe';

import { writeJSON } from './ipc-socket-client';
import type { Logger } from './logger';

/**
 * IPC Socket Server for inter-process communication.
 * This server handles CLI commands from other processes.
 */
export class IPCSocketServer {
  socketServer: net.Server;
  private tegoInstance: any; // Will be typed as Tego once Application is renamed
  private logger: Logger;

  constructor(server: net.Server, tegoInstance: any, logger: Logger) {
    this.socketServer = server;
    this.tegoInstance = tegoInstance;
    this.logger = logger;
  }

  /**
   * Build and start the IPC socket server
   * @param socketPath - Path to the socket file
   * @param tegoInstance - The Tego instance to handle commands
   * @param logger - Logger instance
   */
  static buildServer(socketPath: string, tegoInstance: any, logger: Logger) {
    // try to unlink the socket from a previous run
    if (fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath);
    }

    const dir = path.dirname(socketPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const socketServer = net.createServer((c) => {
      logger.info('IPC client connected');

      c.on('end', () => {
        logger.info('IPC client disconnected');
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

          IPCSocketServer.handleClientMessage(tegoInstance, logger, { reqId, ...dataObj })
            .then((result) => {
              writeJSON(c, {
                reqId,
                type: result === false ? 'not_found' : 'success',
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

    socketServer.listen(xpipe.eq(socketPath), () => {
      logger.info(`IPC Server running at ${socketPath}`);
    });

    return new IPCSocketServer(socketServer, tegoInstance, logger);
  }

  /**
   * Handle client messages (CLI commands)
   */
  static async handleClientMessage(tegoInstance: any, logger: Logger, { reqId, type, payload }) {
    if (type === 'passCliArgv') {
      const argv = payload.argv;

      // Load commands if not already loaded
      if (!tegoInstance.cli.hasCommand(argv[2])) {
        await tegoInstance.pm.loadCommands();
      }

      const cli = tegoInstance.cli;
      if (
        !cli.parseHandleByIPCServer(argv, {
          from: 'node',
        })
      ) {
        logger.debug('Not handle by ipc server');
        return false;
      }

      return tegoInstance.runAsCLI(argv, {
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
