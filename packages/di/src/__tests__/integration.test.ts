import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Container, ContainerInstance, Inject, InjectMany, Service, Token } from '../index';

describe('Integration Tests', () => {
  let container: ContainerInstance;

  beforeEach(() => {
    container = new ContainerInstance('integration-test');
    Container.reset({ strategy: 'resetServices' });
  });

  afterEach(() => {
    container.reset({ strategy: 'resetServices' });
    Container.reset({ strategy: 'resetServices' });
  });

  describe('Real-world Application Scenarios', () => {
    it('should handle typical web application structure', () => {
      // Database service
      @Service({ scope: 'singleton' })
      class DatabaseService {
        public connect() {
          return 'connected to database';
        }
      }

      // Repository layer
      @Service()
      class UserRepository {
        @Inject()
        public db!: DatabaseService;

        public findUser(id: string) {
          return { id, name: 'John Doe', db: this.db.connect() };
        }
      }

      // Service layer
      @Service()
      class UserService {
        @Inject()
        public userRepo!: UserRepository;

        public getUser(id: string) {
          return this.userRepo.findUser(id);
        }
      }

      // Controller layer
      @Service()
      class UserController {
        @Inject()
        public userService!: UserService;

        public handleGetUser(id: string) {
          return this.userService.getUser(id);
        }
      }

      const controller = Container.get(UserController);
      const result = controller.handleGetUser('123');

      expect(result.id).toBe('123');
      expect(result.name).toBe('John Doe');
      expect(result.db).toBe('connected to database');
    });

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

    it('should handle configuration system', () => {
      // Configuration tokens
      const DatabaseConfigToken = new Token('database-config');
      const ApiConfigToken = new Token('api-config');

      // Configuration services
      @Service({ id: DatabaseConfigToken })
      class DatabaseConfig {
        public host = 'localhost';
        public port = 5432;
        public database = 'testdb';
      }

      @Service({ id: ApiConfigToken })
      class ApiConfig {
        public baseUrl = 'https://api.example.com';
        public timeout = 5000;
      }

      // Database service using config
      @Service()
      class DatabaseService {
        @Inject(DatabaseConfigToken)
        public config!: DatabaseConfig;

        public getConnectionString() {
          return `postgresql://${this.config.host}:${this.config.port}/${this.config.database}`;
        }
      }

      // API service using config
      @Service()
      class ApiService {
        @Inject(ApiConfigToken)
        public config!: ApiConfig;

        public getEndpoint(path: string) {
          return `${this.config.baseUrl}${path}`;
        }
      }

      // Application service
      @Service()
      class ApplicationService {
        @Inject()
        public db!: DatabaseService;

        @Inject()
        public api!: ApiService;

        public initialize() {
          return {
            db: this.db.getConnectionString(),
            api: this.api.getEndpoint('/users'),
          };
        }
      }

      const app = Container.get(ApplicationService);
      const result = app.initialize();

      expect(result.db).toBe('postgresql://localhost:5432/testdb');
      expect(result.api).toBe('https://api.example.com/users');
    });
  });

  describe('Complex Dependency Chains', () => {
    it('should handle deep dependency chains', () => {
      @Service()
      class Level5Service {
        public name = 'level5';
      }

      @Service()
      class Level4Service {
        @Inject()
        public level5!: Level5Service;
      }

      @Service()
      class Level3Service {
        @Inject()
        public level4!: Level4Service;
      }

      @Service()
      class Level2Service {
        @Inject()
        public level3!: Level3Service;
      }

      @Service()
      class Level1Service {
        @Inject()
        public level2!: Level2Service;
      }

      const level1 = Container.get(Level1Service);

      expect(level1.level2.level3.level4.level5.name).toBe('level5');
    });

    it('should handle diamond dependency pattern', () => {
      @Service()
      class SharedService {
        public name = 'shared';
      }

      @Service()
      class ServiceA {
        @Inject()
        public shared!: SharedService;
      }

      @Service()
      class ServiceB {
        @Inject()
        public shared!: SharedService;
      }

      @Service()
      class ServiceC {
        @Inject()
        public serviceA!: ServiceA;

        @Inject()
        public serviceB!: ServiceB;
      }

      const serviceC = Container.get(ServiceC);

      expect(serviceC.serviceA.shared).toBe(serviceC.serviceB.shared);
      expect(serviceC.serviceA.shared.name).toBe('shared');
    });
  });

  describe('Mixed Service Types', () => {
    it('should handle mix of class services, factory services, and value services', () => {
      // Class service
      @Service()
      class ClassService {
        public name = 'class-service';
      }

      // Factory service
      const factoryService = () => ({ name: 'factory-service' });
      Container.set({ id: 'factory-service', factory: factoryService });

      // Value service
      Container.set({ id: 'value-service', value: { name: 'value-service' } });

      // Consumer service
      @Service()
      class ConsumerService {
        @Inject()
        public classService!: ClassService;

        @Inject('factory-service')
        public factoryService!: any;

        @Inject('value-service')
        public valueService!: any;
      }

      const consumer = Container.get(ConsumerService);

      expect(consumer.classService.name).toBe('class-service');
      expect(consumer.factoryService.name).toBe('factory-service');
      expect(consumer.valueService.name).toBe('value-service');
    });

    it('should handle services with different scopes in same application', () => {
      @Service({ scope: 'singleton' })
      class SingletonService {
        public id = Math.random();
      }

      @Service({ scope: 'container' })
      class ContainerService {
        public id = Math.random();
      }

      @Service({ scope: 'transient' })
      class TransientService {
        public id = Math.random();
      }

      @Service()
      class MixedScopeService {
        @Inject()
        public singleton!: SingletonService;

        @Inject()
        public container!: ContainerService;

        @Inject()
        public transient!: TransientService;
      }

      const service1 = Container.get(MixedScopeService);
      const service2 = Container.get(MixedScopeService);

      // Singleton should be the same
      expect(service1.singleton).toBe(service2.singleton);

      // Container should be the same
      expect(service1.container).toBe(service2.container);

      // Transient should be different
      expect(service1.transient).not.toBe(service2.transient);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle service failures gracefully', () => {
      @Service()
      class FailingService {
        constructor() {
          throw new Error('Service creation failed');
        }
      }

      @Service()
      class ResilientService {
        @Inject()
        public failingService!: FailingService;
      }

      // Should throw error when trying to get the service
      expect(() => Container.get(ResilientService)).toThrow('Service creation failed');
    });

    it('should handle missing dependencies', () => {
      @Service()
      class MissingDependencyService {
        @Inject('non-existent-service')
        public missing!: any;
      }

      // Should throw error when trying to get the service
      expect(() => Container.get(MissingDependencyService)).toThrow();
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
    it('should handle services across multiple containers', () => {
      const container1 = new ContainerInstance('container1');
      const container2 = new ContainerInstance('container2');

      @Service()
      class SharedService {
        public name = 'shared';
      }

      @Service()
      class Container1Service {
        @Inject()
        public shared!: SharedService;
      }

      @Service()
      class Container2Service {
        @Inject()
        public shared!: SharedService;
      }

      const service1 = container1.get(Container1Service);
      const service2 = container2.get(Container2Service);

      // Each container should have its own instance
      expect(service1.shared).not.toBe(service2.shared);
      expect(service1.shared.name).toBe('shared');
      expect(service2.shared.name).toBe('shared');
    });

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
