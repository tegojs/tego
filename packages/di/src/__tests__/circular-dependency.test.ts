import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Container, ContainerInstance, Inject, Service } from '../index';

describe('Circular Dependency Handling', () => {
  let container: ContainerInstance;

  beforeEach(() => {
    container = new ContainerInstance(`circular-test-${Math.random()}`);
  });

  afterEach(async () => {
    await container.dispose();
  });

  describe('Lazy Type Resolution', () => {
    it('should handle circular dependencies using lazy type functions', () => {
      @Service()
      class ServiceA {
        @Inject(() => ServiceB)
        serviceB!: ServiceB;

        getName() {
          return 'ServiceA';
        }
      }

      @Service()
      class ServiceB {
        @Inject(() => ServiceA)
        serviceA!: ServiceA;

        getName() {
          return 'ServiceB';
        }
      }

      const serviceA = Container.get(ServiceA);
      const serviceB = Container.get(ServiceB);

      expect(serviceA).toBeInstanceOf(ServiceA);
      expect(serviceB).toBeInstanceOf(ServiceB);
      expect(serviceA.serviceB).toBe(serviceB);
      expect(serviceB.serviceA).toBe(serviceA);
      expect(serviceA.getName()).toBe('ServiceA');
      expect(serviceB.getName()).toBe('ServiceB');
    });

    it('should handle three-way circular dependencies', () => {
      @Service()
      class ServiceA {
        @Inject(() => ServiceB)
        serviceB!: ServiceB;
      }

      @Service()
      class ServiceB {
        @Inject(() => ServiceC)
        serviceC!: ServiceC;
      }

      @Service()
      class ServiceC {
        @Inject(() => ServiceA)
        serviceA!: ServiceA;
      }

      const serviceA = Container.get(ServiceA);
      const serviceB = Container.get(ServiceB);
      const serviceC = Container.get(ServiceC);

      expect(serviceA.serviceB).toBe(serviceB);
      expect(serviceB.serviceC).toBe(serviceC);
      expect(serviceC.serviceA).toBe(serviceA);
    });

    it('should handle circular dependencies with multiple instances', () => {
      @Service()
      class Parent {
        @Inject(() => Child)
        child!: Child;

        @Inject(() => Sibling)
        sibling!: Sibling;
      }

      @Service()
      class Child {
        @Inject(() => Parent)
        parent!: Parent;
      }

      @Service()
      class Sibling {
        @Inject(() => Parent)
        parent!: Parent;

        @Inject(() => Child)
        child!: Child;
      }

      const parent = Container.get(Parent);
      const child = Container.get(Child);
      const sibling = Container.get(Sibling);

      expect(parent.child).toBe(child);
      expect(parent.sibling).toBe(sibling);
      expect(child.parent).toBe(parent);
      expect(sibling.parent).toBe(parent);
      expect(sibling.child).toBe(child);
    });
  });

  describe('Lazy Type with InjectMany', () => {
    it('should handle circular dependencies with InjectMany', () => {
      @Service({ id: 'handler', multiple: true })
      class HandlerA {
        @Inject(() => Coordinator)
        coordinator!: Coordinator;

        handle() {
          return 'HandlerA';
        }
      }

      @Service({ id: 'handler', multiple: true })
      class HandlerB {
        @Inject(() => Coordinator)
        coordinator!: Coordinator;

        handle() {
          return 'HandlerB';
        }
      }

      @Service()
      class Coordinator {
        handlers!: any[];

        getHandlers() {
          return Container.getMany('handler');
        }
      }

      const coordinator = Container.get(Coordinator);
      const handlers = coordinator.getHandlers();

      expect(handlers).toHaveLength(2);
      expect(handlers[0]).toBeInstanceOf(HandlerA);
      expect(handlers[1]).toBeInstanceOf(HandlerB);
      expect((handlers[0] as HandlerA).coordinator).toBe(coordinator);
      expect((handlers[1] as HandlerB).coordinator).toBe(coordinator);
    });
  });

  describe('Error Cases with Lazy Types', () => {
    it('should throw error when lazy type returns undefined', () => {
      @Service()
      class TestService {
        @Inject(() => undefined as any)
        dependency!: any;
      }

      expect(() => Container.get(TestService)).toThrow();
    });

    it('should throw error when lazy type returns Object', () => {
      @Service()
      class TestService {
        @Inject(() => Object)
        dependency!: any;
      }

      expect(() => Container.get(TestService)).toThrow();
    });
  });

  describe('Eager Type Resolution', () => {
    it('should throw error immediately when eager type is undefined', () => {
      expect(() => {
        @Service()
        class TestService {
          @Inject(undefined)
          dependency!: any;
        }
      }).toThrow('Cannot inject value');
    });

    it('should throw error when eager type is Object', () => {
      @Service()
      class TestService {
        @Inject(Object as any)
        dependency!: any;
      }

      // Object is a valid identifier, so it won't throw during decoration
      // but will throw when trying to get the service
      expect(() => Container.get(TestService)).toThrow();
    });
  });
});
