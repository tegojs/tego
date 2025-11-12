import { Constructable } from '@tachybase/utils';

import { Token } from '../token.class';
import { ServiceIdentifier } from '../types/service-identifier.type';

/**
 * Helper function used in inject decorators to resolve the received identifier to
 * an eager type when possible or to a lazy type when cyclic dependencies are possibly involved.
 *
 * In Stage 3 decorators, type information is explicitly provided via the typeOrIdentifier parameter,
 * so we don't need reflect-metadata or target/property information.
 *
 * @param typeOrIdentifier a service identifier or a function returning a type acting as service identifier
 */
export function resolveToTypeWrapper(
  typeOrIdentifier: ((type?: never) => Constructable<unknown>) | ServiceIdentifier<unknown> | undefined,
): { eagerType: ServiceIdentifier | null; lazyType: (type?: never) => ServiceIdentifier } {
  /**
   * ? We want to error out as soon as possible when looking up services to inject, however
   * ? we cannot determine the type at decorator execution when cyclic dependencies are involved
   * ? because calling the received `() => MyType` function right away would cause a JS error:
   * ? "Cannot access 'MyType' before initialization", so we need to execute the function in the handler,
   * ? when the classes are already created. To overcome this, we use a wrapper:
   * ?  - the lazyType is executed in the handler so we never have a JS error
   * ?  - the eagerType is checked when decorator is running and an error is raised if an unknown type is encountered
   */
  let typeWrapper!: { eagerType: ServiceIdentifier | null; lazyType: (type?: never) => ServiceIdentifier };

  /** If requested type is explicitly set via a string ID or token, we set it explicitly. */
  if ((typeOrIdentifier && typeof typeOrIdentifier === 'string') || typeOrIdentifier instanceof Token) {
    typeWrapper = { eagerType: typeOrIdentifier, lazyType: () => typeOrIdentifier };
  }

  /** If requested type is explicitly set via a () => MyClassType format, we set it explicitly. */
  if (typeOrIdentifier && typeof typeOrIdentifier === 'function') {
    /** We set eagerType to null, preventing the raising of the CannotInjectValueError in decorators.  */
    typeWrapper = { eagerType: null, lazyType: () => (typeOrIdentifier as CallableFunction)() };
  }

  return typeWrapper;
}
