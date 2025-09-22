import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CannotInjectValueError, Container, Inject, InjectMany, Service, Token } from '../index';

describe('Decorators', () => {
  beforeEach(() => {
    Container.reset({ strategy: 'resetServices' });
  });

  afterEach(() => {
    Container.reset({ strategy: 'resetServices' });
  });

  describe('@Service Decorator', () => {
    it('should register service with default options', () => {
      @Service()
      class TestService {
        public name = 'test';
      }

      expect(Container.has(TestService)).toBe(true);
      const instance = Container.get(TestService);
      expect(instance).toBeInstanceOf(TestService);
      expect(instance.name).toBe('test');
    });

    it('should register service with custom id', () => {
      @Service({ id: 'custom-service' })
      class TestService {
        public name = 'test';
      }

      expect(Container.has('custom-service')).toBe(true);
      const instance = Container.get('custom-service');
      expect(instance).toBeInstanceOf(TestService);
    });

    it('should register service with singleton scope', () => {
      @Service({ scope: 'singleton' })
      class TestService {
        public id = Math.random();
      }

      const instance1 = Container.get(TestService);
      const instance2 = Container.get(TestService);

      expect(instance1).toBe(instance2);
    });

    it('should register service with transient scope', () => {
      @Service({ scope: 'transient' })
      class TestService {
        public id = Math.random();
      }

      const instance1 = Container.get(TestService);
      const instance2 = Container.get(TestService);

      expect(instance1).not.toBe(instance2);
    });

    it('should register service with multiple flag', () => {
      @Service({ multiple: true })
      class TestService {
        public name = 'test';
      }

      expect(Container.has(TestService)).toBe(true);
      const services = Container.getMany(TestService);
      expect(services).toHaveLength(1);
    });

    it('should register service with eager flag', () => {
      let instantiated = false;

      @Service({ eager: true })
      class TestService {
        constructor() {
          instantiated = true;
        }
      }

      expect(instantiated).toBe(true);
    });

    it('should register service with factory', () => {
      const factory = () => ({ name: 'factory-created' });

      @Service({ factory })
      class TestService {}

      const instance = Container.get(TestService);
      expect(instance).toEqual({ name: 'factory-created' });
    });
  });

  describe('@Inject Decorator', () => {
    it('should inject service by string identifier', () => {
      @Service({ id: 'dep-service' })
      class DependencyService {
        public name = 'dependency';
      }

      @Service()
      class TestService {
        @Inject('dep-service')
        public dependency!: DependencyService;
      }

      const instance = Container.get(TestService);
      expect(instance.dependency).toBeInstanceOf(DependencyService);
    });

    it('should inject service by token', () => {
      const token = new Token<DependencyService>('dep-token');

      @Service({ id: token })
      class DependencyService {
        public name = 'dependency';
      }

      @Service()
      class TestService {
        @Inject(token)
        public dependency!: DependencyService;
      }

      const instance = Container.get(TestService);
      expect(instance.dependency).toBeInstanceOf(DependencyService);
    });
  });

  describe('@InjectMany Decorator', () => {
    it('should inject multiple services by string identifier', () => {
      @Service({ id: 'dep-service', multiple: true })
      class DependencyService {
        public name = 'dependency';
      }

      @Service({ id: 'dep-service', multiple: true })
      class AnotherDependencyService {
        public name = 'another-dependency';
      }

      @Service()
      class TestService {
        @InjectMany('dep-service')
        public dependencies!: DependencyService[];
      }

      const instance = Container.get(TestService);
      expect(instance.dependencies).toHaveLength(2);
    });

    it('should inject multiple services by token', () => {
      const token = new Token<DependencyService>('dep-token');

      @Service({ id: token, multiple: true })
      class DependencyService {
        public name = 'dependency';
      }

      @Service({ id: token, multiple: true })
      class AnotherDependencyService {
        public name = 'another-dependency';
      }

      @Service()
      class TestService {
        @InjectMany(token)
        public dependencies!: DependencyService[];
      }

      const instance = Container.get(TestService);
      expect(instance.dependencies).toHaveLength(2);
    });
  });
});
