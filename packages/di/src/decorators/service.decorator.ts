import { Constructable } from '@tachybase/utils';

import { ContainerInstance } from '../container-instance.class';
import { EMPTY_VALUE } from '../empty.const';
import { ServiceMetadata } from '../interfaces/service-metadata.interface';
import { ServiceOptions } from '../interfaces/service-options.interface';

/**
 * Marks class as a service that can be injected using Container.
 *
 * @example
 * // Simple service
 * @Service()
 * class MyService {}
 *
 * // Service with options
 * @Service({ scope: 'singleton' })
 * class MySingletonService {}
 *
 * // Service with custom ID
 * @Service({ id: 'myService' })
 * class MyService {}
 *
 * // Multiple services with same ID
 * @Service({ id: 'logger', multiple: true })
 * class ConsoleLogger {}
 */
export function Service<T = unknown>(options: ServiceOptions<T> = {}): Function {
  return (target: Constructable<T>, context: ClassDecoratorContext) => {
    const serviceMetadata: ServiceMetadata<T> = {
      id: options.id || target,
      type: target,
      factory: (options as any).factory || undefined,
      multiple: options.multiple || false,
      eager: options.eager || false,
      scope: options.scope || 'container',
      referencedBy: new Map().set(ContainerInstance.default.id, ContainerInstance.default),
      value: EMPTY_VALUE,
    };

    ((context.metadata.injects as any[]) || []).forEach((inject) => {
      inject(target);
    });

    ContainerInstance.default.set(serviceMetadata);
    return target;
  };
}
