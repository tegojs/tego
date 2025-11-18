# Performance Monitoring / 性能监控

## Overview / 概述

Performance monitoring helps identify bottlenecks and measure optimization effectiveness.

性能监控有助于识别瓶颈并衡量优化效果。

## Performance Metrics / 性能指标

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

## Performance Budgets / 性能预算

- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.8s
- **Total Blocking Time (TBT)**: < 200ms
- **Cumulative Layout Shift (CLS)**: < 0.1

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

## Checklist / 检查清单

- [ ] Profile before optimizing / 优化前先分析
- [ ] Set performance budgets / 设置性能预算
- [ ] Monitor performance metrics / 监控性能指标
- [ ] Clean up resources / 清理资源

