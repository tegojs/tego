/** @type {import('@tachybase/globals').Settings} */
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
      'acl',
      'app-info',
      'auth',
      'backup',
      'cloud-component',
      'collection',
      'cron',
      'data-source',
      'env-secrets',
      'error-handler',
      'event-source',
      'file',
      'message',
      'pdf',
      'ui-schema',
      'user',
      'web',
      'worker-thread',
      'workflow',
    ],
    /**
     * 可删除
     */
    externalPlugins: [
      { name: 'action-bulk-edit', enabledByDefault: true },
      { name: 'action-bulk-update', enabledByDefault: true },
      { name: 'action-custom-request', enabledByDefault: true },
      { name: 'action-duplicate', enabledByDefault: true },
      { name: 'action-export', enabledByDefault: true },
      { name: 'action-import', enabledByDefault: true },
      { name: 'action-print', enabledByDefault: true },
      { name: 'auth-main-app', enabledByDefault: true },
      { name: 'auth-pages', enabledByDefault: true },
      { name: 'block-calendar', enabledByDefault: true },
      { name: 'block-charts', enabledByDefault: true },
      { name: 'block-gantt', enabledByDefault: true },
      { name: 'block-kanban', enabledByDefault: true },
      { name: 'block-presentation', enabledByDefault: true },
      { name: 'field-bank-card-number', enabledByDefault: true },
      { name: 'field-china-region', enabledByDefault: true },
      { name: 'field-encryption', enabledByDefault: true },
      { name: 'field-formula', enabledByDefault: true },
      { name: 'field-sequence', enabledByDefault: true },
      { name: 'full-text-search', enabledByDefault: true },
      { name: 'instrumentation', enabledByDefault: true },
      { name: 'log-viewer', enabledByDefault: true },
      { name: 'manual-notification', enabledByDefault: true },
      { name: 'otp', enabledByDefault: true },
      { name: 'password-policy', enabledByDefault: true },

      { name: 'adapter-bullmq', enabledByDefault: false },
      { name: 'adapter-red-node', enabledByDefault: false },
      { name: 'adapter-remix', enabledByDefault: false },
      { name: 'ai-chat', enabledByDefault: false },
      { name: 'api-keys', enabledByDefault: false },
      { name: 'api-logs', enabledByDefault: false },
      { name: 'audit-logs', enabledByDefault: false },
      { name: 'auth-cas', enabledByDefault: false },
      { name: 'auth-dingtalk', enabledByDefault: false },
      { name: 'auth-lark', enabledByDefault: false },
      { name: 'auth-oidc', enabledByDefault: false },
      { name: 'auth-saml', enabledByDefault: false },
      { name: 'auth-sms', enabledByDefault: false },
      { name: 'auth-wechat', enabledByDefault: false },
      { name: 'auth-wecom', enabledByDefault: false },
      { name: 'block-comments', enabledByDefault: false },
      { name: 'block-map', enabledByDefault: false },
      { name: 'block-step-form', enabledByDefault: false },
      { name: 'data-source-common', enabledByDefault: false },
      { name: 'database-clean', enabledByDefault: false },
      { name: 'demos-game-runesweeper', enabledByDefault: false },
      { name: 'department', enabledByDefault: false },
      { name: 'devtools', enabledByDefault: false },
      { name: 'field-markdown-vditor', enabledByDefault: false },
      { name: 'field-snapshot', enabledByDefault: false },
      { name: 'form-design', enabledByDefault: false },
      { name: 'hera', enabledByDefault: false },
      { name: 'i18n-editor', enabledByDefault: false },
      { name: 'icon-pickerv2', enabledByDefault: false },
      { name: 'multi-app', enabledByDefault: false },
      { name: 'multi-app-share-collection', enabledByDefault: false },
      { name: 'ocr-convert', enabledByDefault: false },
      { name: 'online-user', enabledByDefault: false },
      { name: 'pagespy', enabledByDefault: false },
      { name: 'simple-cms', enabledByDefault: false },
      { name: 'sub-accounts', enabledByDefault: false },
      { name: 'text-copy', enabledByDefault: false },
      { name: 'theme-editor', enabledByDefault: false },
      { name: 'user-manual-feishu', enabledByDefault: false },
      { name: 'workflow-analysis', enabledByDefault: false },
      { name: 'workflow-approval', enabledByDefault: false },
    ],

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
