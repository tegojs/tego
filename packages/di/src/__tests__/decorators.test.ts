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
    it('should inject service by type', () => {
      @Service()
      class DependencyService {
        public name = 'dependency';
      }

      @Service()
      class TestService {
        @Inject()
        public dependency!: DependencyService;
      }

      const instance = Container.get(TestService);
      expect(instance.dependency).toBeInstanceOf(DependencyService);
      expect(instance.dependency.name).toBe('dependency');
    });

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

    it('should inject service with type function', () => {
      @Service()
      class DependencyService {
        public name = 'dependency';
      }

      @Service()
      class TestService {
        @Inject(() => DependencyService)
        public dependency!: DependencyService;
      }

      const instance = Container.get(TestService);
      expect(instance.dependency).toBeInstanceOf(DependencyService);
    });

    it('should handle circular dependencies', () => {
      @Service()
      class ServiceA {
        @Inject()
        public serviceB!: ServiceB;
      }

      @Service()
      class ServiceB {
        @Inject()
        public serviceA!: ServiceA;
      }

      // Should not throw error during registration
      expect(() => {
        Container.get(ServiceA);
      }).not.toThrow();
    });

    it('should throw error when injecting unknown type', () => {
      expect(() => {
        @Service()
        class TestService {
          @Inject()
          public unknown!: any;
        }
      }).toThrow(CannotInjectValueError);
    });
  });

  describe('@InjectMany Decorator', () => {
    it('should inject multiple services by type', () => {
      @Service({ multiple: true })
      class DependencyService {
        public name = 'dependency';
      }

      @Service({ multiple: true })
      class AnotherDependencyService {
        public name = 'another-dependency';
      }

      @Service()
      class TestService {
        @InjectMany()
        public dependencies!: DependencyService[];
      }

      const instance = Container.get(TestService);
      expect(instance.dependencies).toHaveLength(2);
      expect(instance.dependencies[0]).toBeInstanceOf(DependencyService);
      expect(instance.dependencies[1]).toBeInstanceOf(AnotherDependencyService);
    });

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

    it('should inject multiple services with type function', () => {
      @Service({ multiple: true })
      class DependencyService {
        public name = 'dependency';
      }

      @Service({ multiple: true })
      class AnotherDependencyService {
        public name = 'another-dependency';
      }

      @Service()
      class TestService {
        @InjectMany(() => DependencyService)
        public dependencies!: DependencyService[];
      }

      const instance = Container.get(TestService);
      expect(instance.dependencies).toHaveLength(2);
    });

    it('should return empty array when no services registered', () => {
      @Service()
      class TestService {
        @InjectMany('non-existent-service')
        public dependencies!: any[];
      }

      const instance = Container.get(TestService);
      expect(instance.dependencies).toEqual([]);
    });
  });

  describe('Complex Injection Scenarios', () => {
    it('should handle nested dependencies', () => {
      @Service()
      class DatabaseService {
        public connect() {
          return 'connected';
        }
      }

      @Service()
      class UserRepository {
        @Inject()
        public db!: DatabaseService;
      }

      @Service()
      class UserService {
        @Inject()
        public userRepo!: UserRepository;
      }

      const userService = Container.get(UserService);
      expect(userService.userRepo.db.connect()).toBe('connected');
    });

    it('should handle mixed injection types', () => {
      @Service({ id: 'config' })
      class ConfigService {
        public apiUrl = 'https://api.example.com';
      }

      @Service({ multiple: true })
      class PluginService {
        public name = 'plugin';
      }

      @Service()
      class AppService {
        @Inject('config')
        public config!: ConfigService;

        @InjectMany()
        public plugins!: PluginService[];
      }

      const appService = Container.get(AppService);
      expect(appService.config.apiUrl).toBe('https://api.example.com');
      expect(appService.plugins).toHaveLength(1);
    });

    it('should handle inheritance with injection', () => {
      @Service()
      class BaseService {
        @Inject()
        public config!: any;
      }

      @Service()
      class ExtendedService extends BaseService {
        public name = 'extended';
      }

      Container.set({ id: 'config', value: { apiUrl: 'test' } });

      const instance = Container.get(ExtendedService);
      expect(instance.config).toEqual({ apiUrl: 'test' });
      expect(instance.name).toBe('extended');
    });
  });

  describe('Error Scenarios', () => {
    it('should throw error when injecting into non-service class', () => {
      @Service()
      class DependencyService {
        public name = 'dependency';
      }

      class NonServiceClass {
        @Inject()
        public dependency!: DependencyService;
      }

      // Should not throw during decoration, but should throw when trying to get
      expect(() => Container.get(NonServiceClass)).toThrow();
    });

    it('should handle missing dependencies gracefully', () => {
      @Service()
      class TestService {
        @Inject('missing-service')
        public missing!: any;
      }

      // Should not throw during decoration
      expect(() => {
        Container.get(TestService);
      }).toThrow();
    });
  });
});
