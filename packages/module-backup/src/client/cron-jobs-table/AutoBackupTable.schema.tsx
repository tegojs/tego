import { OpenMode, useDataBlockRequest, useDataBlockResource, useRecord } from '@tachybase/client';
import { ISchema } from '@tachybase/schema';

import { tval } from '../locale';

const properties = {
  name: {
    type: 'string',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'autoBackup.name',
    'x-component-props': {},
  },
  title: {
    type: 'string',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'autoBackup.title',
    'x-component-props': {},
  },
  enabled: {
    type: 'boolean',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'autoBackup.enabled',
    'x-component-props': {},
  },
  // description: {
  //   type: 'string',
  //   'x-component': 'CollectionField',
  //   'x-decorator': 'FormItem',
  //   'x-collection-field': 'autoBackup.description',
  //   'x-component-props': {},
  // },
  // workflowKey: {
  //   type: 'string',
  //   'x-component': 'CollectionField',
  //   'x-decorator': 'FormItem',
  //   'x-collection-field': 'autoBackup.workflowKey',
  // },
  // startsOn: {
  //   type: 'DateTime',
  //   'x-component': 'CollectionField',
  //   'x-decorator': 'FormItem',
  //   'x-collection-field': 'autoBackup.startsOn',
  //   'x-component-props': {},
  // },
  repeat: {
    type: 'string',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'autoBackup.repeat',
    'x-component-props': {},
  },
  dumpRules: {
    title: '{{ t("Dump rules") }}',
    type: 'array',
    'x-component': 'Checkbox.Group',
    'x-decorator': 'FormItem',
    'x-component-props': {
      style: {
        display: 'flex',
        flexDirection: 'column', // 竖向排列
      },
      options: '{{ dumpRuleTypes }}',
    },
    'x-reactions': (field) => {
      const value = new Set(field.value || []);
      value.add('required'); // 👈 始终加入
      field.value = Array.from(value);
    },
  },
  maxNumber: {
    title: '{{ t("Max number") }}',
    description: '{{ t("Keep only the maximum number and delete the oldest versions with redundant time.") }}',
    type: 'number',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'autoBackup.maxNumber',
    'x-component-props': {},
  },
};

const createForm: ISchema = {
  type: 'void',
  'x-acl-action-props': {
    skipScopeCheck: true,
  },
  'x-acl-action': 'autoBackup:create',
  'x-decorator': 'FormBlockProvider',
  'x-use-decorator-props': 'useCreateFormBlockDecoratorProps',
  'x-decorator-props': {
    dataSource: 'main',
    collection: 'autoBackup',
  },
  'x-component': 'CardItem',
  properties: {
    form: {
      type: 'void',
      'x-component': 'FormV2',
      'x-use-component-props': 'useCreateFormBlockProps',
      properties: {
        actionBar: {
          type: 'void',
          'x-component': 'ActionBar',
          'x-component-props': {
            style: {
              marginBottom: 'var(--tb-spacing)',
            },
          },
          properties: {
            submit: {
              title: '{{t("Submit")}}',
              'x-action': 'submit',
              'x-component': 'Action',
              'x-use-component-props': 'useCreateActionProps',
              'x-component-props': {
                type: 'primary',
                htmlType: 'submit',
              },
              type: 'void',
            },
          },
        },
        ...properties,
      },
    },
  },
};

const create = {
  type: 'void',
  'x-action': 'create',
  'x-acl-action': 'create',
  title: "{{t('Add new')}}",
  'x-component': 'Action',
  'x-decorator': 'ACLActionProvider',
  'x-component-props': {
    openMode: OpenMode.DRAWER_MODE,
    type: 'primary',
    component: 'CreateRecordAction',
    icon: 'PlusOutlined',
  },
  'x-align': 'right',
  'x-acl-action-props': {
    skipScopeCheck: true,
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
        form: createForm,
      },
    },
  },
};

const editAction: ISchema = {
  type: 'void',
  title: '{{ t("Edit") }}',
  'x-action': 'update',
  'x-component': 'Action.Link',
  'x-component-props': {
    openMode: OpenMode.DRAWER_MODE,
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
          'x-acl-action': 'autoBackup:update',
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
          'x-decorator-props': {
            action: 'get',
            dataSource: 'main',
            collection: 'autoBackup',
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
                      marginBottom: 'var(--tb-spacing)',
                    },
                  },
                  properties: {
                    submit: {
                      title: '{{ t("Submit") }}',
                      'x-action': 'submit',
                      'x-component': 'Action',
                      'x-use-component-props': 'useUpdateActionProps',
                      'x-component-props': {
                        type: 'primary',
                        htmlType: 'submit',
                      },
                      'x-action-settings': {
                        triggerWorkflows: [],
                        onSuccess: {
                          manualClose: false,
                          redirecting: false,
                          successMessage: '{{t("Updated successfully")}}',
                        },
                        isDeltaChanged: false,
                      },
                      type: 'void',
                    },
                  },
                },
                ...properties,
              },
            },
          },
        },
      },
    },
  },
};

