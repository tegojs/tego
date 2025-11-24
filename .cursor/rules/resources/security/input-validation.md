# Input Validation / 输入验证

## Overview / 概述

Input validation ensures data integrity and prevents security vulnerabilities. Always validate and sanitize user input.

输入验证确保数据完整性并防止安全漏洞。始终验证和清理用户输入。

## Sanitize User Input / 清理用户输入

```typescript
import validator from 'validator';

// ✅ Good / 好的 - Validate and sanitize input / 验证和清理输入
function validateEmail(email: string): string {
  if (!validator.isEmail(email)) {
    throw new Error('Invalid email format');
  }
  return validator.normalizeEmail(email);
}

function sanitizeHtml(html: string): string {
  return validator.escape(html); // Prevent XSS / 防止 XSS
}

// ❌ Bad / 不好的 - Use raw user input / 使用原始用户输入
const userInput = ctx.request.body.content;
await db.getRepository('posts').create({ values: { content: userInput } }); // XSS risk / XSS 风险
```

## SQL Injection Prevention / SQL 注入防护

```typescript
// ✅ Good / 好的 - Use parameterized queries / 使用参数化查询
const user = await db.getRepository('users').findOne({
  filter: {
    email: userEmail, // Parameterized / 参数化
  },
});

// ❌ Bad / 不好的 - String concatenation / 字符串拼接
const query = `SELECT * FROM users WHERE email = '${userEmail}'`; // SQL injection risk / SQL 注入风险
```

## Type Validation / 类型验证

```typescript
import { z } from 'zod';

// ✅ Good / 好的 - Use schema validation / 使用模式验证
const userSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
});

const validatedData = userSchema.parse(ctx.request.body);
```

## Checklist / 检查清单

- [ ] Validate all user input / 验证所有用户输入
- [ ] Sanitize HTML content / 清理 HTML 内容
- [ ] Use parameterized queries / 使用参数化查询
- [ ] Validate file uploads / 验证文件上传

