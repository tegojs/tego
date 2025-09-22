import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Container, ContainerInstance, Inject, Service, Token } from '../index';

describe('Token and Factory Patterns', () => {
  let container: ContainerInstance;

  beforeEach(() => {
    container = new ContainerInstance('test-container');
    Container.reset({ strategy: 'resetServices' });
  });

  afterEach(() => {
    container.reset({ strategy: 'resetServices' });
    Container.reset({ strategy: 'resetServices' });
  });

  describe('Token Class', () => {
    it('should create token with name', () => {
      const token = new Token('test-token');
      expect(token.name).toBe('test-token');
    });

    it('should create token without name', () => {
      const token = new Token();
      expect(token.name).toBeUndefined();
    });

    it('should create token with empty string name', () => {
      const token = new Token('');
      expect(token.name).toBe('');
    });

    it('should be unique instances', () => {
      const token1 = new Token('same-name');
      const token2 = new Token('same-name');

      expect(token1).not.toBe(token2);
      expect(token1.name).toBe(token2.name);
    });

    it('should work as service identifier', () => {
      const token = new Token('service-token');

      class TestService {
        public name = 'test';
      }

      container.set({ id: token, type: TestService });

      expect(container.has(token)).toBe(true);
      const instance = container.get(token);
      expect(instance).toBeInstanceOf(TestService);
    });

    it('should work with decorators', () => {
      const token = new Token('decorator-token');

      @Service({ id: token })
      class TestService {
        public name = 'test';
      }

      @Service()
      class ConsumerService {
        @Inject(token)
        public testService!: TestService;
      }

      const consumer = Container.get(ConsumerService);
      expect(consumer.testService).toBeInstanceOf(TestService);
    });

    it('should work with multiple services', () => {
      const token = new Token('multi-token');

      class Service1 {
        public name = 'service1';
      }

      class Service2 {
        public name = 'service2';
      }

      container.set({ id: token, type: Service1, multiple: true });
      container.set({ id: token, type: Service2, multiple: true });

      const services = container.getMany(token);
      expect(services).toHaveLength(2);
      expect(services[0]).toBeInstanceOf(Service1);
      expect(services[1]).toBeInstanceOf(Service2);
    });
  });

  describe('Factory Functions', () => {
    it('should use simple factory function', () => {
      const factory = () => ({ name: 'factory-created', id: Math.random() });

      container.set({ id: 'factory-service', factory });

      const instance1 = container.get('factory-service');
      const instance2 = container.get('factory-service');

      expect(instance1.name).toBe('factory-created');
      expect(instance2.name).toBe('factory-created');
      expect(instance1).toBe(instance2); // Same instance due to container scope
    });

    it('should use factory with container parameter', () => {
      const factory = (container: ContainerInstance, id: any) => {
        return { name: 'factory-with-container', containerId: container.id, serviceId: id };
      };

      container.set({ id: 'container-factory', factory });

      const instance = container.get('container-factory');
      expect(instance.name).toBe('factory-with-container');
      expect(instance.containerId).toBe('test-container');
      expect(instance.serviceId).toBe('container-factory');
    });

    it('should use factory with token parameter', () => {
      const token = new Token('factory-token');
      const factory = (container: ContainerInstance, id: any) => {
        return { name: 'factory-with-token', tokenId: id };
      };

      container.set({ id: token, factory });

      const instance = container.get(token);
      expect(instance.name).toBe('factory-with-token');
      expect(instance.tokenId).toBe(token);
    });

    it('should work with decorators', () => {
      const factory = () => ({ name: 'decorator-factory' });

      @Service({ id: 'decorator-factory-service', factory })
      class TestService {}

      @Service()
      class ConsumerService {
        @Inject('decorator-factory-service')
        public testService!: any;
      }

      const consumer = Container.get(ConsumerService);
      expect(consumer.testService.name).toBe('decorator-factory');
    });
  });

  describe('Factory Classes', () => {
    it('should use factory class with method', () => {
      class TestFactory {
        create(container: ContainerInstance, id: any) {
          return { name: 'factory-class-created', id };
        }
      }

      container.set({ id: 'factory-class', factory: [TestFactory, 'create'] });

      const instance = container.get('factory-class');
      expect(instance.name).toBe('factory-class-created');
      expect(instance.id).toBe('factory-class');
    });

    it('should use factory class from container', () => {
      class TestFactory {
        create(container: ContainerInstance, id: any) {
          return { name: 'factory-from-container', id };
        }
      }

      // Register factory in container
      container.set({ type: TestFactory });
      container.set({ id: 'factory-from-container', factory: [TestFactory, 'create'] });

      const instance = container.get('factory-from-container');
      expect(instance.name).toBe('factory-from-container');
    });

    it('should handle factory class not in container', () => {
      class TestFactory {
        create(container: ContainerInstance, id: any) {
          return { name: 'factory-not-in-container', id };
        }
      }

      // Don't register factory in container
      container.set({ id: 'factory-not-in-container', factory: [TestFactory, 'create'] });

      const instance = container.get('factory-not-in-container');
      expect(instance.name).toBe('factory-not-in-container');
    });

    it('should work with decorators', () => {
      class TestFactory {
        create() {
          return { name: 'decorator-factory-class' };
        }
      }

      @Service({ id: 'decorator-factory-class-service', factory: [TestFactory, 'create'] })
      class TestService {}

      @Service()
      class ConsumerService {
        @Inject('decorator-factory-class-service')
        public testService!: any;
      }

      const consumer = Container.get(ConsumerService);
      expect(consumer.testService.name).toBe('decorator-factory-class');
    });
  });

  describe('Complex Factory Scenarios', () => {
    it('should handle factory with dependencies', () => {
      class DependencyService {
        public name = 'dependency';
      }

      class TestFactory {
        create(container: ContainerInstance, id: any) {
          const dependency = container.get(DependencyService);
          return { name: 'factory-with-dependency', dependency: dependency.name };
        }
      }

      container.set({ type: DependencyService });
      container.set({ id: 'factory-with-dependency', factory: [TestFactory, 'create'] });

      const instance = container.get('factory-with-dependency');
      expect(instance.name).toBe('factory-with-dependency');
      expect(instance.dependency).toBe('dependency');
    });

    it('should handle factory with multiple dependencies', () => {
      class Service1 {
        public name = 'service1';
      }

      class Service2 {
        public name = 'service2';
      }

      class TestFactory {
        create(container: ContainerInstance, id: any) {
          const service1 = container.get(Service1);
          const service2 = container.get(Service2);
          return {
            name: 'factory-with-multiple-dependencies',
            services: [service1.name, service2.name],
          };
        }
      }

      container.set({ type: Service1 });
      container.set({ type: Service2 });
      container.set({ id: 'factory-multiple-deps', factory: [TestFactory, 'create'] });

      const instance = container.get('factory-multiple-deps');
      expect(instance.name).toBe('factory-with-multiple-dependencies');
      expect(instance.services).toEqual(['service1', 'service2']);
    });

    it('should handle factory with token dependencies', () => {
      const token = new Token('token-dependency');

      class TestFactory {
        create(container: ContainerInstance, id: any) {
          const dependency = container.get(token);
          return { name: 'factory-with-token-dependency', dependency: dependency.name };
        }
      }

      container.set({ id: token, value: { name: 'token-dependency-value' } });
      container.set({ id: 'factory-token-deps', factory: [TestFactory, 'create'] });

      const instance = container.get('factory-token-deps');
      expect(instance.name).toBe('factory-with-token-dependency');
      expect(instance.dependency).toBe('token-dependency-value');
    });
  });

  describe('Factory with Different Scopes', () => {
    it('should handle factory with transient scope', () => {
      const factory = () => ({ id: Math.random() });

      container.set({ id: 'transient-factory', factory, scope: 'transient' });

      const instance1 = container.get('transient-factory');
      const instance2 = container.get('transient-factory');

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).not.toBe(instance2.id);
    });

    it('should handle factory with singleton scope', () => {
      const factory = () => ({ id: Math.random() });

      container.set({ id: 'singleton-factory', factory, scope: 'singleton' });

      const instance1 = container.get('singleton-factory');
      const instance2 = container.get('singleton-factory');

      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });

    it('should handle factory with container scope', () => {
      const factory = () => ({ id: Math.random() });

      container.set({ id: 'container-factory', factory, scope: 'container' });

      const instance1 = container.get('container-factory');
      const instance2 = container.get('container-factory');

      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });
  });

  describe('Factory Error Handling', () => {
    it('should propagate factory errors', () => {
      const factory = () => {
        throw new Error('Factory error');
      };

      container.set({ id: 'error-factory', factory });

      expect(() => container.get('error-factory')).toThrow('Factory error');
    });

    it('should handle factory returning undefined', () => {
      const factory = () => undefined;

      container.set({ id: 'undefined-factory', factory });

      expect(() => container.get('undefined-factory')).toThrow();
    });

    it('should handle factory returning null', () => {
      const factory = () => null;

      container.set({ id: 'null-factory', factory });

      expect(() => container.get('null-factory')).toThrow();
    });

    it('should handle factory class method not found', () => {
      class TestFactory {
        // No create method
      }

      container.set({ id: 'missing-method-factory', factory: [TestFactory, 'create'] });

      expect(() => container.get('missing-method-factory')).toThrow();
    });
  });

  describe('Token and Factory Integration', () => {
    it('should use token with factory', () => {
      const token = new Token('token-factory');
      const factory = () => ({ name: 'token-factory-created' });

      container.set({ id: token, factory });

      const instance = container.get(token);
      expect(instance.name).toBe('token-factory-created');
    });

    it('should use token with factory class', () => {
      const token = new Token('token-factory-class');

      class TestFactory {
        create() {
          return { name: 'token-factory-class-created' };
        }
      }

      container.set({ id: token, factory: [TestFactory, 'create'] });

      const instance = container.get(token);
      expect(instance.name).toBe('token-factory-class-created');
    });

    it('should use token with multiple services and factory', () => {
      const token = new Token('token-multi-factory');

      const factory1 = () => ({ name: 'factory1' });
      const factory2 = () => ({ name: 'factory2' });

      container.set({ id: token, factory: factory1, multiple: true });
      container.set({ id: token, factory: factory2, multiple: true });

      const services = container.getMany(token);
      expect(services).toHaveLength(2);
      expect(services[0].name).toBe('factory1');
      expect(services[1].name).toBe('factory2');
    });
  });
});
