import { ContainerInstance } from '../container-instance.class';
import { EMPTY_VALUE } from '../empty.const';
import { ServiceMetadata } from '../interfaces/service-metadata.interface';
import { ServiceOptions } from '../interfaces/service-options.interface';
import { Constructable } from '../types/constructable.type';

/**
 * Marks class as a service that can be injected using Container.
 */

export function Service<T = unknown>(): Function;
export function Service<T = unknown>(options: ServiceOptions<T>): Function;
export function Service<T>(options: ServiceOptions<T> = {}) {
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
