# Lint Error Check Rules / Lint 错误检查规则

## Mandatory Rule / 必须规则

After modifying any code file, must use `read_lints` tool to check for lint errors.

每次修改代码文件后，必须使用 `read_lints` 工具检查 lint 错误。

## Check Workflow / 检查流程

1. Modify code files / 修改代码文件
2. **Immediately check lint errors** (using read_lints tool) / **立即检查 lint 错误**（使用 read_lints 工具）
3. If errors found, fix them immediately / 如果发现错误，立即修复
4. After fixing, check again to confirm no errors / 修复后再次检查，确认无错误
5. Confirm no errors before continuing other operations / 确认无错误后再继续其他操作

## Check Scope / 检查范围

- All modified files / 修改过的所有文件
- Especially TypeScript/JavaScript files (.ts, .tsx, .js, .jsx, .mjs) / 特别是 TypeScript/JavaScript 文件（.ts, .tsx, .js, .jsx, .mjs）
- Workflow configuration files (.yaml, .yml) / 工作流配置文件（.yaml, .yml）

## Example / 示例

After modifying files, should execute:
修改文件后应该执行：

```typescript
read_lints({ paths: ['modified/file/path'] })
read_lints({ paths: ['修改的文件路径'] })
```

## Code Completion Checklist / 代码完成检查清单

After completing any code modifications, you must perform the following checks:

每次完成代码修改后，必须执行以下检查：

### 1. Remove Unused Imports and Exports / 删除不必要的导入导出

- **Check all modified files** for unused imports and exports / **检查所有修改的文件**中未使用的导入和导出
- Remove any imports that are not used in the code / 删除代码中未使用的导入
- Remove any exports that are not referenced elsewhere / 删除在其他地方未引用的导出
- Use tools or manual review to identify unused code / 使用工具或手动审查来识别未使用的代码

**Example / 示例:**
```typescript
// ❌ Bad: Unused import / 不好的：未使用的导入
import { useState, useEffect, useMemo } from 'react'
// Only useState is used / 只使用了 useState

// ✅ Good: Only import what's needed / 好的：只导入需要的
import { useState } from 'react'
```

### 2. Synchronize All Translation Files / 同步所有翻译文件

When adding or modifying translation keys, you must:

当添加或修改翻译键时，必须：

- **Add the translation key to ALL language files** in the locale directory / **在所有语言文件中添加翻译键**
- Common language files include: `en-US.json`, `zh-CN.json`, `es-ES.json`, `fr-FR.json`, `ja-JP.json`, `ko_KR.json`, `pt-BR.json`, `ru-RU.json`, `tr-TR.json` / 常见语言文件包括：`en-US.json`, `zh-CN.json`, `es-ES.json`, `fr-FR.json`, `ja-JP.json`, `ko_KR.json`, `pt-BR.json`, `ru-RU.json`, `tr-TR.json`
- Ensure all translation keys are in the same order across all files / 确保所有文件中的翻译键顺序一致
- Use appropriate translations for each language / 为每种语言使用适当的翻译

**Workflow / 工作流程:**
1. Add/modify translation key in one language file (usually `en-US.json` or `zh-CN.json`) / 在一个语言文件中添加/修改翻译键（通常是 `en-US.json` 或 `zh-CN.json`）
2. **Immediately add the same key to all other language files** / **立即在所有其他语言文件中添加相同的键**
3. Provide appropriate translations for each language / 为每种语言提供适当的翻译
4. Verify JSON syntax is correct in all files / 验证所有文件的 JSON 语法正确

**Example / 示例:**
```json
// en-US.json
{
  "Failed to create execution": "Failed to create execution",
  "Test execution failed": "Test execution failed"
}

// zh-CN.json (must also add) / 必须也添加
{
  "Failed to create execution": "创建执行记录失败",
  "Test execution failed": "测试执行失败"
}

// es-ES.json (must also add) / 必须也添加
{
  "Failed to create execution": "Error al crear la ejecución",
  "Test execution failed": "Error en la ejecución de prueba"
}
// ... and so on for all language files / ... 对所有语言文件都如此
```

## Important Notes / 重要提示

- **Do not commit code with lint errors** / **不能提交有 lint 错误的代码**
- **Do not commit code with unused imports/exports** / **不能提交带有未使用导入/导出的代码**
- **Do not commit incomplete translations** / **不能提交不完整的翻译**
- Actively run lint checks after completing code modifications, don't wait for user reminders / 在完成代码修改后，应该主动运行 lint 检查，而不是等待用户提醒
- If lint errors are found, must fix them immediately, cannot ignore / 如果发现 lint 错误，必须立即修复，不能忽略
- Always check for unused imports/exports before completing code changes / 在完成代码更改之前，始终检查未使用的导入/导出
- Always synchronize translations across all language files / 始终在所有语言文件之间同步翻译

