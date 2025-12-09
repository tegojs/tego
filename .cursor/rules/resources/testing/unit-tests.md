# Unit Tests / 单元测试

## Overview / 概述

Unit tests focus on testing individual functions, methods, or components in isolation.

单元测试专注于测试独立的函数、方法或组件。

## Test File Structure / 测试文件结构

- **Location / 位置**: `packages/*/src/__tests__/**/*.test.ts`
- **Naming / 命名**: `*.test.ts` or `*.spec.ts`

## Basic Pattern / 基本模式

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockDatabase } from '@tachybase/test';

describe('MyFeature', () => {
  let db;

  beforeEach(async () => {
    db = mockDatabase();
    // Setup test database / 设置测试数据库
    db.collection({
      name: 'posts',
      fields: [
        { type: 'string', name: 'title' },
        { type: 'string', name: 'content' },
      ],
    });
    await db.sync();
  });

  afterEach(async () => {
    await db.close();
  });

  it('should create a post', async () => {
    const repository = db.getRepository('posts');
    const post = await repository.create({
      values: {
        title: 'Test Post',
        content: 'Test Content',
      },
    });

    expect(post.get('title')).toBe('Test Post');
    expect(post.get('content')).toBe('Test Content');
  });
});
```

## Best Practices / 最佳实践

### 1. Test Isolation / 测试隔离

- Each test should be independent / 每个测试应该是独立的
- Use `beforeEach` and `afterEach` for setup/teardown / 使用 `beforeEach` 和 `afterEach` 进行设置/清理

### 2. Descriptive Names / 描述性名称

```typescript
// ✅ Good / 好的
it('should return user data when valid ID is provided', () => {});

// ❌ Bad / 不好的
it('test1', () => {});
```

### 3. Arrange-Act-Assert Pattern / 安排-执行-断言模式

```typescript
it('should calculate total price', () => {
  // Arrange / 安排
  const items = [{ price: 10 }, { price: 20 }];
  
  // Act / 执行
  const total = calculateTotal(items);
  
  // Assert / 断言
  expect(total).toBe(30);
});
```

### 4. Test Edge Cases / 测试边界情况

```typescript
it('should handle empty array', () => {
  expect(processItems([])).toEqual([]);
});

it('should handle null input', () => {
  expect(processItems(null)).toBeNull();
});
```

## Common Mistakes / 常见错误

### ❌ Tests Depend on Each Other / 测试相互依赖

```typescript
// Bad / 不好的
let sharedState;
it('test1', () => { sharedState = 'value'; });
it('test2', () => { expect(sharedState).toBe('value'); }); // Depends on test1 / 依赖于 test1
```

### ❌ Not Cleaning Up / 不清理

```typescript
// Bad / 不好的
it('test', async () => {
  const db = mockDatabase();
  // Missing await db.close() / 缺少 await db.close()
});
```

### ❌ Testing Implementation Details / 测试实现细节

```typescript
// Bad / 不好的
it('should call internal method', () => {
  expect(component.internalMethod).toHaveBeenCalled();
});

// Good / 好的
it('should update UI when data changes', () => {
  // Test behavior, not implementation / 测试行为，而不是实现
});
```

## Testing Patterns / 测试模式

### Testing Async Operations / 测试异步操作

```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Error Handling / 测试错误处理

```typescript
it('should throw error for invalid input', async () => {
  await expect(asyncFunction(null)).rejects.toThrow('Invalid input');
});
```

## Checklist / 检查清单

- [ ] Test is independent / 测试是独立的
- [ ] Uses descriptive name / 使用描述性名称
- [ ] Follows Arrange-Act-Assert pattern / 遵循安排-执行-断言模式
- [ ] Tests edge cases / 测试边界情况
- [ ] Cleans up resources / 清理资源

