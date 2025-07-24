import { Context, Next } from '@tachybase/actions';
import { Application, AppSupervisor } from '@tachybase/server';

import { NAMESPACE, NOTIFY_STATUS_EVENT_KEY } from '../../constants';

export async function start(ctx: Context, next: Next) {
  const targetAppId = String(ctx.request.url.split('filterByTk=')[1]);
  const appSupervisor = AppSupervisor.getInstance();
  if (!appSupervisor.hasApp(targetAppId)) {
    appSupervisor.blockApps.delete(targetAppId);
    AppSupervisor.getInstance().getApp(targetAppId);
    ctx.body = 'ok';
    await next();
  } else {
    ctx.throw(205, ctx.t('App already started', { ns: NAMESPACE }));
  }
}

export async function stop(ctx: Context, next: Next) {
  const targetAppId = String(ctx.request.url.split('filterByTk=')[1]);
  const appSupervisor = AppSupervisor.getInstance();
  if (appSupervisor.hasApp(targetAppId)) {
    appSupervisor.blockApps.add(targetAppId);
    appSupervisor.removeApp(targetAppId);
    ctx.body = 'ok';
    await next();
  } else {
    ctx.throw(400, ctx.t('App already stopped', { ns: NAMESPACE }));
  }
}

export async function listPinned(ctx: Context, next: Next) {
  const items = await ctx.db.getRepository('applications').find({
    filter: {
      pinned: true,
    },
  });
  ctx.body = items;
  await next();
}

export async function create(ctx: Context, next: Next) {
  const params = ctx.action.params;
  const tmpl = params.values?.tmpl;
  if (tmpl) {
    const startEnvs = params.values?.options?.startEnvs;
    if (startEnvs) {
      const dbDialect = startEnvs.split('\n').find((line) => line.startsWith('DB_DIALECT='));
      if (dbDialect) {
        const dbType = dbDialect.split('=')[1].trim();
        if (dbType !== 'postgres') {
          ctx.throw(
            400,
            ctx.t('This database does not support to create application using template', { ns: NAMESPACE }),
          );
        }
      }
    }
    const dbType = ctx.db.options.dialect;
    if (dbType !== 'postgres') {
      ctx.throw(400, ctx.t('This database does not support to create application using template', { ns: NAMESPACE }));
    }
    const matchedApp = await ctx.db.getRepository('applications').find({
      filter: {
        name: tmpl,
      },
    });
    if (matchedApp.length === 0) {
      ctx.throw(400, ctx.t('Template not exists', { ns: NAMESPACE }));
    }
    const appStatus = AppSupervisor.getInstance().getAppStatus(tmpl, 'initialized');
    if (appStatus !== 'stopped' && appStatus !== 'initialized') {
      ctx.throw(400, ctx.t('Template is in use', { ns: NAMESPACE }));
    }
  }
  const app = await ctx.db.getRepository('applications').create({
    values: {
      ...params.values,
      createdBy: ctx.state.currentUser.id,
      updatedBy: ctx.state.currentUser.id,
    },
  });
  ctx.body = app;
  await next();
}

export async function startAll(ctx: Context, next: Next) {
  const db = ctx.db;
  const appSupervisor = AppSupervisor.getInstance();
  const existNames = await appSupervisor.getAppsNames();
  const applications = await db.getRepository('applications').find({
    fields: ['name', 'options'],
    filter: {
      name: {
        $notIn: existNames,
      },
    },
    raw: true,
  });
  let count = 0;
  const all = applications.length;
  appSupervisor.blockApps.clear();
  if (all) {
    const messageTitle = ctx.t('Start count', { ns: NAMESPACE });
    Promise.allSettled(
      applications.map(async (app) => {
        return appSupervisor.bootStrapApp(app.name, app.options).then(() => {
          count++;
        });
      }),
    ).finally(() => {
      const message = `${messageTitle}: ${count}/${all}`;
      ctx.app.noticeManager.notify(NOTIFY_STATUS_EVENT_KEY, { level: 'info', message });
    });
  }
  ctx.body = {
    all,
  };
}

export async function stopAll(ctx: Context, next: Next) {
  const appSupervisor = AppSupervisor.getInstance();
  const subApps = await appSupervisor.getAppsNames();
  const promises = [];
  let count = 0;
  let all = 0;
  const messageTitle = ctx.t('Stop count', { ns: NAMESPACE });
  for (const name of subApps) {
    if (name === 'main') {
      continue;
    }
    all++;
    promises.push(
      appSupervisor.removeApp(name).then(() => {
        appSupervisor.blockApps.add(name);
        count++;
      }),
    );
  }
  if (all) {
    Promise.allSettled(promises).finally(() => {
      const message = `${messageTitle}: ${count}/${all}`;
      ctx.app.noticeManager.notify(NOTIFY_STATUS_EVENT_KEY, { level: 'info', message });
    });
  }
  ctx.body = {
    all,
  };
}

export async function share(ctx: Context, next: Next) {
  const { filterByTk } = ctx.action.params;
  const { partners } = ctx.action.params.values;

  const repo = ctx.db.getRepository('applications');
  await repo.update({
    filterByTk,
    values: {
      partners: partners,
    },
  });
}
