# Database Patterns and Best Practices / 数据库模式和最佳实践

## Purpose / 目的

Establish consistent database development patterns and best practices for Tego core framework.

为 Tego 核心框架建立一致的数据库开发模式和最佳实践。

## When to Use This Guide / 何时使用此指南

Automatically activated in the following situations:
在以下情况下自动激活：

- Creating or modifying database schemas / 创建或修改数据库模式
- Writing migrations / 编写迁移
- Defining collections / 定义集合
- Database queries and operations / 数据库查询和操作
- Performance optimization / 性能优化

---

## Collection Definition / 集合定义

### Basic Collection / 基本集合

```typescript
import { Database } from '@tachybase/database';

const db = new Database({
  // ...
});

db.defineCollection({
  name: 'users',
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'email', type: 'string', unique: true },
  ],
  indexes: [
    { fields: ['email'] },
  ],
});
```

### Collection with Relations / 带关系的集合

```typescript
db.defineCollection({
  name: 'posts',
  fields: [
    { name: 'title', type: 'string', required: true },
    { name: 'authorId', type: 'belongsTo', target: 'users' },
  ],
});
```

---

## Repository Pattern / 仓库模式

### Using Repository / 使用仓库

```typescript
const userRepository = db.getRepository('users');

// Find all / 查找所有
const users = await userRepository.find();

// Find one / 查找一个
const user = await userRepository.findOne({
  filterByTk: userId,
});

// Create / 创建
const newUser = await userRepository.create({
  values: {
    name: 'John',
    email: 'john@example.com',
  },
});

// Update / 更新
await userRepository.update({
  filterByTk: userId,
  values: {
    name: 'Jane',
  },
});

// Delete / 删除
await userRepository.destroy({
  filterByTk: userId,
});
```

---

## Performance Optimization / 性能优化

### Indexes / 索引

```typescript
db.defineCollection({
  name: 'users',
  fields: [
    { name: 'email', type: 'string' },
    { name: 'status', type: 'string' },
  ],
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['status'] },
    { fields: ['email', 'status'] },  // Composite index / 复合索引
  ],
});
```

### Query Optimization / 查询优化

1. **Use indexes / 使用索引**：Create indexes for frequently queried fields / 为频繁查询的字段创建索引
2. **Limit fields / 限制字段**：Only select needed fields / 只选择需要的字段
3. **Pagination / 分页**：Always use pagination for large datasets / 对大数据集始终使用分页

---

## Best Practices / 最佳实践

1. **Schema Design / 模式设计**：Design with scalability in mind / 设计时考虑可扩展性
2. **Data Integrity / 数据完整性**：Use constraints and validations / 使用约束和验证
3. **Performance / 性能**：Create indexes for frequently queried fields / 为频繁查询的字段创建索引
4. **Transactions / 事务**：Use transactions for related operations / 对相关操作使用事务

