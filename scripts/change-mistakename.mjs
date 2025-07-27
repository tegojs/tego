import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 查找指定路径下的所有文件夹名称，并获取其中的 package.json 文件
async function findFoldersAndPackageJson(dirs) {
    const result = [];

    // 遍历多个目录
    for (const dirPath of dirs) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const folderPath = path.join(dirPath, entry.name);  // 获取文件夹的完整路径
                    const packageJsonPath = path.join(folderPath, 'package.json');

                    // 检查是否有 package.json 文件
                    try {
                        await fs.stat(packageJsonPath); // 试图读取 package.json

                        // 读取并解析 package.json
                        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
                        const packageJson = JSON.parse(packageJsonContent); // 使用 JSON.parse 解析

                        if (packageJson && packageJson.name) {
                            const packageName = packageJson.name;
                            const folderName = entry.name;

                            // 分隔 packageName，提取最后一部分（包名）
                            const nameParts = packageName.split('/');
                            const actualPackageName = nameParts[nameParts.length - 1]; // 获取最后一部分作为包名

                            // 如果 name 字段包含前缀且包名与文件夹名一致，保持不变
                            if (actualPackageName === folderName) {
                                continue; // 不做修改，跳过
                            } else {
                                // 如果没有前缀或包名不一致，则修改为正确的包名
                                const newName = nameParts.length === 1 ? folderName : `${nameParts[0]}/${folderName}`;

                                packageJson.name = newName;

                                // 写回 package.json 文件
                                await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
                                result.push({
                                    packageJsonPath: packageJsonPath,
                                    change: `修改 package.json 中的 name 为：${newName}`,
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
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../apps') // 新增目录
];

findFoldersAndPackageJson(dirs).then((folders) => {
    if (folders.length > 0) {
        console.log('检查结果：');
        folders.forEach(item => {
            console.log(`${item.packageJsonPath}: ${item.change}`);
        });
    } else {
        console.log('所有文件夹的名称与 package.json 中的 name 字段一致。');
    }
});
