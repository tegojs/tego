import { InjectedPlugin, Plugin } from '@tachybase/server';

import { AuthMainAppController } from './actions/authMainApp';
import { AuthMainAppService } from './service/authMainAppService';

@InjectedPlugin({
  Controllers: [AuthMainAppController],
  Services: [AuthMainAppService],
})
export class PluginAuthMainAppServer extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {}

  async install() {}

  async afterEnable() {}

  async afterDisable() {}

  async remove() {}
}

export default PluginAuthMainAppServer;
