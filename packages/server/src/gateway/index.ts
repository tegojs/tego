import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import http, { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { parse } from 'node:url';
import { promisify } from 'node:util';
import { createSystemLogger, getLoggerFilePath, SystemLogger } from '@tachybase/logger';
import { createStoragePluginsSymlink, Registry, Toposort, ToposortOptions, uid } from '@tachybase/utils';

import { Command } from 'commander';
import compression from 'compression';
import compose from 'koa-compose';
import qs from 'qs';
import handler from 'serve-handler';

import { AppSupervisor } from '../app-supervisor';
import { ApplicationOptions } from '../application';
import { getPackageDirByExposeUrl, getPackageNameByExposeUrl } from '../plugin-manager';
import { applyErrorWithArgs, getErrorWithCode } from './errors';
import { IPCSocketClient } from './ipc-socket-client';
import { IPCSocketServer } from './ipc-socket-server';
import { WSServer } from './ws-server';

const compress = promisify(compression());

export interface IncomingRequest {
  url: string;
  headers: any;
}

export type AppSelector = (req: IncomingRequest) => string | Promise<string>;
export type AppSelectorMiddleware = (ctx: AppSelectorMiddlewareContext, next: () => Promise<void>) => void;

interface StartHttpServerOptions {
  port: number;
  host: string;
  callback?: (server: http.Server) => void;
}

interface RunOptions {
  mainAppOptions: ApplicationOptions;
}

export interface AppSelectorMiddlewareContext {
  req: IncomingRequest;
  resolvedAppName: string | null;
}

export interface Handler {
  name: string;
  prefix: string;
  callback: (req: IncomingMessage, res: ServerResponse) => void;
}

export class Gateway extends EventEmitter {
  private static instance: Gateway;
  /**
   * use main app as default app to handle request
   */
  selectorMiddlewares: Toposort<AppSelectorMiddleware> = new Toposort<AppSelectorMiddleware>();

  public server: http.Server | null = null;
  public ipcSocketServer: IPCSocketServer | null = null;
  #port: number = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : null;
  #host = '0.0.0.0';
  private wsServer: WSServer;
  private socketPath = resolve(process.cwd(), 'storage', 'gateway.sock');
  private handlers: Map<string, Handler> = new Map();

  loggers = new Registry<SystemLogger>();

  private constructor() {
    super();
    this.reset();
    if (process.env.SOCKET_PATH) {
      this.socketPath = resolve(process.cwd(), process.env.SOCKET_PATH);
    }
  }

  public static getInstance(options: any = {}): Gateway {
    if (!Gateway.instance) {
      Gateway.instance = new Gateway();
    }

    return Gateway.instance;
  }

  destroy() {
    this.reset();
    Gateway.instance = null;
  }

  public reset() {
    this.selectorMiddlewares = new Toposort<AppSelectorMiddleware>();

    this.addAppSelectorMiddleware(
      async (ctx: AppSelectorMiddlewareContext, next) => {
        const { req } = ctx;
        const appName = qs.parse(parse(req.url).query)?.__appName as string | null;

        if (appName) {
          ctx.resolvedAppName = appName;
        }

        if (req.headers['x-app']) {
          ctx.resolvedAppName = req.headers['x-app'];
        }

        await next();
      },
      {
        tag: 'core',
        group: 'core',
      },
    );

    if (this.server) {
      this.server.close();
      this.server = null;
    }

    if (this.ipcSocketServer) {
      this.ipcSocketServer.close();
      this.ipcSocketServer = null;
    }
  }

  addAppSelectorMiddleware(middleware: AppSelectorMiddleware, options?: ToposortOptions) {
    if (this.selectorMiddlewares.nodes.some((existingFunc) => existingFunc.toString() === middleware.toString())) {
      return;
    }

    this.selectorMiddlewares.add(middleware, options);
    this.emit('appSelectorChanged');
  }

  getLogger(appName: string, res: ServerResponse) {
    const reqId = randomUUID();
    res.setHeader('X-Request-Id', reqId);
    let logger = this.loggers.get(appName);
    if (logger) {
      return logger.child({ reqId });
    }
    logger = createSystemLogger({
      dirname: getLoggerFilePath(appName),
      filename: 'system',
      defaultMeta: {
        app: appName,
        module: 'gateway',
      },
    });
    this.loggers.register(appName, logger);
    return logger.child({ reqId });
  }

  responseError(
    res: ServerResponse,
    error: {
      status: number;
      maintaining: boolean;
      message: string;
      code: string;
    },
  ) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = error.status;
    res.end(JSON.stringify({ error }));
  }

  responseErrorWithCode(code, res, options) {
    const log = this.getLogger(options.appName, res);
    const error = applyErrorWithArgs(getErrorWithCode(code), options);
    log.error(error.message, { method: 'responseErrorWithCode', error });
    this.responseError(res, error);
  }

  async requestHandler(req: IncomingMessage, res: ServerResponse) {
    for (const handler of this.handlers.values()) {
      if (req.url?.startsWith(handler.prefix)) {
        return handler.callback(req, res);
      }
    }
    const { pathname } = parse(req.url);
    const { PLUGIN_STATICS_PATH, APP_PUBLIC_PATH } = process.env;

    if (pathname.startsWith(APP_PUBLIC_PATH + 'storage/uploads/')) {
      req.url = req.url.substring(APP_PUBLIC_PATH.length - 1);
      await compress(req, res);
      return handler(req, res, {
        public: resolve(process.cwd()),
        directoryListing: false,
      });
    }

    // pathname example: /static/plugins/@tachybase/plugins-acl/README.md
    // protect server files
    if (pathname.startsWith(PLUGIN_STATICS_PATH) && !pathname.includes('/server/')) {
      await compress(req, res);
      const packageName = getPackageNameByExposeUrl(pathname);
      // /static/plugins/@tachybase/plugins-acl/README.md => /User/projects/tachybase/plugins/acl
      const publicDir = getPackageDirByExposeUrl(pathname);
      // /static/plugins/@tachybase/plugins-acl/README.md => README.md
      const destination = pathname.replace(PLUGIN_STATICS_PATH, '').replace(packageName, '');
      return handler(req, res, {
        public: publicDir,
        rewrites: [
          {
            source: pathname,
            destination,
          },
        ],
      });
    }

    if (!pathname.startsWith(process.env.API_BASE_PATH) && !pathname.startsWith(process.env.EXTENSION_UI_BASE_PATH)) {
      req.url = req.url.substring(APP_PUBLIC_PATH.length - 1);
      await compress(req, res);
      return handler(req, res, {
        public: process.env.SERVE_PATH ? process.env.SERVE_PATH : `${process.env.APP_CLIENT_ROOT}/dist`,
        rewrites: [{ source: '/**', destination: '/index.html' }],
      });
    }

    const handleApp = await this.getRequestHandleAppName(req as IncomingRequest);
    const log = this.getLogger(handleApp, res);

    await AppSupervisor.getInstance().getApp(handleApp);

    let appStatus = AppSupervisor.getInstance().getAppStatus(handleApp, 'initializing');

    if (appStatus === 'not_found') {
      log.warn(`app not found`, { method: 'requestHandler' });
      this.responseErrorWithCode('APP_NOT_FOUND', res, { appName: handleApp });
      return;
    }

    if (appStatus === 'initializing') {
      this.responseErrorWithCode('APP_INITIALIZING', res, { appName: handleApp });
      return;
    }

    if (appStatus === 'initialized') {
      const appInstance = await AppSupervisor.getInstance().getApp(handleApp);
      appStatus = AppSupervisor.getInstance().getAppStatus(handleApp);
    }

    const app = await AppSupervisor.getInstance().getApp(handleApp);

    if (appStatus !== 'running') {
      log.warn(`app is not running`, { method: 'requestHandler', status: appStatus });
      this.responseErrorWithCode(`${appStatus}`, res, { app, appName: handleApp });
      return;
    }

    if (req.url.endsWith('/__health_check')) {
      res.statusCode = 200;
      res.end('ok');
      return;
    }

    if (handleApp !== 'main') {
      AppSupervisor.getInstance().touchApp(handleApp);
    }

    app.callback()(req, res);
  }

  getAppSelectorMiddlewares() {
    return this.selectorMiddlewares;
  }

  async getRequestHandleAppName(req: IncomingRequest) {
    const appSelectorMiddlewares = this.selectorMiddlewares.sort();

    const ctx: AppSelectorMiddlewareContext = {
      req,
      resolvedAppName: null,
    };

    await compose(appSelectorMiddlewares)(ctx);

    if (!ctx.resolvedAppName) {
      ctx.resolvedAppName = 'main';
    }

    return ctx.resolvedAppName;
  }

  getCallback() {
    return this.requestHandler.bind(this);
  }

  async watch() {
    if (!process.env.IS_DEV_CMD) {
      return;
    }
    const file = resolve(process.cwd(), 'storage/app.watch.ts');
    if (!fs.existsSync(file)) {
      await fs.promises.writeFile(file, `export const watchId = '${uid()}';`, 'utf-8');
    }
    require(file);
  }

  async run(options: RunOptions) {
    const isStart = this.isStart();
    let ipcClient: IPCSocketClient | false;
    if (isStart) {
      await this.watch();

      const startOptions = this.getStartOptions();
      const port = startOptions.port || process.env.APP_PORT || 3000;
      const host = startOptions.host || process.env.APP_HOST || '0.0.0.0';

      this.start({
        port,
        host,
      });
    } else if (!this.isHelp()) {
      ipcClient = await this.tryConnectToIPCServer();

      if (ipcClient) {
        const response: any = await ipcClient.write({ type: 'passCliArgv', payload: { argv: process.argv } });
        ipcClient.close();

        if (!['error', 'not_found'].includes(response.type)) {
          return;
        }
      }
    }

    if (isStart || !ipcClient) {
      await createStoragePluginsSymlink();
    }

    const mainApp = AppSupervisor.getInstance().bootMainApp(options.mainAppOptions);

    mainApp
      .runAsCLI(process.argv, {
        throwError: true,
        from: 'node',
      })
      .then(async () => {
        if (!isStart && !(await mainApp.isStarted())) {
          await mainApp.stop({ logging: false });
        }
      })
      .catch(async (e) => {
        if (e.code !== 'commander.helpDisplayed') {
          mainApp.logger.error(e);
        }
        if (!isStart && !(await mainApp.isStarted())) {
          await mainApp.stop({ logging: false });
        }
      });
  }

  isStart() {
    const argv = process.argv;
    return argv[2] === 'start';
  }

  get runAt() {
    return `http://${this.#host}:${this.#port}`;
  }

  get runAtLoop() {
    return `http://127.0.0.1:${this.#port}`;
  }

  get port() {
    return this.#port;
  }

  get host() {
    return this.#host;
  }

  isHelp() {
    const argv = process.argv;
    return argv[2] === 'help';
  }

  getStartOptions() {
    const argv = process.argv;
    const program = new Command();

    program
      .allowUnknownOption()
      .option('-s, --silent')
      .option('-p, --port [post]')
      .option('-h, --host [host]')
      .option('--db-sync')
      .parse(process.argv);
    const options = program.opts();

    return options;
  }

  start(options: StartHttpServerOptions) {
    this.startHttpServer(options);
    this.startIPCSocketServer();
  }

  startIPCSocketServer() {
    this.ipcSocketServer = IPCSocketServer.buildServer(this.socketPath);
  }

  startHttpServer(options: StartHttpServerOptions) {
    if (options?.port !== null) {
      this.#port = options.port;
    }

    if (options?.host) {
      this.#host = options.host;
    }

    if (this.#port === null) {
      console.log('gateway port is not set, http server will not start');
      return;
    }

    this.server = http.createServer(this.getCallback());

    this.wsServer = new WSServer();

    this.server.on('upgrade', (request, socket, head) => {
      const { pathname } = parse(request.url);

      if (pathname === process.env.WS_PATH) {
        this.wsServer.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wsServer.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    this.server.listen(this.#port, this.#host, () => {
      console.log(`Gateway HTTP Server running at http://${this.#host}:${this.#port}/`);
      if (options?.callback) {
        options.callback(this.server);
      }
    });
  }

  registerHandler(handler: Handler) {
    this.handlers.set(handler.name, handler);
  }

  unregisterHandler(name: string) {
    this.handlers.delete(name);
  }

  async tryConnectToIPCServer() {
    try {
      const ipcClient = await this.getIPCSocketClient();
      return ipcClient;
    } catch (e) {
      // console.log(e);
      return false;
    }
  }

  async getIPCSocketClient() {
    return await IPCSocketClient.getConnection(this.socketPath);
  }

  close() {
    this.server?.close();
    this.wsServer?.close();
  }

  static async getIPCSocketClient() {
    const socketPath = resolve(process.cwd(), process.env.SOCKET_PATH || 'storage/gateway.sock');
    try {
      return await IPCSocketClient.getConnection(socketPath);
    } catch (error) {
      return false;
    }
  }
}

export { WSServer } from './ws-server';
