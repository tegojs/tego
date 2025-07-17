import { OpenMode } from '../../../schema-component';
import { ActionInitializer } from '../../../schema-initializer/items/ActionInitializer';

export const UpdateActionInitializer = (props) => {
  const schema = {
    type: 'void',
    title: '{{ t("Edit") }}',
    'x-action': 'update',
    'x-toolbar': 'ActionSchemaToolbar',
    'x-settings': 'actionSettings:edit',
    'x-component': 'Action',
    'x-component-props': {
      openMode: OpenMode.DRAWER_MODE,
      icon: 'EditOutlined',
    },
    properties: {
      subContainer: {
        type: 'void',
        title: '{{ t("Edit record") }}',
        'x-component': 'ContentContainer',
        'x-component-props': {
          className: 'tb-action-popup',
        },
        properties: {
          grid: {
            type: 'void',
            'x-component': 'Grid',
            'x-initializer': 'popup:common:addBlock',
          },
        },
      },
    },
  };
  return <ActionInitializer {...props} schema={schema} />;
};
