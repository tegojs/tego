# Database Performance / 数据库性能

## Overview / 概述

Database performance optimization focuses on query optimization, indexing, pagination, and caching.

数据库性能优化专注于查询优化、索引、分页和缓存。

## Query Optimization / 查询优化

```typescript
// ❌ Bad / 不好的 - N+1 queries / N+1 查询
const users = await db.getRepository('users').find();
for (const user of users) {
  const posts = await db.getRepository('posts').find({
    filter: { userId: user.id },
  });
}

// ✅ Good / 好的 - Batch query / 批量查询
const users = await db.getRepository('users').find({
  appends: ['posts'], // Eager loading / 预加载
});
```

## Indexing / 索引

```typescript
// Add indexes for frequently queried fields / 为频繁查询的字段添加索引
db.collection({
  name: 'posts',
  fields: [
    { type: 'string', name: 'title' },
    { type: 'belongsTo', name: 'author' },
  ],
  indexes: [
    { fields: ['title'] }, // Index for title searches / 标题搜索索引
    { fields: ['authorId'] }, // Index for author lookups / 作者查找索引
  ],
});
```

## Pagination / 分页

```typescript
// ✅ Good / 好的 - Use pagination / 使用分页
const posts = await db.getRepository('posts').find({
  page: 1,
  pageSize: 20,
});

// ❌ Bad / 不好的 - Load all data / 加载所有数据
const posts = await db.getRepository('posts').find(); // Could be thousands / 可能有数千条
```

## Caching / 缓存

```typescript
import { Cache } from '@tachybase/cache';

// Cache expensive queries / 缓存昂贵的查询
const cacheKey = `user:${userId}`;
let user = await cache.get(cacheKey);
if (!user) {
  user = await db.getRepository('users').findOne({ filterByTk: userId });
  await cache.set(cacheKey, user, 3600); // Cache for 1 hour / 缓存 1 小时
}
```

## Checklist / 检查清单

- [ ] Add indexes for frequently queried fields / 为频繁查询的字段添加索引
- [ ] Use pagination for large datasets / 对大数据集使用分页
- [ ] Avoid N+1 queries / 避免 N+1 查询
- [ ] Cache expensive queries / 缓存昂贵的查询
- [ ] Use connection pooling / 使用连接池

