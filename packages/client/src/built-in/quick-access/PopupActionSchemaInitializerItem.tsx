import React from 'react';

import { useTranslation } from 'react-i18next';

import { SchemaSettings, useSchemaInitializer } from '../../application';
import { ButtonEditor } from '../../schema-component';
import { SchemaSettingOpenModeSchemaItems } from '../../schema-items';
import { ModalActionSchemaInitializerItem } from './ModalActionSchemaInitializerItem';

export const quickAccessActionSettingsPopup = new SchemaSettings({
  name: 'quickAccess:actionSettings:popup',
  items: [
    {
      name: 'editButton',
      Component: ButtonEditor,
      useComponentProps() {
        return { hasIconColor: true };
      },
    },

    {
      name: 'openMode',
      Component: SchemaSettingOpenModeSchemaItems,
    },
    {
      sort: 800,
      name: 'd1',
      type: 'divider',
    },
    {
      sort: 900,
      type: 'remove',
      name: 'remove',
    },
  ],
});

export function QuickAccessPopupActionSchemaInitializerItem(props) {
  // 调用插入功能
  const { insert } = useSchemaInitializer();
  const { t } = useTranslation();

  return (
    <ModalActionSchemaInitializerItem
      title={t('Popup')}
      modalSchema={{
        title: t('Add popup'),
        properties: {
          title: {
            title: t('Title'),
            required: true,
            'x-component': 'Input',
            'x-decorator': 'FormItem',
          },
          icon: {
            title: t('Icon'),
            required: true,
            'x-component': 'IconPicker',
            'x-decorator': 'FormItem',
          },
          iconColor: {
            title: t('Color'),
            required: true,
            default: '#1677FF',
            'x-component': 'ColorPicker',
            'x-decorator': 'FormItem',
          },
        },
      }}
      onSubmit={(values) => {
        insert({
          type: 'void',
          title: values.title,
          'x-action': 'customize:popup',
          'x-toolbar': 'ActionSchemaToolbar',
          'x-settings': 'quickAccess:actionSettings:popup',
          'x-component': 'QuickAccessAction',
          'x-component-props': {
            icon: values.icon,
            iconColor: values.iconColor,
            refreshDataBlockRequest: false,
            openMode: 'drawer',
          },
          properties: {
            drawer: {
              type: 'void',
              title: values.title,
              'x-component': 'Action.Container',
              'x-component-props': {
                className: 'tb-action-popup',
              },
              properties: {
                tabs: {
                  type: 'void',
                  'x-component': 'Tabs',
                  'x-component-props': {},
                  'x-initializer': 'popup:addTab',
                  properties: {
                    tab1: {
                      type: 'void',
                      title: '{{t("Details")}}',
                      'x-component': 'Tabs.TabPane',
                      'x-designer': 'Tabs.Designer',
                      'x-component-props': {},
                      properties: {
                        grid: {
                          type: 'void',
                          'x-component': 'Grid',
                          'x-initializer': 'page:addBlock',
                          properties: {},
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });
      }}
    />
  );
}
