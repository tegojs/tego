# Development Guide / 开发指南

## Creating New Modules/Plugins / 创建新模块/插件
1. Create a new directory under `packages/`.
   在 `packages/` 下创建新目录
2. Follow naming conventions: `module-*` or `plugin-*` (if applicable).
   遵循命名规范：`module-*` 或 `plugin-*`（如适用）
3. Create `package.json` with correct `name`, `version`, and dependencies.
   创建 `package.json`，设置正确的 `name`、`version` 和依赖
4. Add necessary TypeScript configuration.
   添加必要的 TypeScript 配置
5. Implement core functionality.
   实现核心功能

### Example: Creating a Plugin / 示例：创建插件

```typescript
// packages/plugin-my-feature/src/index.ts
import { Plugin } from '@tego/client'
import { Database } from '@tachybase/database'

export class MyFeaturePlugin extends Plugin {
  async load() {
    // Register components / 注册组件
    this.app.addComponents({
      MyFeatureComponent,
    })

    // Register routes / 注册路由
    this.app.addRoutes({
      path: '/my-feature',
      element: <MyFeaturePage />,
    })

    // Register menu items / 注册菜单项
    this.app.pluginManager.add('my-feature', {
      name: 'my-feature',
      displayName: 'My Feature',
      displayName: {
        'zh-CN': '我的功能',
      },
    })
  }
}
```

### Example: Creating a Module / 示例：创建模块

```typescript
// packages/module-my-module/src/server/index.ts
import { Application } from '@tego/core'
import { Database } from '@tachybase/database'

export class MyModule {
  constructor(private app: Application) {}

  async load() {
    // Register server-side functionality / 注册服务端功能
    this.app.db.defineCollection({
      name: 'myCollection',
      fields: [
        { name: 'title', type: 'string' },
        { name: 'content', type: 'text' },
      ],
    })
  }
}
```

## Commit Convention / 提交规范
- Use Conventional Commits format.
- 使用 Conventional Commits 格式
- Run `pnpm lint` before committing to check code.
- 提交前运行 `pnpm lint` 检查代码
- Commit message format: `<type>(<scope>): <description>`
  提交信息格式: `<type>(<scope>): <description>`
  - type: feat, fix, docs, style, refactor, test, chore
  - scope: package name or module name (optional)
    scope: 包名或模块名（可选）

### Examples / 示例

```bash
# Feature / 新功能
git commit -m "feat(client): add user profile component"

# Bug fix / 修复
git commit -m "fix(core): resolve authentication issue"

# Documentation / 文档
git commit -m "docs: update API documentation"

# Refactoring / 重构
git commit -m "refactor(auth): simplify authentication logic"

# Test / 测试
git commit -m "test(client): add unit tests for UserService"

# Chore / 杂务
git commit -m "chore: update dependencies"
```

## Testing / 测试
- Unit tests use Vitest.
- 单元测试使用 Vitest
- E2E tests use Playwright.
- E2E 测试使用 Playwright
- Test file naming: `*.test.ts` or `*.spec.ts`
- 测试文件命名: `*.test.ts` 或 `*.spec.ts`

## Common Commands / 常用命令

### Development / 开发
```bash
pnpm dev              # Start development server / 启动开发服务器
pnpm start            # Start production server / 启动生产服务器
```

### Build / 构建
```bash
pnpm build            # Build all packages / 构建所有包
pnpm clean            # Clean build artifacts / 清理构建产物
```

### Code Quality / 代码质量
```bash
pnpm lint             # Run oxlint check / 运行 oxlint 检查
pnpm test             # Run all tests / 运行所有测试
pnpm e2e              # Run E2E tests / 运行 E2E 测试
```

### Package Management / 包管理
```bash
pnpm install          # Install dependencies / 安装依赖
pnpm tgi              # tego install (tegod install)
pnpm tgu              # tego upgrade (tegod upgrade)
```

### Devkit Commands / 开发工具命令
```bash
pnpm tegod            # Run tego devkit / 运行 tego 开发工具
pnpm tg               # Alias for tegod / tegod 的别名
pnpm pm               # Package manager / 包管理器
pnpm ui               # Open devkit UI / 打开开发工具 UI
```

