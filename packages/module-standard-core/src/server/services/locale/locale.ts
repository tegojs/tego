import { randomUUID } from 'node:crypto';
import { Cache, type CacheManager } from '@tachybase/cache';
import { TOKENS, type Tego } from '@tego/core';

import { getResource } from './resource';

const isEmptyValue = (val: any) => {
  if (val == null) {
    return true;
  }
  if (Array.isArray(val) || typeof val === 'string') {
    return val.length === 0;
  }
  if (typeof val === 'object') {
    return Object.keys(val).length === 0;
  }
  return false;
};

export class Locale {
  private cache: Cache;
  private defaultLang = 'en-US';
  private localeFn = new Map<string, (lang: string) => Promise<any>>();
  private resourceCached = new Map<string, boolean>();
  private i18nInstances = new Map<string, any>();

  constructor(private readonly tego: Tego) {
    tego.on('tego:afterLoad', async () => {
      tego.logger.debug('load locale resource', { submodule: 'locale', method: 'onAfterLoad' });
      tego.setMaintainingMessage('load locale resource');
      await this.load();
      tego.logger.debug('locale resource loaded', { submodule: 'locale', method: 'onAfterLoad' });
      tego.setMaintainingMessage('locale resource loaded');
    });
  }

  private get cacheManager() {
    return this.tego.container.get(TOKENS.CacheManager) as CacheManager;
  }

  private get baseI18n() {
    return this.tego.container.get(TOKENS.I18n) as any;
  }

  async load() {
    this.cache = await this.cacheManager.createCache({
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
    if (process.env.APP_ENV !== 'production' && !process.env.FORCE_LOCALE_CACHE) {
      await this.cache.del(`eTag:${lang}`);
    }
    return await this.wrapCache(`eTag:${lang}`, async () => randomUUID());
  }

  async get(lang: string) {
    const defaults: Record<string, any> = {
      resources: await this.getCacheResources(lang),
    };

    for (const [name, fn] of this.localeFn) {
      const result = await this.wrapCache(`${name}:${lang}`, async () => {
        await this.cache.del(`eTag:${lang}`);
        return await fn(lang);
      });
      if (result) {
        defaults[name] = result;
      }
    }
    return defaults;
  }

  private async wrapCache(key: string, fn: () => any) {
    return await this.cache.wrapWithCondition(key, fn, {
      isCacheable: (val: any) => !isEmptyValue(val),
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
      await this.cache.del(`resources:${lang}`);
    }
    return await this.wrapCache(`resources:${lang}`, () => this.getResources(lang));
  }

  private getResources(lang: string) {
    const resources: Record<string, any> = {};
    const names = this.tego.pm.getAliases();

    if (process.env.APP_ENV !== 'production') {
      const keys = Object.keys(require.cache);
      const regex = new RegExp(`((plugin|module)-[a-zA-Z0-9-]+|client)/(dist|lib|src)/locale/${lang}`);
      const matched = keys.filter((path) => regex.test(path));
      if (matched.length > 0) {
        this.tego.logger.debug('clear locale resource cache', { submodule: 'locale', matched });
      }
      matched.forEach((key) => delete require.cache[key]);
    }

    for (const name of names) {
      try {
        const plugin = this.tego.pm.get(name);
        if (!plugin) {
          continue;
        }
        const packageName: string = plugin.options?.packageName;
        if (!packageName) {
          continue;
        }
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
        // ignore
      }
    }

    resources['core'] = resources['web'];
    resources['client'] = resources['web'];

    const i18n = this.baseI18n;
    Object.keys(resources).forEach((name) => {
      if (resources[name]) {
        i18n.addResources(lang, name, resources[name]);
      }
    });

    return resources;
  }

  async getI18nInstance(lang: string) {
    if (lang === '*' || !lang) {
      return this.baseI18n.cloneInstance({ initImmediate: false });
    }
    let instance = this.i18nInstances.get(lang);
    if (!instance) {
      instance = this.baseI18n.cloneInstance({ initImmediate: false });
      this.i18nInstances.set(lang, instance);
    }
    return instance;
  }
}
