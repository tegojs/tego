# 插件生命周期与 Collections 管理

## 插件生命周期顺序

新版本核心的插件生命周期顺序如下：

```
1. 第一轮循环：所有插件的 beforeLoad()
   for (const plugin of plugins) {
     await plugin.beforeLoad();
   }

2. 第二轮循环：每个插件依次执行
   for (const plugin of plugins) {
     await plugin.beforeLoadPlugin();  // 事件
     await plugin.loadCollections();   // ✅ 在 load() 之前调用
     await plugin.load();              // 在这里需要使用 collections
     await plugin.afterLoadPlugin();   // 事件
   }
```

## 问题

基类的 `loadCollections()` 方法只在 `this.options.packageName` 存在时才会导入 collections：

```typescript
async loadCollections() {
  if (!this.options.packageName) {
    return;  // ❌ 如果 packageName 不存在，直接返回，不会导入任何 collections
  }
  const directory = resolve(resolveRequest(this.options.packageName), '../../server/collections');
  if (await fsExists(directory)) {
    await this.db.import({
      directory,
      from: this.options.packageName,
    });
  }
}
```

这导致在 `load()` 方法中访问 collections 时会报错：`Collection XXX is not defined`。

## 解决方案

### 方案 1：在 `loadCollections()` 中手动导入（推荐）

如果 `packageName` 不存在，在 `loadCollections()` 中手动导入 collections：

```typescript
import fs from 'node:fs';
import path from 'node:path';

export class MyPlugin extends Plugin {
  async loadCollections() {
    // 如果 packageName 没有设置，使用 __dirname 手动导入
    if (!this.options.packageName) {
      const collectionsDir = path.resolve(__dirname, './collections');
      if (fs.existsSync(collectionsDir)) {
        await this.db.import({
          directory: collectionsDir,
          from: this.options.packageName || this.getName(),
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
    // 使用 collection...
  }
}
```

### 方案 2：在 `beforeLoad()` 中直接定义（适用于核心 collections）

对于核心 collections（如 `collections`、`fields`、`storages`），如果它们需要在 `beforeLoad()` 中被使用（例如监听事件），应该在 `beforeLoad()` 中直接定义：

```typescript
import collectionsCollection from './collections/collections';
import fieldsCollection from './collections/fields';

export class CollectionManagerPlugin extends Plugin {
  async beforeLoad() {
    // 定义核心 collections（必须在 beforeLoad 中定义，因为 beforeLoad 中需要监听事件）
    // 注意：collections 必须在 fields 之前定义，因为 fields 有 belongsTo 关联指向 collections
    this.db.collection(collectionsCollection);
    this.db.collection(fieldsCollection);
    
    // 监听 collections 事件
    this.app.db.on('collections.beforeCreate', async (model) => {
      // ...
    });
  }

  async loadCollections() {
    // 导入其他 collections（如果 packageName 存在，基类会自动导入）
    await super.loadCollections();
  }

  async load() {
    // 现在可以安全地访问 collections
    const repository = this.db.getRepository('collections');
    // ...
  }
}
```

### 方案 3：在 `load()` 中添加空值检查（防御性编程）

即使 collections 应该在 `loadCollections()` 中被导入，也应该在 `load()` 中添加空值检查：

```typescript
async load() {
  const collection = this.db.getCollection('myCollection');
  if (!collection) {
    this.app.logger.warn('Collection myCollection is not defined');
    return;
  }
  
  const Model = collection.model;
  // 使用 Model...
}
```

## 最佳实践

1. **核心 collections**（需要在 `beforeLoad()` 中使用或监听事件）：在 `beforeLoad()` 中直接定义
2. **普通 collections**（只在 `load()` 中使用）：
   - 如果 `packageName` 存在：依赖基类的 `loadCollections()` 自动导入
   - 如果 `packageName` 不存在：在 `loadCollections()` 中手动导入
3. **在 `load()` 中访问 collections 时**：始终添加空值检查

## 示例：module-collection 的正确做法

```typescript
import collectionsCollection from './collections/collections';
import fieldsCollection from './collections/fields';
import collectionCategoriesCollection from './collections/collectionCategories';

export class CollectionManagerPlugin extends Plugin {
  async beforeLoad() {
    // 核心 collections 必须在 beforeLoad 中定义
    // 注意顺序：collections 必须在 fields 之前，因为 fields 有 belongsTo 指向 collections
    this.db.collection(collectionsCollection);
    this.db.collection(fieldsCollection);
    this.db.collection(collectionCategoriesCollection);
    
    // 监听 collections 事件
    this.app.db.on('collections.beforeCreate', async (model) => {
      // ...
    });
  }

  async loadCollections() {
    // 如果 packageName 存在，基类会自动导入其他 collections
    // 如果不存在，可以在这里手动导入
    await super.loadCollections();
  }

  async load() {
    // 现在可以安全地访问 collections
    const repository = this.db.getRepository('collections');
    if (repository) {
      repository.setApp(this.app);
    }
  }
}
```

## 总结

- ✅ `loadCollections()` 确实在 `load()` 之前调用
- ✅ 如果 `packageName` 存在，基类的 `loadCollections()` 会自动导入 collections
- ✅ 如果 `packageName` 不存在，需要在 `loadCollections()` 中手动导入
- ✅ 核心 collections 应该在 `beforeLoad()` 中直接定义
- ✅ 在 `load()` 中访问 collections 时，始终添加空值检查

