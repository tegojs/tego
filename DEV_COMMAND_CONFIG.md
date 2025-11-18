# Dev 命令配置目录选择说明

## 问题描述

新版本的 `tegod dev` 命令在启动时会提示选择配置目录，而旧版本不需要。这是因为新版本引入了多运行时环境支持。

## 原因分析

新版本的 `tegod dev` 命令默认会执行 `prepare()` 函数，该函数会：
1. 检查当前 Git 分支
2. 根据分支名生成运行时目录名
3. 提示用户选择配置目录

这是为了支持多分支开发时使用不同的配置环境。

## 解决方案

### 方案 1: 设置环境变量（最推荐）

在 `.env` 文件中添加：

```env
# 使用当前目录作为运行时目录（与旧版本行为一致）
TEGO_RUNTIME_HOME=.
```

或者：

```env
# 使用默认的运行时名称
TEGO_RUNTIME_NAME=current
```

**优点：**
- 与旧版本行为一致
- 不需要修改 package.json
- 配置清晰明确

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

### 方案 3: 确保当前目录有 storage 文件夹

如果当前目录存在 `storage` 文件夹，系统会自动使用当前目录，不会提示选择。

```bash
# 检查是否有 storage 目录
ls storage

# 如果没有，创建它（如果需要）
mkdir -p storage
```

**优点：**
- 自动检测，无需配置
- 与项目结构一致

### 方案 4: 在 package.json 中设置环境变量

```json
{
  "scripts": {
    "dev": "TEGO_RUNTIME_HOME=. tegod dev",
    "dev-local": "TEGO_RUNTIME_HOME=. APP_ENV_PATH=.env.local tegod dev"
  }
}
```

**优点：**
- 显式指定运行时目录
- 不依赖 .env 文件

## 环境变量说明

### TEGO_RUNTIME_HOME

运行时目录的完整路径。如果设置了此变量，系统会直接使用，不会提示选择。

**示例：**
```env
TEGO_RUNTIME_HOME=.                    # 当前目录
TEGO_RUNTIME_HOME=/path/to/runtime     # 绝对路径
```

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

1. **如果设置了 `TEGO_RUNTIME_HOME`**：直接使用
2. **如果当前目录有 `storage` 文件夹**：使用当前目录
3. **如果设置了 `TEGO_RUNTIME_NAME`**：使用 `TEGO_HOME/TEGO_RUNTIME_NAME`
4. **否则**：提示用户选择

## 推荐配置（tego-standard）

对于 `tego-standard` 项目，推荐在 `.env` 文件中添加：

```env
# 使用当前目录作为运行时目录，与旧版本行为一致
TEGO_RUNTIME_HOME=.
```

这样配置后：
- ✅ 不会提示选择配置目录
- ✅ 使用项目根目录作为配置目录
- ✅ 与旧版本行为一致
- ✅ 配置清晰明确

## 验证配置

配置完成后，运行：

```bash
pnpm dev
```

如果不再提示选择配置目录，说明配置成功。

## 常见问题

### Q: 为什么新版本要提示选择配置目录？

A: 新版本支持多运行时环境，允许在不同分支或不同配置下开发，所以需要选择配置目录。

### Q: 如何恢复到旧版本的行为？

A: 在 `.env` 文件中设置 `TEGO_RUNTIME_HOME=.` 即可。

### Q: 如果设置了 TEGO_RUNTIME_HOME，还会提示吗？

A: 不会。如果设置了 `TEGO_RUNTIME_HOME`，系统会直接使用，不会提示。

### Q: 多个项目可以共享同一个运行时目录吗？

A: 可以，但不推荐。每个项目应该有自己的运行时目录，避免配置冲突。

---

**最后更新：** 2025-01-27

