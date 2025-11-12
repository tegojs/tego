import { Constructable } from '@tachybase/utils';

import { ContainerInstance } from '../container-instance.class';
import { CannotInjectValueError } from '../error/cannot-inject-value.error';
import { Token } from '../token.class';
import { ServiceIdentifier } from '../types/service-identifier.type';
import { resolveToTypeWrapper } from '../utils/resolve-to-type-wrapper.util';

/**
 * Injects a service into a class property.
 *
 * @example
 * // Inject by type function (for circular dependencies)
 * @Inject(() => MyService)
 * private myService!: MyService;
 *
 * // Inject by string identifier
 * @Inject('myService')
 * private myService!: MyService;
 *
 * // Inject by token
 * @Inject(MY_TOKEN)
 * private myService!: MyService;
 */
export function Inject(
  typeOrIdentifier?: ((type?: never) => Constructable<unknown>) | ServiceIdentifier<unknown>,
): Function {
  return function (_: any, context: ClassFieldDecoratorContext) {
    if (!context.metadata.injects) {
      context.metadata.injects = [];
    }
    (context.metadata.injects as any[]).push((target: Constructable<unknown>) => {
      const typeWrapper = resolveToTypeWrapper(typeOrIdentifier);

      /** If no type was inferred, or the general Object type was inferred we throw an error. */
      if (typeWrapper === undefined || typeWrapper.eagerType === undefined || typeWrapper.eagerType === Object) {
        throw new CannotInjectValueError(target as Constructable<unknown>, context.name as string);
      }

      ContainerInstance.default.registerHandler({
        object: target as Constructable<unknown>,
        propertyName: context.name as string,
        value: (containerInstance) => {
          const evaluatedLazyType = typeWrapper.lazyType();

          /** If no type was inferred lazily, or the general Object type was inferred we throw an error. */
          if (evaluatedLazyType === undefined || evaluatedLazyType === Object) {
            throw new CannotInjectValueError(target as Constructable<unknown>, context.name as string);
          }

          return containerInstance.get<unknown>(evaluatedLazyType);
        },
      });
    });
  };
}
