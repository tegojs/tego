import { useSchemaInitializerItem } from '../../../application';
import { OpenMode } from '../../../schema-component';
import { ActionInitializer } from '../../../schema-initializer/items/ActionInitializer';

export const CreateActionInitializer = () => {
  const schema = {
    type: 'void',
    'x-action': 'create',
    'x-acl-action': 'create',
    title: "{{t('Add new')}}",
    'x-toolbar': 'ActionSchemaToolbar',
    'x-settings': 'actionSettings:addNew',
    'x-component': 'Action',
    'x-decorator': 'ACLActionProvider',
    'x-component-props': {
      openMode: OpenMode.DRAWER_MODE,
      type: 'primary',
      component: 'CreateRecordAction',
      icon: 'PlusOutlined',
    },
    properties: {
      drawer: {
        type: 'void',
        title: '{{ t("Add record") }}',
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
            'x-initializer-props': {
              gridInitializer: 'popup:addNew:addBlock',
            },
            properties: {
              tab1: {
                type: 'void',
                title: '{{t("Add new")}}',
                'x-component': 'Tabs.TabPane',
                'x-designer': 'Tabs.Designer',
                'x-component-props': {},
                properties: {
                  grid: {
                    type: 'void',
                    'x-component': 'Grid',
                    'x-initializer': 'popup:addNew:addBlock',
                    properties: {},
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
  return <ActionInitializer {...itemConfig} item={itemConfig} schema={schema} />;
};
