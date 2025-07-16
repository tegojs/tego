import { Context, Next } from '@tachybase/actions';
import Database from '@tachybase/database';
import { Application, Logger } from '@tachybase/server';
import { App, Db, InjectLog, Service } from '@tachybase/utils';

import { COLLECTION_AUTH_MAIN_APP_CONFIG, NAMESPACE } from '../../constants';

@Service()
export class AuthMainAppService {
  @Db()
  db: Database;

  @App()
  app: Application;

  @InjectLog()
  private logger: Logger;

  private selfSignIn: boolean = true;

  private authMainApp: boolean = true;

  async load() {
    this.addMiddleWare();

    this.app.on('afterStart', async () => {
      await this.checkInstall();
      const config = await this.db.getRepository(COLLECTION_AUTH_MAIN_APP_CONFIG).findOne();
      if (config) {
        this.selfSignIn = config.selfSignIn;
        this.authMainApp = config.authMainApp;
      }
    });

    this.db.on(`${COLLECTION_AUTH_MAIN_APP_CONFIG}.afterSave`, (model) => {
      this.selfSignIn = model.get('selfSignIn');
      this.authMainApp = model.get('authMainApp');
    });
  }

  async checkInstall() {
    const repo = this.db.getRepository(COLLECTION_AUTH_MAIN_APP_CONFIG);
    const existOne = await repo.findOne();
    if (!existOne) {
      await repo.create({
        values: {
          selfSignIn: true,
          authMainApp: true,
        },
      });
    }
  }

  addMiddleWare() {
    this.app.resourcer.use(
      async (ctx: Context, next: Next) => {
        if (ctx.app.name === 'main') {
          return next();
        }
        const { resourceName, actionName } = ctx.action.params;
        await next();
        if (resourceName === 'authenticators' && actionName === 'publicList') {
          if (!this.selfSignIn) {
            ctx.body = [];
          }
          ctx.body.unshift({
            name: ctx.t('Main app signIn', { ns: NAMESPACE }),
            authType: 'mainApp',
            authTypeTitle: 'main app',
          });
        }
      },
      {
        tag: 'forbidSignIn',
        after: 'acl',
      },
    );
  }
}
