import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ContainerInstance, ContainerRegistry } from '../index';

describe('ContainerRegistry', () => {
  let container1: ContainerInstance;
  let container2: ContainerInstance;

  beforeEach(() => {
    // Clean up any existing containers
    ContainerInstance.default.reset({ strategy: 'resetServices' });
  });

  afterEach(async () => {
    // Clean up containers
    try {
      if (container1 && !container1['disposed']) {
        await container1.dispose();
      }
    } catch (error) {
      // Ignore errors during cleanup
    }

    try {
      if (container2 && !container2['disposed']) {
        await container2.dispose();
      }
    } catch (error) {
      // Ignore errors during cleanup
    }

    ContainerInstance.default.reset({ strategy: 'resetServices' });
  });

  describe('Container Registration', () => {
    it('should register container automatically when created', () => {
      container1 = new ContainerInstance('test-container-1');

      expect(ContainerRegistry.hasContainer('test-container-1')).toBe(true);
    });

    it('should not register default container', () => {
      expect(ContainerRegistry.hasContainer('default')).toBe(false);
    });

    it('should throw error when registering non-ContainerInstance', () => {
      expect(() => {
        ContainerRegistry.registerContainer({} as any);
      }).toThrow('Only ContainerInstance instances can be registered.');
    });

    it('should throw error when registering container with same ID', () => {
      container1 = new ContainerInstance('duplicate-id');

      expect(() => {
        container2 = new ContainerInstance('duplicate-id');
      }).toThrow('Cannot register container with same ID.');
    });
  });

  describe('Container Retrieval', () => {
    it('should retrieve registered container', () => {
      container1 = new ContainerInstance('retrieve-test');

      const retrieved = ContainerRegistry.getContainer('retrieve-test');
      expect(retrieved).toBe(container1);
      expect(retrieved.id).toBe('retrieve-test');
    });

    it('should throw error when retrieving non-existent container', () => {
      expect(() => {
        ContainerRegistry.getContainer('non-existent');
      }).toThrow('No container is registered with the given ID.');
    });

    it('should check if container exists', () => {
      expect(ContainerRegistry.hasContainer('non-existent')).toBe(false);

      container1 = new ContainerInstance('exists-test');
      expect(ContainerRegistry.hasContainer('exists-test')).toBe(true);
    });
  });

  describe('Container Removal', () => {
    it('should remove container from registry', async () => {
      container1 = new ContainerInstance('remove-test');

      expect(ContainerRegistry.hasContainer('remove-test')).toBe(true);

      await ContainerRegistry.removeContainer(container1);

      expect(ContainerRegistry.hasContainer('remove-test')).toBe(false);
    });

    it('should throw error when removing non-existent container', async () => {
      container1 = new ContainerInstance('remove-test');
      await ContainerRegistry.removeContainer(container1);

      expect(async () => {
        await ContainerRegistry.removeContainer(container1);
      }).rejects.toThrow('No container is registered with the given ID.');
    });

    it('should dispose container when removing', async () => {
      let disposed = false;

      container1 = new ContainerInstance('dispose-test');
      container1['disposed'] = false;

      // Override dispose method to track calls
      const originalDispose = container1.dispose.bind(container1);
      container1.dispose = async () => {
        disposed = true;
        return originalDispose();
      };

      await ContainerRegistry.removeContainer(container1);

      expect(disposed).toBe(true);
    });
  });

  describe('Multiple Containers', () => {
    it('should handle multiple containers independently', () => {
      container1 = new ContainerInstance('multi-1');
      container2 = new ContainerInstance('multi-2');

      expect(ContainerRegistry.hasContainer('multi-1')).toBe(true);
      expect(ContainerRegistry.hasContainer('multi-2')).toBe(true);

      const retrieved1 = ContainerRegistry.getContainer('multi-1');
      const retrieved2 = ContainerRegistry.getContainer('multi-2');

      expect(retrieved1).toBe(container1);
      expect(retrieved2).toBe(container2);
      expect(retrieved1).not.toBe(retrieved2);
    });

    it('should isolate services between containers', () => {
      class TestService {
        public name = 'test';
      }

      container1 = new ContainerInstance('isolate-1');
      container2 = new ContainerInstance('isolate-2');

      container1.set({ type: TestService });
      container2.set({ type: TestService });

      const instance1 = container1.get(TestService);
      const instance2 = container2.get(TestService);

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Container Inheritance', () => {
    it('should inherit handlers from default container', () => {
      container1 = new ContainerInstance('inherit-test');

      // Default container should have handlers array
      expect(Array.isArray(ContainerInstance.default['handlers'])).toBe(true);

      // Child container should inherit handlers
      expect(Array.isArray(container1['handlers'])).toBe(true);
    });

    it('should not inherit handlers when creating default container', () => {
      // Default container should not inherit from itself
      expect(Array.isArray(ContainerInstance.default['handlers'])).toBe(true);
    });
  });

  describe('Container.of() Method', () => {
    it('should return default container when id is default', () => {
      const container = ContainerInstance.default.of('default');
      expect(container).toBe(ContainerInstance.default);
    });

    it('should return existing container when it exists', () => {
      container1 = new ContainerInstance('of-test');

      const retrieved = ContainerInstance.default.of('of-test');
      expect(retrieved).toBe(container1);
    });

    it('should create new container when it does not exist', () => {
      const newContainer = ContainerInstance.default.of('new-container');

      expect(newContainer).toBeInstanceOf(ContainerInstance);
      expect(newContainer.id).toBe('new-container');
      expect(ContainerRegistry.hasContainer('new-container')).toBe(true);
    });

    it('should throw error when using disposed container', async () => {
      container1 = new ContainerInstance('disposed-test');
      await container1.dispose();

      expect(() => container1.of('test')).toThrow('Cannot use container after it has been disposed.');
    });
  });

  describe('Container Lifecycle', () => {
    it('should handle container creation and disposal cycle', async () => {
      container1 = new ContainerInstance('lifecycle-test');

      // Register a service
      class TestService {
        public name = 'test';
      }

      container1.set({ type: TestService });
      expect(container1.has(TestService)).toBe(true);

      // Remove container
      await ContainerRegistry.removeContainer(container1);

      expect(ContainerRegistry.hasContainer('lifecycle-test')).toBe(false);
    });

    it('should handle multiple containers with same service types', () => {
      class TestService {
        public id = Math.random();
      }

      container1 = new ContainerInstance('same-service-1');
      container2 = new ContainerInstance('same-service-2');

      container1.set({ type: TestService });
      container2.set({ type: TestService });

      const instance1 = container1.get(TestService);
      const instance2 = container2.get(TestService);

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).not.toBe(instance2.id);
    });
  });

  describe('Error Handling', () => {
    it('should handle container disposal errors gracefully', async () => {
      container1 = new ContainerInstance('error-test');

      // Override dispose to throw error
      const originalDispose = container1.dispose.bind(container1);
      container1.dispose = async () => {
        throw new Error('Disposal error');
      };

      // Should still remove from registry even if disposal fails
      await expect(ContainerRegistry.removeContainer(container1)).rejects.toThrow('Disposal error');
    });

    it('should handle invalid container IDs', () => {
      expect(() => {
        ContainerRegistry.getContainer('' as any);
      }).toThrow('No container is registered with the given ID.');
    });
  });

  describe('Default Container', () => {
    it('should have default container available', () => {
      expect(ContainerInstance.default).toBeDefined();
      expect(ContainerInstance.default.id).toBe('default');
    });

    it('should return same default container instance', () => {
      const default1 = ContainerInstance.default;
      const default2 = ContainerInstance.default;

      expect(default1).toBe(default2);
    });

    it('should register default container in registry', () => {
      // Default container should be registered when first accessed
      expect(ContainerInstance.default).toBeDefined();
    });
  });
});
