import { Constructable } from '@tachybase/utils';

/**
 * Thrown when DI cannot inject value into property decorated by @Inject decorator.
 */
export class CannotInjectValueError extends Error {
  public name = 'CannotInjectValueError';

  get message(): string {
    // target is always a class constructor (Constructable), so we can safely access .name
    const targetName = this.target.name || 'Unknown';
    return (
      `Cannot inject value into "${targetName}.${this.propertyName}". ` +
      `Please make sure you provide a type function (() => MyType), string identifier, or Token as the @Inject() parameter. ` +
      `Interfaces and types cannot be used directly as they don't exist at runtime.`
    );
  }

  constructor(
    private target: Constructable<unknown>,
    private propertyName: string,
  ) {
    super();
  }
}
