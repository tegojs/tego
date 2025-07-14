import { Plugin, PluginManager } from '@tachybase/server';

import _ from 'lodash';

export class PluginPresets extends Plugin {
  #builtInPlugins = [
    'acl',
    'app-info',
    'auth',
    'backup',
    'cloud-component',
    'collection',
    'cron',
    'data-source',
    'error-handler',
    'event-source',
    'file',
    'workflow',
    'message',
    'pdf',
    'ui-schema',
    'user',
    'web',
    'worker-thread',
    'env-secrets',
    'instrumentation',
  ];

  get builtInPlugins() {
    return this.#builtInPlugins;
  }

  #localPlugins = [
    // [name, version, enabled]
    ['action-bulk-edit', '0.22.7', true],
    ['action-bulk-update', '0.22.7', true],
    ['action-custom-request', '0.22.7', true],
    ['action-duplicate', '0.22.7', true],
    ['action-export', '0.22.7', true],
    ['action-import', '0.22.7', true],
    ['action-print', '0.22.7', true],
    ['block-calendar', '0.22.7', true],
    ['block-charts', '0.22.7', true],
    ['block-gantt', '0.22.7', true],
    ['block-kanban', '0.22.7', true],
    ['block-presentation', '0.22.7', true],
    ['field-china-region', '0.22.7', true],
    ['field-formula', '0.22.7', true],
    ['field-sequence', '0.22.7', true],
    ['field-encryption', '0.23.8', true],
    ['log-viewer', '0.22.67', true],
    ['otp', '0.22.67', true],
    ['full-text-search', '0.23.24', true],
    ['password-policy', '0.23.65', true],
    ['auth-pages', '0.23.65', true],
    ['manual-notification', '1.0.4', true],
    // default disable
    ['adapter-bullmq', '0.21.76', false],
    ['adapter-red-node', '0.22.8', false],
    ['adapter-remix', '0.22.9', false],
    ['api-keys', '0.10.1', false],
    ['audit-logs', '0.22.7', false],
    ['auth-cas', '0.13.0', false],
    ['auth-dingtalk', '0.21.76', false],
    ['auth-lark', '0.22.42', false],
    ['auth-oidc', '0.9.2', false],
    ['auth-saml', '0.8.1', false],
    ['auth-sms', '0.10.0', false],
    ['auth-wechat', '0.21.89', false],
    ['auth-wecom', '0.21.76', false],
    ['block-comments', '0.22.6', false],
    ['block-map', '0.8.1', false],
    ['block-step-form', '1.0.0', false],
    ['data-source-common', '0.22.5', false],
    ['demos-game-runesweeper', '0.22.20', false],
    ['devtools', '0.22.82', false],
    ['field-markdown-vditor', '0.22.6', false],
    ['field-snapshot', '0.8.1', false],
    ['hera', '0.22.6', false],
    ['i18n-editor', '0.11.1', false],
    ['multi-app', '0.7.0', false],
    ['multi-app-share-collection', '0.9.2', false],
    ['online-user', '0.22.7', false],
    ['simple-cms', '0.22.6', false],
    ['sub-accounts', '0.22.56', false],
    ['theme-editor', '0.11.1', false],
    ['workflow-approval', '0.22.37', false],
    ['ai-chat', '0.23.8', false],
    ['department', '0.23.22', false],
    ['workflow-analysis', '0.23.41', false],
    ['api-logs', '0.23.49', false],
    ['ocr-convert', '1.0.12', false],
    ['text-copy', '1.2.11', false],
    ['log-prometheus', '1.3.15', false],
  ];

  get localPlugins() {
    return this.#localPlugins;
  }

  splitNames(name: string) {
    return (name || '').split(',').filter(Boolean);
  }

  getBuiltInPlugins() {
    const { PRESETS_CORE_PLUGINS } = process.env;
    const [addPlugins, removedPlugins] = this.parseNames(PRESETS_CORE_PLUGINS);
    return _.uniq(this.builtInPlugins.concat(addPlugins).filter((name) => !removedPlugins.includes(name)));
  }

  parseNames(plugins: string) {
    const addPlugins = this.splitNames(plugins).filter((name) => !name.startsWith('!') && !name.startsWith('|'));
    const removedPlugins = this.splitNames(plugins)
      .filter((name) => name.startsWith('!'))
      .map((name) => name.slice(1));

    const addDisabledPlugins = this.splitNames(plugins)
      .filter((name) => name.startsWith('|'))
      .map((name) => name.slice(1));

    return [addPlugins, removedPlugins, addDisabledPlugins];
  }

  getLocalPlugins() {
    const { PRESETS_LOCAL_PLUGINS } = process.env;
    let plugins = [].concat(this.localPlugins);
    const [addPlugins, removedPlugins, addDisabledPlugins] = this.parseNames(PRESETS_LOCAL_PLUGINS);

    addPlugins.forEach((plugin) => {
      const found = plugins.find((p) => p[0] === plugin);
      if (found) {
        found[2] = true;
      } else {
        plugins.push([plugin, '0.0.0', true]);
      }
    });

    removedPlugins.forEach((plugin) => {
      plugins = plugins.filter((p) => p[0] !== plugin);
    });

    addDisabledPlugins.forEach((plugin) => {
      const found = plugins.find((p) => p[0] === plugin);
      if (found) {
        found[2] = false;
      } else {
        plugins.push([plugin, '0.0.0', false]);
      }
    });

    return plugins;
  }

  async getPackageJson(name) {
    let packageName = name;
    try {
      packageName = await PluginManager.getPackageName(name);
    } catch (error) {
      packageName = name;
    }
    const packageJson = await PluginManager.getPackageJson(packageName);
    return packageJson;
  }

  async allPlugins() {
    return (
      await Promise.all(
        this.getBuiltInPlugins().map(async (name) => {
          const packageJson = await this.getPackageJson(name);
          return {
            name,
            packageName: packageJson.name,
            enabled: true,
            builtIn: true,
            version: packageJson.version,
          } as any;
        }),
      )
    ).concat(
      await Promise.all(
        this.getLocalPlugins().map(async (plugin) => {
          const name = plugin[0];
          const enabled = plugin[2];
          const packageJson = await this.getPackageJson(name);
          return { name, packageName: packageJson.name, version: packageJson.version, enabled };
        }),
      ),
    );
  }

  async getPluginToBeUpgraded() {
    const repository = this.app.db.getRepository<any>('applicationPlugins');
    const items = (await repository.find()).map((item) => item.name);
    const plugins = await Promise.all(
      this.getBuiltInPlugins().map(async (name) => {
        const packageJson = await this.getPackageJson(name);
        return {
          name,
          packageName: packageJson.name,
          enabled: true,
          builtIn: true,
          version: packageJson.version,
        } as any;
      }),
    );
    for (const plugin of this.getLocalPlugins()) {
      if (plugin[1]) {
        // 不在插件列表，并且插件最低版本小于当前应用版本，跳过不处理
        if (!items.includes(plugin[0]) && (await this.app.version.satisfies(`>${plugin[1]}`))) {
          continue;
        }
      }
      const name = plugin[0];
      const packageJson = await this.getPackageJson(name);
      if (items.includes(plugin[0])) {
        plugins.push({
          name,
          packageName: packageJson.name,
          version: packageJson.version,
        });
      } else {
        plugins.push({
          name,
          packageName: packageJson.name,
          version: packageJson.version,
          enabled: plugin[2],
          builtIn: false,
        });
      }
    }
    return plugins;
  }

  async updateOrCreatePlugins() {
    const repository = this.pm.repository;
    const plugins = await this.getPluginToBeUpgraded();
    try {
      await this.db.sequelize.transaction((transaction) => {
        return Promise.all(
          plugins.map((values) =>
            repository.updateOrCreate({
              transaction,
              values,
              filterKeys: ['name'],
            }),
          ),
        );
      });
    } catch (err) {
      console.error(err);
      throw new Error('Create or update plugin error.');
    }
  }

  async createIfNotExists() {
    const repository = this.pm.repository;
    const existPlugins = await repository.find();
    const existPluginNames = existPlugins.map((item) => item.name);
    const plugins = (await this.allPlugins()).filter((item) => !existPluginNames.includes(item.name));
    this.filterForbidSubAppPlugin(plugins);
    await repository.create({ values: plugins });
  }

  async install() {
    await this.createIfNotExists();
    this.log.info('start install built-in plugins');
    await this.pm.repository.init();
    await this.pm.load();
    await this.pm.install();
    this.log.info('finish install built-in plugins');
  }

  async upgrade() {
    this.log.info('update built-in plugins');
    await this.forbidSubAppPlugin();
    await this.updateOrCreatePlugins();
  }

  getForbidSubAppPlugin() {
    if (this.app.name === 'main') {
      return [];
    }
    const { FORBID_SUB_APP_PLUGINS } = process.env;
    return FORBID_SUB_APP_PLUGINS ? FORBID_SUB_APP_PLUGINS.split(',') : [];
  }
  // 从环境变量读取禁止子应用装载的插件
  async forbidSubAppPlugin() {
    if (this.app.name === 'main') {
      return;
    }
    const forbidPlugins = this.getForbidSubAppPlugin();
    const repository = this.pm.repository;
    await repository.update({
      values: {
        subView: false,
        enabled: false,
      },
      filter: {
        name: {
          $in: forbidPlugins,
        },
      },
    });
  }

  async filterForbidSubAppPlugin(plugins: any[]) {
    if (this.app.name === 'main') {
      return;
    }
    const forbidPlugins = this.getForbidSubAppPlugin();
    plugins.forEach((plugin) => {
      if (forbidPlugins.includes(plugin.name)) {
        plugin.subView = false;
        plugin.enabled = false;
      }
    });
  }
}

export default PluginPresets;
