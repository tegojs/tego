import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CannotInstantiateValueError, Container, ContainerInstance, ServiceNotFoundError, Token } from '../index';

describe('ContainerInstance', () => {
  let container: ContainerInstance;

  beforeEach(() => {
    container = new ContainerInstance(`test-container-${Math.random()}`);
  });

  afterEach(() => {
    container.reset({ strategy: 'resetServices' });
  });

  describe('Basic Operations', () => {
    it('should create a new container instance with given id', () => {
      const newContainer = new ContainerInstance('my-container');
      expect(newContainer.id).toBe('my-container');
    });

    it('should have default container', () => {
      expect(ContainerInstance.default).toBeDefined();
      expect(ContainerInstance.default.id).toBe('default');
    });

    it('should check if service exists', () => {
      class TestService {}

      expect(container.has(TestService)).toBe(false);
      container.set({ type: TestService });
      expect(container.has(TestService)).toBe(true);
    });

    it('should register and retrieve service by class', () => {
      class TestService {
        public name = 'test';
      }

      container.set({ type: TestService });
      const instance = container.get(TestService) as TestService;

      expect(instance).toBeInstanceOf(TestService);
      expect(instance.name).toBe('test');
    });

    it('should register and retrieve service by string identifier', () => {
      class TestService {
        public name = 'test';
      }

      container.set({ id: 'test-service', type: TestService });
      const instance = container.get('test-service') as TestService;

      expect(instance).toBeInstanceOf(TestService);
      expect(instance.name).toBe('test');
    });

    it('should register and retrieve service by token', () => {
      const token = new Token<TestService>('test-token');

      class TestService {
        public name = 'test';
      }

      container.set({ id: token, type: TestService });
      const instance = container.get(token);

      expect(instance).toBeInstanceOf(TestService);
      expect(instance.name).toBe('test');
    });

    it('should register and retrieve service with value', () => {
      const value = { name: 'test-value' };

      container.set({ id: 'test-value', value });
      const instance = container.get('test-value');

      expect(instance).toBe(value);
    });

    it('should register and retrieve service with factory', () => {
      const factory = () => ({ name: 'factory-created' });

      container.set({ id: 'test-factory', factory });
      const instance = container.get('test-factory');

      expect(instance).toEqual({ name: 'factory-created' });
    });

    it('should register and retrieve service with factory class', () => {
      class Factory {
        create() {
          return { name: 'factory-class-created' };
        }
      }

      container.set({ id: 'test-factory-class', factory: [Factory, 'create'] });
      const instance = container.get('test-factory-class');

      expect(instance).toEqual({ name: 'factory-class-created' });
    });
  });

  describe('Service Scopes', () => {
    it('should create new instance for transient scope', () => {
      class TestService {
        public id = Math.random();
      }

      container.set({ type: TestService, scope: 'transient' });

      const instance1 = container.get(TestService);
      const instance2 = container.get(TestService);

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).not.toBe(instance2.id);
    });

    it('should reuse instance for container scope', () => {
      class TestService {
        public id = Math.random();
      }

      container.set({ type: TestService, scope: 'container' });

      const instance1 = container.get(TestService);
      const instance2 = container.get(TestService);

      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });

    it('should reuse instance for singleton scope', () => {
      class TestService {
        public id = Math.random();
      }

      container.set({ type: TestService, scope: 'singleton' });

      const instance1 = container.get(TestService);
      const instance2 = container.get(TestService);

      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });
  });

  describe('Multiple Services', () => {
    it('should register and retrieve multiple services', () => {
      class TestService1 {
        public name = 'service1';
      }

      class TestService2 {
        public name = 'service2';
      }

      container.set({ id: 'test-services', type: TestService1, multiple: true });
      container.set({ id: 'test-services', type: TestService2, multiple: true });

      const services = container.getMany('test-services');

      expect(services).toHaveLength(2);
      expect(services[0]).toBeInstanceOf(TestService1);
      expect(services[1]).toBeInstanceOf(TestService2);
    });

    it('should throw error when getting single service with multiple flag', () => {
      class TestService {
        public name = 'test';
      }

      container.set({ id: 'test-services', type: TestService, multiple: true });

      expect(() => container.get('test-services')).toThrow(
        'Service with "test-services" identifier was not found in the container',
      );
    });
  });

  describe('Eager Services', () => {
    it('should instantiate eager service immediately', () => {
      let instantiated = false;

      class TestService {
        constructor() {
          instantiated = true;
        }
      }

      container.set({ type: TestService, eager: true });

      expect(instantiated).toBe(true);
    });

    it('should not instantiate eager transient service', () => {
      let instantiated = false;

      class TestService {
        constructor() {
          instantiated = true;
        }
      }

      container.set({ type: TestService, eager: true, scope: 'transient' });

      expect(instantiated).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw ServiceNotFoundError when service not found', () => {
      expect(() => container.get('non-existent-service')).toThrow(ServiceNotFoundError);
    });

    it('should throw CannotInstantiateValueError when no type or factory', () => {
      container.set({ id: 'invalid-service' });

      expect(() => container.get('invalid-service')).toThrow(CannotInstantiateValueError);
    });

    it('should throw error when using disposed container', async () => {
      const testContainer = new ContainerInstance(`dispose-test-${Math.random()}`);
      await testContainer.dispose();

      expect(() => testContainer.get('test')).toThrow('Cannot use container after it has been disposed.');
    });
  });

  describe('Service Removal', () => {
    it('should remove single service', () => {
      class TestService {
        public name = 'test';
      }

      container.set({ type: TestService });
      expect(container.has(TestService)).toBe(true);

      container.remove(TestService);
      expect(container.has(TestService)).toBe(false);
    });

    it('should remove multiple services', () => {
      class TestService1 {
        public name = 'test1';
      }

      class TestService2 {
        public name = 'test2';
      }

      container.set({ type: TestService1 });
      container.set({ type: TestService2 });

      container.remove([TestService1, TestService2]);

      expect(container.has(TestService1)).toBe(false);
      expect(container.has(TestService2)).toBe(false);
    });
  });

  describe('Container Reset', () => {
    it('should reset values but keep services', () => {
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

    it('should reset services completely', () => {
      class TestService {
        public name = 'test';
      }

      container.set({ type: TestService });
      expect(container.has(TestService)).toBe(true);

      container.reset({ strategy: 'resetServices' });
      expect(container.has(TestService)).toBe(false);
    });
  });

  describe('Service Disposal', () => {
    it('should call dispose method on service when removing', () => {
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

    it('should handle disposal errors gracefully', () => {
      class TestService {
        dispose() {
          throw new Error('Disposal error');
        }
      }

      container.set({ type: TestService });
      container.get(TestService);

      // Should not throw error
      expect(() => container.remove(TestService)).not.toThrow();
    });
  });
});
