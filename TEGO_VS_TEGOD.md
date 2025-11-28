# Tego 和 Tegod 命令关系说明

## 概述

`tego` 和 `tegod` 是两个不同的命令行工具，分别用于不同的场景：

- **`tego`** - 运行时命令（Runtime Command）
- **`tegod`** - 开发工具命令（Development Kit Command）

## 详细说明

### `tego` - 运行时命令

**包名：** `tego`  
**包路径：** `packages/tego`  
**用途：** 用于运行和管理 Tego 应用

**主要命令：**
```bash
tego start          # 启动应用
tego init [name]    # 初始化新项目
tego sync           # 同步最新包
```

**特点：**
- 轻量级，专注于运行时功能
- 用于生产环境和用户使用
- 通过 Gateway 运行应用
- 支持项目初始化和包同步

**使用场景：**
- 生产环境启动应用
- 用户创建新项目
- 同步项目依赖

---

### `tegod` - 开发工具命令

**包名：** `@tego/devkit`  
**包路径：** `packages/devkit`  
**用途：** 用于开发和构建 Tego 项目

**主要命令：**
```bash
tegod build         # 构建项目
tegod dev           # 开发模式（启动开发服务器）
tegod clean         # 清理构建产物
tegod e2e           # 运行端到端测试
tegod install       # 安装插件
tegod upgrade       # 升级插件
tegod pm            # 包管理器
tegod postinstall   # 安装后处理
tegod ui            # 打开开发工具 UI
```

**特点：**
- 功能丰富，包含完整的开发工具链
- 用于开发和构建阶段
- 支持热重载、构建、测试等开发功能
- 包含 UI 界面

**使用场景：**
- 本地开发调试
- 构建生产版本
- 运行测试
- 管理插件和依赖

---

## 在项目中的使用

### tego 核心仓库（开发仓库）

在 `tego` 核心仓库的 `package.json` 中：

```json
{
  "scripts": {
    "build": "tegod build",        // 使用 tegod 构建
    "dev": "tegod dev",            // 使用 tegod 开发
    "clean": "tegod clean",        // 使用 tegod 清理
    "e2e": "tegod e2e",           // 使用 tegod 测试
    "start": "tego start",        // 使用 tego 启动
    "tego": "tego",               // tego 命令
    "tegod": "tegod",             // tegod 命令
    "tg": "tegod",                // tegod 的别名
    "tgi": "tegod install",        // tegod install 的别名
    "tgu": "tegod upgrade"         // tegod upgrade 的别名
  }
}
```

### tego-standard 仓库（应用仓库）

在 `tego-standard` 仓库中，应该使用：

```json
{
  "scripts": {
    "build": "tego build",         // 注意：这里应该是 tego，不是 tegod
    "dev": "tego dev",             // 注意：这里应该是 tego，不是 tegod
    "start": "tego start",         // 使用 tego 启动
    "install": "tego install",     // 使用 tego 安装
    "upgrade": "tego upgrade"      // 使用 tego 升级
  }
}
```

**注意：** 在应用仓库中，通常使用 `tego` 命令，因为：
- 应用仓库不需要完整的开发工具链
- `tego` 命令更轻量，适合应用场景
- 但某些开发命令（如 `build`, `dev`）可能仍然需要通过 `tegod` 执行

---

## 命令对比表

| 功能 | tego | tegod | 说明 |
|------|------|-------|------|
| 启动应用 | ✅ `tego start` | ❌ | tego 专用 |
| 初始化项目 | ✅ `tego init` | ❌ | tego 专用 |
| 同步包 | ✅ `tego sync` | ❌ | tego 专用 |
| 开发模式 | ❌ | ✅ `tegod dev` | tegod 专用 |
| 构建项目 | ❌ | ✅ `tegod build` | tegod 专用 |
| 清理构建 | ❌ | ✅ `tegod clean` | tegod 专用 |
| 运行测试 | ❌ | ✅ `tegod e2e` | tegod 专用 |
| 安装插件 | ✅ `tego install` | ✅ `tegod install` | 两者都支持 |
| 升级插件 | ✅ `tego upgrade` | ✅ `tegod upgrade` | 两者都支持 |
| 包管理 | ❌ | ✅ `tegod pm` | tegod 专用 |
| 开发 UI | ❌ | ✅ `tegod ui` | tegod 专用 |

---

## 迁移注意事项

### 从 `tachybase` 迁移时

如果之前使用的是 `tachybase` 命令，需要根据场景选择：

**运行时命令：**
- `tachybase start` → `tego start`
- `tachybase init` → `tego init`
- `tachybase sync` → `tego sync`

**开发命令：**
- `tachybase build` → `tegod build`（在开发仓库）
- `tachybase dev` → `tegod dev`（在开发仓库）
- `tachybase test` → `tegod e2e`（在开发仓库）

**注意：** 在应用仓库（如 `tego-standard`）中，可能需要根据实际情况决定使用 `tego` 还是 `tegod`。

---

## 总结

- **`tego`** = 运行时工具，用于运行和管理应用
- **`tegod`** = 开发工具，用于开发和构建项目
- 两者互补，服务于不同的使用场景
- 在应用仓库中，主要使用 `tego`
- 在开发仓库中，主要使用 `tegod`

---

**最后更新：** 2025-01-27

