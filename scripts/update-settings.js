const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// 配置路径
let PACKAGES_DIR = path.resolve(__dirname, '../../tego-standard/packages');
const SETTINGS_PATH = path.resolve(__dirname, '../packages/tego/presets/settings.js');
const ENV_EXAMPLE_PATH = path.resolve(__dirname, '../../tego-standard/.env.example');

// 需要排除的插件列表
const EXCLUDE_PLUGINS = [
  'action-share',
  'devkit',
  'evaluator-mathjs',
  'mock-collections',
  'print-template',
  'wechat-official-account',
  'workflow-test',
];

// 特殊处理：这些 module- 开头的文件夹视为 plugin
const MODULE_AS_PLUGIN = ['instrumentation', 'hera', 'multi-app'];

// 日志函数
function log(message, level = 'info') {
  const configs = {
    info: { prefix: '[INFO]', color: colors.cyan },
    warn: { prefix: '[WARN]', color: colors.yellow },
    error: { prefix: '[ERRO]', color: colors.red },
    success: { prefix: '[SUCC]', color: colors.green },
  };

  const config = configs[level] || configs.info;
  console.log(`${config.color}${config.prefix}${colors.reset} ${message}`);
}

// 提示用户输入目录
function promptForDirectory() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(
      `\n${colors.yellow}Failed to auto discovery tego-standard directory, please enter it manually:${colors.reset}`,
    );

    rl.question('> ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// 验证并获取 packages 目录
async function getPackagesDirectory() {
  // 首先尝试默认路径
  if (fs.existsSync(PACKAGES_DIR)) {
    log(`Using packages directory: ${PACKAGES_DIR}`, 'info');
    return PACKAGES_DIR;
  }

  log(`Default packages directory not found: ${PACKAGES_DIR}`, 'warn');
  log('Please provide the tego-standard directory path', 'warn');

  while (true) {
    const userInput = await promptForDirectory();

    if (!userInput) {
      log('No path provided, exiting...', 'error');
      process.exit(1);
    }

    // 检查用户输入的路径
    let tegoStandardPath = userInput;
    let packagesPath = path.join(tegoStandardPath, 'packages');

    // 如果用户输入的已经是 packages 目录
    if (tegoStandardPath.endsWith('packages')) {
      packagesPath = tegoStandardPath;
    }

    if (fs.existsSync(packagesPath)) {
      log(`Found packages directory: ${packagesPath}`, 'success');
      PACKAGES_DIR = packagesPath;
      return packagesPath;
    } else {
      log(`Directory not found: ${packagesPath}`, 'error');
      log('Please check the path and try again', 'warn');
    }
  }
}

// 读取 .env.example 获取内置插件列表
function readBuiltinPlugins() {
  log('Reading builtin plugins from .env.example...');

  if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
    log(`Warning: .env.example not found at ${ENV_EXAMPLE_PATH}`, 'warn');
    log('Using empty builtin plugins list', 'warn');
    return [];
  }

  try {
    const content = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
    const match = content.match(/PRESETS_BULTIN_PLUGINS=([^\n]+)/);

    if (!match) {
      log('Warning: PRESETS_BULTIN_PLUGINS not found in .env.example', 'warn');
      return [];
    }

    const pluginsStr = match[1].trim();
    const plugins = pluginsStr
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p);

    log(`Found ${plugins.length} builtin plugins`, 'success');
    return plugins;
  } catch (error) {
    log(`Error reading .env.example: ${error.message}`, 'error');
    return [];
  }
}

// 读取 .env.example 获取外部插件列表
function readExternalPlugins() {
  log('Reading external plugins from .env.example...');

  if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
    log(`Warning: .env.example not found at ${ENV_EXAMPLE_PATH}`, 'warn');
    return { enabled: [], disabled: [] };
  }

  try {
    const content = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
    const match = content.match(/PRESETS_EXTERNAL_PLUGINS=([^\n]+)/);

    if (!match) {
      log('Warning: PRESETS_EXTERNAL_PLUGINS not found in .env.example', 'warn');
      return { enabled: [], disabled: [] };
    }

    const pluginsStr = match[1].trim();
    const pluginItems = pluginsStr
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p);

    const enabled = [];
    const disabled = [];

    for (const item of pluginItems) {
      if (item.startsWith('!')) {
        disabled.push(item.substring(1));
      } else {
        enabled.push(item);
      }
    }

    log(`Found ${enabled.length} enabled external plugins`, 'success');
    log(`Found ${disabled.length} disabled external plugins`, 'info');
    return { enabled, disabled };
  } catch (error) {
    log(`Error reading .env.example: ${error.message}`, 'error');
    return { enabled: [], disabled: [] };
  }
}

