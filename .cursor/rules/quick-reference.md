# Quick Reference / 快速参考

A quick reference guide for common development tasks and patterns.

常用开发任务和模式的快速参考指南。

## Common Commands / 常用命令

```bash
# Development / 开发
pnpm dev              # Start dev server / 启动开发服务器
pnpm build            # Build all packages / 构建所有包
pnpm lint             # Run linter / 运行代码检查
pnpm test             # Run tests / 运行测试
pnpm e2e              # Run E2E tests / 运行 E2E 测试

# Package Management / 包管理
pnpm install          # Install dependencies / 安装依赖
pnpm add <pkg> -w     # Add to root / 添加到根目录
pnpm add <pkg> --filter <name>  # Add to specific package / 添加到特定包
pnpm tgi              # tego install / tego 安装
pnpm tgu              # tego upgrade / tego 升级
```

## Code Snippets / 代码片段

### React Component / React 组件

```typescript
import React from 'react'

interface Props {
  title: string
  onAction?: () => void
}

export const MyComponent: React.FC<Props> = ({ title, onAction }) => {
  return (
    <div>
      <h1>{title}</h1>
      {onAction && <button onClick={onAction}>Action</button>}
    </div>
  )
}
```

### API Request / API 请求

```typescript
// Client-side / 客户端
import { useAPIClient, useRequest } from '@tego/client'

// Using useRequest / 使用 useRequest
const { data, loading, refresh } = useRequest({
  resource: 'users',
  action: 'list',
})

// Using APIClient directly / 直接使用 APIClient
const api = useAPIClient()
const response = await api.resource('users').list()

// Server-side / 服务端
import { Resourcer } from '@tachybase/resourcer'
import { Application } from '@tego/core'

const resourcer = app.resourcer
const result = await resourcer.resource('users').list()
```

### Schema Component / Schema 组件

```typescript
import { SchemaComponent } from '@tachybase/schema'
// or from client package / 或从客户端包
import { SchemaComponent } from '@tego/client'

const schema = {
  type: 'void',
  'x-component': 'Card',
  properties: {
    title: {
      type: 'string',
      'x-component': 'Input',
      'x-component-props': {
        placeholder: 'Enter title',
      },
    },
  },
}

<SchemaComponent schema={schema} />
```

### Plugin Registration / 插件注册

```typescript
import { Plugin } from '@tego/client'

export class MyPlugin extends Plugin {
  async load() {
    this.app.addComponents({ MyComponent })
    this.app.addRoutes({
      path: '/my-route',
      element: <MyPage />,
    })
  }
}
```

## File Naming / 文件命名

| Type / 类型 | Pattern / 模式 | Example / 示例 |
|------------|---------------|---------------|
| Component / 组件 | PascalCase | `UserProfile.tsx` |
| Utility / 工具 | camelCase | `formatDate.ts` |
| Constant / 常量 | UPPER_SNAKE_CASE | `API_CONSTANTS.ts` |
| Type / 类型 | PascalCase | `UserTypes.ts` |

## Import Patterns / 导入模式

```typescript
// 1. React
import React, { useState } from 'react'

// 2. Third-party
import { Button } from 'antd'

// 3. Internal - Core packages (@tego/*) / 内部 - 核心包
import { Application } from '@tego/core'
import { Plugin, useAPIClient } from '@tego/client'
import { Server } from '@tego/server'

// 3. Internal - Functional modules (@tachybase/*) / 内部 - 功能模块
import { AuthManager } from '@tachybase/auth'
import { Database } from '@tachybase/database'
import { CacheManager } from '@tachybase/cache'
import { Resourcer } from '@tachybase/resourcer'
import { SchemaComponent } from '@tachybase/schema'
import { Logger } from '@tachybase/logger'

// 4. Types
import type { User } from '../types'
import type { ApplicationOptions } from '@tego/core'
```

**Note / 注意**: 
- Use `@tego/*` for core application packages (client, core, server)
- 使用 `@tego/*` 用于核心应用包（client, core, server）
- Use `@tachybase/*` for functional modules and utilities
- 使用 `@tachybase/*` 用于功能模块和工具

## Commit Message Format / 提交信息格式

```
<type>(<scope>): <description>

Types / 类型:
  feat:     New feature / 新功能
  fix:      Bug fix / 修复
  docs:     Documentation / 文档
  style:    Formatting / 格式
  refactor: Code refactoring / 重构
  test:     Tests / 测试
  chore:    Maintenance / 维护

Examples / 示例:
  feat(client): add user profile
  fix(core): resolve authentication issue
  docs: update README
```

## TypeScript Patterns / TypeScript 模式

```typescript
// Interface / 接口
interface User {
  id: number
  name: string
}

// Type alias / 类型别名
type Status = 'pending' | 'approved' | 'rejected'

// Generic function / 泛型函数
function process<T>(data: T): T {
  return data
}

// Type guard / 类型守卫
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj
}
```

## Testing Patterns / 测试模式

```typescript
import { render, screen } from '@tachybase/test'
// or / 或
import { render, screen } from '@tachybase/test/client'
import { SchemaComponentProvider } from '@tego/client'

test('renders component', () => {
  render(
    <SchemaComponentProvider>
      <MyComponent />
    </SchemaComponentProvider>
  )
  expect(screen.getByText('Hello')).toBeInTheDocument()
})
```

## Common Patterns / 常见模式

### Error Handling / 错误处理

```typescript
try {
  const result = await api.resource('users').create(data)
  return result
} catch (error) {
  console.error('Failed to create user:', error)
  throw error
}
```

### Loading States / 加载状态

```typescript
const { data, loading, error } = useRequest({
  resource: 'users',
  action: 'list',
})

if (loading) return <Spin />
if (error) return <Alert message={error.message} />
return <UserList data={data} />
```

## Resources / 资源

- **Project Docs / 项目文档**: https://tachybase.org/
- **GitHub**: https://github.com/tegojs/tego

