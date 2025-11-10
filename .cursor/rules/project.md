# Tego Project Configuration / 项目配置

## Project Overview / 项目概述
Tego is a pluggable application framework that enables developers to build complex application logic. This is a monorepo project managed with pnpm workspace.

Tego 是一个插件化的应用框架，支持开发者构建复杂的应用逻辑。这是一个 monorepo 项目，使用 pnpm workspace 管理多个包。

## Tech Stack / 技术栈
- **Language / 语言**: TypeScript (5.8.3+)
- **Frontend Framework / 前端框架**: React 18.3.1
- **UI Library / UI 库**: Ant Design 5.22.5, Ant Design Pro Components
- **Package Manager / 包管理**: pnpm 10.14.0
- **Build Tools / 构建工具**: Tego CLI (tegod)
- **Linting / 代码检查**: oxlint, Prettier
- **Testing / 测试**: Vitest, Playwright
- **Node.js**: >= 20.19.0

## Project Structure / 项目结构
```
tego/
├── packages/                # Packages / 包目录
│   ├── acl/                 # ACL module / ACL 模块
│   ├── actions/             # Actions module / Actions 模块
│   ├── auth/                # Auth module / 认证模块
│   ├── cache/               # Cache module / 缓存模块
│   ├── client/              # Client core package / 客户端核心包
│   ├── components/          # Components package / 组件包
│   ├── core/                # Core module / 核心模块
│   ├── data-source/         # Data source module / 数据源模块
│   ├── database/            # Database module / 数据库模块
│   ├── devkit/              # Devkit package / 开发工具包
│   ├── di/                  # Dependency injection / 依赖注入
│   ├── evaluators/          # Evaluators module / 评估器模块
│   ├── globals/             # Globals module / 全局模块
│   ├── loader/              # Loader module / 加载器模块
│   ├── logger/              # Logger module / 日志模块
│   ├── requirejs/           # RequireJS module / RequireJS 模块
│   ├── resourcer/           # Resourcer module / 资源管理器模块
│   ├── schema/              # Schema module / Schema 模块
│   ├── sdk/                 # SDK package / SDK 包
│   ├── server/              # Server module / 服务器模块
│   ├── tego/                # Tego core package / Tego 核心包
│   ├── test/                # Test utilities / 测试工具
│   └── utils/               # Utils package / 工具包
├── storage/                  # Storage directory / 存储目录
└── ...
```

## Package Management / 包管理规范

### Version Number / 版本号
- Version numbers are managed uniformly, all packages use the same major version number.
- 主版本号统一管理，所有包使用相同的主版本号
- Current version: 1.3.52
- 当前版本: 1.3.52
- When modifying version numbers, synchronize updates across all related package.json files.
- 修改版本号时，需要同步更新所有相关包的 package.json

### Dependency Management / 依赖管理
- Use `workspace:*` to reference internal packages.
- 使用 `workspace:*` 引用内部包
- Use `pnpm` instead of `npm` or `yarn`.
- 使用 `pnpm` 而非 `npm` 或 `yarn`
- When adding dependencies, use `pnpm add <package> -w` (root directory) or `pnpm add <package> --filter <package-name>`.
- 添加依赖时使用 `pnpm add <package> -w`（根目录）或 `pnpm add <package> --filter <package-name>`

### Package Naming Conventions / 包命名规范

The project uses two package namespaces: `@tego/*` and `@tachybase/*`.

项目使用两种包命名空间：`@tego/*` 和 `@tachybase/*`。

#### `@tego/*` Namespace / `@tego/*` 命名空间
Used for core application packages:
用于核心应用包：

- `@tego/client` - Client-side application framework / 客户端应用框架
- `@tego/core` - Core application logic / 核心应用逻辑
- `@tego/server` - Server-side utilities / 服务端工具

#### `@tachybase/*` Namespace / `@tachybase/*` 命名空间
Used for functional modules and utilities:
用于功能模块和工具：

- `@tachybase/actions` - Action handlers / 操作处理器
- `@tachybase/auth` - Authentication / 认证模块
- `@tachybase/cache` - Caching / 缓存模块
- `@tachybase/components` - UI components / UI 组件
- `@tachybase/data-source` - Data source management / 数据源管理
- `@tachybase/database` - Database ORM / 数据库 ORM
- `@tachybase/di` - Dependency injection / 依赖注入
- `@tachybase/evaluators` - Expression evaluators / 表达式评估器
- `@tachybase/logger` - Logging / 日志模块
- `@tachybase/resourcer` - Resource management / 资源管理
- `@tachybase/schema` - Schema definitions / Schema 定义
- `@tachybase/sdk` - SDK utilities / SDK 工具
- `@tachybase/test` - Testing utilities / 测试工具
- `@tachybase/utils` - Utility functions / 工具函数

**Import Examples / 导入示例**:

```typescript
// Core packages / 核心包
import { Application } from '@tego/core'
import { Plugin } from '@tego/client'
import { Server } from '@tego/server'

// Functional modules / 功能模块
import { AuthManager } from '@tachybase/auth'
import { Database } from '@tachybase/database'
import { CacheManager } from '@tachybase/cache'
import { useAPIClient } from '@tego/client'
```

## Important Notes / 注意事项

### Version Conflicts / 版本冲突
- If version conflicts occur during merge, use the version from the main branch.
- 合并时如果出现版本号冲突，以 main 分支的版本号为准
- All package.json files must maintain consistent version numbers.
- 所有 package.json 文件的版本号需要保持一致

### Path Aliases / 路径别名
- The project uses TypeScript path aliases, refer to `tsconfig.paths.json`.
- 项目使用 TypeScript 路径别名，参考 `tsconfig.paths.json`
- Use aliases instead of relative paths when importing.
- 导入时可以使用别名而非相对路径

### Internationalization / 国际化
- The project supports English and Chinese, using i18next.
- 项目支持中英文，使用 i18next
- Text content must provide both English and Chinese versions.
- 文本内容需要同时提供中英文版本
- Use `displayName` and `displayName.zh-CN` fields.
- 使用 `displayName` 和 `displayName.zh-CN` 字段

### Plugin System / 插件系统
- Plugins must implement the Plugin interface.
- 插件需要实现 Plugin 接口
- Plugins can register routes, components, data sources, etc.
- 插件可以注册路由、组件、数据源等
- Use PluginManager to manage plugin lifecycle.
- 使用 PluginManager 管理插件生命周期

## Related Resources / 相关资源
- Project Documentation / 项目文档: https://tachybase.org/
- GitHub: https://github.com/tegojs/tego

