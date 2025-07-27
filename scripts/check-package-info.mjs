import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 查找指定路径下的所有文件夹名称，并获取其中的 package.json 文件
async function checkPackageJson(dirs) {
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

            if (packageJson) {
              const missingFields = [];
              // 检查是否缺少 keywords、description 和 displayName
              if (!packageJson.keywords) {
                missingFields.push('keywords');
              }
              if (!packageJson.description) {
                missingFields.push('description');
              }
              if (!packageJson.displayName) {
                missingFields.push('displayName');
              }
              if (!packageJson['description.zh-CN']) {
                missingFields.push('description.zh-CN');
              }
              if (!packageJson['displayName.zh-CN']) {
                missingFields.push('displayName.zh-CN');
              }

              // 如果缺少字段，记录结果
              if (missingFields.length > 0) {
                result.push({
                  packageJsonPath: packageJsonPath,
                  suggestion: `${missingFields.join(', ')} 缺少`,
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

checkPackageJson(dirs).then((folders) => {
  if (folders.length > 0) {
    console.log('检查结果：');
    folders.forEach((item) => {
      console.log(`${item.packageJsonPath}: ${item.suggestion}`);
    });
  } else {
    console.log('所有 package.json 都包含所需字段');
  }
});
