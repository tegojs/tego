import React from 'react';
import { css, useApp, useTranslation } from '@tachybase/client';

import { LinkOutlined } from '@ant-design/icons';
import { Button } from 'antd';

export const OpenInNewTab = () => {
  const { t } = useTranslation();
  const app = useApp();

  const onOpenInNewTab = () => {
    const search = window.location;
    const hash = search.hash.slice(search.hash.indexOf('/'));
    window.open(app.getRouteUrl(hash));
  };

  return (
    <div
      className={css`
        position: absolute;
        top: -40px;
        right: 0;
      `}
    >
      <Button type="dashed" onClick={onOpenInNewTab} icon={<LinkOutlined />}>
        {t('Preview')}
      </Button>
    </div>
  );
};
