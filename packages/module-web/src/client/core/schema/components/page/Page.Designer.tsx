import React from 'react';
import {
  SchemaComponent,
  SchemaSettingsDropdown,
  SchemaSettingsSwitchItem,
  useApp,
  useDesignable,
  useSchemaSettingsItem,
  useSchemaToolbar,
  useTranslation,
} from '@tachybase/client';
import { uid, useField, useFieldSchema } from '@tachybase/schema';

import { MenuOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import { generateNTemplate } from '../../../../locale';
import { findGridSchema } from '../../helpers';
import { useSchemaPatch } from '../../hooks';

export const PageDesigner = (props) => {
  const { showBack } = props;
  const { t } = useTranslation();
  const field = useField();
  const fieldSchema = useFieldSchema();
  const { dn } = useDesignable();
  const { onUpdateComponentProps } = useSchemaPatch();
  const headerSchema = fieldSchema?.properties?.['header'];
  const isHeaderEnabled = !!headerSchema && field.componentProps?.headerEnabled !== false;
  const tabsSchema = fieldSchema?.properties?.['tabs'];
  const isTabsEnabled = !!tabsSchema && field.componentProps?.tabsEnabled !== false;
  const schemaSettingsProps = {
    dn,
    field,
    fieldSchema,
  };
  const app = useApp();
  const MPageSettings = app.schemaSettingsManager.get('MPage:Dropdown')?.options;

  return (
    <SchemaSettingsDropdown
      title={
        <Button
          style={{
            borderColor: 'var(--colorSettings)',
            color: 'var(--colorSettings)',
            width: '100%',
          }}
          icon={<MenuOutlined />}
          type="dashed"
        >
          {t('Page configuration')}
        </Button>
      }
      {...schemaSettingsProps}
    >
      <SchemaSettingsSwitchItem
        checked={isHeaderEnabled}
        title={t('Enable Header')}
        onChange={async (v) => {
          if (!headerSchema) {
            await dn.insertAfterBegin({
              type: 'void',
              name: 'header',
              'x-component': 'MHeader',
              'x-designer': 'MHeader.Designer',
              'x-component-props': {
                title: fieldSchema.parent['x-component-props']?.name,
                showBack,
              },
            });
          }
          await onUpdateComponentProps({
            ...fieldSchema['x-component-props'],
            headerEnabled: v,
          });
        }}
      />
      <SchemaSettingsSwitchItem
        checked={isTabsEnabled}
        title={t('Enable Tabs')}
        onChange={async (v) => {
          if (!tabsSchema) {
            const gridSchema = findGridSchema(fieldSchema);
            await dn.remove(gridSchema);
            return dn.insertBeforeEnd({
              type: 'void',
              name: 'tabs',
              'x-component': 'Tabs',
              'x-component-props': {},
              'x-initializer': 'popup:addTab',
              'x-initializer-props': {
                gridInitializer: 'mobilePage:addBlock',
              },
              properties: {
                tab1: {
                  type: 'void',
                  title: generateNTemplate('Untitled'),
                  'x-component': 'Tabs.TabPane',
                  'x-designer': 'Tabs.Designer',
                  'x-component-props': {},
                  properties: {
                    grid: {
                      ...gridSchema,
                      'x-uid': uid(),
                    },
                  },
                },
              },
            });
          }

          await onUpdateComponentProps({
            tabsEnabled: v,
          });
        }}
      />
      {MPageSettings.items.map((item: any) => {
        const schema = {
          name: item.name,
          type: 'void',
          'x-component': item.Component,
          'x-component-props': {
            fieldSchema,
          },
        };
        const visible = item.useVisible();
        return visible && <SchemaComponent schema={schema} />;
      })}
    </SchemaSettingsDropdown>
  );
};
