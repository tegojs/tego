import { Plugin } from '@tachybase/client';

import { ProviderUserManual } from './UserManual.provider';

class PluginUserManualClient extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    this.app.use(ProviderUserManual);
  }
}

export default PluginUserManualClient;
