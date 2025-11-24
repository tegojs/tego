# Tego Core Framework Project Context / Tego 核心框架项目上下文文档

> Records important project decisions, architectural patterns, and context information  
> 记录项目的重要决策、架构模式和上下文信息

## Project Overview / 项目概述

**Project Name / 项目名称**：Tego  
**Type / 类型**：TypeScript Monorepo - Core Framework / 核心框架  
**Package Manager / 包管理**：pnpm workspace  
**Last Updated / 最后更新**：2025-01-27

---

## Project Structure / 项目结构

### Directory Structure / 目录结构

```
tego/
├── packages/                    # Core packages / 核心包
│   ├── core/                   # Core functionality (@tego/core) / 核心功能
│   ├── server/                 # Server side (@tego/server) / 服务端
│   ├── client/                 # Client (@tego/client) / 客户端
│   ├── components/             # React component library (@tego/components) / React 组件库
│   ├── schema/                 # Schema definitions (@tego/schema) / Schema 定义
│   ├── database/               # Database (@tachybase/database) / 数据库
│   ├── auth/                   # Authentication (@tachybase/auth) / 认证
│   ├── acl/                    # Access control (@tachybase/acl) / 权限控制
│   ├── actions/                # Action system (@tachybase/actions) / 动作系统
│   ├── data-source/            # Data source (@tachybase/data-source) / 数据源
│   ├── di/                     # Dependency injection (@tachybase/di) / 依赖注入
│   ├── evaluators/             # Expression evaluators (@tachybase/evaluators) / 表达式求值器
│   ├── logger/                 # Logging (@tachybase/logger) / 日志
│   ├── resourcer/              # Resource management (@tachybase/resourcer) / 资源管理
│   ├── utils/                  # Utilities (@tachybase/utils) / 工具函数
│   ├── devkit/                 # Dev tools (@tego/devkit) / 开发工具
│   └── test/                   # Testing utilities (@tachybase/test) / 测试工具
└── tego/                       # CLI tool / CLI 工具
```

### Main Packages / 主要包

- **core** (`@tego/core`)：Core functionality, provides application framework foundation / 核心功能，提供应用框架基础
- **server** (`@tego/server`)：Server-side functionality / 服务端功能
- **client** (`@tego/client`)：Client core library / 客户端核心库
- **components** (`@tego/components`)：React component library / React 组件库
- **schema** (`@tego/schema`)：Schema definitions and validation / Schema 定义和验证
- **database** (`@tachybase/database`)：Database operations and Prisma integration / 数据库操作和 Prisma 集成
- **auth** (`@tachybase/auth`)：Authentication and authorization / 认证授权
- **acl** (`@tachybase/acl`)：Access control / 权限控制
- **actions** (`@tachybase/actions`)：Action system / 动作系统
- **data-source** (`@tachybase/data-source`)：Data source management / 数据源管理
- **di** (`@tachybase/di`)：Dependency injection / 依赖注入
- **devkit** (`@tego/devkit`)：Development tools and CLI / 开发工具和 CLI

---

## Tech Stack / 技术栈

### Backend / 后端
- **Runtime / 运行时**：Node.js (>=20.19.0)
- **Framework / 框架**：Based on Express (if applicable) / 基于 Express（如适用）
- **Database / 数据库**：Prisma ORM
- **Language / 语言**：TypeScript

### Frontend / 前端
- **Framework / 框架**：React 18
- **Language / 语言**：TypeScript
- **Build Tool / 构建工具**：tegod (based on tsup/vite) / tegod (基于 tsup/vite)
- **State Management / 状态管理**：Based on React Hooks / 基于 React Hooks

### Toolchain / 工具链
- **Package Manager / 包管理**：pnpm workspace
- **Testing / 测试**：Vitest
- **E2E / 端到端测试**：Playwright
- **Code Quality / 代码质量**：oxlint, Prettier
- **CLI Tool / CLI 工具**：tegod (Tego Devkit)

### Internationalization / 国际化
- **Framework / 框架**：i18next
- **Supported Languages / 支持语言**：en-US, zh-CN, ko_KR, ja-JP, pt-BR, etc. / 等
- **Translation File Location / 翻译文件位置**：`packages/*/src/locale/` directory / 目录
- **File Format / 文件格式**：`.ts` or `.json` / `.ts` 或 `.json`
- **Mandatory Rule / 必须规则**：When adding or modifying translations, must synchronize all language files / 添加或修改翻译时，必须同步更新所有语言文件

---

## Key Decision Records / 关键决策记录

### 2025-01-27: Establish Cursor AI Rules System / 建立 Cursor AI 规则系统
- **Decision / 决策**：Adopt modular skill rules system / 采用模块化的技能规则系统
- **Reason / 原因**：Improve consistency and efficiency of AI-assisted programming / 提高 AI 辅助编程的一致性和效率
- **Impact / 影响**：All development work should follow rules in `.cursor/rules/` / 所有开发工作都应遵循 `.cursor/rules/` 中的规则

