import React, { useState } from 'react';

import { Button, Popover } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAPIClient } from '../../../api-client';
import { SchemaInitializerContext, useApp } from '../../../application';
import { GroupItem } from '../../../modules/menu/GroupItem';
import { LinkMenuItem } from '../../../modules/menu/LinkMenuItem';
import { PageMenuItem } from '../../../modules/menu/PageMenuItem';

export const AddNewButtonComponent = () => {
  const { t } = useTranslation();
  return (
    <Popover trigger="click" content={<PopverContent />}>
      <Button type="primary">{t('Add Entry')}</Button>
    </Popover>
  );
};

const PopverContent = (props) => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const apiClient = useAPIClient();
  const app = useApp();
  const insertSchema = async (schema) => {
    const { data: newSchema } = await apiClient.request({
      resource: 'uiSchemas',
      action: 'insertAdjacent/default-admin-menu',
      params: {
        position: 'beforeEnd',
        values: schema,
      },
    });
    if (newSchema?.data?.['x-uid']) {
      // XXX: 有待改善交互体验, 强制刷新是为了重新获取刚存进去的 schema
      navigate(`/${app.prefix}/${newSchema.data['x-uid']}`);
      window.location.reload();
    }
  };
  return (
    <SchemaInitializerContext.Provider
      value={{
        visible,
        setVisible,
        insert: insertSchema,
        options: props,
      }}
    >
      <GroupItem />
      <LinkMenuItem />
      <PageMenuItem />
    </SchemaInitializerContext.Provider>
  );
};
