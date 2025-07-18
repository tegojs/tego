import { ParseKeys, TOptions } from 'i18next';

import type { Application } from './Application';

export class Plugin<T = any> {
  constructor(
    protected options: T,
    protected app: Application,
  ) {}

  get pluginManager() {
    return this.app.pluginManager;
  }

  get pm() {
    return this.app.pm;
  }

  get router() {
    return this.app.router;
  }

  get systemSettingsManager() {
    return this.app.systemSettingsManager;
  }

  get userSettingsManager() {
    return this.app.userSettingsManager;
  }

  get schemaInitializerManager() {
    return this.app.schemaInitializerManager;
  }

  get schemaSettingsManager() {
    return this.app.schemaSettingsManager;
  }

  get dataSourceManager() {
    return this.app.dataSourceManager;
  }

  get AttachmentPreviewManager() {
    return this.app.AttachmentPreviewManager;
  }

  async afterAdd() {}

  async beforeLoad() {}

  async load() {}

  async afterLoad() {}

  t(text: ParseKeys | ParseKeys[], options: TOptions = {}) {
    return this.app.i18n.t(text, { ns: this.options?.['packageName'], ...(options as any) }) as string;
  }
}
