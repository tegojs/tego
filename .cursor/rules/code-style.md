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

## Code Refactoring Principles / 代码重构原则

### DRY (Don't Repeat Yourself) / DRY 原则（不要重复自己）
- **Core Principle / 核心原则**: Eliminate duplicate code by extracting common logic into reusable functions.
- **核心原则**：通过提取公共逻辑到可复用函数来消除重复代码
- When you find identical or similar code blocks in multiple places, extract them into a shared function.
- 当发现多个地方有相同或相似的代码块时，应提取为共享函数
- This improves maintainability, consistency, and reduces the risk of bugs.
- 这能提高可维护性、一致性，并降低 bug 风险

### When to Refactor / 何时重构
- **Duplicate Logic / 重复逻辑**: If the same logic appears in 2+ places, extract it.
- **重复逻辑**：如果相同逻辑出现在 2 个或更多地方，应提取它
- **Similar Patterns / 相似模式**: If similar code patterns exist with only minor differences, parameterize them.
- **相似模式**：如果存在仅细微差异的相似代码模式，应参数化它们
- **Before Adding Features / 添加功能前**: Refactor existing code to make it easier to extend.
- **添加功能前**：重构现有代码，使其更易于扩展

### Refactoring Guidelines / 重构指南

#### 1. Extract Common Functions / 提取公共函数
```typescript
// ❌ Bad: Duplicate logic / 不好的：重复逻辑
function processEnglishData(data: string) {
  const lines = data.split('\n');
  const seen = new Set();
  const result = [];
  for (const line of lines) {
    if (line.trim().startsWith('- ')) {
      const normalized = line.trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }
  return result.join('\n');
}

function processChineseData(data: string) {
  const lines = data.split('\n');
  const seen = new Set();
  const result = [];
  for (const line of lines) {
    if (line.trim().startsWith('- ')) {
      const normalized = line.trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }
  return result.join('\n');
}

// ✅ Good: Extracted common function / 好的：提取公共函数
function deduplicateContent(content: string): string {
  const contentLines = content.split('\n');
  const seen = new Set<string>();
  const deduplicatedLines: string[] = [];

  for (const line of contentLines) {
    if (line.trim().startsWith('- ')) {
      const normalized = line.trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        deduplicatedLines.push(line);
      }
    } else {
      deduplicatedLines.push(line);
    }
  }

  return deduplicatedLines.join('\n');
}

function processEnglishData(data: string) {
  return deduplicateContent(data);
}

function processChineseData(data: string) {
  return deduplicateContent(data);
}
```

#### 2. Parameterize Similar Functions / 参数化相似函数
```typescript
// ❌ Bad: Similar functions with hardcoded values / 不好的：硬编码值的相似函数
function updateEnglishChangelog(changelog: string, content: string) {
  if (changelog.includes('## [Unreleased]')) {
    const index = changelog.indexOf('## [Unreleased]');
    // ... complex logic ...
    return beforeSection + '## [Unreleased]\n\n' + content + afterSection;
  }
  return '## [Unreleased]\n\n' + content + '\n\n' + changelog;
}

function updateChineseChangelog(changelog: string, content: string) {
  if (changelog.includes('## [未发布]')) {
    const index = changelog.indexOf('## [未发布]');
    // ... complex logic ...
    return beforeSection + '## [未发布]\n\n' + content + afterSection;
  }
  return '## [未发布]\n\n' + content + '\n\n' + changelog;
}

// ✅ Good: Parameterized function / 好的：参数化函数
function updateChangelogSection(
  changelog: string,
  sectionTitle: string,
  sectionLinkPattern: RegExp,
  newContent: string
): string {
  if (changelog.includes(sectionTitle)) {
    const sectionIndex = changelog.indexOf(sectionTitle);
    // ... shared logic ...
    return beforeSection + sectionTitle + '\n\n' + newContent + afterSection;
  }
  return sectionTitle + '\n\n' + newContent + '\n\n' + changelog;
}

function updateEnglishChangelog(changelog: string, content: string) {
  return updateChangelogSection(
    changelog,
    '## [Unreleased]',
    /\[Unreleased\]:\s*https:\/\/[^\s]+/,
    content
  );
}

function updateChineseChangelog(changelog: string, content: string) {
  return updateChangelogSection(
    changelog,
    '## [未发布]',
    /\[未发布\]:\s*https:\/\/[^\s]+/,
    content
  );
}
```

#### 3. Benefits of Refactoring / 重构的好处
- **Maintainability / 可维护性**: Changes only need to be made in one place.
- **可维护性**：修改只需在一处进行
- **Consistency / 一致性**: Ensures identical behavior across all usages.
- **一致性**：确保所有使用场景的行为一致
- **Readability / 可读性**: Code becomes cleaner and easier to understand.
- **可读性**：代码更清晰、更易理解
- **Testability / 可测试性**: Common functions can be tested independently.
- **可测试性**：公共函数可以独立测试

### Refactoring Workflow / 重构流程
1. **Identify Duplication / 识别重复**: Look for similar code blocks or patterns.
- **识别重复**：查找相似的代码块或模式
2. **Extract Common Logic / 提取公共逻辑**: Create a shared function with parameters.
- **提取公共逻辑**：创建带参数的共享函数
3. **Replace Duplicates / 替换重复**: Update all occurrences to use the new function.
- **替换重复**：更新所有出现的地方以使用新函数
4. **Test / 测试**: Verify that behavior remains unchanged.
- **测试**：验证行为保持不变
5. **Check Lint Errors / 检查 Lint 错误**: Run lint checks after refactoring.
- **检查 Lint 错误**：重构后运行 lint 检查

### Code Review Checklist / 代码审查清单
When reviewing code, check for:
审查代码时，检查：
- [ ] Duplicate code blocks that could be extracted
- [ ] 可以提取的重复代码块
- [ ] Similar functions that could be parameterized
- [ ] 可以参数化的相似函数
- [ ] Repeated patterns that could be abstracted
- [ ] 可以抽象的重复模式
- [ ] Opportunities to improve code organization
- [ ] 改进代码组织的机会

