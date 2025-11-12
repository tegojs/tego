import { TOKENS, type Tego } from '@tego/core';

export function getDatabaseOrThrow(app: Tego) {
  if (!app.container.has(TOKENS.Database)) {
    throw new Error('Database service is not registered. Ensure StandardCorePlugin is loaded.');
  }
  return app.container.get(TOKENS.Database);
}
