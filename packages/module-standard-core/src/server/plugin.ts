import { Plugin } from '@tego/server';

export class ModuleStandardCorePlugin extends Plugin {
  async beforeLoad() {
    // Initialize services before load
  }

  async load() {
    // Register all services to DI container
    // This will be implemented in later phases
  }

  async install() {
    // One-time installation logic
  }
}
