# Performance Optimization Guidelines / 性能优化指南

This document provides performance optimization guidelines for the Tego project.

本文档提供 Tego 项目的性能优化指南。

## Quick Navigation / 快速导航

- [Database Performance / 数据库性能](resources/performance/database.md) - Query optimization, indexing, caching
  查询优化、索引、缓存
- [Frontend Performance / 前端性能](resources/performance/frontend.md) - Component optimization, code splitting
  组件优化、代码分割
- [API Performance / API 性能](resources/performance/api.md) - Response compression, request batching
  响应压缩、请求批处理
- [Performance Monitoring / 性能监控](resources/performance/monitoring.md) - Metrics, budgets, memory management
  指标、预算、内存管理

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

## Common Patterns / 常见模式

### Database / 数据库

- Avoid N+1 queries / 避免 N+1 查询
- Use pagination / 使用分页
- Add indexes / 添加索引
- Cache expensive queries / 缓存昂贵的查询

### Frontend / 前端

- Use React.memo / 使用 React.memo
- Implement code splitting / 实现代码分割
- Optimize images / 优化图片
- Use virtual scrolling / 使用虚拟滚动

### API / API

- Enable compression / 启用压缩
- Batch requests / 批处理请求
- Implement caching / 实现缓存

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
