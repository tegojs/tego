import React from 'react';
import {
  css,
  cx,
  GeneralSchemaDesigner,
  SchemaSettingsModalItem,
  SchemaSettingsRemove,
  SortableItem,
  useDesigner,
  useTranslation,
} from '@tachybase/client';
import { useField, useFieldSchema } from '@tachybase/schema';

import { TabBarItemProps } from 'antd-mobile';

import { useSchemaPatch } from '../../hooks';
import { tabItemSchema } from './schema';

const InternalItem: React.FC<TabBarItemProps> = () => {
  // NOTE: nothing to do
  // return <TabBar.Item {...props}></TabBar.Item>;
  const Designer = useDesigner();
  return (
    <SortableItem
      className={cx(
        'tb-mobile-tab-bar-item',
        css`
          position: absolute !important;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        `,
      )}
    >
      <Designer />
    </SortableItem>
  );
};

export const Designer = () => {
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();
  const { onUpdateComponentProps } = useSchemaPatch();
  const field = useField();
  const tabItems = Object.keys(fieldSchema.parent.properties).length;

  return (
    <GeneralSchemaDesigner>
      <SchemaSettingsModalItem
        title={t('Edit info')}
        initialValues={field.componentProps}
        schema={tabItemSchema}
        onSubmit={onUpdateComponentProps}
      ></SchemaSettingsModalItem>
      {tabItems > 1 ? (
        <SchemaSettingsRemove
          key="remove"
          removeParentsIfNoChildren
          confirm={{
            title: t('Delete tab item?'),
          }}
          breakRemoveOn={{
            'x-component': 'MTabBar',
          }}
        ></SchemaSettingsRemove>
      ) : null}
    </GeneralSchemaDesigner>
  );
};

export const TabBarItem = InternalItem as unknown as typeof InternalItem & {
  Designer: typeof Designer;
};

TabBarItem.Designer = Designer;
