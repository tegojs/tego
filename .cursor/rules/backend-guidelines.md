# Backend Development Guidelines / 后端开发指南

## Purpose / 目的

Establish consistent backend development patterns and best practices for Tego core framework.

为 Tego 核心框架建立一致的后端开发模式和最佳实践。

## When to Use This Guide / 何时使用此指南

Automatically activated in the following situations:
在以下情况下自动激活：

- Creating or modifying core packages / 创建或修改核心包
- Building server-side functionality / 构建服务端功能
- Implementing middleware / 实现中间件
- Database operations / 数据库操作
- Error handling / 错误处理
- Configuration management / 配置管理

---

## Quick Start / 快速开始

### New Package Checklist / 新包清单

- [ ] **Package Structure / 包结构**：Clear directory organization / 清晰的目录组织
- [ ] **Exports / 导出**：Clear public API / 清晰的公共 API
- [ ] **Type Definitions / 类型定义**：Complete TypeScript types / 完整的 TypeScript 类型
- [ ] **Dependencies / 依赖**：Minimal dependencies / 最小化依赖
- [ ] **Testing / 测试**：Unit tests + integration tests / 单元测试 + 集成测试

---

## Package Structure / 包结构

### Core Package Structure / 核心包结构

```
packages/core/src/
├── index.ts            # Main exports / 主导出
├── types.ts            # Type definitions / 类型定义
├── utils/              # Utility functions / 工具函数
├── classes/            # Core classes / 核心类
└── __tests__/          # Tests / 测试
```

### Server Package Structure / 服务端包结构

```
packages/server/src/
├── index.ts            # Main exports / 主导出
├── server.ts           # Server class / 服务器类
├── middleware/         # Middleware / 中间件
└── types.ts            # Type definitions / 类型定义
```

---

## Core Patterns / 核心模式

### 1. Application Class / Application 类

```typescript
import { Application } from '@tego/core';

const app = new Application({
  database: {
    dialect: 'postgres',
    // ...
  },
});

await app.load();
```

### 2. Database Operations / 数据库操作

```typescript
import { Database } from '@tachybase/database';

const db = new Database({
  dialect: 'postgres',
  // ...
});

// Define collection / 定义集合
db.defineCollection({
  name: 'users',
  fields: [
    { name: 'name', type: 'string' },
  ],
});
```

### 3. Dependency Injection / 依赖注入

```typescript
import { Container } from '@tachybase/di';

const container = new Container();

container.bind('UserService').to(UserService);
const userService = container.get('UserService');
```

---

## Best Practices / 最佳实践

1. **Single Responsibility / 单一职责**：Each package has one clear purpose / 每个包有单一明确的目的
2. **Minimal Dependencies / 最小依赖**：Avoid unnecessary dependencies / 避免不必要的依赖
3. **Type Safety / 类型安全**：Fully utilize TypeScript type system / 充分利用 TypeScript 类型系统
4. **Clear API / 清晰的 API**：Export only what's needed / 只导出需要的
5. **Test Coverage / 测试覆盖**：Write tests for core functionality / 为核心功能编写测试

