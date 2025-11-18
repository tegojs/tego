# Tego-Standard 命令迁移指南

本文档详细说明如何修改 `tego-standard` 仓库中的命令，从 `tachybase` 迁移到 `tego` 或 `tegod`。

## 命令分类

根据命令的用途，需要选择使用 `tego` 还是 `tegod`：

### 使用 `tego` 的命令（运行时命令）
- `start` - 启动应用
- `install` - 安装插件
- `upgrade` - 升级插件

### 使用 `tegod` 的命令（开发工具命令）
- `build` - 构建项目
- `dev` - 开发模式
- `clean` - 清理构建
- `e2e` - 运行端到端测试
- `postinstall` - 安装后处理
- `pm` - 包管理器
- `test` - 运行测试

## 当前状态分析

查看 `tego-standard/package.json`，当前使用的命令：

```json
{
  "scripts": {
    "build": "tachybase build",           // ❌ 需要改为 tegod
    "build:p": "tachybase build -s --no-dts",  // ❌ 需要改为 tegod
    "clean": "tachybase clean",          // ❌ 需要改为 tegod
    "dev": "tachybase dev",              // ❌ 需要改为 tegod
    "dev-local": "APP_ENV_PATH=.env.local tachybase dev",  // ❌ 需要改为 tegod
    "dev-server": "tachybase dev --server",  // ❌ 需要改为 tegod
    "e2e": "tachybase e2e",             // ❌ 需要改为 tegod
    "postinstall": "tachybase postinstall",  // ❌ 需要改为 tegod
    "pm": "tachybase pm",               // ❌ 需要改为 tegod
    "start": "tego start",               // ✅ 已经正确
    "test": "tachybase test",            // ❌ 需要改为 tegod
    "test:client": "tachybase test:client",  // ❌ 需要改为 tegod
    "test:server": "tachybase test:server",  // ❌ 需要改为 tegod
    "tachybase": "tachybase",           // ❌ 可以删除或改为 tego/tegod
    "tb": "tachybase",                  // ❌ 可以删除或改为 tego/tegod
    "tbi": "tachybase install",         // ❌ 需要改为 tego
    "tbu": "tachybase upgrade",         // ❌ 需要改为 tego
    "tc": "tachybase test:client",       // ❌ 需要改为 tegod
    "tego": "tego",                     // ✅ 已经正确
    "ts": "tachybase test:server"       // ❌ 需要改为 tegod
  }
}
```

## 修改方案

### 方案 1：完整迁移（推荐）

将所有命令按照用途分类迁移：

```json
{
  "scripts": {
    "prebuild": "node scripts/update-version-with-hash.mjs",
    "build": "tegod build",
    "prebuild:p": "node scripts/update-version-with-hash.mjs",
    "build:p": "tegod build -s --no-dts",
    "changelog:generate": "node scripts/generate-changelog.mjs",
    "changelog:update-unreleased": "node scripts/update-unreleased.mjs",
    "clean": "tegod clean",
    "predev": "node scripts/update-version-with-hash.mjs",
    "dev": "tegod dev",
    "dev-local": "APP_ENV_PATH=.env.local tegod dev",
    "dev-server": "tegod dev --server",
    "e2e": "tegod e2e",
    "preinstall": "npx only-allow pnpm",
    "postinstall": "tegod postinstall",
    "lint": "oxlint",
    "pm": "tegod pm",
    "prepare": "husky",
    "start": "tego start",
    "tego": "tego",
    "tegod": "tegod",
    "tg": "tegod",
    "tgi": "tego install",
    "tgu": "tego upgrade",
    "test": "tegod test",
    "test:client": "tegod test:client",
    "test:server": "tegod test:server",
    "ts": "tegod test:server"
  }
}
```

### 方案 2：保持兼容性（过渡方案）

如果暂时不确定某些命令应该用哪个，可以先统一使用 `tego`，因为 `tego` 可能内部会转发到 `tegod`：

