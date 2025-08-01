import { Container } from './container-instance.class';

export * from './decorators/inject-many.decorator';
export * from './decorators/inject.decorator';
export * from './decorators/service.decorator';

export * from './error/cannot-inject-value.error';
export * from './error/cannot-instantiate-value.error';
export * from './error/service-not-found.error';

export type { Handler } from './interfaces/handler.interface';
export type { ServiceMetadata } from './interfaces/service-metadata.interface';
export type { ServiceOptions } from './interfaces/service-options.interface';
export type { Constructable } from './types/constructable.type';
export type { ServiceIdentifier } from './types/service-identifier.type';

export { ContainerInstance, Container } from './container-instance.class';
export { Token } from './token.class';

export default Container;

export * from './decorators';
