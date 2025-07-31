import { Context, Next } from '@tachybase/actions';
import { ActionDef, App, Container, Inject, Service } from '@tachybase/di';

import Application from '../application';

@Service()
export class WebControllerService {
  @App()
  private app: Application;

  @Inject('actions')
  private actions: Map<Function, any>;

  allow(name, actionName, acl) {
    this.app.acl.allow(name, actionName, acl || 'loggedIn');
  }

  async load() {
    // register resources and actions
    if (!Container.has('controller')) {
      // when init, controller is not in container
      return;
    }
    const controllers = Container.getMany('controller');
    controllers.forEach((instance: object) => {
      const items = this.actions.get(instance.constructor) as ActionDef[];
      const resourceItems = items.filter((item) => item.type === 'resource');
      if (resourceItems.length === 0) {
        return;
      }
      const resource = {
        name: resourceItems[0].resourceName,
        actions: {},
      };
      const actionItems = items.filter((item) => item.type === 'action');
      this.app.logger.debug(`register resource [${resource.name}]`);
      actionItems.forEach((item) => {
        resource.actions[item.actionName] = async (ctx: Context, next: Next) => await instance[item.method](ctx, next);
        this.allow(resource.name, item.actionName, item.options?.acl || '');
        this.app.logger.debug(`register resource [${resource.name}] action [${item.actionName}]`);
      });
      this.app.resource(resource);
    });
  }
}
