import { useActionContext, useRequest } from '@tachybase/client';
import { ISchema, uid } from '@tachybase/schema';

import { Card } from 'antd';

import collection, { COLLECTION_NAME_MESSAGES_PROVIDERS } from '../../../common/collections/messages_providers';

export const update: ISchema = {
  type: 'void',
  title: '{{ t("Edit") }}',
  'x-action': 'update',
  'x-component': 'Action.Link',
  'x-component-props': {
    openMode: 'drawer',
    icon: 'EditOutlined',
  },
  'x-decorator': 'ACLActionProvider',
  properties: {
    drawer: {
      type: 'void',
      title: '{{ t("Edit record") }}',
      'x-component': 'Action.Container',
      'x-component-props': {
        className: 'tb-action-popup',
      },
      properties: {
        card: {
          type: 'void',
          'x-acl-action-props': {
            skipScopeCheck: false,
          },
          'x-acl-action': `${COLLECTION_NAME_MESSAGES_PROVIDERS}:update`,
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
          'x-decorator-props': {
            action: 'get',
            dataSource: 'main',
            collection: collection,
          },
          'x-component': 'CardItem',
          properties: {
            form: {
              type: 'void',
              'x-component': 'FormV2',
              'x-use-component-props': 'useEditFormBlockProps',
              properties: {
                actionBar: {
                  type: 'void',
                  'x-component': 'ActionBar',
                  'x-component-props': {
                    style: {
                      marginBottom: 24,
                    },
                  },
                  properties: {
                    cancel: {
                      title: '{{ t("Cancel") }}',
                      'x-component': 'Action',
                      'x-use-component-props': 'useCancelActionProps',
                    },
                    submit: {
                      title: '{{ t("Submit") }}',
                      'x-component': 'Action',
                      'x-use-component-props': 'useUpdateActionProps',
                      'x-component-props': {
                        type: 'primary',
                      },
                    },
                  },
                },
                id: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  'x-disabled': true,
                },
                title: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                },
                type: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  'x-disabled': true,
                },
                options: {
                  type: 'object',
                  'x-component': 'ProviderOptions',
                },
                default: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                },
              },
            },
          },
        },
      },
    },
  },
};

export const schemaNotificationProviders = {
  type: 'void',
  name: 'NotificationProviders',
  'x-component': Card,
  'x-component-props': {
    bordered: false,
  },
  properties: {
    tableCard: {
      type: 'void',
      name: 'tableCard',
      'x-decorator': 'TableBlockProvider',
      'x-decorator-props': {
        collection: collection,
        action: 'list',
        params: {
          pageSize: 50,
          sort: ['-default', 'id'],
          appends: [],
        },
      },
      properties: {
        actions: {
          type: 'void',
          'x-component': 'ActionBar',
          'x-component-props': {
            style: {
              marginBottom: 16,
            },
          },
          properties: {
            filter: {
              type: 'void',
              title: '{{ t("Filter") }}',
              'x-action': 'filter',
              'x-designer': 'Filter.Action.Designer',
              'x-component': 'Filter.Action',
              'x-use-component-props': 'useFilterActionProps',
              'x-component-props': { icon: 'FilterOutlined' },
              'x-align': 'left',
            },
            refresher: {
              type: 'void',
              title: '{{ t("Refresh") }}',
              'x-action': 'refresh',
              'x-component': 'Action',
              'x-use-component-props': 'useRefreshActionProps',
              'x-designer': 'Action.Designer',
              'x-component-props': { icon: 'ReloadOutlined' },
              'x-align': 'right',
            },
            delete: {
              type: 'void',
              title: '{{ t("Delete") }}',
              'x-action': 'destroy',
              'x-decorator': 'ACLActionProvider',
              'x-component': 'Action',
              'x-use-component-props': 'useBulkDestroyActionProps',
              'x-component-props': {
                icon: 'DeleteOutlined',
                confirm: {
                  title: "{{t('Delete record')}}",
                  content: "{{t('Are you sure you want to delete it?')}}",
                },
              },
            },
            create: {
              type: 'void',
              title: '{{t("Add new")}}',
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
                              name: `s_${uid()}`,
                            },
                          }),
                        { ...options, refreshDeps: [ctx.visible] },
                      );
                    },
                  },
                  title: '{{t("Add new")}}',
                  properties: {
                    actionBar: {
                      type: 'void',
                      'x-component': 'ActionBar',
                      'x-component-props': {
                        style: {
                          marginBottom: 24,
                        },
                      },
                      properties: {
                        cancel: {
                          title: '{{ t("Cancel") }}',
                          'x-component': 'Action',
                          'x-use-component-props': 'useCancelActionProps',
                        },
                        create: {
                          title: '{{ t("Submit") }}',
                          'x-action': 'submit',
                          'x-component': 'Action',
                          'x-use-component-props': 'useCreateDatabaseConnectionAction',
                          'x-component-props': {
                            type: 'primary',
                          },
                        },
                      },
                    },
                    id: {
                      'x-component': 'CollectionField',
                      'x-decorator': 'FormItem',
                      description:
                        '{{t("Identifier for program usage. Support letters, numbers and underscores, must start with an letter.")}}',
                    },
                    title: {
                      'x-component': 'CollectionField',
                      'x-decorator': 'FormItem',
                    },
                    type: {
                      'x-component': 'CollectionField',
                      'x-decorator': 'FormItem',
                    },
                    options: {
                      type: 'object',
                      'x-component': 'ProviderOptions',
                    },
                    default: {
                      'x-component': 'CollectionField',
                      'x-decorator': 'FormItem',
                    },
                    // footer: {
                    //   type: 'void',
                    //   'x-component': 'Action.Drawer.Footer',
                    //   properties: {
                    //     cancel: {
                    //       title: '{{t("Cancel")}}',
                    //       'x-component': 'Action',
                    //       'x-component-props': {
                    //         useAction: '{{ cm.useCancelAction }}',
                    //       },
                    //     },
                    //     submit: {
                    //       title: '{{t("Submit")}}',
                    //       'x-component': 'Action',
                    //       'x-component-props': {
                    //         type: 'primary',
                    //         useAction: '{{ cm.useCreateAction }}',
                    //       },
                    //     },
                    //   },
                    // },
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
          'x-use-decorator-props': 'useTableBlockDecoratorProps',
          'x-component-props': {
            rowKey: 'id',
            rowSelection: {
              type: 'checkbox',
            },
          },
          properties: {
            id: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              properties: {
                id: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            title: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              properties: {
                title: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            type: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              properties: {
                type: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            default: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              properties: {
                default: {
                  type: 'boolean',
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
                  properties: {
                    update,
                    delete: {
                      type: 'void',
                      title: '{{ t("Delete") }}',
                      'x-action': 'destroy',
                      'x-component': 'Action.Link',
                      'x-use-component-props': 'useDestroyActionProps',
                      'x-component-props': {
                        confirm: {
                          title: "{{t('Delete record')}}",
                          content: "{{t('Are you sure you want to delete it?')}}",
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
