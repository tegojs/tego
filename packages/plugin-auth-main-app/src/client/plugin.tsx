import { Plugin } from '@tachybase/client';
import AuthPlugin from '@tachybase/module-auth/client';

import { AuthMainAppManager } from './authMainAppManager/AuthMainAppManager';
import { tval } from './locale';
import { SignInForm } from './signInForm';

class PluginAuthMainAppClient extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    // 仅仅在子应用中生效
    if (this.app.name !== 'main') {
      this.app.systemSettingsManager.add('system-services.auth-main-app', {
        icon: 'LoginOutlined',
        title: tval('Single Sign-On (SSO) between applications'),
        Component: AuthMainAppManager,
        aclSnippet: `pm.system-services.auth-main-app`,
      });
      const auth = this.app.pm.get(AuthPlugin);
      auth.registerType('mainApp', {
        components: {
          SignInForm: SignInForm,
        },
      });
    }
  }
}

export default PluginAuthMainAppClient;
