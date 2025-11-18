# Tego Cursor Rules Index / 项目 Cursor 规则索引

This is the main rule configuration file for the Tego project, used to centrally manage and reference all project rules.

这是 Tego 项目的主规则配置文件，用于统一管理和引用所有项目规则。

## Language Support / 语言支持

**This project supports bilingual documentation (English and Chinese) for international collaboration.**

**本项目支持双语文档（英语和中文），便于国际协作。**

All rule files contain both English and Chinese content side by side for easy understanding by team members from different regions.

所有规则文件都包含并排的英文和中文内容，方便来自不同地区的团队成员理解。

## Rule File Structure / 规则文件结构

This project uses a modular rule file structure, with each file focusing on a specific topic:

本项目使用模块化的规则文件结构，每个文件专注于特定的主题：

- **Project Configuration / 项目配置** (`project.md`) - Project overview, tech stack, package management
  项目概述、技术栈、包管理规范
- **Code Style / 代码风格** (`code-style.md`) - TypeScript, React components, file naming conventions
  TypeScript、React 组件、文件命名等代码规范
- **Development Guide / 开发指南** (`development.md`) - Development workflow, commit conventions, testing, common commands
  开发流程、提交规范、测试、常用命令
- **AI Assistant / AI 辅助** (`ai-assistant.md`) - AI-assisted development suggestions and guidelines
  AI 辅助开发的建议和指南
- **Lint Check / Lint 检查** (`lint-check.md`) - Mandatory lint error checking rules after code modifications
  代码修改后必须的 lint 错误检查规则
- **Quick Reference / 快速参考** (`quick-reference.md`) - Quick reference for common tasks and patterns
  常用任务和模式的快速参考

## Reference All Rules / 引用所有规则

The following rule files will be automatically loaded and applied:

以下规则文件会被自动加载和应用：

@file project.md
@file code-style.md
@file development.md
@file ai-assistant.md
@file lint-check.md
@file quick-reference.md

## Usage Instructions / 使用说明

1. **Auto-loading / 自动加载**: Cursor automatically reads all `.md` files in the `.cursor/rules/` directory.
   Cursor 会自动读取 `.cursor/rules/` 目录下的所有 `.md` 文件
2. **Priority / 优先级**: `index.md` serves as the main entry point, referencing other rules via `@file` syntax.
   `index.md` 作为主入口，通过 `@file` 语法引用其他规则
3. **Update Rules / 更新规则**: After modifying corresponding rule files, Cursor will automatically apply the new rules.
   修改对应的规则文件后，Cursor 会自动应用新的规则

## Configuration Version / 配置版本

- **Created / 创建时间**: 2025-01-27
- **Cursor Version / Cursor 版本**: Supports `.cursor/rules/` directory structure
  支持 `.cursor/rules/` 目录结构
- **Project Version / 项目版本**: 1.3.52

## Related Configuration / 相关配置

- **CLI Config / CLI 配置**: `.cursor/cli.json` - CLI permissions and command configuration
  CLI 权限和命令配置
- **Ignore File / 忽略文件**: `.cursorignore` - Files and directories ignored by AI indexing
  AI 索引忽略的文件和目录

