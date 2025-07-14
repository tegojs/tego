import React, { useMemo } from 'react';
import { useApp, useTranslation } from '@tachybase/client';

import { Card, Form, Input } from 'antd';

export const AppConfiguration = () => {
  const app = useApp();
  const { t } = useTranslation();
  const targetUrl = useMemo(() => {
    return app.getRouteUrl('/mobile');
  }, [app]);
  return (
    <Card
      style={{
        minHeight: '600px',
      }}
    >
      <Form layout="vertical">
        <Form.Item
          tooltip={`${t('The full address is')} ${window.origin}${targetUrl}`}
          label={t('Mobile client access address')}
        >
          <Input value={targetUrl} disabled />
        </Form.Item>
      </Form>
    </Card>
  );
};
