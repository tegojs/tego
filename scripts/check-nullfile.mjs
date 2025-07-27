import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkbox, Separator, confirm } from '@inquirer/prompts';

// 查找指定路径下的所有文件夹名称，并获取其中的 package.json 文件
async function checkFoldersAndPackageJson(dirs) {
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
                    } catch (err) {
                        // 如果没有 package.json 文件，记录缺失的文件夹
                        result.push({
                            folderName: entry.name,
                            folderPath: folderPath,
                        });
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

checkFoldersAndPackageJson(dirs).then(async (folders) => {
    if (folders.length === 0) {
        console.log('所有文件夹都包含 package.json 文件');
        return;  // 如果没有缺少 package.json 的文件夹，直接返回
    }

    console.log('缺少 package.json 的文件夹：');

    // 使用 Inquirer.js 交互式显示选择文件夹
    const answers = await checkbox({
        message: '请选择需要删除的文件夹（默认全选）:',
        choices: folders.map(item => ({
            name: item.folderName,  // 显示的名称
            value: item.folderPath,
            checked: true
        })),
    });

    if (answers.length === 0) {
        console.log('没有选择任何文件夹');
        return;  // 如果没有选择任何文件夹，直接返回
    }

    // 输出选择的文件夹
    console.log('选择的文件夹:');
    answers.forEach(folderPath => {
        console.log(`- ${folderPath}`);
    });

    // 添加确认提示
    const confirmDelete = await confirm({
        message: `你确定要删除这些文件夹吗？（选中的文件夹会被永久删除）`
    });

    if (!confirmDelete) {
        console.log('删除操作已取消');
        return;  // 如果用户取消删除，直接返回
    }

    // 删除选中的文件夹
    for (const folderPath of answers) {
        try {
            const resolvedPath = path.resolve(folderPath); // 确保路径是绝对路径
            await fs.rm(resolvedPath, { recursive: true, force: true });
            console.log(`文件夹已删除: ${resolvedPath}`);
        } catch (err) {
            console.error(`删除失败: ${folderPath}`, err);
        }
    }
});
