# Tego-Standard 命令迁移脚本
# 用途：将 package.json 中的 tachybase 命令迁移到 tego/tegod
# 使用方法：在 tego-standard 目录下执行 .\migrate-tego-standard-commands.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tego-Standard 命令迁移脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在正确的目录
if (-not (Test-Path "package.json")) {
    Write-Host "错误: 未找到 package.json 文件" -ForegroundColor Red
    Write-Host "请确保在 tego-standard 根目录下执行此脚本" -ForegroundColor Red
    exit 1
}

# 备份 package.json
$backupFile = "package.json.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item "package.json" $backupFile
Write-Host "✓ 已备份 package.json 到: $backupFile" -ForegroundColor Green

# 读取 package.json
try {
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
} catch {
    Write-Host "错误: 无法解析 package.json" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "✓ 已读取 package.json" -ForegroundColor Green
Write-Host ""

# 定义命令映射规则
$migrations = @()

# 开发命令 → tegod
$devCommands = @('build', 'clean', 'dev', 'e2e', 'postinstall', 'pm', 'test')
foreach ($cmd in $devCommands) {
    $migrations += @{
        Pattern = "tachybase $cmd"
        Replacement = "tegod $cmd"
        Type = "开发命令"
    }
    $migrations += @{
        Pattern = "tachybase $cmd "
        Replacement = "tegod $cmd "
        Type = "开发命令"
    }
}

# 特殊命令处理
$migrations += @{
    Pattern = "tachybase test:client"
    Replacement = "tegod test:client"
    Type = "开发命令"
}
$migrations += @{
    Pattern = "tachybase test:server"
    Replacement = "tegod test:server"
    Type = "开发命令"
}

# 运行时命令 → tego
$runtimeCommands = @('install', 'upgrade')
foreach ($cmd in $runtimeCommands) {
    $migrations += @{
        Pattern = "tachybase $cmd"
        Replacement = "tego $cmd"
        Type = "运行时命令"
    }
}

# 更新脚本
$updatedCount = 0
foreach ($script in $packageJson.scripts.PSObject.Properties) {
    $originalValue = $script.Value
    $newValue = $originalValue
    
    foreach ($migration in $migrations) {
        if ($newValue -match [regex]::Escape($migration.Pattern)) {
            $newValue = $newValue -replace [regex]::Escape($migration.Pattern), $migration.Replacement
        }
    }
    
    if ($newValue -ne $originalValue) {
        $script.Value = $newValue
        Write-Host "  ✓ 更新: $($script.Name)" -ForegroundColor Yellow
        Write-Host "    旧: $originalValue" -ForegroundColor Gray
        Write-Host "    新: $newValue" -ForegroundColor Gray
        $updatedCount++
    }
}

# 更新别名脚本
Write-Host ""
Write-Host "更新别名脚本..." -ForegroundColor Cyan

# 移除或更新 tachybase 别名
if ($packageJson.scripts.tachybase) {
    $packageJson.scripts.PSObject.Properties.Remove('tachybase')
    Write-Host "  ✓ 移除: tachybase 别名" -ForegroundColor Yellow
    $updatedCount++
}

# 更新 tb 别名
if ($packageJson.scripts.tb) {
    if ($packageJson.scripts.tb -eq "tachybase") {
        $packageJson.scripts.tb = "tegod"
        Write-Host "  ✓ 更新: tb = tegod" -ForegroundColor Yellow
        $updatedCount++
    }
}

# 更新 tbi 别名 (tachybase install → tego install)
if ($packageJson.scripts.tbi) {
    if ($packageJson.scripts.tbi -match "tachybase install") {
        $packageJson.scripts.tbi = "tego install"
        Write-Host "  ✓ 更新: tbi = tego install" -ForegroundColor Yellow
        $updatedCount++
    }
}

# 更新 tbu 别名 (tachybase upgrade → tego upgrade)
if ($packageJson.scripts.tbu) {
    if ($packageJson.scripts.tbu -match "tachybase upgrade") {
        $packageJson.scripts.tbu = "tego upgrade"
        Write-Host "  ✓ 更新: tbu = tego upgrade" -ForegroundColor Yellow
        $updatedCount++
    }
}

# 更新 tc 别名 (tachybase test:client → tegod test:client)
if ($packageJson.scripts.tc) {
    if ($packageJson.scripts.tc -match "tachybase test:client") {
        $packageJson.scripts.tc = "tegod test:client"
        Write-Host "  ✓ 更新: tc = tegod test:client" -ForegroundColor Yellow
        $updatedCount++
    }
}

# 更新 ts 别名 (tachybase test:server → tegod test:server)
if ($packageJson.scripts.ts) {
    if ($packageJson.scripts.ts -match "tachybase test:server") {
        $packageJson.scripts.ts = "tegod test:server"
        Write-Host "  ✓ 更新: ts = tegod test:server" -ForegroundColor Yellow
        $updatedCount++
    }
}

# 确保有 tegod 别名
if (-not $packageJson.scripts.tegod) {
    $packageJson.scripts | Add-Member -MemberType NoteProperty -Name "tegod" -Value "tegod" -Force
    Write-Host "  ✓ 添加: tegod 别名" -ForegroundColor Yellow
    $updatedCount++
}

# 保存文件
try {
    $jsonContent = $packageJson | ConvertTo-Json -Depth 10
    # 修复 JSON 格式（确保 scripts 对象正确格式化）
    $jsonContent = $jsonContent -replace '"\s*:\s*"', '": "'
    $jsonContent | Set-Content "package.json" -Encoding UTF8
    Write-Host ""
    Write-Host "✓ 已保存更新后的 package.json" -ForegroundColor Green
} catch {
    Write-Host "错误: 无法保存 package.json" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "正在恢复备份..." -ForegroundColor Yellow
    Copy-Item $backupFile "package.json" -Force
    exit 1
}

# 总结
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "迁移完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "共更新 $updatedCount 个脚本" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作：" -ForegroundColor Cyan
Write-Host "1. 检查 package.json 中的更改" -ForegroundColor White
Write-Host "2. 测试关键命令：" -ForegroundColor White
Write-Host "   - pnpm tegod build" -ForegroundColor Gray
Write-Host "   - pnpm tegod dev" -ForegroundColor Gray
Write-Host "   - pnpm tego start" -ForegroundColor Gray
Write-Host "3. 如果出现问题，可以恢复备份：" -ForegroundColor White
Write-Host "   Copy-Item $backupFile package.json" -ForegroundColor Gray
Write-Host ""

