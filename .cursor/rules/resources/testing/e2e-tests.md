# E2E Tests / E2E 测试

## Overview / 概述

End-to-end tests verify the entire application flow from user perspective.

端到端测试从用户角度验证整个应用流程。

## Test File Structure / 测试文件结构

- **Location / 位置**: `packages/*/e2e/**/*.test.ts` or `packages/*/__e2e__/**/*.test.ts`
- **Framework / 框架**: Playwright

## Basic Pattern / 基本模式

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

### 1. Test User Flows / 测试用户流程

- Focus on complete user journeys / 专注于完整的用户旅程
- Test critical paths / 测试关键路径
- Avoid testing implementation details / 避免测试实现细节

### 2. Use Page Object Model / 使用页面对象模式

```typescript
class UserPage {
  constructor(private page: Page) {}
  
  async goto() {
    await this.page.goto('/users');
  }
  
  async createUser(name: string, email: string) {
    await this.page.click('text=Create User');
    await this.page.fill('input[name="name"]', name);
    await this.page.fill('input[name="email"]', email);
    await this.page.click('button[type="submit"]');
  }
}
```

### 3. Wait for Elements / 等待元素

```typescript
// ✅ Good / 好的 - Wait for element / 等待元素
await page.waitForSelector('text=User created');
await expect(page.locator('text=User created')).toBeVisible();

// ❌ Bad / 不好的 - No wait / 不等待
await page.click('button');
expect(page.locator('text=Success')).toBeVisible(); // May fail / 可能失败
```

## Common Patterns / 常见模式

### Testing Forms / 测试表单

```typescript
test('should submit form', async ({ page }) => {
  await page.goto('/form');
  await page.fill('input[name="name"]', 'Test');
  await page.selectOption('select[name="type"]', 'option1');
  await page.click('button[type="submit"]');
  await expect(page.locator('.success-message')).toBeVisible();
});
```

### Testing Navigation / 测试导航

```typescript
test('should navigate between pages', async ({ page }) => {
  await page.goto('/home');
  await page.click('text=Users');
  await expect(page).toHaveURL('/users');
});
```

## Checklist / 检查清单

- [ ] Tests complete user flow / 测试完整的用户流程
- [ ] Uses page object model / 使用页面对象模式
- [ ] Waits for elements / 等待元素
- [ ] Tests critical paths / 测试关键路径

