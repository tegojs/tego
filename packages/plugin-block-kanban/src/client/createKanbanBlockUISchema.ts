import { OpenMode } from '@tachybase/client';
import { ISchema, uid } from '@tachybase/schema';

export const createKanbanBlockUISchema = (options: {
  collectionName: string;
  groupField: string;
  sortField: string;
  dataSource: string;
  params?: Record<string, any>;
}): ISchema => {
  const { collectionName, groupField, sortField, dataSource, params } = options;

  return {
    type: 'void',
    'x-acl-action': `${collectionName}:list`,
    'x-decorator': 'KanbanBlockProvider',
    'x-decorator-props': {
      collection: collectionName,
      action: 'list',
      groupField,
      sortField,
      params: {
        paginate: false,
        ...params,
      },
      dataSource,
    },
    // 'x-designer': 'Kanban.Designer',
    'x-toolbar': 'BlockSchemaToolbar',
    'x-settings': 'blockSettings:kanban',
    'x-component': 'CardItem',
    properties: {
      actions: {
        type: 'void',
        'x-initializer': 'kanban:configureActions',
        'x-component': 'ActionBar',
        'x-component-props': {
          style: {
            marginBottom: 'var(--tb-spacing)',
          },
        },
        properties: {},
      },
      [uid()]: {
        type: 'array',
        'x-component': 'Kanban',
        'x-use-component-props': 'useKanbanBlockProps',
        properties: {
          card: {
            type: 'void',
            'x-read-pretty': true,
            'x-label-disabled': true,
            'x-decorator': 'BlockItem',
            'x-component': 'Kanban.Card',
            'x-component-props': {
              openMode: OpenMode.DRAWER_MODE,
            },
            'x-designer': 'Kanban.Card.Designer',
            properties: {
              grid: {
                type: 'void',
                'x-component': 'Grid',
                'x-component-props': { dndContext: false },
              },
            },
          },
          cardViewer: {
            type: 'void',
            title: '{{ t("View") }}',
            'x-designer': 'Action.Designer',
            'x-component': 'Kanban.CardViewer',
            'x-action': 'view',
            'x-component-props': {
              openMode: OpenMode.DRAWER_MODE,
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
                            'x-initializer': 'popup:common:addBlock',
                            properties: {},
                          },
                        },
                      },
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
};
