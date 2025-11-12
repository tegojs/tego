import { EventEmitter } from 'node:events';
import http from 'node:http';
import { resolve } from 'node:path';
import { TOKENS, type Tego } from '@tego/core';

import Koa from 'koa';

import { AppSupervisor } from '../app-supervisor';
import { registerMiddlewares } from '../middlewares';
import { registerNoticeManager } from '../notice';
import { registerSyncMessageManager } from '../sync-message-manager';
import { IPCSocketServer } from './ipc-socket-server';
import { GatewayOptions } from './types';
import { WSServer } from './ws-server';

export class Gateway extends EventEmitter {
  private static instance: Gateway | null = null;

  readonly koa: Koa;
  readonly httpServer: http.Server;
  readonly wsServer: WSServer;
  readonly ipcServer: IPCSocketServer;

  private constructor(
    private readonly tego: Tego,
    private readonly options: GatewayOptions,
  ) {
    super();

    this.koa = new Koa();
    (this.koa.context as any).tego = tega;
    (this.koa.context as any).state = {};

    (tego as any).koa = this.koa;
    (tego as any).use = this.koa.use.bind(this.koa);
    (tego as any).callback = () => this.koa.callback();

    tego.container.set({ id: TOKENS.KoaApp, value: this.koa });

    registerMiddlewares(tego);

    this.httpServer = http.createServer(this.koa.callback());
    this.wsServer = new WSServer(this.httpServer, this.options.wsPath ?? process.env.WS_PATH ?? '/ws');
    tego.container.set({ id: TOKENS.WSServer, value: this.wsServer });

    const socketPath = this.options.ipcSocketPath ?? resolve(process.env.TEGO_RUNTIME_HOME, 'storage/gateway.sock');
    this.ipcServer = IPCSocketServer.buildServer(socketPath);
    tego.container.set({ id: TOKENS.IPCSocketServer, value: this.ipcServer });

    registerNoticeManager(tego, this);
    registerSyncMessageManager(tego);

    tego.on('tego:started', () => this.start());
    tego.on('tego:beforeStop', () => this.stop());
  }

  static initialize(tego: Tego, options: GatewayOptions = {}) {
    if (!this.instance) {
      this.instance = new Gateway(tego, options);
    }
    return this.instance;
  }

  static getInstance() {
    if (!this.instance) {
      throw new Error('Gateway has not been initialized. Did you forget to load StandardCorePlugin?');
    }
    return this.instance;
  }

  start() {
    const port = this.options.port ?? Number(process.env.APP_PORT ?? 3000);
    const host = this.options.host ?? process.env.APP_HOST ?? '0.0.0.0';

    if (this.httpServer.listening) {
      return;
    }

    this.httpServer.listen(port, host, () => {
      this.tego.logger.info(`Gateway listening on http://${host}:${port}`);
    });
  }

  stop() {
    if (this.httpServer.listening) {
      this.httpServer.close();
    }
    this.wsServer.close();
    this.ipcServer.close();
  }

  getWebSocketServer() {
    return this.wsServer;
  }
}

export const registerGateway = (tego: Tego, options: GatewayOptions = {}) => {
  const supervisor = AppSupervisor.getInstance();
  supervisor.bootMainApp();

  const gateway = Gateway.initialize(tego, options);
  tego.container.set({ id: TOKENS.Gateway, value: gateway });
  return gateway;
};
