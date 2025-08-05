import TachybaseGlobal from '@tachybase/globals';
import { Plugin, PluginManager } from '@tego/core';

import _ from 'lodash';

export class PluginPresets extends Plugin {
  getBuiltInPlugins() {
    if (!TachybaseGlobal.settings.presets.builtinPlugins) {
      throw new Error(
        'presets.builtinPlugins is not defined! Please refer to the settings.js file for the correct configuration.',
      );
    }
    return TachybaseGlobal.settings.presets.builtinPlugins;
  }

  getExternalPlugins() {
    if (!TachybaseGlobal.settings.presets.externalPlugins) {
      throw new Error(
        'presets.externalPlugins is not defined! Please refer to the settings.js file for the correct configuration.',
      );
    }
    return TachybaseGlobal.settings.presets.externalPlugins.reduce(
      (acc, cur) => {
        if (cur.enabledByDefault) {
          acc.installedPlugins.push(cur.name);
        } else {
          acc.disabledPlugins.push(cur.name);
        }
        return acc;
      },
      { installedPlugins: [] as string[], disabledPlugins: [] as string[] },
    );
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
        this.getExternalPlugins()
          .installedPlugins.map(async (name) => {
            const packageJson = await this.getPackageJson(name);
            return { name, packageName: packageJson.name, version: packageJson.version, enabled: true, builtIn: false };
          })
          .concat(
            this.getExternalPlugins().disabledPlugins.map(async (name) => {
              const packageJson = await this.getPackageJson(name);
              return {
                name,
                packageName: packageJson.name,
                version: packageJson.version,
                enabled: false,
                builtIn: false,
              };
            }),
          ),
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
    for (const name of this.getExternalPlugins().installedPlugins) {
      const packageJson = await this.getPackageJson(name);
      if (items.includes(name)) {
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
          enabled: true,
          builtIn: false,
        });
      }
    }
    for (const name of this.getExternalPlugins().disabledPlugins) {
      const packageJson = await this.getPackageJson(name);
      if (items.includes(name)) {
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
          enabled: false,
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
    return TachybaseGlobal.settings.misc.forbidSubAppPlugins;
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
