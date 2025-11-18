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

## Internationalization (i18n) / 国际化

### Translation File Synchronization / 翻译文件同步
- **Mandatory Rule / 必须规则**: When adding or modifying translations, **MUST** update **ALL** language files in the locale directory.
- **必须规则**：添加或修改翻译时，**必须**更新 locale 目录下的**所有**语言文件
- Do not only update Chinese (zh-CN) and English (en-US), but also update all other language files:
- 不要只更新中文（zh-CN）和英文（en-US），还要更新所有其他语言文件：
  - Korean (ko_KR.json)
  - Japanese (ja-JP.ts)
  - Portuguese (pt-BR.ts)
  - And any other language files that exist
  - 以及存在的任何其他语言文件

### Translation File Locations / 翻译文件位置
- Locale files are typically located in `packages/*/src/locale/` directory
- 翻译文件通常位于 `packages/*/src/locale/` 目录
- Common file formats: `.json`, `.ts`
- 常见文件格式：`.json`, `.ts`

### Workflow for Adding Translations / 添加翻译的工作流程
1. Identify all locale files in the target package / 识别目标包中的所有翻译文件
2. Add the translation key to **ALL** language files / 将翻译键添加到**所有**语言文件
3. Provide appropriate translations for each language / 为每种语言提供适当的翻译
4. If unsure of translation, use English as fallback or mark with TODO / 如果不确定翻译，使用英文作为后备或标记 TODO

### Example / 示例
```typescript
// ❌ Wrong - Only updating two files / 错误 - 只更新两个文件
// zh-CN.json: { "NewKey": "新键" }
// en-US.json: { "NewKey": "New Key" }

// ✅ Correct - Updating all files / 正确 - 更新所有文件
// zh-CN.json: { "NewKey": "新键" }
// en-US.json: { "NewKey": "New Key" }
// ko_KR.json: { "NewKey": "새 키" }
// ja-JP.ts: { NewKey: '新しいキー' }
// pt-BR.ts: { NewKey: 'Nova Chave' }
```

## Debugging / 调试

### Debug Logging / 调试日志
- **Mandatory Rule / 必须规则**: When adding debug logs (console.log, console.debug, etc.), **MUST** include timestamp information.
- **必须规则**：添加调试日志（console.log、console.debug 等）时，**必须**包含时间戳信息
- Use ISO 8601 format timestamps for consistency and easy parsing.
- 使用 ISO 8601 格式的时间戳，便于一致性和解析
- Timestamps help track execution timing, identify performance issues, and debug race conditions.
- 时间戳有助于追踪执行时序、识别性能问题和调试竞态条件

### Debug Log Format / 调试日志格式
- Format: `[${timestamp}] [标签] 消息内容`
- 格式：`[${timestamp}] [标签] 消息内容`
- Use `new Date().toISOString()` to generate timestamps.
- 使用 `new Date().toISOString()` 生成时间戳

### Examples / 示例
```typescript
// ❌ Wrong - No timestamp / 错误 - 没有时间戳
console.log('[轮询调试] queryFieldList 被调用', { showLoading });

// ✅ Correct - With timestamp / 正确 - 有时间戳
const timestamp = new Date().toISOString();
console.log(`[${timestamp}] [轮询调试] queryFieldList 被调用`, { showLoading });

// ✅ Also correct - Multiple timestamps in same function / 同样正确 - 同一函数中多个时间戳
const timestamp1 = new Date().toISOString();
console.log(`[${timestamp1}] [轮询调试] 开始执行`);
// ... some code ...
const timestamp2 = new Date().toISOString();
console.log(`[${timestamp2}] [轮询调试] 执行完成`);
```

### When to Add Timestamps / 何时添加时间戳
- All debug logs in production code / 生产代码中的所有调试日志
- Performance-critical operations / 性能关键操作
- Async operations and polling / 异步操作和轮询
- State changes and side effects / 状态变化和副作用
- Error handling and recovery / 错误处理和恢复

