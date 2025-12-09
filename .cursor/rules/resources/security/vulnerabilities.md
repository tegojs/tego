# Common Vulnerabilities / 常见漏洞

## Overview / 概述

This guide covers common security vulnerabilities and how to prevent them.

本指南涵盖常见安全漏洞及其预防方法。

## XSS (Cross-Site Scripting) / 跨站脚本攻击

```typescript
// ✅ Good / 好的 - Escape user input / 转义用户输入
import { escape } from 'lodash';

const safeContent = escape(userInput);

// ✅ Good / 好的 - Use Content Security Policy / 使用内容安全策略
app.use((ctx, next) => {
  ctx.set('Content-Security-Policy', "default-src 'self'");
  return next();
});
```

## CSRF (Cross-Site Request Forgery) / 跨站请求伪造

```typescript
// ✅ Good / 好的 - Use CSRF tokens / 使用 CSRF token
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Include token in forms / 在表单中包含 token
app.use((ctx, next) => {
  ctx.state.csrfToken = ctx.csrfToken();
  return next();
});
```

## Path Traversal / 路径遍历

```typescript
// ✅ Good / 好的 - Validate file paths / 验证文件路径
import path from 'path';

function getSafeFilePath(userPath: string): string {
  const normalized = path.normalize(userPath);
  const baseDir = '/safe/directory';
  
  if (!normalized.startsWith(baseDir)) {
    throw new Error('Invalid path');
  }
  
  return normalized;
}

// ❌ Bad / 不好的 - Use user input directly / 直接使用用户输入
const filePath = path.join('/uploads', userInput); // Path traversal risk / 路径遍历风险
```

## Security Headers / 安全头

```typescript
// ✅ Good / 好的 - Set security headers / 设置安全头
app.use(async (ctx, next) => {
  ctx.set('X-Content-Type-Options', 'nosniff');
  ctx.set('X-Frame-Options', 'DENY');
  ctx.set('X-XSS-Protection', '1; mode=block');
  ctx.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  ctx.set('Content-Security-Policy', "default-src 'self'");
  await next();
});
```

## Checklist / 检查清单

- [ ] Prevent XSS attacks / 防止 XSS 攻击
- [ ] Implement CSRF protection / 实现 CSRF 保护
- [ ] Validate file paths / 验证文件路径
- [ ] Set security headers / 设置安全头

