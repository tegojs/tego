/**
 * Minimal Logger interface for Tego core.
 * This interface is not dependent on any specific logging library (like winston).
 * Plugins can provide their own implementations.
 */
export interface Logger {
  /**
   * Log an error message
   */
  error(message: string, meta?: any): void;

  /**
   * Log a warning message
   */
  warn(message: string, meta?: any): void;

  /**
   * Log an info message
   */
  info(message: string, meta?: any): void;

  /**
   * Log a debug message
   */
  debug(message: string, meta?: any): void;

  /**
   * Create a child logger with additional context
   */
  child(meta: any): Logger;
}

/**
 * Basic console-based logger implementation
 */
export class ConsoleLogger implements Logger {
  constructor(private context: any = {}) {}

  error(message: string, meta?: any): void {
    console.error('[ERROR]', message, { ...this.context, ...meta });
  }

  warn(message: string, meta?: any): void {
    console.warn('[WARN]', message, { ...this.context, ...meta });
  }

  info(message: string, meta?: any): void {
    console.info('[INFO]', message, { ...this.context, ...meta });
  }

  debug(message: string, meta?: any): void {
    console.debug('[DEBUG]', message, { ...this.context, ...meta });
  }

  child(meta: any): Logger {
    return new ConsoleLogger({ ...this.context, ...meta });
  }
}