## Code Quality Check / 代码质量检查

### Lint Error Check / Lint 错误检查
- **Mandatory Rule / 必须规则**: After modifying any code file, must use `read_lints` tool to check for lint errors.
- **必须规则**：每次修改代码文件后，必须使用 `read_lints` 工具检查 lint 错误
- If lint errors are found, fix them immediately. Do not commit code with lint errors.
- 如果发现 lint 错误，必须立即修复，不能提交有 lint 错误的代码
- Check all modified files, especially TypeScript/JavaScript files (.ts, .tsx, .js, .jsx, .mjs).
- 检查所有修改过的文件，特别是 TypeScript/JavaScript 文件（.ts, .tsx, .js, .jsx, .mjs）
- Actively run lint checks after completing code modifications, don't wait for user reminders.
- 在完成代码修改后，应该主动运行 lint 检查，而不是等待用户提醒

### Code Modification Workflow / 代码修改流程
1. Modify code files / 修改代码文件
2. **Immediately check lint errors** (using read_lints tool) / **立即检查 lint 错误**（使用 read_lints 工具）
3. If errors found, fix them and check again / 如果发现错误，修复后再次检查
4. Confirm no errors before continuing / 确认无错误后再继续

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

## Code Refactoring / 代码重构

### Extracting Code to Separate Files / 提取代码到独立文件

When a feature module becomes large or has independent functionality, consider extracting it to a separate file to improve code organization and maintainability.

当某个功能模块变得庞大或具有独立功能时，考虑将其提取到独立文件中，以改善代码组织和可维护性。

#### When to Extract / 何时提取

Extract code to a separate file when:
在以下情况下将代码提取到独立文件：

1. **Feature Independence / 功能独立性**: The code represents a cohesive, independent feature that can be used separately.
   - 代码代表一个内聚的、独立的功能，可以单独使用
2. **Code Volume / 代码量**: A single file exceeds 500-800 lines, or a specific feature section is large.
   - 单个文件超过 500-800 行，或某个特定功能部分很大
3. **Reusability / 可复用性**: The code can be reused in multiple places or contexts.
   - 代码可以在多个地方或上下文中复用
4. **Separation of Concerns / 关注点分离**: The code handles a different concern from the main class/file.
   - 代码处理与主类/文件不同的关注点
5. **Testability / 可测试性**: Extracting makes the code easier to test in isolation.
   - 提取使代码更容易独立测试

#### Extraction Process / 提取流程

1. **Create New File / 创建新文件**
   - Create a new file with a descriptive name (e.g., `progress-tracker.ts`, `cache-manager.ts`)
   - 创建具有描述性名称的新文件（例如：`progress-tracker.ts`、`cache-manager.ts`）
   - Place it in the same directory or an appropriate subdirectory
   - 将其放在同一目录或适当的子目录中

2. **Define Clear Interfaces / 定义清晰的接口**
   - Use TypeScript interfaces/types to define the API of the extracted module
   - 使用 TypeScript 接口/类型定义提取模块的 API
   - Export necessary types and interfaces for use by other modules
   - 导出必要的类型和接口供其他模块使用

```typescript
// ✅ Good - Clear interface definition / 良好 - 清晰的接口定义
export interface ProgressTracker {
  update(percent: number, currentStep: string): Promise<void>;
  getCollectionProgress(currentIndex: number, totalCollections: number): number;
}

export type ProgressInfo = {
  percent: number;
  currentStep: string;
};
```

3. **Dependency Injection / 依赖注入**
   - Pass dependencies through constructor parameters or method arguments
   - 通过构造函数参数或方法参数传递依赖
   - Avoid directly accessing private members of the original class
   - 避免直接访问原类的私有成员
   - Use function parameters or class methods to access needed resources
   - 使用函数参数或类方法来访问所需资源