```json
{
  "scripts": {
    "build": "tego build",      // 如果 tego 支持 build
    "dev": "tego dev",          // 如果 tego 支持 dev
    // ... 其他命令
  }
}
```

**注意：** 需要验证 `tego` 是否支持这些开发命令。如果不支持，必须使用 `tegod`。

## 具体修改步骤

### 步骤 1: 备份当前 package.json

```bash
cd D:\Dev\TegoJS\tego-standard
cp package.json package.json.backup
```

### 步骤 2: 使用 PowerShell 脚本批量替换

在 `tego-standard` 目录下执行：

```powershell
# 读取 package.json
$packageJson = Get-Content package.json -Raw | ConvertFrom-Json

# 定义命令映射
$commandMappings = @{
    'tachybase build' = 'tegod build'
    'tachybase clean' = 'tegod clean'
    'tachybase dev' = 'tegod dev'
    'tachybase e2e' = 'tegod e2e'
    'tachybase postinstall' = 'tegod postinstall'
    'tachybase pm' = 'tegod pm'
    'tachybase test' = 'tegod test'
    'tachybase test:client' = 'tegod test:client'
    'tachybase test:server' = 'tegod test:server'
    'tachybase install' = 'tego install'
    'tachybase upgrade' = 'tego upgrade'
}

# 更新脚本
foreach ($script in $packageJson.scripts.PSObject.Properties) {
    $value = $script.Value
    foreach ($key in $commandMappings.Keys) {
        if ($value -match [regex]::Escape($key)) {
            $newValue = $value -replace [regex]::Escape($key), $commandMappings[$key]
            $script.Value = $newValue
            Write-Host "Updated: $($script.Name) = $newValue"
        }
    }
}

# 更新别名脚本
if ($packageJson.scripts.tachybase) {
    $packageJson.scripts | Add-Member -MemberType NoteProperty -Name "tegod" -Value "tegod" -Force
    $packageJson.scripts.PSObject.Properties.Remove('tachybase')
    Write-Host "Removed: tachybase alias"
}

if ($packageJson.scripts.tb) {
    $packageJson.scripts.tb = "tegod"
    Write-Host "Updated: tb = tegod"
}

if ($packageJson.scripts.tbi) {
    $packageJson.scripts.tbi = "tego install"
    Write-Host "Updated: tbi = tego install"
}

if ($packageJson.scripts.tbu) {
    $packageJson.scripts.tbu = "tego upgrade"
    Write-Host "Updated: tbu = tego upgrade"
}

if ($packageJson.scripts.tc) {
    $packageJson.scripts.tc = "tegod test:client"
    Write-Host "Updated: tc = tegod test:client"
}

# 保存文件
$packageJson | ConvertTo-Json -Depth 10 | Set-Content package.json
Write-Host "`nMigration complete! Please review the changes."
```

### 步骤 3: 手动验证和调整

检查修改后的 `package.json`，确保：

1. ✅ 运行时命令使用 `tego`：
   - `start` → `tego start`
   - `install` → `tego install`
   - `upgrade` → `tego upgrade`

2. ✅ 开发命令使用 `tegod`：
   - `build` → `tegod build`
   - `dev` → `tegod dev`
   - `clean` → `tegod clean`
   - `e2e` → `tegod e2e`
   - `postinstall` → `tegod postinstall`
   - `pm` → `tegod pm`
   - `test` → `tegod test`

3. ✅ 别名脚本已更新：
   - `tb` → `tegod`
   - `tbi` → `tego install`
   - `tbu` → `tego upgrade`
   - `tc` → `tegod test:client`

### 步骤 4: 测试命令

测试关键命令是否正常工作：

```bash
# 测试开发命令
pnpm tegod build
pnpm tegod dev
pnpm tegod clean

# 测试运行时命令
pnpm tego start
pnpm tego install
pnpm tego upgrade

