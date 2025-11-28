# Tego 故障排查指南

## 常见错误

### 错误：`Collection XXX is not defined` 和 `Cannot read properties of undefined (reading 'model')`

#### 错误信息

```
[warn] Collection webhooks is not defined
[error] Cannot read properties of undefined (reading 'model')
at PluginFileManager.load (.../server.ts:71:29)
```

#### 问题原因

1. **废弃的 `importCollections()` 方法**：该方法已被废弃且实现为空，不会导入任何 collections
2. **`loadCollections()` 未被正确调用**：如果 `this.options.packageName` 没有设置，基类的 `loadCollections()` 会直接返回
3. **在 `load()` 中直接访问未定义的 collection**：如果 collection 没有导入，`getCollection()` 返回 `undefined`，访问 `.model` 会报错

#### 解决方案

**正确的迁移方式：**

1. **重写 `loadCollections()` 方法**，处理 `packageName` 未设置的情况：

```typescript
import fs from 'node:fs';
import path from 'node:path';

export class MyPlugin extends Plugin {
  async loadCollections() {
    // 如果 packageName 没有设置，使用 __dirname 手动导入
    if (!this.options.packageName) {
      const collectionsDir = path.resolve(__dirname, '../collections');
      try {
        if (fs.existsSync(collectionsDir)) {
          await this.db.import({
            directory: collectionsDir,
            from: this.options.packageName || this.getName(),
          });
          this.app.logger.debug(`Loaded collections from ${collectionsDir}`);
        } else {
          this.app.logger.warn(`Collections directory not found: ${collectionsDir}`);
        }
      } catch (error) {
        this.app.logger.error(`Failed to load collections from ${collectionsDir}`, error);
      }
      return;
    }
    // 如果 packageName 已设置，调用基类方法
    await super.loadCollections();
  }

  async load() {
    // 确保 collection 存在后再访问
    const collection = this.db.getCollection('myCollection');
    if (!collection) {
      this.app.logger.warn('Collection myCollection is not defined');
      return;
    }

    const Model = collection.model;
    // 现在可以安全地使用 Model
  }
}
```

2. **在访问 collection/model 之前添加空值检查**：

```typescript
// ❌ 错误方式
const Model = this.db.getModel('storages'); // 如果 collection 不存在，返回 undefined

// ✅ 正确方式
const collection = this.db.getCollection('storages');
if (!collection) {
  this.app.logger.warn('Collection storages is not defined');
  return;
}
const Model = collection.model;
```

#### 目录结构要求

确保 collections 文件位于正确的位置：
```
module-name/
  src/ (或 dist/)
    server/
      collections/
        myCollection.ts
        ...
      server.ts (或 Plugin.ts)
```

#### 已修复的插件示例

- ✅ `module-event-source` - 已修复
- ✅ `module-file` - 已修复
- ✅ `module-collection` - 已修复

---

## 常见错误

### 错误：`Cannot read properties of undefined (reading 'setApp')`

#### 错误信息

```
TypeError: Cannot read properties of undefined (reading 'setApp')
at CollectionManagerPlugin.load (.../server.ts:275:62)
```

#### 错误代码

```typescript
this.db.getRepository<CollectionRepository>('collections').setApp(this.app);
```

#### 问题原因

`getRepository('collections')` 返回了 `undefined`，说明 `collections` 这个 collection 还没有被定义。

**根本原因：**
- 在插件的 `load()` 方法中，尝试访问 `collections` collection 的 repository
- 但是 `collections` collection 可能还没有被定义（在 `loadCollections()` 中定义，或者在其他插件的 `loadCollections()` 中定义）
- 插件加载顺序：`beforeLoad()` → `loadCollections()` → `load()`

#### 解决方案

**方案 1：在 `loadCollections()` 中定义 collection（推荐）**

确保在 `load()` 方法调用之前，collection 已经被定义：

```typescript
class CollectionManagerPlugin extends Plugin {
  async loadCollections() {
    // 在这里定义 collections collection
    this.app.db.collection({
      name: 'collections',
      // ... 其他配置
    });
  }

  async load() {
    // 现在可以安全地访问 repository
    const repository = this.db.getRepository<CollectionRepository>('collections');
    if (repository) {
      repository.setApp(this.app);
    }
  }
}
```

**方案 2：添加空值检查**

在访问 repository 之前，先检查 collection 是否存在：

```typescript
async load() {
  const collection = this.db.getCollection('collections');
  if (!collection) {
    throw new Error('collections collection is not defined');
  }
  
  const repository = collection.repository as CollectionRepository;
  if (repository && typeof repository.setApp === 'function') {
    repository.setApp(this.app);
  }
}
```

**方案 3：使用可选链操作符**

```typescript
async load() {
  const repository = this.db.getRepository<CollectionRepository>('collections');
  repository?.setApp?.(this.app);
}
```

**方案 4：在 `beforeLoad()` 中定义 collection**

如果 collection 不依赖于其他插件，可以在 `beforeLoad()` 中定义：

```typescript
class CollectionManagerPlugin extends Plugin {
  async beforeLoad() {
    // 在 beforeLoad 中定义 collection
    this.app.db.collection({
      name: 'collections',
      // ... 其他配置
    });
  }

  async load() {
    // 现在可以安全地访问 repository
    const repository = this.db.getRepository<CollectionRepository>('collections');
    repository.setApp(this.app);
  }
}
```

#### 最佳实践

1. **在 `loadCollections()` 中定义 collections**
   - 这是标准的做法，符合插件的生命周期
   - 确保 collection 在 `load()` 之前被定义

2. **添加空值检查**
   - 即使 collection 应该在 `loadCollections()` 中定义，也应该添加检查
   - 防止因为插件加载顺序问题导致的错误

3. **使用类型守卫**
   ```typescript
   const repository = this.db.getRepository<CollectionRepository>('collections');
   if (repository instanceof CollectionRepository) {
     repository.setApp(this.app);
   }
   ```

#### 相关代码位置

- 插件加载顺序：`packages/core/src/plugin-manager/plugin-manager.ts:469-470`
- `getRepository` 实现：`packages/database/src/database.ts:626-632`
- `loadCollections` 方法：`packages/core/src/plugin.ts:215-226`

