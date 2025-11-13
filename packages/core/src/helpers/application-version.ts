import { Collection } from '@tachybase/database';

import semver from 'semver';

import Application from '../application';

export class ApplicationVersion {
  protected app: Application;
  protected collection: Collection;

  constructor(app: Application) {
    this.app = app;
    if (!app.db) {
      // 如果 db 还未初始化，延迟初始化 collection
      // collection 将在第一次使用时初始化
      this.collection = null;
      return;
    }
    app.db.collection({
      origin: '@tego/core',
      name: 'applicationVersion',
      dataType: 'meta',
      timestamps: false,
      dumpRules: 'required',
      fields: [{ name: 'value', type: 'string' }],
    });
    this.collection = this.app.db.getCollection('applicationVersion');
  }

  async get() {
    if (!this.collection) {
      // 延迟初始化 collection
      if (!this.app.db) {
        return null;
      }
      this.app.db.collection({
        origin: '@tego/core',
        name: 'applicationVersion',
        dataType: 'meta',
        timestamps: false,
        dumpRules: 'required',
        fields: [{ name: 'value', type: 'string' }],
      });
      this.collection = this.app.db.getCollection('applicationVersion');
    }
    const model = await this.collection.model.findOne();
    if (!model) {
      return null;
    }
    return model.get('value') as any;
  }

  async update(version?: string) {
    if (!this.collection) {
      // 延迟初始化 collection
      if (!this.app.db) {
        return;
      }
      this.app.db.collection({
        origin: '@tego/core',
        name: 'applicationVersion',
        dataType: 'meta',
        timestamps: false,
        dumpRules: 'required',
        fields: [{ name: 'value', type: 'string' }],
      });
      this.collection = this.app.db.getCollection('applicationVersion');
    }
    await this.collection.model.destroy({
      truncate: true,
    });

    await this.collection.model.create({
      value: version || this.app.getVersion(),
    });
  }

  async satisfies(range: string) {
    if (!this.collection) {
      // 延迟初始化 collection
      if (!this.app.db) {
        return true;
      }
      this.app.db.collection({
        origin: '@tego/core',
        name: 'applicationVersion',
        dataType: 'meta',
        timestamps: false,
        dumpRules: 'required',
        fields: [{ name: 'value', type: 'string' }],
      });
      this.collection = this.app.db.getCollection('applicationVersion');
    }
    const model: any = await this.collection.model.findOne();
    const version = model?.value as any;
    if (!version) {
      return true;
    }
    return semver.satisfies(version, range, { includePrerelease: true });
  }
}
