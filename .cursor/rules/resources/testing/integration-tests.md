# Integration Tests / 集成测试

## Overview / 概述

Integration tests verify that multiple components work together correctly.

集成测试验证多个组件能够正确协同工作。

## Test File Structure / 测试文件结构

- **Location / 位置**: `packages/*/src/__tests__/**/*.test.ts`
- **Naming / 命名**: `*.test.ts` or `*.spec.ts`

## Server Integration Tests / 服务端集成测试

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockServer } from '@tachybase/test';

describe('API Routes', () => {
  let app;

  beforeEach(async () => {
    app = mockServer({
      plugins: [
        'acl',
        'users',
        'collection-manager',
        'error-handler',
        // Add required plugins / 添加必需的插件
      ],
    });
    await app.start();
  });

  afterEach(async () => {
    await app.destroy();
  });

  it('should handle GET request', async () => {
    const response = await app.agent().resource('users').list();
    expect(response.status).toBe(200);
  });

  it('should handle POST request', async () => {
    const response = await app.agent().resource('users').create({
      values: {
        name: 'Test User',
        email: 'test@example.com',
      },
    });
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Test User');
  });
});
```

## Best Practices / 最佳实践

### 1. Test Real Integration / 测试真实集成

- Test actual component interactions / 测试实际的组件交互
- Use real database connections / 使用真实数据库连接
- Test API endpoints / 测试 API 端点

### 2. Isolate Test Data / 隔离测试数据

- Use separate test database / 使用独立的测试数据库
- Clean up after each test / 每个测试后清理
- Use transactions when possible / 尽可能使用事务

### 3. Test Error Scenarios / 测试错误场景

```typescript
it('should handle database errors', async () => {
  // Simulate database error / 模拟数据库错误
  await expect(app.agent().resource('users').create({
    values: { /* invalid data */ },
  })).rejects.toThrow();
});
```

## Common Patterns / 常见模式

### Testing Database Operations / 测试数据库操作

```typescript
it('should create and retrieve user', async () => {
  const createResponse = await app.agent().resource('users').create({
    values: { name: 'Test', email: 'test@example.com' },
  });
  
  const userId = createResponse.body.data.id;
  const getResponse = await app.agent().resource('users').get({ filterByTk: userId });
  
  expect(getResponse.body.data.name).toBe('Test');
});
```

### Testing Authentication / 测试认证

```typescript
it('should require authentication', async () => {
  const response = await app.agent().resource('protected').list();
  expect(response.status).toBe(401);
});
```

## Checklist / 检查清单

- [ ] Tests multiple components together / 测试多个组件一起工作
- [ ] Uses real database / 使用真实数据库
- [ ] Tests error scenarios / 测试错误场景
- [ ] Cleans up test data / 清理测试数据

