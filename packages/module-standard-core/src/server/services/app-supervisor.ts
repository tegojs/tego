import { EventEmitter } from 'node:events';
import { applyMixins, AsyncEmitter } from '@tachybase/utils';
import { TOKENS, type Tego } from '@tego/core';

export type AppStatus = 'initializing' | 'initialized' | 'running' | 'stopped' | 'error';

export class AppSupervisor extends EventEmitter implements AsyncEmitter {
  private static instance: AppSupervisor | null = null;
  declare emitAsync: (event: string | symbol, ...args: any[]) => Promise<boolean>;

  private status: AppStatus = 'initializing';
  private error: Error | null = null;

  private constructor(private readonly tego: Tego) {
    super();
    this.bindTegoLifecycle(tego);
  }

  static initialize(tego: Tego) {
    if (!this.instance) {
      this.instance = new AppSupervisor(tego);
    }
    return this.instance;
  }

  static getInstance(): AppSupervisor {
    if (!this.instance) {
      throw new Error('AppSupervisor has not been initialized. Did you forget to load StandardCorePlugin?');
    }
    return this.instance;
  }

  getAppStatus(appName: string, defaultStatus?: AppStatus): AppStatus {
    if (appName !== this.tego.name) {
      return defaultStatus ?? 'not_found';
    }
    return this.status;
  }

  setAppStatus(_appName: string, status: AppStatus, options: any = {}) {
    this.status = status;
    if (options?.error instanceof Error) {
      this.error = options.error;
    }
    this.emit('appStatusChanged', { appName: this.tego.name, status, options });
  }

  hasApp(appName: string) {
    return appName === this.tego.name;
  }

  getApp(appName: string) {
    if (!this.hasApp(appName)) {
      return null;
    }
    return this.tego;
  }

  async removeApp(appName: string) {
    if (!this.hasApp(appName)) {
      return;
    }
    await this.tego.destroy();
    this.setAppStatus(appName, 'stopped');
  }

  touchApp(_appName: string) {
    // no-op for single app mode
  }

  async bootMainApp(_options: any = {}) {
    this.setAppStatus(this.tego.name, 'initialized');
    return this.tego;
  }

  getAppError(appName: string) {
    if (appName !== this.tego.name) {
      return null;
    }
    return this.error;
  }

  destroy() {
    AppSupervisor.instance = null;
  }

  private bindTegoLifecycle(tego: Tego) {
    tego.on('tego:beforeStart', () => {
      this.setAppStatus(tego.name, 'initializing');
    });

    tego.on('tego:started', () => {
      this.setAppStatus(tego.name, 'running');
    });

    tego.on('tego:beforeStop', () => {
      this.setAppStatus(tego.name, 'initialized');
    });

    tego.on('tego:afterDestroy', () => {
      this.setAppStatus(tego.name, 'stopped');
    });
  }
}

applyMixins(AppSupervisor, [AsyncEmitter]);

export const registerAppSupervisor = (tego: Tego) => {
  const supervisor = AppSupervisor.initialize(tego);
  tego.container.set({ id: TOKENS.AppSupervisor, value: supervisor });
  return supervisor;
};
