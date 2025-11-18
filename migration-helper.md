# Tego Standard 迁移辅助指南

本文档提供具体的迁移步骤和脚本，帮助快速完成从 1.3.52 到 1.3.54+ 的适配。

> **版本说明**：tego-standard 当前基于 tego 1.3.52，需要适配到 1.3.54+ 版本。

## 快速迁移步骤

### 自动化迁移（推荐）

对于 `tego-standard` 仓库，可以使用提供的 PowerShell 脚本自动迁移：

```powershell
# 在 tego-standard 目录下执行
cd D:\Dev\TegoJS\tego-standard
.\migrate-tego-standard-commands.ps1
```

脚本会自动：
- 备份当前的 `package.json`
- 将所有 `tachybase` 命令替换为 `tego` 或 `tegod`
- 更新所有别名脚本
- 显示详细的更改日志

### 手动迁移步骤

### 步骤 1: 更新命令行工具 `tachybase` → `tego` / `tegod`

这是最基础的更改，需要更新所有脚本命令。

#### 更新 package.json 脚本

在 `tego-standard/package.json` 中，需要根据命令类型选择使用 `tego` 或 `tegod`：

**运行时命令 → `tego`：**
- `start`: `tego start`（可能已经更新）
- `install`: `tachybase install` → `tego install`
- `upgrade`: `tachybase upgrade` → `tego upgrade`

**开发命令 → `tegod`：**
- `build`: `tachybase build` → `tegod build`
- `dev`: `tachybase dev` → `tegod dev`
- `clean`: `tachybase clean` → `tegod clean`
- `pm`: `tachybase pm` → `tegod pm`
- `test`: `tachybase test` → `tegod test`
- `test:client`: `tachybase test:client` → `tegod test:client`
- `test:server`: `tachybase test:server` → `tegod test:server`
- `e2e`: `tachybase e2e` → `tegod e2e`
- `postinstall`: `tachybase postinstall` → `tegod postinstall`

**别名脚本更新：**
- `tb`: `tachybase` → `tegod`
- `tbi`: `tachybase install` → `tego install`
- `tbu`: `tachybase upgrade` → `tego upgrade`
- `tc`: `tachybase test:client` → `tegod test:client`
- `ts`: `tachybase test:server` → `tegod test:server`

**PowerShell 脚本：**
```powershell
# 在 tego-standard 目录下执行
$packageJson = Get-Content package.json -Raw | ConvertFrom-Json
foreach ($script in $packageJson.scripts.PSObject.Properties) {
    if ($script.Value -match 'tachybase') {
        $script.Value = $script.Value -replace 'tachybase', 'tego'
        Write-Host "Updated: $($script.Name) = $($script.Value)"
    }
}
$packageJson | ConvertTo-Json -Depth 10 | Set-Content package.json
```

**Bash 脚本：**
```bash
# 在 tego-standard 目录下执行
sed -i 's/tachybase/tego/g' package.json
```

#### 更新文档和注释

搜索所有文档文件（`.md`, `.txt`）中的 `tachybase` 命令：

```bash
# 查找所有文档中的 tachybase
find . -type f \( -name "*.md" -o -name "*.txt" \) \
  ! -path "*/node_modules/*" \
  -exec grep -l "tachybase" {} \;
```

### 步骤 2: 批量替换 `ctx.app` → `ctx.tego`

这是最重要的更改，影响范围最广。

#### 使用 VS Code / Cursor 批量替换

1. 打开全局查找替换（`Ctrl+Shift+H` 或 `Cmd+Shift+H`）
2. 查找：`ctx.app`
3. 替换为：`ctx.tego`
4. 在 `tego-standard` 仓库中执行替换
5. **注意**：某些情况下可能需要手动检查，确保替换正确

#### 使用 PowerShell 脚本（Windows）

```powershell
# 在 tego-standard 目录下执行
$files = Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx | Where-Object { $_.FullName -notmatch 'node_modules|lib|dist' }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace 'ctx\.app', 'ctx.tego'
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}
```

#### 使用 Bash 脚本（Linux/Mac）

```bash
#!/bin/bash
# 在 tego-standard 目录下执行

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/lib/*" \
  ! -path "*/dist/*" \
  -exec sed -i 's/ctx\.app/ctx.tego/g' {} +

echo "Replacement complete. Please review the changes."
```

### 步骤 3: 替换 Application 废弃方法

#### 2.1 替换 `app.collection()` → `app.db.collection()`

**查找模式：**
```typescript
app\.collection\(
```

**替换为：**
```typescript
app.db.collection(
```

**注意：** 如果使用的是 `ctx.app.collection()`，需要先完成步骤 1，然后替换为 `ctx.tego.db.collection()`

