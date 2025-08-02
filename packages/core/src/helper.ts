import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { createHistogram, RecordableHistogram } from 'node:perf_hooks';
import { requestLogger } from '@tachybase/logger';
import { Resourcer } from '@tachybase/resourcer';
import { uid } from '@tachybase/utils';

import cors from '@koa/cors';
import { Command } from 'commander';
import i18next, { type i18n as TypeI18n } from 'i18next';
import bodyParser from 'koa-bodyparser';

import Application, { ApplicationOptions } from './application';
import { dataWrapping } from './middlewares/data-wrapping';
import { db2resource } from './middlewares/db2resource';
import { extractClientIp } from './middlewares/extract-client-ip';
import { i18n } from './middlewares/i18n';

export function createI18n(options: ApplicationOptions): TypeI18n {
  const instance = i18next.createInstance();
  instance.init({
    lng: 'en-US',
    resources: {},
    keySeparator: false,
    nsSeparator: false,
    ...options.i18n,
  });
  return instance;
}

export function createResourcer(options: ApplicationOptions) {
  return new Resourcer({ ...options.resourcer });
}

export function registerMiddlewares(app: Application, options: ApplicationOptions) {
  app.use(
    async (ctx, next) => {
      app.context.reqId = randomUUID();
      await next();
    },
    { tag: 'UUID' },
  );

  app.use(requestLogger(app.name, options.logger?.request), { tag: 'logger' });

  app.use(
    cors({
      exposeHeaders: ['content-disposition'],
      ...options.cors,
    }),
    {
      tag: 'cors',
      after: 'bodyParser',
    },
  );

  if (options.bodyParser !== false) {
    const bodyLimit = '10mb';
    app.use(
      bodyParser({
        enableTypes: ['json', 'form', 'xml'],
        jsonLimit: bodyLimit,
        formLimit: bodyLimit,
        textLimit: bodyLimit,
        ...options.bodyParser,
      }),
      {
        tag: 'bodyParser',
        after: 'logger',
      },
    );
  }

  app.use(
    async (ctx, next) => {
      ctx.getBearerToken = () => {
        const token = ctx.get('Authorization').replace(/^Bearer\s+/gi, '');
        return token || ctx.query.token;
      };
      await next();
    },
    { tag: 'authorization' },
  );

  app.use(i18n, { tag: 'i18n', after: 'cors' });

  if (options.dataWrapping !== false) {
    app.use(dataWrapping(), { tag: 'dataWrapping', after: 'i18n' });
  }

  app.use(db2resource, { tag: 'db2resource', after: 'dataWrapping' });
  app.use(app.dataSourceManager.middleware(), { tag: 'dataSource', after: 'dataWrapping' });

  app.use(extractClientIp(), { tag: 'extractClientIp', before: 'cors' });
}

export const createAppProxy = (app: Application) => {
  return new Proxy(app, {
    get(target, prop, ...args) {
      if (typeof prop === 'string' && ['on', 'once', 'addListener'].includes(prop)) {
        return (eventName: string, listener: any) => {
          listener['_reinitializable'] = true;
          return target[prop](eventName, listener);
        };
      }
      return Reflect.get(target, prop, ...args);
    },
  });
};

export const getCommandFullName = (command: Command) => {
  const names = [];
  names.push(command.name());
  let parent = command?.parent;
  while (parent) {
    if (!parent?.parent) {
      break;
    }
    names.unshift(parent.name());
    parent = parent.parent;
  }
  return names.join('.');
};

export const tsxRerunning = async () => {
  const file = resolve(process.cwd(), 'storage/app.watch.ts');
  await fs.promises.writeFile(file, `export const watchId = '${uid()}';`, 'utf-8');
};

export const enablePerfHooks = (app: Application) => {
  app.context.getPerfHistogram = (name: string) => {
    if (!app.perfHistograms.has(name)) {
      app.perfHistograms.set(name, createHistogram());
    }
    return app.perfHistograms.get(name);
  };

  app.resourcer.define({
    name: 'perf',
    actions: {
      view: async (ctx, next) => {
        const result = {};
        const histograms = ctx.app.perfHistograms as Map<string, RecordableHistogram>;
        const sortedHistograms = [...histograms.entries()].sort(([i, a], [j, b]) => b.mean - a.mean);
        sortedHistograms.forEach(([name, histogram]) => {
          result[name] = histogram;
        });
        ctx.body = result;
        await next();
      },
      reset: async (ctx, next) => {
        const histograms = ctx.app.perfHistograms as Map<string, RecordableHistogram>;
        histograms.forEach((histogram: RecordableHistogram) => histogram.reset());
        await next();
      },
    },
  });

  app.acl.allow('perf', '*', 'public');
};
