# Authorization / 授权

## Overview / 概述

Authorization controls what authenticated users can do. This guide covers ACL, resource-level authorization, and permission checks.

授权控制已认证用户可以做什么。本指南涵盖 ACL、资源级授权和权限检查。

## ACL (Access Control List) / 访问控制列表

```typescript
// ✅ Good / 好的 - Check permissions before actions / 操作前检查权限
const canAccess = await ctx.acl.can({
  role: ctx.state.user.role,
  resource: 'users',
  action: 'create',
});

if (!canAccess) {
  ctx.throw(403, { message: 'Forbidden' });
}

// ✅ Good / 好的 - Use ACL middleware / 使用 ACL 中间件
app.resourcer.use(acl.middleware(), { tag: 'acl', after: ['auth'] });
```

## Resource-Level Authorization / 资源级授权

```typescript
// ✅ Good / 好的 - Filter by user ownership / 按用户所有权过滤
app.resourcer.use(async (ctx, next) => {
  if (ctx.action.actionName === 'list') {
    ctx.action.mergeParams({
      filter: {
        createdById: ctx.auth.user.id, // Only show user's own resources / 仅显示用户自己的资源
      },
    });
  }
  await next();
});
```

## Checklist / 检查清单

- [ ] Implement ACL / 实现 ACL
- [ ] Check permissions before actions / 操作前检查权限
- [ ] Filter resources by ownership / 按所有权过滤资源
- [ ] Use least privilege principle / 使用最小权限原则

