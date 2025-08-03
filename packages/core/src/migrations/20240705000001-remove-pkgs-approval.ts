import { DataTypes } from '@tachybase/database';

import { Migration } from '../migration';

export default class extends Migration {
  on = 'beforeLoad';
  appVersion = '<0.21.65';

  async up() {
    console.log('remove workflow notice');
    await this.pm.repository.destroy({
      filter: {
        name: 'workflow-notice',
      },
    });

    console.log('remove approval');
    await this.pm.repository.destroy({
      filter: {
        name: 'approval',
      },
    });
  }
}
