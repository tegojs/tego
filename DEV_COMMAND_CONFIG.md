# Dev 命令配置目录选择说明

## 问题描述

新版本的 `tegod dev` 命令在启动时会提示选择配置目录，而旧版本不需要。这是因为新版本引入了多运行时环境支持。

## 原因分析

新版本的 `tegod dev` 命令默认会执行 `prepare()` 函数，该函数会：
1. **没有检查 `TEGO_RUNTIME_HOME` 是否已经设置**
2. 直接去 `TEGO_HOME`（默认 `~/.tego`）下查找目录
3. 提示用户选择配置目录

**关键问题：** `prepare()` 函数在开始时就使用了 `process.env.TEGO_HOME`，但没有先检查 `TEGO_RUNTIME_HOME` 是否已经设置。即使 `.env` 文件中设置了 `TEGO_RUNTIME_HOME`，`prepare()` 函数也不会使用它。

**执行顺序：**
1. `initEnv()` 先执行，读取 `.env` 文件
2. 如果当前目录有 `storage` 文件夹，`initEnv()` 会设置 `TEGO_RUNTIME_HOME = process.cwd()`
3. 但是 `prepare()` 函数**没有检查** `TEGO_RUNTIME_HOME` 是否已设置，直接去 `TEGO_HOME` 下查找

## 解决方案

### 方案 1: 确保当前目录有 storage 文件夹（最推荐）

**关键发现：** `initEnv()` 函数会检查当前目录是否有 `storage` 文件夹，如果有，会自动设置 `TEGO_RUNTIME_HOME = process.cwd()`。

但是 `prepare()` 函数**没有检查** `TEGO_RUNTIME_HOME` 是否已设置，所以即使 `initEnv()` 设置了，`prepare()` 仍然会提示选择。

**解决方案：** 使用 `--no-prepare` 选项跳过 `prepare()` 函数。

在 `package.json` 中：

```json
{
  "scripts": {
    "dev": "tegod dev --no-prepare"
  }
}
```

**为什么这样有效：**
- `initEnv()` 会检查 `storage` 目录并设置 `TEGO_RUNTIME_HOME`
- `--no-prepare` 跳过 `prepare()` 函数，不会提示选择
- 系统会使用 `initEnv()` 设置的 `TEGO_RUNTIME_HOME`

### 方案 2: 在 package.json 中设置环境变量

在 `package.json` 中直接设置环境变量：

```json
{
  "scripts": {
    "dev": "TEGO_RUNTIME_HOME=. tegod dev --no-prepare"
  }
}
```

**注意：** 必须同时使用 `--no-prepare`，否则 `prepare()` 函数仍然会提示选择。

### 方案 2: 使用 --no-prepare 选项

修改 `package.json`：

```json
{
  "scripts": {
    "dev": "tegod dev --no-prepare",
    "dev-local": "APP_ENV_PATH=.env.local tegod dev --no-prepare"
  }
}
```

**优点：**
- 完全跳过 prepare 步骤
- 使用系统默认的运行时目录

**缺点：**
- 需要修改 package.json
- 如果运行时目录不存在，可能会报错


## 环境变量说明

### TEGO_RUNTIME_HOME

运行时目录的完整路径。

**重要：** 即使设置了此变量，`prepare()` 函数**也不会检查**它，仍然会提示选择。必须使用 `--no-prepare` 来跳过 `prepare()` 函数。

**示例：**
```env
TEGO_RUNTIME_HOME=.                    # 当前目录
TEGO_RUNTIME_HOME=/path/to/runtime     # 绝对路径
```

**注意：** 在 `.env` 中设置 `TEGO_RUNTIME_HOME=.` **不会**阻止 `prepare()` 函数提示选择，因为 `prepare()` 函数没有检查这个变量。

### TEGO_RUNTIME_NAME

运行时名称。系统会在 `TEGO_HOME`（默认 `~/.tego`）下查找对应名称的目录。

**示例：**
```env
TEGO_RUNTIME_NAME=current              # 使用 ~/.tego/current
TEGO_RUNTIME_NAME=main                 # 使用 ~/.tego/main
```

### TEGO_HOME

Tego 的主目录，默认为 `~/.tego`。

**示例：**
```env
TEGO_HOME=~/.tego                      # 默认值
TEGO_HOME=/custom/path                 # 自定义路径
```