// 读取所有插件文件夹
async function getAllPluginFolders() {
  log('Reading plugin folders...');

  // 确保目录存在
  await getPackagesDirectory();

  const folders = fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  log(`Found ${folders.length} total folders`, 'info');
  return folders;
}

// 预处理插件列表
function preprocessPluginList(folders) {
  log('Preprocessing plugin list...');

  const skippedModules = [];
  const nonPluginFolders = [];
  const specialModules = [];

  const filtered = folders.filter((folder) => {
    // 特殊处理：某些 module- 视为 plugin
    if (folder.startsWith('module-')) {
      const moduleName = folder.replace('module-', '');
      if (MODULE_AS_PLUGIN.includes(moduleName)) {
        specialModules.push(folder);
        return true; // 保留这个 module 作为 plugin 处理
      }
      skippedModules.push(folder);
      return false;
    }

    // 只保留 plugin- 开头的
    if (!folder.startsWith('plugin-')) {
      nonPluginFolders.push(folder);
      return false;
    }

    return true;
  });

  // 统一输出跳过的模块
  if (skippedModules.length > 0) {
    log(`Skipped ${skippedModules.length} modules: ${skippedModules.join(', ')}`, 'info');
  }

  // 输出特殊处理的模块
  if (specialModules.length > 0) {
    log(`Treating ${specialModules.length} modules as plugins: ${specialModules.join(', ')}`, 'info');
  }

  // 警告非预期的文件夹
  if (nonPluginFolders.length > 0) {
    log(`Warning: Non-plugin folders found: ${nonPluginFolders.join(', ')}`, 'warn');
  }

  log(`After preprocessing: ${filtered.length} plugins remain`);
  return filtered;
}

// 处理插件包名
function processPluginName(folderName) {
  let processedName = folderName;

  // 特殊处理: plugin-prototype-game-runesweeper -> plugin-demos-game-runesweeper
  if (folderName === 'plugin-prototype-game-runesweeper') {
    processedName = 'plugin-demos-game-runesweeper';
    log(`Special rename: ${folderName} -> ${processedName}`, 'warn');
  }
  // 将 plugin-auth-prototype- 开头的改为 plugin-auth-
  else if (folderName.startsWith('plugin-auth-prototype-')) {
    processedName = folderName.replace('plugin-auth-prototype-', 'plugin-auth-');
    log(`Auth prototype rename: ${folderName} -> ${processedName}`, 'warn');
  }
  // 将 plugin-prototype- 开头的改为 plugin-
  else if (folderName.startsWith('plugin-prototype-')) {
    processedName = folderName.replace('plugin-prototype-', 'plugin-');
    log(`Prototype rename: ${folderName} -> ${processedName}`, 'warn');
  }

  return processedName;
}

// 获取插件的短名称(去掉 plugin- 或 module- 前缀)
function getPluginShortName(folderName) {
  const processedName = processPluginName(folderName);
  // 处理 plugin- 前缀
  if (processedName.startsWith('plugin-')) {
    return processedName.replace(/^plugin-/, '');
  }
  // 处理 module- 前缀（对于特殊的 module 作为 plugin 的情况）
  if (processedName.startsWith('module-')) {
    return processedName.replace(/^module-/, '');
  }
  return processedName;
}

// 读取插件信息
function readPluginInfo(folderName) {
  const packageJsonPath = path.join(PACKAGES_DIR, folderName, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    log(`package.json not found for ${folderName}`, 'error');
    return null;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const shortName = getPluginShortName(folderName);

    return {
      shortName,
      displayName: packageJson.displayName || packageJson.name || shortName,
    };
  } catch (error) {
    log(`Error reading package.json for ${folderName}: ${error.message}`, 'error');
    return null;
  }
}

