import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Container, ContainerInstance, Inject, InjectMany, Service, Token } from '../index';

describe('Integration Tests', () => {
  let container: ContainerInstance;

  beforeEach(() => {
    container = new ContainerInstance(`integration-test-${Math.random()}`);
    Container.reset({ strategy: 'resetServices' });
  });

  afterEach(() => {
    container.reset({ strategy: 'resetServices' });
    Container.reset({ strategy: 'resetServices' });
  });

  describe('Real-world Application Scenarios', () => {
    it('should handle plugin system with multiple implementations', () => {
      // Plugin interface
      const PluginToken = new Token<Plugin>('plugin');

      interface Plugin {
        name: string;
        execute(): string;
      }

      // Plugin implementations
      @Service({ id: PluginToken, multiple: true })
      class LoggingPlugin implements Plugin {
        public name = 'logging';

        execute() {
          return 'logging executed';
        }
      }

      @Service({ id: PluginToken, multiple: true })
      class CachingPlugin implements Plugin {
        public name = 'caching';

        execute() {
          return 'caching executed';
        }
      }

      // Plugin manager
      @Service()
      class PluginManager {
        @InjectMany(PluginToken)
        public plugins!: Plugin[];

        public executeAll() {
          return this.plugins.map((plugin) => plugin.execute());
        }
      }

      const manager = Container.get(PluginManager);
      const results = manager.executeAll();

      expect(results).toHaveLength(2);
      expect(results).toContain('logging executed');
      expect(results).toContain('caching executed');
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large number of services efficiently', () => {
      const services: any[] = [];

      // Create many services
      for (let i = 0; i < 100; i++) {
        class TestService {
          public id = i;
        }

        container.set({ id: `service-${i}`, type: TestService });
        services.push(container.get(`service-${i}`));
      }

      // Verify all services are accessible
      for (let i = 0; i < 100; i++) {
        expect(container.has(`service-${i}`)).toBe(true);
        const service = container.get(`service-${i}`);
        expect(service.id).toBe(i);
      }
    });

    it('should handle rapid service creation and destruction', () => {
      class TestService {
        public id = Math.random();
      }

      // Rapidly create and destroy services
      for (let i = 0; i < 50; i++) {
        container.set({ id: `temp-service-${i}`, type: TestService });
        const service = container.get(`temp-service-${i}`);
        expect(service).toBeInstanceOf(TestService);
        container.remove(`temp-service-${i}`);
        expect(container.has(`temp-service-${i}`)).toBe(false);
      }
    });
  });

  describe('Cross-Container Scenarios', () => {
    it('should handle singleton services across containers', () => {
      const container1 = new ContainerInstance('container1');
      const container2 = new ContainerInstance('container2');

      @Service({ scope: 'singleton' })
      class SingletonService {
        public id = Math.random();
      }

      const service1 = container1.get(SingletonService);
      const service2 = container2.get(SingletonService);

      // Singleton should be shared across containers
      expect(service1).toBe(service2);
      expect(service1.id).toBe(service2.id);
    });
  });
});