#### 2.2 替换 `app.resource()` → `app.resourcer.define()`

**查找模式：**
```typescript
app\.resource\(
```

**替换为：**
```typescript
app.resourcer.define(
```

#### 2.3 替换 `app.getPlugin()` → `app.pm.get()`

**查找模式：**
```typescript
app\.getPlugin\(
```

**替换为：**
```typescript
app.pm.get(
```

**注意：** 如果使用的是 `ctx.app.getPlugin()`，需要先完成步骤 1，然后替换为 `ctx.tego.pm.get()`

#### 2.4 替换 `app.parse()` → `app.runAsCLI()`

**查找模式：**
```typescript
app\.parse\(
```

**替换为：**
```typescript
app.runAsCLI(
```

**注意：** `runAsCLI` 的第二个参数需要添加选项对象：
```typescript
// 旧代码
await app.parse(['restart']);

// 新代码
await app.runAsCLI(['restart'], { from: 'user' });
```

### 步骤 4: 更新包导入

#### 替换 `@tachybase/server` → `@tego/core`

**查找模式：**
```typescript
from '@tachybase/server'
import.*from '@tachybase/server'
```

**替换为：**
```typescript
from '@tego/core'
import.*from '@tego/core'
```

**PowerShell 脚本：**
```powershell
$files = Get-ChildItem -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch 'node_modules|lib|dist' }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace "@tachybase/server", "@tego/core"
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}
```

### 步骤 5: 更新 package.json 依赖

在 `tego-standard/package.json` 中：

```json
{
  "dependencies": {
    "@tego/core": "^1.3.54"
  }
}
```

确保移除 `@tachybase/server` 依赖（如果存在）。

### 步骤 6: 检查环境变量使用

搜索所有使用 `process.env` 的地方，评估是否需要迁移到 `app.environment`：

```typescript
// 查找模式
process\.env\.
```

**需要迁移的情况：**
- 在 Action 处理器中使用 `process.env`
- 在中间件中使用 `process.env`
- 在插件初始化中使用 `process.env`

**迁移示例：**
```typescript
// 旧代码
const apiPath = process.env.API_BASE_PATH;

// 新代码（在 Action/中间件中）
const vars = ctx.tego.environment.getVariables();
const apiPath = vars.API_BASE_PATH;
```

### 步骤 7: 验证类型定义

检查所有类型定义文件（`.d.ts`），确保更新了上下文类型：

```typescript
// 旧类型定义
interface Context {
  app: Application;
}

// 新类型定义
interface Context {
  tego: Application;
  db: Database;
  cache: Cache;
  resourcer: Resourcer;
}
```

## 常见问题修复

### 问题 1: 类型错误 `Property 'app' does not exist on type 'Context'`

**解决方案：**
```typescript
// 旧代码
const app = ctx.app as Application;

// 新代码
const app = ctx.tego as Application;
```

### 问题 2: `app.collection is not a function`

**解决方案：**
```typescript
// 旧代码
app.collection({ name: 'users' });

// 新代码
app.db.collection({ name: 'users' });
```

### 问题 3: `app.getPlugin is not a function`

**解决方案：**
```typescript
// 旧代码
const plugin = app.getPlugin('workflow');

// 新代码
const plugin = app.pm.get('workflow');
```

### 问题 4: 中间件中无法访问 `ctx.app`

**解决方案：**
```typescript
// 旧代码
app.use(async (ctx, next) => {
  const name = ctx.app.name;
  await next();
});

// 新代码
app.use(async (ctx, next) => {
  const name = ctx.tego.name;
  await next();
});
```

## 测试清单

完成迁移后，请测试以下功能：

- [ ] 应用启动正常
- [ ] 所有 API 端点正常工作
- [ ] 认证功能正常
- [ ] 数据库操作正常
- [ ] 插件加载正常
- [ ] 中间件执行正常
- [ ] WebSocket 连接正常
- [ ] 文件上传功能正常
- [ ] 工作流功能正常（如果使用）

## 回滚计划

如果迁移后出现问题，可以：

1. 使用 Git 回滚到迁移前的版本
2. 逐步迁移，每次只迁移一个模块
3. 使用功能分支进行迁移，充分测试后再合并

## 获取帮助

如果遇到问题：

1. 查看 `BREAKING_CHANGES.md` 了解详细变更
2. 检查 Tego 核心仓库的提交历史
3. 在 GitHub 上提交 Issue
4. 参考 Tego Standard 仓库中的其他已迁移代码

---

**提示：** 建议分模块逐步迁移，每次迁移一个插件或模块，充分测试后再继续下一个。

