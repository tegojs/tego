# 正确的 Collections 迁移指南

## 问题分析

在 `tego` 1.3.52 → 1.3.54 的迁移中，`importCollections()` 方法已被废弃，基类的 `loadCollections()` 方法只有在 `this.options.packageName` 存在时才会工作。

在 `tego-standard` 本地开发时，`packageName` 可能没有设置（从数据库的 `applicationPlugins` 表读取），导致 collections 没有被导入。

## 正确的迁移方式

### ❌ 错误方式：在 `load()` 中导入 collections

```typescript
async load() {
  // ❌ 错误：loadCollections() 在 load() 之前被调用
  const collectionsDir = resolve(__dirname, './collections');
  const collection = this.db.getCollection('myCollection');
  if (!collection) {
    await this.db.import({
      directory: collectionsDir,
      from: this.options.packageName || '@tachybase/module-name',
    });
  }
  // ...
}
```

### ✅ 正确方式：重写 `loadCollections()` 方法

```typescript
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { Plugin } from '@tego/server';

export class MyPlugin extends Plugin {
  async loadCollections() {
    // 如果 packageName 没有设置，使用 __dirname 手动导入
    if (!this.options.packageName) {
      const collectionsDir = resolve(__dirname, './collections');
      if (existsSync(collectionsDir)) {
        await this.db.import({
          directory: collectionsDir,
          from: this.options.packageName || '@tachybase/module-name',
        });
      }
      return;
    }
    // 如果 packageName 已设置，调用基类方法
    await super.loadCollections();
  }

  async load() {
    // 现在可以安全地访问 collections
    const collection = this.db.getCollection('myCollection');
    if (!collection) {
      this.app.logger.warn('Collection myCollection is not defined');
      return;
    }
    // ...
  }
}
```

## 插件加载顺序

```
beforeLoad() → loadCollections() → load()
```

因此，collections 必须在 `loadCollections()` 中导入，而不是在 `load()` 中。

## 需要修复的插件列表

所有在 `load()` 方法中导入 collections 的插件都需要改为在 `loadCollections()` 中导入：

1. `module-auth` - 需要修复
2. `module-collection` - 需要修复
3. `module-event-source` - 需要修复
4. `module-file` - 需要修复
5. `module-env-secrets` - 需要修复
6. `module-workflow` - 需要修复
7. `module-acl` - 需要修复
8. `module-data-source` - 需要修复
9. `module-backup` - 需要修复
10. `module-cloud-component` - 需要修复
11. `module-cron` - 需要修复
12. `module-instrumentation` - 需要修复
13. `plugin-password-policy` - 需要修复
14. `plugin-auth-main-app` - 需要修复

## 修复步骤

1. 将 `load()` 方法中的 collection 导入逻辑移到 `loadCollections()` 方法中
2. 在 `loadCollections()` 中检查 `packageName`，如果未设置则使用 `__dirname` 手动导入
3. 在 `load()` 方法中添加空值检查，确保 collection 存在后再访问

