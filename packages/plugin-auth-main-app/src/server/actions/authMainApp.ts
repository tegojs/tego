import { Context } from '@tachybase/actions';
import { AppSupervisor } from '@tachybase/server';
import { Action, Controller } from '@tachybase/utils';

import { COLLECTION_AUTH_MAIN_APP_CONFIG, NAMESPACE } from '../../constants';

@Controller('authMainAppConfig')
export class AuthMainAppController {
  @Action('getMainUser', { acl: 'public' })
  async getMainUser(ctx: Context, next: () => Promise<any>) {
    if (ctx.app.name === 'main') {
      ctx.body = {};
      return next();
    }
    const { token } = ctx.action.params.values;
    // 走主程序换取用户信息
    const mainApp = await AppSupervisor.getInstance().getApp('main');
    const jwt = mainApp.authManager.jwt;

    let user;
    try {
      user = await jwt.decode(token);
    } catch (err) {
      ctx.throw(401, ctx.t('Please log in to the main application first', { ns: NAMESPACE }));
    }

    // 拥有管理权限
    const multiAppRepo = mainApp.db.getRepository('applications');
    const multiApp = await multiAppRepo.findOne({
      filter: {
        name: ctx.app.name,
        createdById: user.userId,
      },
    });
    if (!multiApp) {
      ctx.throw(
        403,
        ctx.t('Unable to manage this application, please exit the main application and change to a new account', {
          ns: NAMESPACE,
        }),
      );
    }

    const repo = ctx.db.getRepository('users');
    const root = await repo.findOne({
      filter: {
        specialRole: 'root',
      },
    });
    const tokenInfo = await mainApp.authManager.tokenController.add({ userId: root.id });
    const expiresIn = Math.floor((await mainApp.authManager.tokenController.getConfig()).tokenExpirationTime / 1000);
    const newToken = ctx.app.authManager.jwt.sign(
      {
        userId: root.id,
        temp: true,
        iat: Math.floor(tokenInfo.issuedTime / 1000),
        signInTime: tokenInfo.signInTime,
      },
      {
        jwtid: tokenInfo.jti,
        expiresIn,
      },
    );
    const mainUserRepo = mainApp.db.getRepository('users');
    const userInfo = await mainUserRepo.findOne({
      fields: ['username', 'nickname', 'phone'],
      filter: {
        id: user.userId,
      },
      raw: true,
    });
    ctx.body = {
      ...userInfo,
      token: newToken,
    };
    return next();
  }

  @Action('get', { acl: 'public' })
  async get(ctx: Context, next: () => Promise<any>) {
    const repo = ctx.db.getRepository(COLLECTION_AUTH_MAIN_APP_CONFIG);
    const existOne = await repo.findOne();
    ctx.body = existOne;
    return next();
  }

  @Action('set', { acl: 'public' })
  async set(ctx: Context, next: () => Promise<any>) {
    const { selfSignIn, authMainApp } = ctx.action.params.values;
    if (ctx.app.name === 'main' && !selfSignIn) {
      ctx.throw(400, ctx.t('Unable to disable all authenticators in the main application.', { ns: NAMESPACE }));
    }

    if (!selfSignIn && !authMainApp) {
      ctx.throw(400, ctx.t('It is impossible to delete all login verification methods.', { ns: NAMESPACE }));
    }

    const repo = ctx.db.getRepository(COLLECTION_AUTH_MAIN_APP_CONFIG);
    const existOne = await repo.findOne();
    if (!existOne) {
      await repo.create({
        values: {
          selfSignIn,
          authMainApp,
        },
      });
    } else {
      await repo.update({
        filterByTk: existOne.id,
        values: {
          selfSignIn,
          authMainApp,
        },
      });
    }
    ctx.body = 'ok';
    return next();
  }
}
