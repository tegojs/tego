import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 查找指定路径下的所有文件夹名称，并获取其中的 package.json 文件
async function checkFoldersAndPackageJson(dirs, mainVersion) {
  const result = [];

  // 遍历多个目录
  for (const dirPath of dirs) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const folderPath = path.join(dirPath, entry.name); // 获取文件夹的完整路径
          const packageJsonPath = path.join(folderPath, 'package.json');

          // 检查是否有 package.json 文件
          try {
            await fs.stat(packageJsonPath); // 试图读取 package.json

            // 读取并解析 package.json
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent); // 使用 JSON.parse 解析

            if (packageJson && packageJson) {
              const packageName = packageJson.name;
              const version = packageJson.version;
              if (mainVersion !== version) {
                result.push({
                  packageJsonPath: packageJsonPath,
                  suggestion: `${packageName} 不一致的版本 ${mainVersion} -> ${version}`,
                });
              }
            }
          } catch (err) {
            // 如果没有 package.json 文件，忽略
          }
        }
      }
    } catch (err) {
      console.error(`读取目录 ${dirPath} 失败:`, err);
    }
  }

  return result;
}

// 需要检查的多个目录
const dirs = [
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../packages'),
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../apps'),
];

const mainPackagePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../package.json'); // 新增目录

const content = await fs.readFile(mainPackagePath, 'utf-8');

const mainPackageJson = JSON.parse(content);
const mainVersion = mainPackageJson.version;

checkFoldersAndPackageJson(dirs, mainVersion).then((folders) => {
  if (folders.length > 0) {
    console.log('检查结果：');
    folders.forEach((item) => {
      console.log(`${item.packageJsonPath}: ${item.suggestion}`);
    });
  } else {
    console.log('所有文件夹的名称与 package.json 中的 name 字段一致。');
  }
});
