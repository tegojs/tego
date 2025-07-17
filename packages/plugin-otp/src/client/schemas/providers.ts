import { OpenMode, useActionContext, useRequest } from '@tachybase/client';
import { ISchema, uid } from '@tachybase/schema';

import { NAMESPACE } from '../locale';

const collectionotp = {
  name: 'verifications_providers',
  fields: [
    {
      type: 'string',
      name: 'id',
      interface: 'input',
      uiSchema: {
        title: '{{t("ID")}}',
        type: 'string',
        'x-component': 'Input',
        required: true,
      },
    },
    {
      type: 'string',
      name: 'title',
      interface: 'input',
      uiSchema: {
        title: '{{t("Title")}}',
        type: 'string',
        'x-component': 'Input',
        required: true,
      },
    },
    {
      type: 'string',
      name: 'type',
      interface: 'select',
      uiSchema: {
        title: `{{t("Provider type", { ns: "${NAMESPACE}" })}}`,
        type: 'string',
        'x-component': 'Select',
        required: true,
        enum: [
          { label: `{{t("Aliyun SMS", { ns: "${NAMESPACE}" })}}`, value: 'sms-aliyun' },
          { label: `{{t("Tencent SMS", { ns: "${NAMESPACE}" })}}`, value: 'sms-tencent' },
        ],
      },
    },
    {
      type: 'radio',
      name: 'default',
      interface: 'checkbox',
      uiSchema: {
        title: '{{t("Default")}}',
        type: 'boolean',
        'x-component': 'Checkbox',
      },
    },
  ],
};

export const update: ISchema = {
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
          'x-acl-action': `verifications_providers:update`,
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
          'x-decorator-props': {
            action: 'get',
            dataSource: 'main',
            collection: collectionotp,
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

export default {
  type: 'void',
  name: 'providers',
  'x-decorator': 'TableBlockProvider',
  'x-decorator-props': {
    collection: collectionotp,
    action: 'list',
    params: {
      pageSize: 50,
      sort: ['-default', 'id'],
      appends: [],
    },
    rowKey: 'id',
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
                  'x-decorator': 'ACLActionProvider',
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
};
