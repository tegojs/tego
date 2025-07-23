import { OpenMode } from '../../../schema-component';
import { ActionInitializer } from '../../../schema-initializer/items/ActionInitializer';

export const ViewActionInitializer = (props) => {
  const schema = {
    type: 'void',
    title: '{{ t("View") }}',
    'x-action': 'view',
    'x-toolbar': 'ActionSchemaToolbar',
    'x-settings': 'actionSettings:view',
    'x-component': 'Action',
    'x-component-props': {
      openMode: OpenMode.DEFAULT,
    },
    properties: {
      drawer: {
        type: 'void',
        title: '{{ t("View record") }}',
        'x-component': 'Action.Container',
        'x-component-props': {
          className: 'tb-action-popup',
        },
        properties: {
          page: {
            type: 'void',
            title: '{{ t("Details") }}',
            'x-component': 'Page',
            properties: {
              grid: {
                type: 'void',
                'x-component': 'Grid',
                'x-initializer': 'popup:common:addBlock',
              },
            },
          },
        },
      },
    },
  };
  return <ActionInitializer {...props} schema={schema} />;
};
