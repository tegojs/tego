# Frontend Performance / 前端性能

## Overview / 概述

Frontend performance optimization focuses on component optimization, code splitting, and rendering optimization.

前端性能优化专注于组件优化、代码分割和渲染优化。

## Component Optimization / 组件优化

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

## Code Splitting / 代码分割

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
```

## List Rendering / 列表渲染

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
```

## Image Optimization / 图片优化

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

## Checklist / 检查清单

- [ ] Use React.memo for expensive components / 为昂贵的组件使用 React.memo
- [ ] Implement code splitting / 实现代码分割
- [ ] Optimize images / 优化图片
- [ ] Use virtual scrolling for long lists / 为长列表使用虚拟滚动
- [ ] Debounce/throttle user input / 防抖/节流用户输入