## 自动检测逻辑

系统会按以下顺序自动检测运行时目录：

1. **`initEnv()` 函数（在 `tegod` 启动时执行）：**
   - 读取 `.env` 文件
   - 如果当前目录有 `storage` 文件夹，且 `TEGO_RUNTIME_HOME` 和 `TEGO_RUNTIME_NAME` 都没设置，则设置 `TEGO_RUNTIME_HOME = process.cwd()`
   - 如果 `TEGO_RUNTIME_HOME` 还没设置，则设置为 `TEGO_HOME/TEGO_RUNTIME_NAME`（默认 `~/.tego/current`）

2. **`prepare()` 函数（如果执行）：**
   - **问题：** 没有检查 `TEGO_RUNTIME_HOME` 是否已设置
   - 直接去 `TEGO_HOME` 下查找目录
   - 提示用户选择

**所以正确的做法是使用 `--no-prepare` 跳过 `prepare()` 函数。**

## 推荐配置（tego-standard）

对于 `tego-standard` 项目，推荐使用以下配置：

### 方法 1: 使用 --no-prepare（最简单）

在 `package.json` 中：

```json
{
  "scripts": {
    "dev": "tegod dev --no-prepare",
    "dev-local": "APP_ENV_PATH=.env.local tegod dev --no-prepare"
  }
}
```

**工作原理：**
- `initEnv()` 会检查当前目录是否有 `storage` 文件夹
- 如果有，自动设置 `TEGO_RUNTIME_HOME = process.cwd()`
- `--no-prepare` 跳过 `prepare()` 函数，不会提示选择
- 系统使用当前目录作为运行时目录

### 方法 2: 显式设置环境变量

在 `package.json` 中：

```json
{
  "scripts": {
    "dev": "TEGO_RUNTIME_HOME=. tegod dev --no-prepare"
  }
}
```

**注意：** 必须同时使用 `--no-prepare`，否则 `prepare()` 函数仍然会提示选择。

这样配置后：
- ✅ 不会提示选择配置目录
- ✅ 使用项目根目录作为配置目录
- ✅ 与旧版本行为一致

## 验证配置

配置完成后，运行：

```bash
pnpm dev
```

如果不再提示选择配置目录，说明配置成功。

## 常见问题

### Q: 为什么新版本要提示选择配置目录？

A: 新版本支持多运行时环境，允许在不同分支或不同配置下开发。`prepare()` 函数会提示选择配置目录，但该函数没有检查 `TEGO_RUNTIME_HOME` 是否已设置。

### Q: 为什么在 .env 中设置 TEGO_RUNTIME_HOME=. 没用？

A: 因为 `prepare()` 函数在开始执行时**没有检查** `TEGO_RUNTIME_HOME` 是否已设置，而是直接去 `TEGO_HOME` 下查找目录。即使 `initEnv()` 已经设置了 `TEGO_RUNTIME_HOME`，`prepare()` 函数也不会使用它。

### Q: 如何恢复到旧版本的行为？

A: 使用 `--no-prepare` 选项跳过 `prepare()` 函数。`initEnv()` 会自动检测 `storage` 目录并设置 `TEGO_RUNTIME_HOME`。

### Q: 默认会使用哪个目录？会使用 tego-standard/packages 里的包吗？

A: 
- **如果使用 `--no-prepare` 且当前目录有 `storage` 文件夹：** 使用当前目录（`tego-standard` 根目录），会使用 `packages/` 里的包（通过符号链接）
- **如果使用默认的 `~/.tego/current`：** 插件会从 npm 下载，不会使用 `packages/` 里的包

**关键：** `createDevPluginsSymlink()` 函数会从 `process.cwd()/packages` 创建符号链接到 `TEGO_RUNTIME_HOME/plugins/dev`。所以：
- 如果 `TEGO_RUNTIME_HOME` 指向当前目录，会使用 `packages/` 里的包
- 如果 `TEGO_RUNTIME_HOME` 指向 `~/.tego/current`，需要从 npm 下载插件

### Q: 多个项目可以共享同一个运行时目录吗？

A: 可以，但不推荐。每个项目应该有自己的运行时目录，避免配置冲突。

---

**最后更新：** 2025-01-27

