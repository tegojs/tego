import { Plugin } from '@tachybase/client';

import { useMatch } from 'react-router';

import { ShareButton } from './component/ShareButton';
import { SharePage } from './component/SharePage';
import { ShareSchemaComponent } from './component/ShareSchemaComponent';
import { useEnablePageShare } from './hook/useEnableSharePage';
import { MEnableSharePage } from './mobile/component/MpageSharePage';
import { MShareModal } from './mobile/component/MShareModal';

export class PluginShareClient extends Plugin {
  async load() {
    this.app.addComponents({
      ShareButton,
      MEnableSharePage,
      MShareModal,
    });
    this.router.add('share', {
      path: '/share',
      Component: SharePage,
    });
    this.router.add('share.page', { path: '/share/:name', Component: ShareSchemaComponent });
    this.schemaSettingsManager.addItem('MPage:Dropdown', 'Menablesharepage', {
      type: 'item',
      useVisible() {
        const isShare = useMatch('/share/:name');
        return !isShare;
      },
      Component: 'MEnableSharePage',
    });
    this.schemaSettingsManager.addItem('PageSettings', 'enablesharepage', {
      type: 'switch',
      useVisible() {
        const isShare = useMatch('/share/:name');
        return !isShare;
      },
      useComponentProps: useEnablePageShare,
    });
  }
}

export default PluginShareClient;