### Architecture Decisions / 架构决策
- **Monorepo Structure / Monorepo 结构**：Use pnpm workspace to manage multiple packages / 使用 pnpm workspace 管理多个包
- **Core Framework Positioning / 核心框架定位**：Provide pluggable application framework foundation / 提供可插拔的应用框架基础
- **Type Safety / 类型安全**：Strictly use TypeScript, avoid any / 严格使用 TypeScript，避免 any
- **Code Organization / 代码组织**：Organize by feature modules, each package has single responsibility / 按功能模块组织，每个包职责单一
- **Package Naming Conventions / 包命名规范**：
  - `@tego/*`：Core framework packages / 核心框架包
  - `@tachybase/*`：Feature module packages / 功能模块包

### Design Principles / 设计原则
- **Pluggable Architecture / 可插拔架构**：Support plugin and module extensions / 支持插件和模块扩展
- **Dependency Injection / 依赖注入**：Use DI container to manage dependencies / 使用 DI 容器管理依赖
- **Layered Architecture / 分层架构**：Clear layer division (Routes → Controllers → Services → Repositories) / 清晰的层次划分（Routes → Controllers → Services → Repositories）
- **Type First / 类型优先**：Fully utilize TypeScript type system / 充分利用 TypeScript 类型系统

---

## Development Standards / 开发规范

### Code Style / 代码风格
- **Indentation / 缩进**：2 spaces / 2 空格
- **Quotes / 引号**：Single quotes (for strings) / 单引号（字符串）
- **Semicolons / 分号**：No semicolons / 不使用分号
- **Line Length / 行长度**：Maximum 100 characters / 最大 100 字符

### Naming Conventions / 命名约定
- **Files / 文件**：kebab-case (`user-service.ts`)
- **Classes / 类**：PascalCase (`UserService`)
- **Functions/Variables / 函数/变量**：camelCase (`getUserById`)
- **Constants / 常量**：UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)

### Git Commit Convention / Git 提交规范
- Use commitlint / 使用 commitlint
- Format / 格式：`type(scope): message`
- Types / 类型：feat, fix, docs, style, refactor, test, chore
- Scope / 范围：Package name (e.g., `core`, `database`, `components`) / 包名（如 `core`, `database`, `components`）

### Package Development Standards / 包开发规范
- **Single Responsibility / 单一职责**：Each package has clear responsibility / 每个包有明确的职责
- **Export Standards / 导出规范**：Clear public API / 清晰的公共 API
- **Dependency Management / 依赖管理**：Minimize dependencies, avoid circular dependencies / 最小化依赖，避免循环依赖
- **Type Exports / 类型导出**：Export necessary type definitions / 导出必要的类型定义

---

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
pnpm tegod            # Run tego devkit / 运行 tego devkit
pnpm tg               # Alias for tegod / tegod 的别名
pnpm pm               # Package manager / 包管理器
pnpm ui                # Open devkit UI / 打开 devkit UI
```

---

## Current Tasks / 当前任务

### In Progress / 进行中
- [ ] Improve Cursor AI rules system / 完善 Cursor AI 规则系统
- [ ] Core framework refactoring (in progress) / 核心框架重构（进行中）

### Planned / 计划中
- [ ] Add more skill rules / 添加更多技能规则
- [ ] Optimize skill activation mechanism / 优化技能激活机制
- [ ] Improve project documentation / 完善项目文档

---

## FAQ / 常见问题

### Q: How to create a new core package? / 如何创建新的核心包？
A: Refer to existing package structure, create new package directory, configure `package.json` and TypeScript configuration. / 参考现有包的结构，创建新的包目录，配置 `package.json` 和 TypeScript 配置。

### Q: What's the difference between core packages and application packages? / 核心包和应用包的区别？
A: Core packages (`tego`) provide framework foundation, application packages (`tego-standard`) build applications based on core packages. / 核心包（`tego`）提供框架基础，应用包（`tego-standard`）基于核心包构建应用。

### Q: What if skills don't activate automatically? / 技能没有自动激活怎么办？
A: Check if path patterns and keywords in `.cursor/skill-rules.json` match current context. / 检查 `.cursor/skill-rules.json` 中的路径模式和关键词是否匹配当前上下文。

### Q: How to add a new feature module? / 如何添加新的功能模块？
A: Create new package under `packages/`, follow package naming and structure conventions. / 在 `packages/` 下创建新包，遵循包的命名和结构规范。

---

## Related Resources / 相关资源

- [Project README](../README.md)
- [Skill Rules Configuration](../skill-rules.json)
- [Cursor Rules Index](../rules/index.md)
- [Tego Official Documentation](https://tachybase.org/)

---

## Changelog / 更新日志

### 2025-01-27
- Create project context document / 创建项目上下文文档
- Establish Cursor AI rules system / 建立 Cursor AI 规则系统
- Add skill activation rules configuration / 添加技能激活规则配置
