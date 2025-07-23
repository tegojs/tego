import { OpenMode } from '@tachybase/client';

export const getSchemaCheckLink = (params) => {
  const { record } = params;
  return {
    name: `view-${record.id}`,
    type: 'void',
    title: '{{t("View", {"ns":["messages","client"]})}}',
    'x-action': 'view',
    'x-decorator': 'ACLActionProvider',
    'x-component': 'Action.Link',
    'x-component-props': {
      openMode: OpenMode.DRAWER_MODE,
    },
    'x-use-component-props': 'usePropsCheckLink',
    properties: {
      drawer: {
        type: 'void',
        title: '{{t("View record", {"ns":["messages","client"]})}}',
        'x-component': 'Action.Drawer',
        'x-component-props': {
          className: 'tb-action-popup',
        },
        properties: {
          checkContent: {
            type: 'void',
            'x-component': 'ViewCheckContent',
            'x-component-props': {
              record,
            },
          },
        },
      },
    },
  };
};
