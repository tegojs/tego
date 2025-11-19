# Tego-Standard Dev 命令配置完整指南

## 问题总结

1. **`.env` 中设置 `TEGO_RUNTIME_HOME=.` 没用**
   - 原因：`prepare()` 函数没有检查 `TEGO_RUNTIME_HOME` 是否已设置
   - 即使 `initEnv()` 已经设置了 `TEGO_RUNTIME_HOME`，`prepare()` 函数仍然会提示选择

2. **默认会使用哪个目录？会使用 `tego-standard/packages/` 里的包吗？**
   - 如果使用 `--no-prepare` 且当前目录有 `storage` 文件夹：使用当前目录，**会使用 `packages/` 里的包**
   - 如果使用默认的 `~/.tego/current`：插件会从 npm **下载**，不会使用 `packages/` 里的包

## 正确的解决方案

### 方案 1: 使用 --no-prepare（推荐）

在 `tego-standard/package.json` 中：

```json
{
  "scripts": {
    "dev": "tegod dev --no-prepare",
    "dev-local": "APP_ENV_PATH=.env.local tegod dev --no-prepare",
    "dev-server": "tegod dev --no-prepare --server"
  }
}
```

**工作原理：**
1. `initEnv()` 先执行，读取 `.env` 文件
2. 如果当前目录有 `storage` 文件夹，`initEnv()` 会设置 `TEGO_RUNTIME_HOME = process.cwd()`
3. `--no-prepare` 跳过 `prepare()` 函数，不会提示选择
4. 系统使用当前目录作为运行时目录
5. `createDevPluginsSymlink()` 会从 `process.cwd()/packages` 创建符号链接到 `TEGO_RUNTIME_HOME/plugins/dev`
6. **结果：使用 `packages/` 里的包，不需要下载**

### 方案 2: 显式设置环境变量

在 `package.json` 中：

```json
{
  "scripts": {
    "dev": "TEGO_RUNTIME_HOME=. tegod dev --no-prepare"
  }
}
```

**注意：** 必须同时使用 `--no-prepare`，否则 `prepare()` 函数仍然会提示选择。

## 插件加载机制

### 开发插件（dev plugins）

`createDevPluginsSymlink()` 函数会：
1. 从 `process.cwd()/packages` 查找插件
2. 创建符号链接到 `TEGO_RUNTIME_HOME/plugins/dev`
3. 系统从 `TEGO_RUNTIME_HOME/plugins/dev` 加载插件

**关键路径：**
- 源路径：`process.cwd()/packages/plugin-xxx`（tego-standard 的 packages 目录）
- 目标路径：`TEGO_RUNTIME_HOME/plugins/dev/@tachybase/plugin-xxx`

**所以：**
- 如果 `TEGO_RUNTIME_HOME` = 当前目录（`tego-standard` 根目录）
  - ✅ 会使用 `packages/` 里的包
  - ✅ 通过符号链接加载
  - ✅ 不需要下载

- 如果 `TEGO_RUNTIME_HOME` = `~/.tego/current`
  - ❌ 不会使用 `packages/` 里的包
  - ❌ 需要从 npm 下载插件
  - ❌ 符号链接指向 `~/.tego/current/plugins/dev`，但源路径仍然是 `process.cwd()/packages`

### 远程插件（remote plugins）

从 `TEGO_RUNTIME_HOME/plugins/remote` 加载，这些是从 npm 下载的插件。

### 内置插件（builtin plugins）

从 `TEGO_RUNTIME_HOME/plugins/builtin` 加载，这些是系统内置的插件。

## 执行流程

### 使用 --no-prepare 的流程

```
1. tegod dev --no-prepare
   ↓
2. initEnv() 执行
   - 读取 .env 文件
   - 检查 storage 目录
   - 设置 TEGO_RUNTIME_HOME = process.cwd()（如果有 storage）
   ↓
3. 跳过 prepare() 函数
   ↓
4. 启动开发服务器
   ↓
5. createDevPluginsSymlink() 执行
   - 从 process.cwd()/packages 查找插件
   - 创建符号链接到 TEGO_RUNTIME_HOME/plugins/dev
   ↓
6. 系统从 TEGO_RUNTIME_HOME/plugins/dev 加载插件
   - 实际加载的是 packages/ 里的包（通过符号链接）
```

### 不使用 --no-prepare 的流程

```
1. tegod dev
   ↓
2. initEnv() 执行
   - 读取 .env 文件
   - 检查 storage 目录
   - 设置 TEGO_RUNTIME_HOME = process.cwd()（如果有 storage）
   ↓
3. prepare() 函数执行
   - ❌ 没有检查 TEGO_RUNTIME_HOME 是否已设置
   - 直接去 TEGO_HOME 下查找目录
   - 提示用户选择配置目录
   ↓
4. 用户选择目录
   - 可能选择 ~/.tego/current
   - 可能选择当前目录
   ↓
5. 如果选择了 ~/.tego/current
   - ❌ 不会使用 packages/ 里的包
   - ❌ 需要从 npm 下载插件
```

## 推荐配置（tego-standard）

### package.json 修改

```json
{
  "scripts": {
    "dev": "tegod dev --no-prepare",
    "dev-local": "APP_ENV_PATH=.env.local tegod dev --no-prepare",
    "dev-server": "tegod dev --no-prepare --server"
  }
}
```

### 确保 storage 目录存在

```bash
# 检查 storage 目录
ls storage

# 如果不存在，创建它
mkdir -p storage
```

### 可选：在 .env 中设置（虽然 prepare() 不会用，但其他代码可能会用）

```env
# .env
TEGO_RUNTIME_HOME=.
```

## 验证配置

配置完成后，运行：

```bash
pnpm dev
```

**预期结果：**
- ✅ 不会提示选择配置目录
- ✅ 使用当前目录作为运行时目录
- ✅ 使用 `packages/` 里的包（通过符号链接）
- ✅ 不需要从 npm 下载插件

**验证插件路径：**
```bash
# 检查符号链接
ls -la ~/.tego/current/plugins/dev  # 如果使用默认目录
# 或
ls -la ./plugins/dev  # 如果使用当前目录
```

应该能看到指向 `packages/` 的符号链接。

## 常见问题

### Q: 为什么 .env 中设置 TEGO_RUNTIME_HOME=. 没用？

A: 因为 `prepare()` 函数在开始执行时**没有检查** `TEGO_RUNTIME_HOME` 是否已设置，而是直接去 `TEGO_HOME` 下查找目录。这是 `prepare()` 函数的一个 bug 或设计缺陷。

### Q: 默认会使用哪个目录？

A: 
- 如果使用 `--no-prepare` 且当前目录有 `storage` 文件夹：使用当前目录
- 如果不使用 `--no-prepare`：`prepare()` 会提示选择，默认可能是 `~/.tego/current`

### Q: 会使用 tego-standard/packages 里的包吗？

A: 
- **使用 `--no-prepare` 且 `TEGO_RUNTIME_HOME` 指向当前目录：** ✅ 会使用 `packages/` 里的包
- **使用默认的 `~/.tego/current`：** ❌ 不会使用 `packages/` 里的包，需要从 npm 下载

### Q: 如何确保使用 packages/ 里的包？

A: 
1. 使用 `--no-prepare` 选项
2. 确保当前目录有 `storage` 文件夹（这样 `initEnv()` 会设置 `TEGO_RUNTIME_HOME = process.cwd()`）
3. 或者显式设置 `TEGO_RUNTIME_HOME=.` 并使用 `--no-prepare`

---

**最后更新：** 2025-01-27

