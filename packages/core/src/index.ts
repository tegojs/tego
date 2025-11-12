// Export new minimal Tego
export * from './tego';
export { Tego, Application } from './tego';
export { Tego as default } from './tego';

// Keep old application.ts for reference but mark as deprecated
// export * from './application'; // REMOVED - use Tego instead
export * as middlewares from './middlewares';
export * from './migration';
export * from './plugin';
export * from './plugin-manager';
export * from './gateway';
export * from './app-supervisor';
export * from './notice';
export { AesEncryptor } from './aes-encryptor';
export * from './logger';
export * from './event-bus';
export * from './tokens';
export * from './ipc-socket-client';
export * from './ipc-socket-server';
