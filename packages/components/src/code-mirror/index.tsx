import React from 'react';
import { connect, mapReadPretty } from '@tachybase/schema';

import Editor, { loader, type Monaco } from '@monaco-editor/react';

loader.config({ paths: { vs: 'https://assets.tachybase.com/monaco-editor@0.52.0/min/vs' } });

// 在 Editor 挂载前配置 Monaco 语言服务
const handleBeforeMount = (monaco: Monaco) => {
  // 配置 JavaScript 语言服务支持 JSX
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    jsx: monaco.languages.typescript.JsxEmit.React,
    allowJs: true,
    allowNonTsExtensions: true,
  });

  // 配置 TypeScript 语言服务支持 JSX（如果使用 typescript 语言）
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    jsx: monaco.languages.typescript.JsxEmit.React,
    allowNonTsExtensions: true,
  });

  // 禁用某些可能导致 Worker 错误的诊断选项
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
};

export const CodeMirror = connect(
  ({ value, onChange, ...otherProps }) => {
    return (
      <Editor
        beforeMount={handleBeforeMount}
        options={{ readOnly: !!otherProps.disabled }}
        value={value}
        height="300px"
        defaultLanguage="javascript"
        onChange={onChange}
        {...otherProps}
      />
    );
  },
  mapReadPretty(({ value, onChange, ...otherProps }) => {
    if (value == null) {
      return null;
    }
    return (
      <Editor
        beforeMount={handleBeforeMount}
        options={{ readOnly: true }}
        value={value}
        height="300px"
        defaultLanguage="javascript"
        onChange={onChange}
        {...otherProps}
      />
    );
  }),
);

export const CodeEditor = CodeMirror;