// 构建插件数据数组
function buildPluginData(pluginFolders, builtinPlugins, externalPluginsFromEnv) {
  log('Building plugin data...');

  const enabledPlugins = [];
  const disabledPlugins = [];
  const excludedPlugins = [];
  const { enabled: envEnabled, disabled: envDisabled } = externalPluginsFromEnv;

  for (const folder of pluginFolders) {
    const info = readPluginInfo(folder);
    if (info) {
      // 检查是否在排除列表中
      if (EXCLUDE_PLUGINS.includes(info.shortName)) {
        excludedPlugins.push(info.shortName);
        log(`Excluding plugin: ${info.shortName}`, 'info');
        continue;
      }

      // 跳过内置插件
      if (builtinPlugins.includes(info.shortName)) {
        log(`Skipping builtin plugin: ${info.shortName}`, 'info');
        continue;
      }

      // 根据 .env.example 中的配置判断是否启用
      if (envEnabled.includes(info.shortName)) {
        enabledPlugins.push(info);
      } else if (envDisabled.includes(info.shortName)) {
        disabledPlugins.push(info);
      } else {
        // 不在 .env.example 中的新插件，默认禁用
        log(`New plugin not in .env.example: ${info.shortName}, setting as disabled`, 'warn');
        disabledPlugins.push(info);
      }
    }
  }

  // 按短名称排序
  enabledPlugins.sort((a, b) => a.shortName.localeCompare(b.shortName));
  disabledPlugins.sort((a, b) => a.shortName.localeCompare(b.shortName));

  if (excludedPlugins.length > 0) {
    log(`Excluded ${excludedPlugins.length} plugins: ${excludedPlugins.join(', ')}`, 'warn');
  }
  log(`Skipped ${builtinPlugins.length} builtin plugins`, 'info');
  log(`Found ${enabledPlugins.length} enabled external plugins`, 'success');
  log(`Found ${disabledPlugins.length} disabled external plugins`, 'info');
  return { enabledPlugins, disabledPlugins };
}

