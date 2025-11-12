import { Constructable } from '@tachybase/utils';

import { Container } from './container-instance.class';
import { Inject } from './decorators/inject.decorator';
import { Service } from './decorators/service.decorator';

export interface ActionDef {
  type: string;
  resourceName?: string;
  actionName?: string;
  method?: string;
  options?: {
    acl?: 'loggedIn' | 'public' | 'private';
  };
}

// init actions
Container.set({ id: 'actions', value: new Map<Function, ActionDef[]>() });

/**
 * Convenience decorator to inject 'app' service.
 * @example
 * class MyService {
 *   @App()
 *   private app!: Application;
 * }
 */
export function App() {
  return Inject('app');
}

/**
 * Convenience decorator to inject 'db' service.
 * @example
 * class MyService {
 *   @Db()
 *   private db!: Database;
 * }
 */
export function Db() {
  return Inject('db');
}

/**
 * Convenience decorator to inject 'logger' service.
 * @example
 * class MyService {
 *   @InjectLog()
 *   private logger!: Logger;
 * }
 */
export function InjectLog() {
  return Inject('logger');
}

/**
 * Marks a class as a controller and registers it with the given resource name.
 * Controllers are automatically registered as multiple services.
 *
 * @param name - The resource name for this controller
 * @example
 * @Controller('users')
 * class UserController {
 *   @Action('list')
 *   async list() {
 *     // Handle list action
 *   }
 * }
 */
export function Controller(name: string) {
  return function (target: any, context: ClassDecoratorContext) {
    const serviceOptions = { id: 'controller', multiple: true };
    Service(serviceOptions)(target, context);
    const actions = Container.get('actions') as Map<Function, ActionDef[]>;
    if (!actions.has(target)) {
      actions.set(target, []);
    }
    actions.get(target).push({
      type: 'resource',
      resourceName: name,
    });
  };
}

/**
 * Marks a method as an action handler within a controller.
 *
 * @param name - The action name
 * @param options - Action options including ACL settings
 * @example
 * @Controller('users')
 * class UserController {
 *   @Action('list', { acl: 'public' })
 *   async list() {
 *     return await this.userService.findAll();
 *   }
 *
 *   @Action('create', { acl: 'loggedIn' })
 *   async create(data: CreateUserDto) {
 *     return await this.userService.create(data);
 *   }
 * }
 */
export function Action(
  name: string,
  options?: {
    acl?: 'loggedIn' | 'public' | 'private';
  },
) {
  return function (_: any, context: ClassMethodDecoratorContext) {
    if (!context.metadata.injects) {
      context.metadata.injects = [];
    }
    (context.metadata.injects as any[]).push((target: Constructable<unknown>) => {
      const actions = Container.get('actions') as Map<Function, ActionDef[]>;
      if (!actions.has(target)) {
        actions.set(target, []);
      }
      actions.get(target).push({
        type: 'action',
        method: String(context.name),
        actionName: name,
        options: options || { acl: 'private' },
      });
    });
  };
}
