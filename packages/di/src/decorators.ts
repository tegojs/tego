import { Container } from './container-instance.class';
import { Inject } from './decorators/inject.decorator';
import { Service } from './decorators/service.decorator';
import { Constructable } from './types/constructable.type';

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

export function App() {
  return Inject('app');
}

export function Db() {
  return Inject('db');
}

export function InjectLog() {
  return Inject('logger');
}

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
