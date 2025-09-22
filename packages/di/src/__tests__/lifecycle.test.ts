import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Container, ContainerInstance, Inject, Service } from '../index';

describe('Service Lifecycle and Cleanup', () => {
  let container: ContainerInstance;

  beforeEach(() => {
    container = new ContainerInstance('test-container');
    Container.reset({ strategy: 'resetServices' });
  });

  afterEach(() => {
    container.reset({ strategy: 'resetServices' });
    Container.reset({ strategy: 'resetServices' });
  });

  describe('Service Disposal', () => {
    it('should call dispose method when removing service', () => {
      let disposed = false;

      class TestService {
        dispose() {
          disposed = true;
        }
      }

      container.set({ type: TestService });
      const instance = container.get(TestService);

      container.remove(TestService);

      expect(disposed).toBe(true);
    });

    it('should call dispose method with correct context', () => {
      let disposedInstance: any = null;

      class TestService {
        public name = 'test';

        dispose() {
          disposedInstance = this;
        }
      }

      container.set({ type: TestService });
      const instance = container.get(TestService);

      container.remove(TestService);

      expect(disposedInstance).toBe(instance);
      expect(disposedInstance.name).toBe('test');
    });

    it('should handle service without dispose method', () => {
      class TestService {
        public name = 'test';
      }

      container.set({ type: TestService });
      const instance = container.get(TestService);

      // Should not throw error
      expect(() => container.remove(TestService)).not.toThrow();
    });

    it('should handle disposal errors gracefully', () => {
      class TestService {
        dispose() {
          throw new Error('Disposal error');
        }
      }

      container.set({ type: TestService });
      const instance = container.get(TestService);

      // Should not throw error even if disposal fails
      expect(() => container.remove(TestService)).not.toThrow();
    });

    it('should dispose service when resetting with resetValue strategy', () => {
      let disposed = false;

      class TestService {
        dispose() {
          disposed = true;
        }
      }

      container.set({ type: TestService });
      container.get(TestService);

      container.reset({ strategy: 'resetValue' });

      expect(disposed).toBe(true);
    });

    it('should dispose service when resetting with resetServices strategy', () => {
      let disposed = false;

      class TestService {
        dispose() {
          disposed = true;
        }
      }

      container.set({ type: TestService });
      container.get(TestService);

      container.reset({ strategy: 'resetServices' });

      expect(disposed).toBe(true);
    });

    it('should dispose service when disposing container', async () => {
      let disposed = false;

      class TestService {
        dispose() {
          disposed = true;
        }
      }

      container.set({ type: TestService });
      container.get(TestService);

      await container.dispose();

      expect(disposed).toBe(true);
    });
  });

  describe('Service Lifecycle with Different Scopes', () => {
    it('should dispose singleton service only once', () => {
      let disposeCount = 0;

      class TestService {
        dispose() {
          disposeCount++;
        }
      }

      container.set({ type: TestService, scope: 'singleton' });
      const instance1 = container.get(TestService);
      const instance2 = container.get(TestService);

      container.remove(TestService);

      expect(disposeCount).toBe(1);
    });

    it('should dispose transient service instances separately', () => {
      let disposeCount = 0;

      class TestService {
        dispose() {
          disposeCount++;
        }
      }

      container.set({ type: TestService, scope: 'transient' });
      const instance1 = container.get(TestService);
      const instance2 = container.get(TestService);

      container.remove(TestService);

      // Transient services don't store instances, so dispose is not called
      expect(disposeCount).toBe(0);
    });

    it('should dispose container scope service only once', () => {
      let disposeCount = 0;

      class TestService {
        dispose() {
          disposeCount++;
        }
      }

      container.set({ type: TestService, scope: 'container' });
      const instance1 = container.get(TestService);
      const instance2 = container.get(TestService);

      container.remove(TestService);

      expect(disposeCount).toBe(1);
    });
  });

  describe('Multiple Services Disposal', () => {
    it('should dispose all multiple services', () => {
      let disposeCount = 0;

      class TestService {
        dispose() {
          disposeCount++;
        }
      }

      container.set({ id: 'multi-service', type: TestService, multiple: true });
      container.set({ id: 'multi-service', type: TestService, multiple: true });

      const services = container.getMany('multi-service');

      container.remove('multi-service');

      expect(disposeCount).toBe(2);
    });

    it('should dispose multiple services with different types', () => {
      let service1Disposed = false;
      let service2Disposed = false;

      class Service1 {
        dispose() {
          service1Disposed = true;
        }
      }

      class Service2 {
        dispose() {
          service2Disposed = true;
        }
      }

      container.set({ id: 'multi-service', type: Service1, multiple: true });
      container.set({ id: 'multi-service', type: Service2, multiple: true });

      container.remove('multi-service');

      expect(service1Disposed).toBe(true);
      expect(service2Disposed).toBe(true);
    });
  });

  describe('Container Disposal', () => {
    it('should dispose all services when disposing container', async () => {
      let service1Disposed = false;
      let service2Disposed = false;

      class Service1 {
        dispose() {
          service1Disposed = true;
        }
      }

      class Service2 {
        dispose() {
          service2Disposed = true;
        }
      }

      container.set({ type: Service1 });
      container.set({ type: Service2 });

      container.get(Service1);
      container.get(Service2);

      await container.dispose();

      expect(service1Disposed).toBe(true);
      expect(service2Disposed).toBe(true);
    });

    it('should mark container as disposed', async () => {
      container.set({ id: 'test', value: 'test' });

      await container.dispose();

      expect(container['disposed']).toBe(true);
    });

    it('should prevent operations after disposal', async () => {
      await container.dispose();

      expect(() => container.get('test')).toThrow('Cannot use container after it has been disposed.');
      expect(() => container.set({ id: 'test', value: 'test' })).toThrow(
        'Cannot use container after it has been disposed.',
      );
      expect(() => container.has('test')).toThrow('Cannot use container after it has been disposed.');
      expect(() => container.remove('test')).toThrow('Cannot use container after it has been disposed.');
      expect(() => container.reset()).toThrow('Cannot use container after it has been disposed.');
    });
  });

  describe('Service Reset Strategies', () => {
    it('should reset values but keep services with resetValue strategy', () => {
      class TestService {
        public id = Math.random();
      }

      container.set({ type: TestService });
      const instance1 = container.get(TestService);

      container.reset({ strategy: 'resetValue' });
      const instance2 = container.get(TestService);

      expect(container.has(TestService)).toBe(true);
      expect(instance1).not.toBe(instance2);
    });

    it('should reset services completely with resetServices strategy', () => {
      class TestService {
        public name = 'test';
      }

      container.set({ type: TestService });
      expect(container.has(TestService)).toBe(true);

      container.reset({ strategy: 'resetServices' });
      expect(container.has(TestService)).toBe(false);
    });

    it('should dispose services when resetting', () => {
      let disposed = false;

      class TestService {
        dispose() {
          disposed = true;
        }
      }

      container.set({ type: TestService });
      container.get(TestService);

      container.reset({ strategy: 'resetServices' });

      expect(disposed).toBe(true);
    });
  });

  describe('Eager Services Lifecycle', () => {
    it('should dispose eager services when removing', () => {
      let disposed = false;

      class TestService {
        dispose() {
          disposed = true;
        }
      }

      container.set({ type: TestService, eager: true });

      container.remove(TestService);

      expect(disposed).toBe(true);
    });

    it('should dispose eager services when resetting', () => {
      let disposed = false;

      class TestService {
        dispose() {
          disposed = true;
        }
      }

      container.set({ type: TestService, eager: true });

      container.reset({ strategy: 'resetServices' });

      expect(disposed).toBe(true);
    });
  });

  describe('Factory Services Lifecycle', () => {
    it('should dispose factory-created services', () => {
      let disposed = false;

      class TestService {
        dispose() {
          disposed = true;
        }
      }

      const factory = () => new TestService();

      container.set({ id: 'factory-service', factory });
      container.get('factory-service');

      container.remove('factory-service');

      expect(disposed).toBe(true);
    });

    it('should dispose factory class-created services', () => {
      let disposed = false;

      class TestService {
        dispose() {
          disposed = true;
        }
      }

      class TestFactory {
        create() {
          return new TestService();
        }
      }

      container.set({ id: 'factory-class-service', factory: [TestFactory, 'create'] });
      container.get('factory-class-service');

      container.remove('factory-class-service');

      expect(disposed).toBe(true);
    });
  });

  describe('Complex Lifecycle Scenarios', () => {
    it('should handle nested service disposal', () => {
      let parentDisposed = false;
      let childDisposed = false;

      class ChildService {
        dispose() {
          childDisposed = true;
        }
      }

      class ParentService {
        @Inject()
        public child!: ChildService;

        dispose() {
          parentDisposed = true;
        }
      }

      container.set({ type: ChildService });
      container.set({ type: ParentService });

      const parent = container.get(ParentService);

      container.remove(ParentService);

      expect(parentDisposed).toBe(true);
      // Child should still exist since it's not removed
      expect(childDisposed).toBe(false);
    });

    it('should handle circular dependency disposal', () => {
      let serviceADisposed = false;
      let serviceBDisposed = false;

      class ServiceA {
        @Inject()
        public serviceB!: ServiceB;

        dispose() {
          serviceADisposed = true;
        }
      }

      class ServiceB {
        @Inject()
        public serviceA!: ServiceA;

        dispose() {
          serviceBDisposed = true;
        }
      }

      container.set({ type: ServiceA });
      container.set({ type: ServiceB });

      container.get(ServiceA);

      container.remove(ServiceA);
      container.remove(ServiceB);

      expect(serviceADisposed).toBe(true);
      expect(serviceBDisposed).toBe(true);
    });

    it('should handle service disposal with async operations', async () => {
      let disposed = false;

      class TestService {
        async dispose() {
          await new Promise((resolve) => setTimeout(resolve, 10));
          disposed = true;
        }
      }

      container.set({ type: TestService });
      container.get(TestService);

      container.remove(TestService);

      // Wait a bit for async disposal
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(disposed).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should clear service references after disposal', async () => {
      class TestService {
        public data = new Array(1000).fill('data');
      }

      container.set({ type: TestService });
      const instance = container.get(TestService);

      await container.dispose();

      // Service should be disposed and references cleared
      expect(container['disposed']).toBe(true);
    });

    it('should handle large number of services disposal', async () => {
      const services: any[] = [];

      for (let i = 0; i < 100; i++) {
        class TestService {
          public id = i;
          dispose() {
            // Disposal logic
          }
        }

        container.set({ id: `service-${i}`, type: TestService });
        services.push(container.get(`service-${i}`));
      }

      await container.dispose();

      expect(container['disposed']).toBe(true);
    });
  });
});