export const table = {
  type: 'void',
  'x-decorator': 'TableBlockProvider',
  'x-acl-action': 'autoBackup:list',
  'x-use-decorator-props': 'useTableBlockDecoratorProps',
  'x-decorator-props': {
    collection: 'autoBackup',
    dataSource: 'main',
    action: 'list',
    params: {
      pageSize: 20,
    },
    rowKey: 'id',
    showIndex: true,
    dragSort: false,
  },
  'x-component': 'CardItem',
  'x-filter-targets': [],
  properties: {
    actions: {
      type: 'void',
      'x-component': 'ActionBar',
      'x-component-props': {
        style: {
          marginBottom: 'var(--tb-spacing)',
        },
      },
      properties: {
        refresh: {
          type: 'void',
          title: '{{ t("Refresh") }}',
          'x-action': 'refresh',
          'x-component': 'Action',
          'x-settings': 'actionSettings:refresh',
          'x-component-props': {
            icon: 'ReloadOutlined',
          },
          'x-use-component-props': 'useRefreshActionProps',
        },
        create,
      },
    },
    table: {
      type: 'array',
      'x-component': 'TableV2',
      'x-use-component-props': 'useTableBlockProps',
      'x-component-props': {
        rowKey: 'id',
        rowSelection: {
          type: 'checkbox',
        },
      },
      properties: {
        title: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            title: {
              'x-collection-field': 'autoBackup.title',
              'x-component': 'CollectionField',
              'x-component-props': {
                ellipsis: true,
              },
              'x-read-pretty': true,
              'x-decorator': null,
              'x-decorator-props': {
                labelStyle: {
                  display: 'none',
                },
              },
            },
          },
        },
        enabled: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            enabled: {
              'x-collection-field': 'autoBackup.enabled',
              'x-component': 'CollectionField',
              'x-component-props': {
                ellipsis: true,
              },
              'x-read-pretty': true,
              'x-decorator': null,
              'x-decorator-props': {
                labelStyle: {
                  display: 'none',
                },
              },
            },
          },
        },
        // lastTime: {
        //   type: 'void',
        //   'x-decorator': 'TableV2.Column.Decorator',
        //   'x-component': 'TableV2.Column',
        //   'x-component-props': {
        //     width: 20,
        //   },
        //   properties: {
        //     lastTime: {
        //       'x-collection-field': 'autoBackup.lastTime',
        //       'x-component': 'CollectionField',
        //       'x-component-props': {
        //         ellipsis: true,
        //       },
        //       'x-read-pretty': true,
        //       'x-decorator': null,
        //       'x-decorator-props': {
        //         labelStyle: {
        //           display: 'none',
        //         },
        //       },
        //     },
        //   },
        // },
        maxNumber: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            maxNumber: {
              'x-collection-field': 'autoBackup.maxNumber',
              'x-component': 'CollectionField',
              'x-component-props': {
                ellipsis: true,
              },
              'x-read-pretty': true,
              'x-decorator': null,
              'x-decorator-props': {
                labelStyle: {
                  display: 'none',
                },
              },
            },
          },
        },
        actions: {
          type: 'void',
          title: '{{ t("Actions") }}',
          'x-action-column': 'actions',
          'x-decorator': 'TableV2.Column.ActionBar',
          'x-component': 'TableV2.Column',
          'x-component-props': {
            width: 100,
            fixed: 'right',
          },
          properties: {
            actions: {
              type: 'void',
              'x-component': 'Space',
              properties: {
                editAction,
                delete: {
                  type: 'void',
                  title: 'Delete',
                  'x-action': 'destroy',
                  'x-component': 'Action.Link',
                  'x-component-props': {
                    confirm: {
                      title: 'Delete',
                      content: 'Are you sure you want to delete it?',
                    },
                  },
                  'x-decorator': 'ACLActionProvider',
                  'x-use-component-props': 'useDestroyActionProps',
                },
                clear: {
                  type: 'void',
                  title: tval('Clear current times'),
                  'x-action': 'clearLimit',
                  'x-component': 'Action.Link',
                  'x-component-props': {
                    confirm: {
                      title: 'Clear',
                      content: 'Are you sure you want to clear current times?',
                    },
                  },
                  'x-decorator': 'ACLActionProvider',
                  'x-use-component-props': () => {
                    const { refresh } = useDataBlockRequest();
                    const resource = useDataBlockResource();
                    const record = useRecord();
                    return {
                      async onClick() {
                        await resource.clearLimitExecuted({
                          id: record.id,
                        });
                        refresh();
                      },
                    };
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

export const schema = {
  type: 'void',
  properties: {
    autoBackupTable: table,
  },
};
