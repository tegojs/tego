# Authentication / 认证

## Overview / 概述

Authentication verifies user identity. This guide covers token security, password security, and session management.

认证验证用户身份。本指南涵盖 token 安全、密码安全和会话管理。

## Token Security / Token 安全

```typescript
// ✅ Good / 好的 - Secure token handling / 安全的 token 处理
const token = ctx.getBearerToken();
if (!token) {
  ctx.throw(401, { message: 'Unauthenticated' });
}

// Validate token / 验证 token
const payload = await jwt.decode(token);
if (payload.exp < Date.now() / 1000) {
  ctx.throw(401, { message: 'Token expired' });
}

// Check blacklist / 检查黑名单
const blocked = await jwt.blacklist.has(payload.jti);
if (blocked) {
  ctx.throw(401, { message: 'Token blocked' });
}

// ❌ Bad / 不好的 - Trust token without validation / 不验证就信任 token
const token = ctx.getBearerToken();
const payload = jwt.decode(token); // No validation / 没有验证
```

## Password Security / 密码安全

```typescript
import bcrypt from 'bcrypt';

// ✅ Good / 好的 - Hash passwords / 哈希密码
const hashedPassword = await bcrypt.hash(password, 10);

// ✅ Good / 好的 - Verify passwords / 验证密码
const isValid = await bcrypt.compare(password, hashedPassword);

// ❌ Bad / 不好的 - Store plain text passwords / 存储明文密码
await db.getRepository('users').create({
  values: { password: plainTextPassword }, // Never do this / 永远不要这样做
});
```

## Session Management / 会话管理

```typescript
// ✅ Good / 好的 - Secure session configuration / 安全的会话配置
app.use(session({
  secret: process.env.SESSION_SECRET, // Use environment variable / 使用环境变量
  httpOnly: true, // Prevent XSS / 防止 XSS
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production / 生产环境仅 HTTPS
  sameSite: 'strict', // CSRF protection / CSRF 保护
  maxAge: 3600000, // 1 hour / 1 小时
}));
```

## Checklist / 检查清单

- [ ] Use secure token storage / 使用安全的 token 存储
- [ ] Implement token expiration / 实现 token 过期
- [ ] Implement token blacklist / 实现 token 黑名单
- [ ] Hash passwords / 哈希密码
- [ ] Use strong password policies / 使用强密码策略

