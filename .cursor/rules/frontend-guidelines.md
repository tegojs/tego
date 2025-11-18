# Frontend Development Guidelines / 前端开发指南

## Purpose / 目的

Establish consistent frontend development patterns and best practices for Tego core framework.

为 Tego 核心框架建立一致的前端开发模式和最佳实践。

## When to Use This Guide / 何时使用此指南

Automatically activated in the following situations:
在以下情况下自动激活：

- Creating or modifying React components / 创建或修改 React 组件
- Building component library / 构建组件库
- Implementing schema components / 实现 Schema 组件
- TypeScript type definitions / TypeScript 类型定义
- Frontend testing / 前端测试

---

## Quick Start / 快速开始

### New Component Checklist / 新组件清单

- [ ] **Component Structure / 组件结构**：Clear component hierarchy / 清晰的组件层次
- [ ] **Type Definitions / 类型定义**：Complete TypeScript types / 完整的 TypeScript 类型
- [ ] **Props Interface / Props 接口**：Well-defined props / 定义良好的 props
- [ ] **Styling / 样式**：Consistent styling approach / 一致的样式方案
- [ ] **Testing / 测试**：Component tests / 组件测试

---

## Component Patterns / 组件模式

### Functional Components / 函数组件

```typescript
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary' 
}) => {
  return (
    <button 
      className={`btn btn-${variant}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### Schema Components / Schema 组件

```typescript
import { SchemaComponent } from '@tego/components';

const schema = {
  type: 'void',
  'x-component': 'Card',
  properties: {
    title: {
      type: 'string',
      'x-component': 'Input',
    },
  },
};

<SchemaComponent schema={schema} />
```

---

## Package Structure / 包结构

### Components Package / 组件包结构

```
packages/components/src/
├── index.ts            # Main exports / 主导出
├── Button/             # Component directory / 组件目录
│   ├── index.tsx
│   ├── Button.tsx
│   └── Button.types.ts
└── SchemaComponent/    # Schema component / Schema 组件
    └── index.tsx
```

---

## Best Practices / 最佳实践

1. **Component Single Responsibility / 组件单一职责**：Each component does one thing / 每个组件只做一件事
2. **Type Safety / 类型安全**：Fully utilize TypeScript / 充分利用 TypeScript
3. **Reusability / 可复用性**：Design components for reuse / 设计可复用的组件
4. **Performance / 性能**：Optimize rendering when needed / 需要时优化渲染
5. **Test Coverage / 测试覆盖**：Write tests for components / 为组件编写测试

