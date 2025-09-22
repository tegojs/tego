import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Container, ContainerInstance, Inject, Service } from '../index';

describe('Service Scopes', () => {
  let container1: ContainerInstance;
  let container2: ContainerInstance;

  beforeEach(() => {
    container1 = new ContainerInstance('container1');
    container2 = new ContainerInstance('container2');
    Container.reset({ strategy: 'resetServices' });
  });

  afterEach(() => {
    container1.reset({ strategy: 'resetServices' });
    container2.reset({ strategy: 'resetServices' });
    Container.reset({ strategy: 'resetServices' });
  });

  describe('Container Scope', () => {
    it('should create separate instances in different containers', () => {
      class TestService {
        public id = Math.random();
      }

      container1.set({ type: TestService, scope: 'container' });
      container2.set({ type: TestService, scope: 'container' });

      const instance1 = container1.get(TestService);
      const instance2 = container2.get(TestService);

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).not.toBe(instance2.id);
    });

    it('should reuse instance within same container', () => {
      class TestService {
        public id = Math.random();
      }

      container1.set({ type: TestService, scope: 'container' });

      const instance1 = container1.get(TestService);
      const instance2 = container1.get(TestService);

      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });

    it('should work with decorators', () => {
      @Service({ scope: 'container' })
      class TestService {
        public id = Math.random();
      }

      const instance1 = Container.get(TestService);
      const instance2 = Container.get(TestService);

      expect(instance1).toBe(instance2);
    });

    it('should handle dependencies with container scope', () => {
      @Service({ scope: 'container' })
      class DependencyService {
        public id = Math.random();
      }

      @Service({ scope: 'container' })
      class TestService {
        @Inject()
        public dependency!: DependencyService;
      }

      const instance1 = Container.get(TestService);
      const instance2 = Container.get(TestService);

      expect(instance1).toBe(instance2);
      expect(instance1.dependency).toBe(instance2.dependency);
    });
  });

  describe('Singleton Scope', () => {
    it('should share instance across all containers', () => {
      class TestService {
        public id = Math.random();
      }

      container1.set({ type: TestService, scope: 'singleton' });
      container2.set({ type: TestService, scope: 'singleton' });

      const instance1 = container1.get(TestService);
      const instance2 = container2.get(TestService);

      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });

    it('should register in default container when set in child container', () => {
      class TestService {
        public id = Math.random();
      }

      container1.set({ type: TestService, scope: 'singleton' });

      // Should be registered in default container
      expect(Container.has(TestService)).toBe(true);
      expect(container1.has(TestService)).toBe(false);

      const instance1 = container1.get(TestService);
      const instance2 = Container.get(TestService);

      expect(instance1).toBe(instance2);
    });

    it('should work with decorators', () => {
      @Service({ scope: 'singleton' })
      class TestService {
        public id = Math.random();
      }

      const instance1 = Container.get(TestService);
      const instance2 = Container.get(TestService);

      expect(instance1).toBe(instance2);
    });

    it('should handle dependencies with singleton scope', () => {
      @Service({ scope: 'singleton' })
      class DependencyService {
        public id = Math.random();
      }

      @Service({ scope: 'singleton' })
      class TestService {
        @Inject()
        public dependency!: DependencyService;
      }

      const instance1 = Container.get(TestService);
      const instance2 = Container.get(TestService);

      expect(instance1).toBe(instance2);
      expect(instance1.dependency).toBe(instance2.dependency);
    });

    it('should handle multiple services with singleton scope', () => {
      class TestService1 {
        public name = 'service1';
      }

      class TestService2 {
        public name = 'service2';
      }

      container1.set({ id: 'test-services', type: TestService1, multiple: true, scope: 'singleton' });
      container2.set({ id: 'test-services', type: TestService2, multiple: true, scope: 'singleton' });

      const services1 = container1.getMany('test-services');
      const services2 = container2.getMany('test-services');

      expect(services1).toHaveLength(2);
      expect(services2).toHaveLength(2);
      expect(services1[0]).toBe(services2[0]);
      expect(services1[1]).toBe(services2[1]);
    });
  });

  describe('Transient Scope', () => {
    it('should create new instance every time', () => {
      class TestService {
        public id = Math.random();
      }

      container1.set({ type: TestService, scope: 'transient' });

      const instance1 = container1.get(TestService);
      const instance2 = container1.get(TestService);

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).not.toBe(instance2.id);
    });

    it('should create new instances in different containers', () => {
      class TestService {
        public id = Math.random();
      }

      container1.set({ type: TestService, scope: 'transient' });
      container2.set({ type: TestService, scope: 'transient' });

      const instance1 = container1.get(TestService);
      const instance2 = container2.get(TestService);

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).not.toBe(instance2.id);
    });

    it('should work with decorators', () => {
      @Service({ scope: 'transient' })
      class TestService {
        public id = Math.random();
      }

      const instance1 = Container.get(TestService);
      const instance2 = Container.get(TestService);

      expect(instance1).not.toBe(instance2);
    });

    it('should handle dependencies with transient scope', () => {
      @Service({ scope: 'transient' })
      class DependencyService {
        public id = Math.random();
      }

      @Service({ scope: 'transient' })
      class TestService {
        @Inject()
        public dependency!: DependencyService;
      }

      const instance1 = Container.get(TestService);
      const instance2 = Container.get(TestService);

      expect(instance1).not.toBe(instance2);
      expect(instance1.dependency).not.toBe(instance2.dependency);
    });

    it('should not store value for transient services', () => {
      class TestService {
        public id = Math.random();
      }

      container1.set({ type: TestService, scope: 'transient' });

      const instance1 = container1.get(TestService);
      const instance2 = container1.get(TestService);

      // Both should be new instances
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Mixed Scopes', () => {
    it('should handle mixed scopes in dependency chain', () => {
      @Service({ scope: 'singleton' })
      class SingletonService {
        public id = Math.random();
      }

      @Service({ scope: 'container' })
      class ContainerService {
        @Inject()
        public singleton!: SingletonService;
      }

      @Service({ scope: 'transient' })
      class TransientService {
        @Inject()
        public container!: ContainerService;
      }

      const instance1 = Container.get(TransientService);
      const instance2 = Container.get(TransientService);

      // Transient services should be different
      expect(instance1).not.toBe(instance2);

      // But container services should be the same
      expect(instance1.container).toBe(instance2.container);

      // And singleton services should be the same
      expect(instance1.container.singleton).toBe(instance2.container.singleton);
    });

    it('should handle inheritance with different scopes', () => {
      @Service({ scope: 'singleton' })
      class BaseService {
        public id = Math.random();
      }

      @Service({ scope: 'transient' })
      class ExtendedService extends BaseService {
        public name = 'extended';
      }

      const instance1 = Container.get(ExtendedService);
      const instance2 = Container.get(ExtendedService);

      // Extended service should be transient
      expect(instance1).not.toBe(instance2);

      // But base service should be singleton
      expect(instance1.id).toBe(instance2.id);
    });
  });

  describe('Scope Edge Cases', () => {
    it('should handle scope change after registration', () => {
      class TestService {
        public id = Math.random();
      }

      container1.set({ type: TestService, scope: 'container' });
      const instance1 = container1.get(TestService);

      // Change scope
      container1.set({ type: TestService, scope: 'transient' });
      const instance2 = container1.get(TestService);

      // Should still use the same instance due to caching
      expect(instance1).toBe(instance2);
    });

    it('should handle eager services with different scopes', () => {
      let singletonInstantiated = false;
      let containerInstantiated = false;
      let transientInstantiated = false;

      @Service({ scope: 'singleton', eager: true })
      class SingletonService {
        constructor() {
          singletonInstantiated = true;
        }
      }

      @Service({ scope: 'container', eager: true })
      class ContainerService {
        constructor() {
          containerInstantiated = true;
        }
      }

      @Service({ scope: 'transient', eager: true })
      class TransientService {
        constructor() {
          transientInstantiated = true;
        }
      }

      expect(singletonInstantiated).toBe(true);
      expect(containerInstantiated).toBe(true);
      expect(transientInstantiated).toBe(false); // Transient eager services are ignored
    });

    it('should handle multiple services with different scopes', () => {
      class Service1 {
        public name = 'service1';
      }

      class Service2 {
        public name = 'service2';
      }

      container1.set({ id: 'mixed-services', type: Service1, multiple: true, scope: 'singleton' });
      container1.set({ id: 'mixed-services', type: Service2, multiple: true, scope: 'container' });

      const services1 = container1.getMany('mixed-services');
      const services2 = container1.getMany('mixed-services');

      expect(services1).toHaveLength(2);
      expect(services2).toHaveLength(2);

      // First service is singleton, should be the same
      expect(services1[0]).toBe(services2[0]);

      // Second service is container scope, should be the same
      expect(services1[1]).toBe(services2[1]);
    });
  });
});
