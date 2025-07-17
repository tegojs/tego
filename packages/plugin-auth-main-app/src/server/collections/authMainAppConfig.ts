import { defineCollection } from '@tachybase/database';

import { COLLECTION_AUTH_MAIN_APP_CONFIG } from '../../constants';

export default defineCollection({
  dumpRules: 'required',
  name: COLLECTION_AUTH_MAIN_APP_CONFIG,
  updatedAt: true,
  createdAt: true,
  autoGenId: true,
  fields: [
    {
      type: 'boolean',
      name: 'selfSignIn', // 关闭本应用所有认证器
      defaultValue: false,
    },
    {
      type: 'boolean',
      name: 'authMainApp', // 是否支持从主应用一键登录
      defaultValue: true,
    },
  ],
});
