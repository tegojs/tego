# Mocking Patterns / 模拟模式

## Overview / 概述

Mocking allows you to isolate units under test by replacing dependencies with controlled substitutes.

模拟允许您通过用受控替代品替换依赖项来隔离被测试的单元。

## Mocking with Vitest / 使用 Vitest 模拟

```typescript
import { vi } from 'vitest';

// Mock a function / 模拟函数
const mockFetch = vi.fn().mockResolvedValue({ data: 'test' });

// Mock a module / 模拟模块
vi.mock('./api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' }),
}));

// Mock implementation / 模拟实现
const mockService = {
  getData: vi.fn().mockImplementation(async (id) => {
    return { id, name: 'Test' };
  }),
};
```

## Mocking Database / 模拟数据库

```typescript
import { mockDatabase } from '@tachybase/test';

describe('UserService', () => {
  let db;

  beforeEach(async () => {
    db = mockDatabase();
    db.collection({
      name: 'users',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'string', name: 'email' },
      ],
    });
    await db.sync();
  });

  afterEach(async () => {
    await db.close();
  });
});
```

## Mocking Server / 模拟服务器

```typescript
import { mockServer } from '@tachybase/test';

describe('API Integration', () => {
  let app;

  beforeEach(async () => {
    app = mockServer({
      plugins: ['acl', 'users'],
    });
    await app.start();
  });

  afterEach(async () => {
    await app.destroy();
  });
});
```

## Best Practices / 最佳实践

### 1. Mock External Dependencies / 模拟外部依赖

```typescript
// Mock external API / 模拟外部 API
vi.mock('@tachybase/api', () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
}));
```

### 2. Reset Mocks Between Tests / 测试之间重置模拟

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

### 3. Verify Mock Calls / 验证模拟调用

```typescript
it('should call API', async () => {
  const mockFetch = vi.fn().mockResolvedValue({ data: 'test' });
  await fetchData();
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
```

## Common Patterns / 常见模式

### Mocking HTTP Requests / 模拟 HTTP 请求

```typescript
import { vi } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

it('should fetch data', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test' }),
  });
  
  const result = await fetchData();
  expect(result.data).toBe('test');
});
```

### Mocking Time / 模拟时间

```typescript
import { vi } from 'vitest';

it('should handle timeout', async () => {
  vi.useFakeTimers();
  
  const promise = delayedFunction();
  vi.advanceTimersByTime(1000);
  
  await promise;
  vi.useRealTimers();
});
```

## Checklist / 检查清单

- [ ] Mocks external dependencies / 模拟外部依赖
- [ ] Resets mocks between tests / 测试之间重置模拟
- [ ] Verifies mock calls / 验证模拟调用
- [ ] Uses appropriate mock type / 使用适当的模拟类型

