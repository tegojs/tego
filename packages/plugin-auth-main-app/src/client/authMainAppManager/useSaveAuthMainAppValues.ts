import { useAPIClient, useTranslation } from '@tachybase/client';
import { useForm } from '@tachybase/schema';

import { App } from 'antd';

import { COLLECTION_AUTH_MAIN_APP_CONFIG } from '../../constants';

export const useSaveAuthMainAppValues = () => {
  const form = useForm();
  const { message } = App.useApp();
  const api = useAPIClient();
  const { t } = useTranslation();

  return {
    async run() {
      await form.submit();
      await api.request({
        url: `${COLLECTION_AUTH_MAIN_APP_CONFIG}:set`,
        method: 'post',
        data: form.values,
      });
      message.success(t('Saved successfully'));
    },
  };
};
