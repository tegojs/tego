import path from 'node:path';

import fg from 'fast-glob';
import fs from 'fs-extra';
import ts from 'typescript';

import { globExcludeFiles, ROOT_PATH } from './constant';
import { PkgLog } from './utils';

export const buildDeclaration = (cwd: string, targetDir: string, log: PkgLog) => {
  return new Promise<{ exitCode: 1 | 0; messages: string[] }>((resolve, reject) => {
    log('build declaration');
    const localTsConfigPath = path.join(cwd, 'tsconfig.json');

    // 读取 tsconfig.json 文件路径
    const configPath = fs.existsSync(localTsConfigPath) ? localTsConfigPath : path.join(ROOT_PATH, 'tsconfig.json');

    // 读取并解析 tsconfig.json
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

    if (configFile.error) {
      const message = ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n');
      return reject(`Error reading tsconfig.json: ${message}`);
    }

    // 解析 tsconfig.json 配置
    const parsedCommandLine = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
    parsedCommandLine.options.paths = {};

    // 更新编译选项，设置输出目录为 lib，启用声明文件生成
    parsedCommandLine.options.outDir = path.join(cwd, targetDir);

    parsedCommandLine.fileNames = fg.globSync(['src/**/*.{ts,tsx}', ...globExcludeFiles], { cwd, absolute: true });
    parsedCommandLine.options.rootDir = path.join(cwd, 'src');

    // 编译
    const program = ts.createProgram(parsedCommandLine.fileNames, parsedCommandLine.options);
    const emitResult = program.emit();

    // 处理编译错误
    const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    const messages: any[] = [];
    allDiagnostics.forEach((diagnostic) => {
      if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        messages.push(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        console.error(`${diagnostic.file.fileName}(${line + 1},${character + 1}): ${message}`);
      } else {
        messages.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      }
    });

    const exitCode = emitResult.emitSkipped ? 1 : 0;
    if (messages.length > 0) {
      reject(messages.join('\n'));
    }
    resolve({ exitCode, messages });
  });
};