// 生成 settings.js 内容
function generateSettingsContent(builtinPlugins, enabledPlugins, disabledPlugins) {
  log('Generating settings.js content...');

  let content = `/** @type {import('@tachybase/globals').Settings} */
module.exports = {
  /**
   * 如果对应的环境变量没设置，则使用这里面的值，如果有设置，不用这里的值
   */
  env: {
    APP_ENV: 'development',
    APP_PORT: 3000,
    APP_KEY: 'test-key',
    API_BASE_PATH: '/api/',
    INIT_APP_LANG: 'en-US',
    INIT_ROOT_EMAIL: 'admin@tachybase.com',
    INIT_ROOT_USERNAME: 'tego',
    INIT_ROOT_PASSWORD: 'tego',
    INIT_ROOT_NICKNAME: 'Admin',
    PLUGIN_STORAGE_PATH: 'storage/plugins',
    WS_PATH: '/ws',
    SOCKET_PATH: 'storage/gateway.sock',
    PLUGIN_PACKAGE_PREFIX: '@tachybase/plugin-,@tachybase/module-',
    SERVER_TSCONFIG_PATH: './tsconfig.server.json',
    PLAYWRIGHT_AUTH_FILE: 'storage/playwright/.auth/admin.json',
    PLUGIN_STATICS_PATH: '/static/plugins/',
    APP_SERVER_BASE_URL: '',
    APP_PUBLIC_PATH: '/',
    // 开发环境测试locale 强制使用 cache
    // FORCE_LOCALE_CACHE: '1',
  },
  logger: {
    /**
     *  console | file | dailyRotateFile
     */
    transport: ['console', 'dailyRotateFile'],

    /**
     *
     */
    basePath: 'storage/logs',
    /**
     *
     *  error | warn | info | debug
     */
    // level: 'warn',

    /**
     * If LOGGER_TRANSPORT is dailyRotateFile and using days, add 'd' as the suffix.
     */
    // maxFiles: '14d',

    /**
     * add 'k', 'm', 'g' as the suffix.
     */
    // maxSize: '10m',

    /**
     * json | splitter, split by '|' character
     */
    // format: '',
  },

  database: {
    /**
     *
     */
    dialect: 'sqlite',

    /**
     *
     */
    storage: 'storage/db/tego.sqlite',

    /**
     *
     */
    // tablePrefix: '',

    /**
     *
     */
    // host: 'localhost',

    /**
     *
     */
    // port: 5432,

    /**
     *
     */
    // database: 'tego',

    /**
     *
     */
    // user: 'tego',

    /**
     *
     */
    // password: 'tego',

    /**
     *
     */
    // logging: true,

    /**
     *
     */
    underscored: false,

    /**
     * mysql/postgres
     */
    timezone: '+00:00',

    /**
     * ssl config
     */
    ssl: {
      // ca: '',
      // key: '',
      // cert: '',
      // rejectUnauthorized: true,
    },
  },

  cache: {
    /**
     *
     */
    defaultStore: 'memory',

    /**
     * max number of items in memory cache
     */
    memoryMax: 2000,

    /**
     *
     */
    // redisUrl: '',
  },

  encryptionField: {
    /**
     *
     */
    // key: '',
  },

  presets: {
    /**
     * 默认启用，并且不可删除
     */
    builtinPlugins: [
`;

  // 添加内置插件
  for (let i = 0; i < builtinPlugins.length; i++) {
    const plugin = builtinPlugins[i];
    content += `      '${plugin}',\n`;
  }

  content += `    ],
    /**
     * 可删除
     */
    externalPlugins: [
`;

  // 添加默认启用的插件
  for (const plugin of enabledPlugins) {
    content += `      { name: '${plugin.shortName}', enabledByDefault: true },\n`;
  }

  content += '\n';

  // 添加默认禁用的插件
  for (const plugin of disabledPlugins) {
    content += `      { name: '${plugin.shortName}', enabledByDefault: false },\n`;
  }

  content += `    ],

    /**
     *
     */
    runtimePlugins: [],
  },

  worker: {
    /**
     * -1 为不限制，自动设置为核心数量
     * 0 禁用 worker
     * 其他值为 worker 数量
     */
    count: -1,

    /**
     * -1 为最大为核心数量
     * 其他值为最大 worker 数量
     */
    countMax: -1,

    /**
     * 错误尝试次数
     */
    // errorRetry: 3,

    /**
     * MB
     */
    // maxMemory: 4096,
  },

  /**
   * export config, max length of export data to use main thread and page size in worker thread
   */
  export: {
    /**
     *
     */
    // lengthMax: 2000,
    /**
     *
     */
    // workerPageSize: 1000,
  },

  misc: {
    forbidSubAppPlugins: ['multi-app', 'manual-notification', 'multi-app-share-collection'],
  },
};
`;

  return content;
}

// 写入 settings.js 文件
function writeSettingsFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    log(`Successfully wrote to ${filePath}`, 'success');
  } catch (error) {
    log(`Error writing to ${filePath}: ${error.message}`, 'error');
  }
}

// 主函数
async function main() {
  log('=== Starting settings.js update ===', 'info');

  // 1. 读取内置插件列表
  const builtinPlugins = readBuiltinPlugins();

  // 2. 读取外部插件列表
  const externalPluginsFromEnv = readExternalPlugins();

  // 3. 读取所有文件夹
  const allFolders = await getAllPluginFolders();

  // 4. 预处理插件列表
  const pluginFolders = preprocessPluginList(allFolders);

  // 5. 构建插件数据
  const { enabledPlugins, disabledPlugins } = buildPluginData(pluginFolders, builtinPlugins, externalPluginsFromEnv);

  if (enabledPlugins.length === 0 && disabledPlugins.length === 0) {
    log('No external plugin data found!', 'warn');
  }

  // 6. 生成并写入 settings.js
  const settingsContent = generateSettingsContent(builtinPlugins, enabledPlugins, disabledPlugins);
  writeSettingsFile(SETTINGS_PATH, settingsContent);

  log('=== settings.js update completed ===', 'success');
  log(`Builtin plugins: ${builtinPlugins.length}`, 'info');
  log(`Enabled external plugins: ${enabledPlugins.length}`, 'info');
  log(`Disabled external plugins: ${disabledPlugins.length}`, 'info');
  log(`Total external plugins: ${enabledPlugins.length + disabledPlugins.length}`, 'info');
}

// 运行主函数
main().catch((error) => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});
