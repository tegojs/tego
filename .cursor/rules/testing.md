# Testing Guidelines / 测试指南

This document provides comprehensive testing guidelines for the Tego project, covering unit tests, integration tests, and E2E tests.

本文档提供 Tego 项目的全面测试指南，涵盖单元测试、集成测试和 E2E 测试。

## Testing Framework / 测试框架

- **Unit/Integration Tests**: Vitest
- **E2E Tests**: Playwright
- **Test Utilities**: `@tachybase/test` package

## Test File Structure / 测试文件结构

### Unit/Integration Tests / 单元/集成测试

- **Location / 位置**: `packages/*/src/__tests__/**/*.test.ts`
- **Naming / 命名**: `*.test.ts` or `*.spec.ts`
- **Example / 示例**:

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

### Server Tests / 服务端测试

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

### Client/Component Tests / 客户端/组件测试

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@tachybase/test/client';
import { SchemaComponentProvider } from '@tego/client';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(
      <SchemaComponentProvider>
        <MyComponent />
      </SchemaComponentProvider>
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const { user } = render(
      <SchemaComponentProvider>
        <MyComponent />
      </SchemaComponentProvider>
    );

    const button = screen.getByRole('button', { name: 'Click me' });
    await user.click(button);

    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

### E2E Tests / E2E 测试

- **Location / 位置**: `packages/*/e2e/**/*.test.ts` or `packages/*/__e2e__/**/*.test.ts`
- **Example / 示例**:

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test('should create a new user', async ({ page }) => {
    await page.goto('/users');
    await page.click('text=Create User');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Test User')).toBeVisible();
  });
});
```

## Best Practices / 最佳实践

### ✅ Good Practices / 好的做法

1. **Isolation / 隔离**
   - Each test should be independent / 每个测试应该是独立的
   - Use `beforeEach` and `afterEach` for setup/teardown / 使用 `beforeEach` 和 `afterEach` 进行设置/清理

2. **Descriptive Names / 描述性名称**
   ```typescript
   // Good / 好的
   it('should return user data when valid ID is provided', () => {});
   
   // Bad / 不好的
   it('test1', () => {});
   ```

3. **Arrange-Act-Assert Pattern / 安排-执行-断言模式**
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

4. **Mock External Dependencies / 模拟外部依赖**
   ```typescript
   import { vi } from 'vitest';
   
   it('should call API', async () => {
     const mockFetch = vi.fn().mockResolvedValue({ data: 'test' });
     // Use mock / 使用模拟
   });
   ```

5. **Test Edge Cases / 测试边界情况**
   ```typescript
   it('should handle empty array', () => {
     expect(processItems([])).toEqual([]);
   });
   
   it('should handle null input', () => {
     expect(processItems(null)).toBeNull();
   });
   ```

### ❌ Common Mistakes / 常见错误

1. **Tests Depend on Each Other / 测试相互依赖**
   ```typescript
   // Bad / 不好的
   let sharedState;
   it('test1', () => { sharedState = 'value'; });
   it('test2', () => { expect(sharedState).toBe('value'); }); // Depends on test1 / 依赖于 test1
   ```

2. **Not Cleaning Up / 不清理**
   ```typescript
   // Bad / 不好的
   it('test', async () => {
     const db = mockDatabase();
     // Missing await db.close() / 缺少 await db.close()
   });
   ```

3. **Testing Implementation Details / 测试实现细节**
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

4. **Overly Complex Tests / 过于复杂的测试**
   ```typescript
   // Bad / 不好的 - Too many assertions / 太多断言
   it('should do everything', () => {
     // 50 lines of test code / 50 行测试代码
   });
   
   // Good / 好的 - Focused test / 专注的测试
   it('should validate email format', () => {
     expect(validateEmail('test@example.com')).toBe(true);
   });
   ```

## Test Coverage / 测试覆盖率

### Coverage Thresholds / 覆盖率阈值

- **Lines**: 60%
- **Branches**: 60%
- **Functions**: 80%
- **Statements**: 80%

### Running Coverage / 运行覆盖率

```bash
# Run tests with coverage / 运行测试并生成覆盖率报告
pnpm test --coverage

# View coverage report / 查看覆盖率报告
open coverage/index.html
```

## Common Test Patterns / 常见测试模式

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

### Testing Hooks / 测试钩子

```typescript
describe('Component Lifecycle', () => {
  it('should call onMount', () => {
    const onMount = vi.fn();
    render(<Component onMount={onMount} />);
    expect(onMount).toHaveBeenCalled();
  });
});
```

### Testing Forms / 测试表单

```typescript
it('should submit form with valid data', async () => {
  const onSubmit = vi.fn();
  const { user } = render(<Form onSubmit={onSubmit} />);
  
  await user.type(screen.getByLabelText('Name'), 'Test');
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  
  expect(onSubmit).toHaveBeenCalledWith({ name: 'Test' });
});
```

## Checklist / 检查清单

### Before Writing Tests / 编写测试前

- [ ] Understand what needs to be tested / 理解需要测试的内容
- [ ] Identify test cases (happy path, edge cases, error cases) / 识别测试用例（正常路径、边界情况、错误情况）
- [ ] Set up test environment / 设置测试环境

### While Writing Tests / 编写测试时

- [ ] Follow Arrange-Act-Assert pattern / 遵循安排-执行-断言模式
- [ ] Use descriptive test names / 使用描述性测试名称
- [ ] Keep tests focused and simple / 保持测试专注和简单
- [ ] Mock external dependencies / 模拟外部依赖
- [ ] Clean up resources in `afterEach` / 在 `afterEach` 中清理资源

### After Writing Tests / 编写测试后

- [ ] Run tests locally / 本地运行测试
- [ ] Check test coverage / 检查测试覆盖率
- [ ] Ensure tests are independent / 确保测试是独立的
- [ ] Review test code quality / 审查测试代码质量

## Resources / 资源

- **Vitest Documentation**: https://vitest.dev/
- **Playwright Documentation**: https://playwright.dev/
- **Testing Library**: https://testing-library.com/

