import { randomUUID } from 'node:crypto';
import { requestLogger } from '@tachybase/logger';
import { TOKENS, type Tego } from '@tego/core';

import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';

import { dataWrapping } from './data-wrapping';
import { db2resource } from './db2resource';
import { extractClientIp } from './extract-client-ip';
import { i18n } from './i18n';
import { parseVariables } from './parse-variables';

export const registerMiddlewares = (tego: Tego) => {
  if (!tego.container.has(TOKENS.KoaApp)) {
    throw new Error('Koa application not registered. Ensure gateway is initialized before middlewares.');
  }

  const koa = tego.container.get(TOKENS.KoaApp);
  const logger = tego.container.get(TOKENS.Logger);
  const database = tego.container.has(TOKENS.Database) ? tego.container.get(TOKENS.Database) : undefined;
  const resourcer = tego.container.has(TOKENS.Resourcer) ? tego.container.get(TOKENS.Resourcer) : undefined;
  const acl = tego.container.has(TOKENS.ACL) ? tego.container.get(TOKENS.ACL) : undefined;
  const localeManager = tego.container.has(TOKENS.Locale) ? tego.container.get(TOKENS.Locale) : undefined;

  koa.context.tego = tego;
  koa.context.logger = logger;
  koa.context.db = database;
  koa.context.resourcer = resourcer;
  koa.context.acl = acl;
  koa.context.localeManager = localeManager;

  koa.use(async (ctx, next) => {
    ctx.reqId = randomUUID();
    ctx.state = ctx.state || {};
    await next();
  });

  koa.use(requestLogger(tego.name, tego.options?.logger?.request));

  koa.use(
    cors({
      exposeHeaders: ['content-disposition'],
      ...tego.options?.cors,
    }),
  );

  if (tego.options?.bodyParser !== false) {
    const bodyLimit = '10mb';
    koa.use(
      bodyParser({
        enableTypes: ['json', 'form', 'xml'],
        jsonLimit: bodyLimit,
        formLimit: bodyLimit,
        textLimit: bodyLimit,
        ...tego.options?.bodyParser,
      }),
    );
  }

  koa.use((ctx, next) => {
    ctx.getBearerToken = () => {
      const token = ctx.get('Authorization')?.replace(/^Bearer\s+/gi, '');
      return token || (ctx.query?.token as string);
    };
    return next();
  });

  koa.use(extractClientIp());
  koa.use(i18n);
  koa.use(parseVariables);
  koa.use(dataWrapping());
  koa.use(db2resource);
};

export { dataWrapping } from './data-wrapping';
export { db2resource } from './db2resource';
export { parseVariables } from './parse-variables';
export { extractClientIp } from './extract-client-ip';
export { i18n } from './i18n';