```typescript
// ✅ Good - Dependency injection / 良好 - 依赖注入
export class ProgressManager {
  constructor(
    private backupStorageDir: (appName?: string) => string,
    private workDir: string,
  ) {}
}

// ❌ Bad - Direct access to parent class / 不好 - 直接访问父类
export class ProgressManager {
  constructor(private dumper: Dumper) {
    // Directly accessing dumper's private members / 直接访问 dumper 的私有成员
  }
}
```

4. **Lazy Initialization / 延迟初始化**
   - Use getters for optional or expensive-to-initialize dependencies
   - 对可选或初始化成本高的依赖使用 getter
   - Initialize only when needed
   - 仅在需要时初始化

```typescript
// ✅ Good - Lazy initialization / 良好 - 延迟初始化
private get progressManager(): ProgressManager {
  if (!this._progressManager) {
    this._progressManager = new ProgressManager(
      (appName?: string) => this.backUpStorageDir(appName),
      this.workDir,
    );
  }
  return this._progressManager;
}
```

5. **Update References / 更新引用**
   - Update all places that use the extracted code
   - 更新所有使用提取代码的地方
   - Replace direct method calls with calls to the new module
   - 将对直接方法的调用替换为对新模块的调用
   - Ensure static methods that don't need instance access remain accessible
   - 确保不需要实例访问的静态方法保持可访问

6. **Remove Old Code / 移除旧代码**
   - Remove the extracted code from the original file
   - 从原文件中移除已提取的代码
   - Keep only the necessary imports and usage of the new module
   - 仅保留新模块的必要导入和使用

#### Example: Extracting Progress Management / 示例：提取进度管理

**Before / 之前**:
```typescript
// dumper.ts - 700+ lines with progress logic mixed in
export class Dumper {
  async writeProgress(...) { ... }
  async readProgress(...) { ... }
  async cleanProgressFile(...) { ... }
  private createProgressTracker(...) { ... }
  // ... many other methods
}
```

**After / 之后**:
```typescript
// progress-tracker.ts - Dedicated progress management
export interface ProgressTracker { ... }
export class ProgressManager {
  createProgressTracker(...): ProgressTracker { ... }
  setupPackingProgress(...): () => void { ... }
}

// dumper.ts - Clean, focused on core logic
import { ProgressManager, ProgressTracker } from './progress-tracker';
export class Dumper {
  private get progressManager(): ProgressManager { ... }
  async dump(options: DumpOptions) {
    const progressTracker = this.progressManager.createProgressTracker(...);
    // ... use progressTracker
  }
}
```

#### Benefits / 好处

1. **Improved Readability / 提高可读性**: Main file focuses on core logic, easier to understand
   - 主文件专注于核心逻辑，更容易理解
2. **Better Maintainability / 更好的可维护性**: Related code is grouped together, easier to modify
   - 相关代码分组在一起，更容易修改
3. **Enhanced Testability / 增强可测试性**: Extracted modules can be tested independently
   - 提取的模块可以独立测试
4. **Reusability / 可复用性**: Extracted code can be reused in other contexts
   - 提取的代码可以在其他上下文中复用
5. **Clear Separation of Concerns / 清晰的关注点分离**: Each file has a single, clear responsibility
   - 每个文件都有单一、明确的职责

#### Checklist / 检查清单

Before completing the extraction, ensure:
在完成提取之前，确保：

- [ ] New file has a clear, descriptive name / 新文件有清晰、描述性的名称
- [ ] All necessary types and interfaces are exported / 所有必要的类型和接口都已导出
- [ ] Dependencies are properly injected, not directly accessed / 依赖已正确注入，未直接访问
- [ ] All references in the original file are updated / 原文件中的所有引用都已更新
- [ ] All other files using the extracted code are updated / 所有使用提取代码的其他文件都已更新
- [ ] Old code is removed from the original file / 旧代码已从原文件中移除
- [ ] No lint errors after extraction / 提取后没有 lint 错误
- [ ] Code functionality remains unchanged / 代码功能保持不变