# 测试别名
pnpm tg        # 应该等同于 tegod
pnpm tgi       # 应该等同于 tego install
pnpm tgu       # 应该等同于 tego upgrade
```

## 新版本 dev 命令的配置目录选择

### 问题说明

新版本的 `tegod dev` 命令默认会执行 `prepare()` 函数，提示用户选择配置目录。这与旧版本的行为不同。

### 解决方案

有几种方法可以避免这个提示：

#### 方案 1: 设置环境变量（推荐）

在 `.env` 文件中设置 `TEGO_RUNTIME_HOME`：

```env
# .env
TEGO_RUNTIME_HOME=.
# 或者指定具体路径
# TEGO_RUNTIME_HOME=D:\Dev\TegoJS\tego-standard
```

或者设置 `TEGO_RUNTIME_NAME`：

```env
# .env
TEGO_RUNTIME_NAME=current
```

#### 方案 2: 使用 --no-prepare 选项

在 `package.json` 中修改 dev 脚本：

```json
{
  "scripts": {
    "dev": "tegod dev --no-prepare"
  }
}
```

#### 方案 3: 确保当前目录有 storage 文件夹

如果当前目录存在 `storage` 文件夹，系统会自动使用当前目录作为 `TEGO_RUNTIME_HOME`，不会提示选择。

```bash
# 确保当前目录有 storage 文件夹
ls storage  # 应该能看到 storage 目录
```

#### 方案 4: 在 package.json 中设置环境变量

```json
{
  "scripts": {
    "dev": "TEGO_RUNTIME_HOME=. tegod dev",
    "dev-local": "TEGO_RUNTIME_HOME=. APP_ENV_PATH=.env.local tegod dev"
  }
}
```

### 推荐配置

对于 `tego-standard` 项目，推荐在 `.env` 文件中添加：

```env
# 使用当前目录作为运行时目录
TEGO_RUNTIME_HOME=.

# 或者如果使用默认的 .tego 目录
# TEGO_RUNTIME_NAME=current
```

这样就不会每次启动都提示选择配置目录了。

---

## 注意事项

### 1. 确保依赖已安装

确保 `package.json` 中包含必要的依赖：

```json
{
  "devDependencies": {
    "@tego/devkit": "catalog:",  // 提供 tegod 命令
    "tego": "catalog:"          // 提供 tego 命令
  }
}
```

### 2. 环境变量

某些命令可能依赖环境变量，确保 `.env` 文件配置正确。

### 3. CI/CD 脚本

如果项目中有 CI/CD 脚本（如 GitHub Actions），也需要更新其中的命令：

```yaml
# .github/workflows/*.yaml
- run: pnpm tego build    # 如果使用 tego
- run: pnpm tegod build   # 如果使用 tegod
```

### 4. Docker 脚本

检查 `docker/` 目录下的脚本，确保命令已更新：

```bash
# docker/docker-entrypoint.sh
tego start  # 而不是 tachybase start
```

### 5. 文档更新

更新 README 和其他文档中的命令示例：

```markdown
# 旧文档
```bash
tachybase start
tachybase build
```

# 新文档
```bash
tego start
tegod build
```
```

## 验证清单

完成迁移后，请验证：

- [ ] `pnpm build` 正常工作
- [ ] `pnpm dev` 正常工作
- [ ] `pnpm start` 正常工作
- [ ] `pnpm install` 正常工作
- [ ] `pnpm upgrade` 正常工作
- [ ] `pnpm test` 正常工作
- [ ] `pnpm e2e` 正常工作
- [ ] 所有别名脚本正常工作
- [ ] CI/CD 流程正常
- [ ] Docker 容器正常启动

## 回滚方案

如果迁移后出现问题，可以：

1. 恢复备份：
```bash
cp package.json.backup package.json
```

2. 或者手动回滚特定命令

3. 逐步迁移，每次只迁移一个命令，充分测试后再继续

---

**最后更新：** 2025-01-27  
**适用版本：** tego-standard 从 1.3.52 升级到 1.3.54+

