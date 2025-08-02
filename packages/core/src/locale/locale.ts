import { randomUUID } from 'node:crypto';
import { Cache } from '@tachybase/cache';

import lodash from 'lodash';

import Application from '../application';
import { getResource } from './resource';

export class Locale {
  app: Application;
  cache: Cache;
  defaultLang = 'en-US';
  localeFn = new Map();
  resourceCached = new Map();
  i18nInstances = new Map();

  constructor(app: Application) {
    this.app = app;
    this.app.on('afterLoad', async () => {
      this.app.logger.debug('load locale resource', { submodule: 'locale', method: 'onAfterLoad' });
      this.app.setMaintainingMessage('load locale resource');
      await this.load();
      this.app.logger.debug('locale resource loaded', { submodule: 'locale', method: 'onAfterLoad' });
      this.app.setMaintainingMessage('locale resource loaded');
    });
  }

  async load() {
    this.cache = await this.app.cacheManager.createCache({
      name: 'locale',
      prefix: 'locale',
      store: 'memory',
    });

    await this.get(this.defaultLang);
  }

  setLocaleFn(name: string, fn: (lang: string) => Promise<any>) {
    this.localeFn.set(name, fn);
  }

  async getETag(lang: string) {
    // TODO: 开发环境做文件监听变动这个缓存, 目前开发环境默认不缓存,需要重新拉取
    if (process.env.APP_ENV !== 'production' && !process.env.FORCE_LOCALE_CACHE) {
      // 此处之前不该reset(),会导致所有内存缓存被重置
      await this.cache.del(`eTag:${lang}`);
    }
    return await this.wrapCache(`eTag:${lang}`, async () => {
      return randomUUID();
    });
  }

  async get(lang: string) {
    const defaults = {
      resources: await this.getCacheResources(lang),
    };
    for (const [name, fn] of this.localeFn) {
      // this.app.log.debug(`load [${name}] locale resource `);
      const result = await this.wrapCache(`${name}:${lang}`, async () => {
        this.cache.del(`eTag:${lang}`);
        return await fn(lang);
      });
      if (result) {
        defaults[name] = result;
      }
    }
    return defaults;
  }

  async wrapCache(key: string, fn: () => any) {
    return await this.cache.wrapWithCondition(key, fn, {
      isCacheable: (val: any) => !lodash.isEmpty(val),
    });
  }

  async loadResourcesByLang(lang: string) {
    if (!this.cache) {
      return;
    }
    if (!this.resourceCached.has(lang)) {
      await this.getCacheResources(lang);
    }
  }

  async getCacheResources(lang: string) {
    this.resourceCached.set(lang, true);
    if (process.env.APP_ENV !== 'production' && !process.env.FORCE_LOCALE_CACHE) {
      // 此处之前不该reset(),会导致所有内存缓存被重置
      await this.cache.del(`resources:${lang}`);
    }
    return await this.wrapCache(`resources:${lang}`, () => this.getResources(lang));
  }

  getResources(lang: string) {
    const resources = {};
    const names = this.app.pm.getAliases();
    if (process.env.APP_ENV !== 'production') {
      const keys = Object.keys(require.cache);
      // 这里假定路径名称都符合 plugin-、module- 的形式
      const regex = new RegExp(`((plugin|module)-[a-zA-Z0-9\\-]+|client)/(dist|lib|src)/locale/${lang}`);
      const matched = keys.filter((path) => regex.test(path));
      if (matched.length > 0) {
        this.app.logger.debug('clear locale resource cache', { submodule: 'locale', matched });
      }
      matched.forEach((key) => delete require.cache[key]);
    }
    for (const name of names) {
      try {
        const p = this.app.pm.get(name);
        if (!p) {
          continue;
        }
        const packageName: string = p.options?.packageName;
        if (!packageName) {
          continue;
        }
        // this.app.log.debug(`load [${packageName}] locale resource `);
        // this.app.setMaintainingMessage(`load [${packageName}] locale resource `);
        const res = getResource(packageName, lang);
        if (res) {
          resources[packageName] = { ...res };
          if (packageName.includes('@tachybase/plugin-')) {
            resources[packageName.substring('@tachybase/plugin-'.length)] = { ...res };
          }
          if (packageName.includes('@tachybase/module-')) {
            resources[packageName.substring('@tachybase/module-'.length)] = { ...res };
          }
        }
      } catch (err) {
        // empty
      }
    }

    // map from web
    resources['core'] = resources['web'];
    // compatible with @tachybase/module-client
    resources['client'] = resources['web'];

    Object.keys(resources).forEach((name) => {
      this.app.i18n.addResources(lang, name, resources[name]);
    });

    return resources;
  }

  async getI18nInstance(lang: string) {
    if (lang === '*' || !lang) {
      return this.app.i18n.cloneInstance({ initImmediate: false });
    }
    let instance = this.i18nInstances.get(lang);
    if (!instance) {
      instance = this.app.i18n.cloneInstance({ initImmediate: false });
      this.i18nInstances.set(lang, instance);
    }
    return instance;
  }
}
