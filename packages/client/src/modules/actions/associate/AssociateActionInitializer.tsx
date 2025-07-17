import React from 'react';

import { useSchemaInitializerItem } from '../../../application';
import { ActionInitializer } from '../../../schema-initializer/items/ActionInitializer';

export const AssociateActionInitializer = () => {
  const schema = {
    type: 'void',
    'x-action': 'associate',
    'x-acl-action': 'associate',
    title: "{{t('Associate')}}",
    'x-toolbar': 'ActionSchemaToolbar',
    'x-settings': 'actionSettings:associate',
    'x-component': 'Action',
    'x-component-props': {
      actionType: 'associations',
      openMode: 'drawer',
      type: 'primary',
      icon: 'PlusOutlined',
    },
    properties: {
      drawer: {
        type: 'void',
        title: '{{ t("Select record") }}',
        'x-component': 'Action.Container',
        'x-component-props': {
          className: 'nb-record-picker-selector',
        },
        'x-decorator': 'AssociateActionProvider',
        properties: {
          grid: {
            type: 'void',
            'x-component': 'Grid',
            'x-initializer': 'popup:tableSelector:addBlock',
            properties: {},
          },
          footer: {
            'x-component': 'Action.Container.Footer',
            'x-component-props': {},
            properties: {
              actions: {
                type: 'void',
                'x-component': 'ActionBar',
                'x-component-props': {},
                properties: {
                  submit: {
                    title: '{{ t("Submit") }}',
                    'x-action': 'submit',
                    'x-component': 'Action',
                    'x-use-component-props': 'usePickActionProps',
                    'x-toolbar': 'ActionSchemaToolbar',
                    'x-settings': 'actionSettings:submit',
                    'x-component-props': {
                      type: 'primary',
                      htmlType: 'submit',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
  const itemConfig = useSchemaInitializerItem();
  return <ActionInitializer item={itemConfig} schema={schema} />;
};
