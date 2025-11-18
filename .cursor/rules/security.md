# Security Guidelines / 安全开发指南

This document provides comprehensive security guidelines for the Tego project.

本文档提供 Tego 项目的全面安全开发指南。

## Quick Navigation / 快速导航

- [Authentication / 认证](resources/security/authentication.md) - Token security, password security, session management
  Token 安全、密码安全、会话管理
- [Authorization / 授权](resources/security/authorization.md) - ACL, resource-level authorization, permissions
  ACL、资源级授权、权限
- [Input Validation / 输入验证](resources/security/input-validation.md) - Input sanitization, SQL injection prevention
  输入清理、SQL 注入防护
- [Common Vulnerabilities / 常见漏洞](resources/security/vulnerabilities.md) - XSS, CSRF, path traversal prevention
  XSS、CSRF、路径遍历防护

## Security Principles / 安全原则

1. **Defense in Depth / 纵深防御**
   - Multiple layers of security / 多层安全防护
   - Don't rely on a single security measure / 不要依赖单一安全措施

2. **Least Privilege / 最小权限**
   - Grant minimum necessary permissions / 授予最小必要权限
   - Principle of least privilege / 最小权限原则

3. **Secure by Default / 默认安全**
   - Secure configurations by default / 默认安全配置
   - Explicitly enable insecure features / 显式启用不安全功能

4. **Never Trust User Input / 永远不要信任用户输入**
   - Validate and sanitize all input / 验证和清理所有输入
   - Use parameterized queries / 使用参数化查询

## Data Protection / 数据保护

### Sensitive Data / 敏感数据

```typescript
// ✅ Good / 好的 - Don't expose sensitive fields / 不暴露敏感字段
const user = await db.getRepository('users').findOne({
  filter: { id: userId },
  appends: ['profile'],
});

// Remove sensitive data / 移除敏感数据
delete user.password;
delete user.secretKey;
delete user.apiKey;
```

### Encryption / 加密

```typescript
import crypto from 'crypto';

// ✅ Good / 好的 - Encrypt sensitive data / 加密敏感数据
function encrypt(text: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}
```

## API Security / API 安全

### Rate Limiting / 速率限制

```typescript
import rateLimit from 'express-rate-limit';

// ✅ Good / 好的 - Implement rate limiting / 实现速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes / 15 分钟
  max: 100, // Limit each IP to 100 requests per windowMs / 限制每个 IP 在窗口时间内最多 100 个请求
});

app.use('/api/', limiter);
```

### CORS Configuration / CORS 配置

```typescript
// ✅ Good / 好的 - Restrictive CORS / 限制性 CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### HTTPS / HTTPS

```typescript
// ✅ Good / 好的 - Force HTTPS in production / 生产环境强制 HTTPS
if (process.env.NODE_ENV === 'production') {
  app.use((ctx, next) => {
    if (ctx.protocol !== 'https') {
      ctx.redirect(`https://${ctx.host}${ctx.url}`);
      return;
    }
    return next();
  });
}
```

## Environment Variables / 环境变量

```typescript
// ✅ Good / 好的 - Use environment variables for secrets / 使用环境变量存储密钥
const config = {
  jwtSecret: process.env.JWT_SECRET, // Never hardcode / 永远不要硬编码
  dbPassword: process.env.DB_PASSWORD,
  apiKey: process.env.API_KEY,
};

// Validate required environment variables / 验证必需的环境变量
const requiredEnvVars = ['JWT_SECRET', 'DB_PASSWORD'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

## Logging and Monitoring / 日志和监控

```typescript
// ✅ Good / 好的 - Log security events / 记录安全事件
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      ctx.logger.warn('Security event', {
        status: err.status,
        path: ctx.path,
        ip: ctx.ip,
        user: ctx.state.user?.id,
      });
    }
    throw err;
  }
});
```

## Checklist / 检查清单

### Authentication / 认证

- [ ] Use secure token storage / 使用安全的 token 存储
- [ ] Implement token expiration / 实现 token 过期
- [ ] Implement token blacklist / 实现 token 黑名单
- [ ] Hash passwords / 哈希密码
- [ ] Use strong password policies / 使用强密码策略

### Authorization / 授权

- [ ] Implement ACL / 实现 ACL
- [ ] Check permissions before actions / 操作前检查权限
- [ ] Filter resources by ownership / 按所有权过滤资源
- [ ] Use least privilege principle / 使用最小权限原则

### Input Validation / 输入验证

- [ ] Validate all user input / 验证所有用户输入
- [ ] Sanitize HTML content / 清理 HTML 内容
- [ ] Use parameterized queries / 使用参数化查询
- [ ] Validate file uploads / 验证文件上传

### Data Protection / 数据保护

- [ ] Don't expose sensitive fields / 不暴露敏感字段
- [ ] Encrypt sensitive data / 加密敏感数据
- [ ] Use HTTPS in production / 生产环境使用 HTTPS
- [ ] Secure environment variables / 保护环境变量

### API Security / API 安全

- [ ] Implement rate limiting / 实现速率限制
- [ ] Configure CORS properly / 正确配置 CORS
- [ ] Use security headers / 使用安全头
- [ ] Implement CSRF protection / 实现 CSRF 保护

## Resources / 资源

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Node.js Security Best Practices**: https://nodejs.org/en/docs/guides/security/
- **Express Security**: https://expressjs.com/en/advanced/best-practice-security.html
