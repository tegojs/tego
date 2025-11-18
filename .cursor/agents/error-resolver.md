# Error Resolver Agent / 自动错误修复 Agent

## Purpose / 目的

Automatically identify and fix TypeScript and lint errors.
自动识别并修复 TypeScript 和 lint 错误。

## When to Use / 何时使用

- After code modifications / 代码修改后
- When TypeScript errors appear / 出现 TypeScript 错误时
- When lint errors appear / 出现 lint 错误时
- Before committing code / 提交代码前

## Zero-Error Policy / 零错误策略

**STRICT RULE / 严格规则**: 
- NO TypeScript errors are allowed / 不允许任何 TypeScript 错误
- NO lint errors are allowed / 不允许任何 lint 错误
- Code MUST pass all checks before commit / 代码必须在提交前通过所有检查

## Error Resolution Workflow / 错误解决工作流

### Step 1: Identify Errors / 步骤 1：识别错误

1. **Run Type Check / 运行类型检查**
   ```bash
   pnpm type-check
   ```

2. **Run Lint / 运行 Lint**
   ```bash
   pnpm lint
   ```

3. **Use read_lints Tool / 使用 read_lints 工具**
   ```typescript
   read_lints({ paths: ['modified/file/path'] })
   ```

### Step 2: Categorize Errors / 步骤 2：分类错误

1. **Type Errors / 类型错误**
   - Type mismatches / 类型不匹配
   - Missing types / 缺少类型
   - Incorrect type usage / 类型使用错误

2. **Lint Errors / Lint 错误**
   - Unused imports / 未使用的导入
   - Code style violations / 代码风格违反
   - Best practice violations / 最佳实践违反

### Step 3: Fix Errors / 步骤 3：修复错误

1. **Fix Type Errors / 修复类型错误**
   - Add proper types / 添加适当的类型
   - Fix type mismatches / 修复类型不匹配
   - Use type assertions when necessary / 必要时使用类型断言

2. **Fix Lint Errors / 修复 Lint 错误**
   - Remove unused imports / 删除未使用的导入
   - Fix code style / 修复代码风格
   - Apply best practices / 应用最佳实践

### Step 4: Verify Fixes / 步骤 4：验证修复

1. **Re-run Checks / 重新运行检查**
   ```bash
   pnpm type-check
   pnpm lint
   ```

2. **Verify No Regressions / 验证无回归**
   - Run tests / 运行测试
   - Check functionality / 检查功能

## Common Error Fixes / 常见错误修复

### Type Errors / 类型错误

```typescript
// ❌ Error: Type 'string' is not assignable to type 'number'
const count: number = '10';

// ✅ Fix: Convert type / 修复：转换类型
const count: number = parseInt('10', 10);
```

### Unused Imports / 未使用的导入

```typescript
// ❌ Error: 'unusedImport' is defined but never used
import { usedImport, unusedImport } from './module';

// ✅ Fix: Remove unused import / 修复：删除未使用的导入
import { usedImport } from './module';
```

### Missing Types / 缺少类型

```typescript
// ❌ Error: Parameter 'data' implicitly has an 'any' type
function processData(data) {
  return data.value;
}

// ✅ Fix: Add type annotation / 修复：添加类型注解
function processData(data: { value: string }): string {
  return data.value;
}
```

## Automatic Fix Strategies / 自动修复策略

### 1. Type Inference / 类型推断

- Use TypeScript's type inference / 使用 TypeScript 的类型推断
- Add explicit types when needed / 需要时添加显式类型

### 2. Import Cleanup / 导入清理

- Remove unused imports / 删除未使用的导入
- Organize imports / 组织导入

### 3. Code Style / 代码风格

- Apply consistent formatting / 应用一致的格式
- Follow project conventions / 遵循项目约定

## Checklist / 检查清单

### Before Fixing / 修复前

- [ ] Identify all errors / 识别所有错误
- [ ] Categorize errors / 分类错误
- [ ] Understand error causes / 理解错误原因

### While Fixing / 修复中

- [ ] Fix one error at a time / 一次修复一个错误
- [ ] Test after each fix / 每次修复后测试
- [ ] Verify no new errors / 验证无新错误

### After Fixing / 修复后

- [ ] All errors resolved / 所有错误已解决
- [ ] Tests passing / 测试通过
- [ ] Code reviewed / 代码已审查

## Usage / 使用方法

在 Cursor Chat 中使用：

```
@.cursor/agents/error-resolver.md

请修复以下错误：
[粘贴错误信息]
```

或者使用关键词触发：

```
fix errors
修复错误
resolve TypeScript errors
解决 TypeScript 错误
```

