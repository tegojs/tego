# Documentation Agent / 文档生成 Agent

## Purpose / 目的

Automatically generate comprehensive documentation for code, APIs, and features.
自动为代码、API 和功能生成全面的文档。

## When to Use / 何时使用

- After completing a feature / 完成功能后
- When updating APIs / 更新 API 时
- When creating new modules/plugins / 创建新模块/插件时
- Before code review / 代码审查前

## Documentation Types / 文档类型

### 1. API Documentation / API 文档

**Generate / 生成**:
- Endpoint descriptions / 端点描述
- Request/response schemas / 请求/响应模式
- Example requests / 示例请求
- Error responses / 错误响应

**Example / 示例**:

```markdown
## POST /api/users

Creates a new user.

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "data": {
    "id": "number",
    "name": "string",
    "email": "string"
  }
}
```

**Errors:**
- 400: Invalid input
- 409: Email already exists
```

### 2. Code Comments / 代码注释

**Generate / 生成**:
- Function documentation / 函数文档
- Class documentation / 类文档
- Complex logic explanations / 复杂逻辑说明

**Example / 示例**:

```typescript
/**
 * Creates a new user with hashed password
 * 
 * @param userData - User data including name, email, and password
 * @returns Created user object without password
 * @throws Error if email already exists
 */
async function createUser(userData: CreateUserInput): Promise<User> {
  // Implementation
}
```

### 3. README Documentation / README 文档

**Generate / 生成**:
- Feature overview / 功能概述
- Installation instructions / 安装说明
- Usage examples / 使用示例
- Configuration options / 配置选项

## Documentation Checklist / 文档检查清单

### API Documentation / API 文档

- [ ] All endpoints documented / 所有端点已文档化
- [ ] Request/response schemas included / 包含请求/响应模式
- [ ] Example requests provided / 提供示例请求
- [ ] Error responses documented / 错误响应已文档化

### Code Documentation / 代码文档

- [ ] Public functions documented / 公共函数已文档化
- [ ] Complex logic explained / 复杂逻辑已解释
- [ ] Type definitions documented / 类型定义已文档化
- [ ] Examples provided / 提供示例

### README Documentation / README 文档

- [ ] Feature overview / 功能概述
- [ ] Installation instructions / 安装说明
- [ ] Usage examples / 使用示例
- [ ] Configuration options / 配置选项

## Usage / 使用方法

在 Cursor Chat 中使用：

```
@.cursor/agents/documentation.md

请为以下代码生成文档：
[粘贴代码或文件路径]
```

或者使用关键词触发：

```
generate documentation
生成文档
document this code
为这段代码生成文档
```

## Documentation Standards / 文档标准

### Code Comments / 代码注释

- Use JSDoc format / 使用 JSDoc 格式
- Include parameter descriptions / 包含参数描述
- Include return value descriptions / 包含返回值描述
- Include error conditions / 包含错误条件

### API Documentation / API 文档

- Use OpenAPI/Swagger format / 使用 OpenAPI/Swagger 格式
- Include request/response examples / 包含请求/响应示例
- Document all error codes / 文档化所有错误代码

### README Documentation / README 文档

- Clear structure / 清晰的结构
- Code examples / 代码示例
- Links to related documentation / 相关文档链接

