# Code Style Guidelines / 代码风格规范

## TypeScript
- Use TypeScript strict mode (but project config has `strict: false`, note compatibility).
- 使用 TypeScript 严格模式（但项目配置中 `strict: false`，注意兼容性）
- Prefer type inference, explicitly declare types when necessary.
- 优先使用类型推断，必要时显式声明类型
- Use interfaces (interface) to define object types.
- 使用接口（interface）定义对象类型
- Use type aliases (type) for union types and complex types.
- 使用类型别名（type）定义联合类型和复杂类型
- Avoid using `any`, prefer `unknown` or specific types.
- 避免使用 `any`，优先使用 `unknown` 或具体类型

### Examples / 示例

```typescript
// Good: Use interface for object types / 好的：使用接口定义对象类型
interface User {
  id: number
  name: string
  email: string
}

// Good: Use type for union types / 好的：使用类型别名定义联合类型
type Status = 'pending' | 'approved' | 'rejected'

// Good: Prefer type inference / 好的：优先使用类型推断
const users = ['alice', 'bob'] // string[]

// Good: Use unknown instead of any / 好的：使用 unknown 而非 any
function processData(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase()
  }
  return null
}

// Avoid / 避免
function badExample(data: any) {
  return data.something // No type safety / 没有类型安全
}
```

## React Components / React 组件
- Use functional components and Hooks.
- 使用函数式组件和 Hooks
- Component files use PascalCase naming (e.g., `UserProfile.tsx`).
- 组件文件使用 PascalCase 命名（如 `UserProfile.tsx`）
- Use `React.FC` or direct function declarations.
- 使用 `React.FC` 或直接函数声明
- Define Props using interfaces.
- Props 使用接口定义
- Prefer named exports over default exports.
- 优先使用命名导出而非默认导出

### Examples / 示例

```typescript
// Good: Functional component with interface / 好的：使用接口的函数组件
interface UserProfileProps {
  userId: number
  onUpdate?: (user: User) => void
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onUpdate }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetchUser(userId).then(setUser)
  }, [userId])

  return <div>{user?.name}</div>
}

// Good: Direct function declaration / 好的：直接函数声明
export function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>
}

// Avoid: Default export / 避免：默认导出
export default function UserProfile() { } // Not recommended / 不推荐
```

## File Naming / 文件命名
- Component files: PascalCase (e.g., `UserProfile.tsx`)
- 组件文件: PascalCase (如 `UserProfile.tsx`)
- Utility files: camelCase (e.g., `formatDate.ts`)
- 工具文件: camelCase (如 `formatDate.ts`)
- Constant files: UPPER_SNAKE_CASE (e.g., `API_CONSTANTS.ts`)
- 常量文件: UPPER_SNAKE_CASE (如 `API_CONSTANTS.ts`)
- Type definitions: PascalCase (e.g., `UserTypes.ts`)
- 类型定义: PascalCase (如 `UserTypes.ts`)

## Import Order / 导入顺序
1. React-related imports
   React 相关导入
2. Third-party library imports
   第三方库导入
3. Internal project imports (sorted by path hierarchy)
   项目内部导入（按路径层级排序）
4. Type imports (use `import type`)
   类型导入（使用 `import type`）

### Example / 示例

```typescript
// 1. React imports / React 导入
import React, { useState, useEffect } from 'react'
import { useRouter } from 'react-router-dom'

// 2. Third-party imports / 第三方库导入
import { Button } from 'antd'
import { useRequest } from 'ahooks'
import dayjs from 'dayjs'

// 3. Internal project imports - Core packages / 项目内部导入 - 核心包
import { Application } from '@tego/core'
import { Plugin, useAPIClient } from '@tego/client'
import { Server } from '@tego/server'

// 3. Internal project imports - Functional modules / 项目内部导入 - 功能模块
import { Database } from '@tachybase/database'
import { AuthManager } from '@tachybase/auth'
import { CacheManager } from '@tachybase/cache'
import { UserService } from '../services/UserService'
import { formatDate } from '../utils/date'

// 4. Type imports / 类型导入
import type { User } from '../types'
import type { ApplicationOptions } from '@tego/core'
import type { APIClientOptions } from '@tego/client'
```

## Code Style / 代码风格
- Use 2-space indentation.
- 使用 2 空格缩进
- Use single quotes (unless string contains single quotes).
- 使用单引号（除非字符串包含单引号）
- No semicolons at end of lines (according to project Prettier config).
- 行尾不使用分号（根据项目 Prettier 配置）
- Use trailing commas for objects and arrays.
- 对象和数组使用尾随逗号
- Maximum line length: 100 characters (according to Prettier config).
- 最大行长度：100 字符（根据 Prettier 配置）

