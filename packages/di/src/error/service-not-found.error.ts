import { Token } from '../token.class';
import { ServiceIdentifier } from '../types/service-identifier.type';

/**
 * Thrown when requested service was not found.
 */
export class ServiceNotFoundError extends Error {
  public name = 'ServiceNotFoundError';

  /** Normalized identifier name used in the error message. */
  private normalizedIdentifier = '<UNKNOWN_IDENTIFIER>';

  get message(): string {
    return (
      `Service with "${this.normalizedIdentifier}" identifier was not found in the container. ` +
      `Register it before usage via explicitly calling the "Container.set" function or using the "@Service()" decorator.`
    );
  }

  constructor(identifier: ServiceIdentifier) {
    super();

    if (typeof identifier === 'string') {
      this.normalizedIdentifier = identifier;
    } else if (identifier instanceof Token) {
      this.normalizedIdentifier = `Token<${identifier.name || 'UNSET_NAME'}>`;
    } else if (identifier && (identifier.name || identifier.prototype?.name)) {
      this.normalizedIdentifier = identifier.name
        ? `MaybeConstructable<${identifier.name}>`
        : `MaybeConstructable<${(identifier.prototype as { name: string })?.name}>`;
    }
  }
}
