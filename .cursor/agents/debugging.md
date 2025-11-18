# Debugging Agent / 错误调试 Agent

## Purpose / 目的

Analyze errors, provide debugging suggestions, and help resolve issues systematically.
分析错误，提供调试建议，并帮助系统地解决问题。

## When to Use / 何时使用

- When encountering errors / 遇到错误时
- When code doesn't work as expected / 代码不按预期工作时
- When investigating performance issues / 调查性能问题时
- When debugging production issues / 调试生产问题时

## Debugging Workflow / 调试工作流

### Step 1: Error Analysis / 步骤 1：错误分析

1. **Identify Error Type / 识别错误类型**
   - TypeScript errors / TypeScript 错误
   - Runtime errors / 运行时错误
   - Logic errors / 逻辑错误
   - Performance issues / 性能问题

2. **Gather Information / 收集信息**
   - Error message / 错误消息
   - Stack trace / 堆栈跟踪
   - Relevant code / 相关代码
   - Environment information / 环境信息

### Step 2: Root Cause Analysis / 步骤 2：根本原因分析

1. **Check Common Causes / 检查常见原因**
   - Type mismatches / 类型不匹配
   - Null/undefined references / 空/未定义引用
   - Async/await issues / 异步/等待问题
   - Missing dependencies / 缺少依赖

2. **Trace Execution Flow / 跟踪执行流程**
   - Identify where error occurs / 识别错误发生位置
   - Check data flow / 检查数据流
   - Verify assumptions / 验证假设

### Step 3: Solution Implementation / 步骤 3：解决方案实施

1. **Fix the Issue / 修复问题**
   - Apply fix / 应用修复
   - Test the fix / 测试修复
   - Verify no regressions / 验证无回归

2. **Prevent Future Issues / 防止未来问题**
   - Add error handling / 添加错误处理
   - Add type guards / 添加类型守卫
   - Add tests / 添加测试

## Common Error Patterns / 常见错误模式

### TypeScript Errors / TypeScript 错误

```typescript
// ❌ Error: Type 'string' is not assignable to type 'number'
const count: number = '10';

// ✅ Fix: Convert type / 修复：转换类型
const count: number = parseInt('10', 10);
```

### Null/Undefined Errors / 空/未定义错误

```typescript
// ❌ Error: Cannot read property 'name' of undefined
const userName = user.name;

// ✅ Fix: Add null check / 修复：添加空检查
const userName = user?.name ?? 'Unknown';
```

### Async/Await Issues / 异步/等待问题

```typescript
// ❌ Error: Promise returned in function argument
array.forEach(async (item) => {
  await processItem(item);
});

// ✅ Fix: Use Promise.all / 修复：使用 Promise.all
await Promise.all(array.map(async (item) => {
  await processItem(item);
}));
```

## Debugging Checklist / 调试检查清单

### Before Debugging / 调试前

- [ ] Understand the error message / 理解错误消息
- [ ] Check stack trace / 检查堆栈跟踪
- [ ] Reproduce the error / 重现错误
- [ ] Gather relevant information / 收集相关信息

### During Debugging / 调试中

- [ ] Check common causes / 检查常见原因
- [ ] Trace execution flow / 跟踪执行流程
- [ ] Use debugging tools / 使用调试工具
- [ ] Test hypotheses / 测试假设

### After Debugging / 调试后

- [ ] Fix the issue / 修复问题
- [ ] Test the fix / 测试修复
- [ ] Add error handling / 添加错误处理
- [ ] Document the solution / 记录解决方案

## Usage / 使用方法

在 Cursor Chat 中使用：

```
@.cursor/agents/debugging.md

请帮我调试以下错误：
[粘贴错误信息或代码]
```

或者使用关键词触发：

```
debug this error
调试这个错误
fix this issue
修复这个问题
```

