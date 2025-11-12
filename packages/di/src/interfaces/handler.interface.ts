import { Constructable } from '@tachybase/utils';

import { ContainerInstance } from '../container-instance.class';

/**
 * Used to register special "handler" which will be executed on a service class during its initialization.
 * It can be used to create custom decorators and set/replace service class properties.
 *
 * Note: Stage 3 decorators only support class and class member decorators.
 * Constructor parameter decorators are not supported.
 */
export interface Handler<T = unknown> {
  /**
   * Service object used to apply handler to.
   */
  object: Constructable<T>;

  /**
   * Class property name to set/replace value of.
   * Used when handler is applied on a class property.
   */
  propertyName: string;

  /**
   * Factory function that produces value that will be set to the class property.
   * Accepts container instance which requested the value.
   */
  value: (container: ContainerInstance) => any;
}
