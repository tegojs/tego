# Performance Optimization Guidelines / 性能优化指南

This document provides performance optimization guidelines for the Tego project.

本文档提供 Tego 项目的性能优化指南。

## Performance Principles / 性能原则

1. **Measure First / 先测量**
   - Profile before optimizing / 优化前先分析
   - Identify bottlenecks / 识别瓶颈
   - Set performance budgets / 设置性能预算

2. **Optimize Critical Path / 优化关键路径**
   - Focus on user-facing performance / 关注面向用户的性能
   - Optimize hot paths / 优化热路径

3. **Progressive Enhancement / 渐进增强**
   - Start with baseline performance / 从基线性能开始
   - Add optimizations incrementally / 逐步添加优化

## Database Performance / 数据库性能

### Query Optimization / 查询优化

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

### Indexing / 索引

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

### Pagination / 分页

```typescript
// ✅ Good / 好的 - Use pagination / 使用分页
const posts = await db.getRepository('posts').find({
  page: 1,
  pageSize: 20,
});

// ❌ Bad / 不好的 - Load all data / 加载所有数据
const posts = await db.getRepository('posts').find(); // Could be thousands / 可能有数千条
```

### Caching / 缓存

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

## Frontend Performance / 前端性能

### Component Optimization / 组件优化

```typescript
// ✅ Good / 好的 - Memoization / 记忆化
import { memo, useMemo, useCallback } from 'react';

const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => {
    return expensiveComputation(data);
  }, [data]);

  const handleClick = useCallback(() => {
    // Handle click / 处理点击
  }, []);

  return <div>{processedData}</div>;
});

// ❌ Bad / 不好的 - Re-renders on every parent update / 每次父组件更新都重新渲染
const ExpensiveComponent = ({ data }) => {
  const processedData = expensiveComputation(data); // Runs every render / 每次渲染都运行
  return <div>{processedData}</div>;
};
```

### Code Splitting / 代码分割

```typescript
// ✅ Good / 好的 - Lazy loading / 懒加载
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}

// ❌ Bad / 不好的 - Eager loading / 立即加载
import HeavyComponent from './HeavyComponent'; // Loads immediately / 立即加载
```

### List Rendering / 列表渲染

```typescript
// ✅ Good / 好的 - Virtual scrolling / 虚拟滚动
import { VirtualList } from '@tachybase/client';

function LargeList({ items }) {
  return (
    <VirtualList
      items={items}
      itemHeight={50}
      renderItem={(item) => <ListItem item={item} />}
    />
  );
}

// ❌ Bad / 不好的 - Render all items / 渲染所有项
function LargeList({ items }) {
  return (
    <div>
      {items.map((item) => (
        <ListItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### Image Optimization / 图片优化

```typescript
// ✅ Good / 好的 - Lazy loading images / 懒加载图片
<img
  src={imageUrl}
  loading="lazy"
  alt="Description"
/>

// ✅ Good / 好的 - Responsive images / 响应式图片
<img
  srcSet={`${imageSmall} 480w, ${imageLarge} 800w`}
  sizes="(max-width: 600px) 480px, 800px"
  src={imageLarge}
  alt="Description"
/>
```

## API Performance / API 性能

### Response Compression / 响应压缩

```typescript
// Enable compression middleware / 启用压缩中间件
import compression from 'compression';

app.use(compression());
```

### Request Batching / 请求批处理

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

### Debouncing and Throttling / 防抖和节流

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

## Memory Management / 内存管理

### Cleanup / 清理

```typescript
// ✅ Good / 好的 - Cleanup in useEffect / 在 useEffect 中清理
useEffect(() => {
  const subscription = subscribe();
  return () => {
    subscription.unsubscribe(); // Cleanup / 清理
  };
}, []);

// ❌ Bad / 不好的 - Memory leak / 内存泄漏
useEffect(() => {
  subscribe(); // No cleanup / 没有清理
}, []);
```

### Avoid Memory Leaks / 避免内存泄漏

```typescript
// ✅ Good / 好的 - Clear references / 清除引用
let timer: NodeJS.Timeout | null = null;

useEffect(() => {
  timer = setInterval(() => {
    // Do something / 做一些事情
  }, 1000);

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}, []);
```

## Performance Monitoring / 性能监控

### Performance Metrics / 性能指标

```typescript
// Measure API response time / 测量 API 响应时间
const startTime = performance.now();
await api.resource('users').list();
const endTime = performance.now();
console.log(`API call took ${endTime - startTime}ms`);

// Measure component render time / 测量组件渲染时间
useEffect(() => {
  const startTime = performance.now();
  return () => {
    const endTime = performance.now();
    console.log(`Component rendered in ${endTime - startTime}ms`);
  };
});
```

### Performance Budgets / 性能预算

- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.8s
- **Total Blocking Time (TBT)**: < 200ms
- **Cumulative Layout Shift (CLS)**: < 0.1

## Checklist / 检查清单

### Database / 数据库

- [ ] Add indexes for frequently queried fields / 为频繁查询的字段添加索引
- [ ] Use pagination for large datasets / 对大数据集使用分页
- [ ] Avoid N+1 queries / 避免 N+1 查询
- [ ] Cache expensive queries / 缓存昂贵的查询
- [ ] Use connection pooling / 使用连接池

### Frontend / 前端

- [ ] Use React.memo for expensive components / 为昂贵的组件使用 React.memo
- [ ] Implement code splitting / 实现代码分割
- [ ] Optimize images / 优化图片
- [ ] Use virtual scrolling for long lists / 为长列表使用虚拟滚动
- [ ] Debounce/throttle user input / 防抖/节流用户输入

### API / API

- [ ] Enable response compression / 启用响应压缩
- [ ] Batch related requests / 批处理相关请求
- [ ] Implement request caching / 实现请求缓存
- [ ] Use CDN for static assets / 为静态资源使用 CDN

### General / 通用

- [ ] Profile before optimizing / 优化前先分析
- [ ] Set performance budgets / 设置性能预算
- [ ] Monitor performance metrics / 监控性能指标
- [ ] Clean up resources / 清理资源

## Resources / 资源

- **Web Vitals**: https://web.dev/vitals/
- **React Performance**: https://react.dev/learn/render-and-commit
- **Chrome DevTools**: https://developer.chrome.com/docs/devtools/

