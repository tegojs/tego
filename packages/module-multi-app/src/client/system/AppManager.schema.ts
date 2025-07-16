import React from 'react';
import { SchemaComponentOptions, useActionContext, useRequest } from '@tachybase/client';
import { ISchema, uid } from '@tachybase/schema';

import { collectionMultiApp } from '../base/collections/collectionMultiApp';
import { formSchema } from '../base/schemas/schemaForm';
import { tableActionColumnSchema } from '../base/schemas/schemaTableActionColumn';
import { i18nText } from '../locale';

export const schemaAppManager: ISchema = {
  type: 'void',
  properties: {
    applicationsTable: {
      type: 'void',
      'x-decorator': 'TableBlockProvider',
      'x-decorator-props': {
        collection: collectionMultiApp,
        action: 'list',
        params: {
          pageSize: 20,
          sort: ['-createdAt'],
          appends: ['partners.id', 'partners.username'],
          filter: "{{ admin ? {} : { '$or': [ { createdById: userId }, { 'partners.id': { '$in': [userId] } } ] } }}",
        },
        rowKey: 'name',
      },
      properties: {
        GlobalNotificationHandler: {
          type: 'void',
          'x-component': 'GlobalNotificationHandler',
        },
        actions: {
          type: 'void',
          'x-component': 'ActionBar',
          'x-component-props': {
            style: {
              marginBottom: 16,
            },
          },
          properties: {
            fuzzySearch: {
              type: 'void',
              'x-component': 'FuzzySearchInput',
              'x-align': 'left',
            },
            refresh: {
              type: 'void',
              title: '{{ t("Refresh") }}',
              'x-component': 'Action',
              'x-use-component-props': 'useRefreshActionProps',
              'x-component-props': {
                icon: 'ReloadOutlined',
              },
            },
            delete: {
              type: 'void',
              title: '{{ t("Delete") }}',
              'x-action': 'destroy',
              'x-component': 'Action',
              'x-decorator': 'ACLActionProvider',
              'x-use-component-props': 'useBulkDestroyActionProps',
              'x-component-props': {
                icon: 'DeleteOutlined',
                confirm: {
                  title: "{{t('Delete')}}",
                  content: "{{t('Are you sure you want to delete it?')}}",
                },
              },
              'x-hidden': '{{ !admin }}',
            },
            startAll: {
              type: 'void',
              title: '{{ t("Start all") }}',
              'x-component': 'Action',
              'x-use-component-props': 'useStartAllAction',
              'x-component-props': {
                icon: 'FastForwardOutlined',
                danger: true,
                confirm: {
                  title: i18nText('Start all'),
                  content: i18nText(
                    'Starting all sub-applications may cause lag. The more applications you have, the longer the waiting time',
                  ),
                },
              },
              'x-hidden': '{{ !admin }}',
            },
            stopAll: {
              type: 'void',
              title: '{{ t("Stop all") }}',
              'x-component': 'Action',
              'x-use-component-props': 'useStopAllAction',
              'x-component-props': {
                icon: 'StopOutlined',
                danger: true,
                confirm: {
                  title: i18nText('Stop all'),
                  content: i18nText('All sub-applications have stopped serving, unless you restart them'),
                },
              },
              'x-hidden': '{{ !admin }}',
            },
            create: {
              type: 'void',
              title: '{{t("Add new")}}',
              'x-decorator': (props) =>
                React.createElement(SchemaComponentOptions, { ...props, scope: { createOnly: true } }),
              'x-component': 'Action',
              'x-component-props': {
                type: 'primary',
                icon: 'PlusOutlined',
              },
              properties: {
                drawer: {
                  type: 'void',
                  'x-component': 'Action.Drawer',
                  'x-decorator': 'Form',
                  'x-decorator-props': {
                    useValues(options) {
                      const ctx = useActionContext();
                      return useRequest(
                        () =>
                          Promise.resolve({
                            data: {
                              name: `a_${uid()}`,
                            },
                          }),
                        { ...options, refreshDeps: [ctx.visible] },
                      );
                    },
                  },
                  title: '{{t("Add new")}}',
                  properties: {
                    formSchema,
                    footer: {
                      type: 'void',
                      'x-component': 'Action.Drawer.Footer',
                      properties: {
                        cancel: {
                          title: '{{t("Cancel")}}',
                          'x-component': 'Action',
                          'x-use-component-props': 'useCancelActionProps',
                        },
                        submit: {
                          title: '{{ t("Submit") }}',
                          'x-component': 'Action',
                          'x-use-component-props': 'useCreateDatabaseConnectionAction',
                          'x-component-props': {
                            type: 'primary',
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
        table: {
          type: 'array',
          'x-uid': 'input',
          'x-component': 'TableV2',
          'x-use-component-props': 'useTableBlockProps',
          'x-component-props': {
            rowKey: 'name',
            rowSelection: {
              type: 'checkbox',
            },
          },
          properties: {
            displayName: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              properties: {
                displayName: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            name: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              properties: {
                name: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            pinned: {
              type: 'void',
              title: i18nText('Pin to menu'),
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              properties: {
                pinned: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            isTemplate: {
              type: 'void',
              title: i18nText('Is template'),
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              properties: {
                isTemplate: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            status: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              properties: {
                status: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            actions: {
              type: 'void',
              title: '{{t("Actions")}}',
              'x-component': 'TableV2.Column',
              properties: {
                actions: {
                  type: 'void',
                  'x-component': 'Space',
                  'x-component-props': {
                    split: '|',
                  },
                  ...tableActionColumnSchema,
                },
              },
            },
          },
        },
      },
    },
  },
};
