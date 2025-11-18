# API Performance / API 性能

## Overview / 概述

API performance optimization focuses on response compression, request batching, and caching.

API 性能优化专注于响应压缩、请求批处理和缓存。

## Response Compression / 响应压缩

```typescript
// Enable compression middleware / 启用压缩中间件
import compression from 'compression';

app.use(compression());
```

## Request Batching / 请求批处理

```typescript
// ✅ Good / 好的 - Batch requests / 批处理请求
const [users, posts, comments] = await Promise.all([
  api.resource('users').list(),
  api.resource('posts').list(),
  api.resource('comments').list(),
]);

// ❌ Bad / 不好的 - Sequential requests / 顺序请求
const users = await api.resource('users').list();
const posts = await api.resource('posts').list();
const comments = await api.resource('comments').list();
```

## Debouncing and Throttling / 防抖和节流

```typescript
import { debounce, throttle } from 'lodash';

// Debounce search input / 防抖搜索输入
const debouncedSearch = debounce((query) => {
  api.resource('items').list({ filter: { q: query } });
}, 300);

// Throttle scroll events / 节流滚动事件
const throttledScroll = throttle(() => {
  // Handle scroll / 处理滚动
}, 100);
```

## Checklist / 检查清单

- [ ] Enable response compression / 启用响应压缩
- [ ] Batch related requests / 批处理相关请求
- [ ] Implement request caching / 实现请求缓存
- [ ] Use CDN for static assets / 为静态资源使用 CDN

