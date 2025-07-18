import { useContext } from 'react';
import { i18n, OpenMode, useActionContext, useRequest } from '@tachybase/client';
import { ISchema, uid } from '@tachybase/schema';

import { AuthTypeContext } from '../authType';

const collection = {
  name: 'authenticators',
  sortable: true,
  fields: [
    {
      name: 'id',
      type: 'string',
      interface: 'id',
    },
    {
      interface: 'input',
      type: 'string',
      name: 'name',
      uiSchema: {
        type: 'string',
        title: '{{t("Auth UID")}}',
        'x-component': 'Input',
        'x-validator': (value: string) => {
          if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            return i18n.t('a-z, A-Z, 0-9, _, -');
          }
          return '';
        },
        required: true,
      },
    },
    {
      interface: 'input',
      type: 'string',
      name: 'authType',
      uiSchema: {
        type: 'string',
        title: '{{t("Auth Type")}}',
        'x-component': 'Select',
        dataSource: '{{ types }}',
        required: true,
      },
    },
    {
      interface: 'input',
      type: 'string',
      name: 'title',
      uiSchema: {
        type: 'string',
        title: '{{t("Title")}}',
        'x-component': 'Input',
      },
    },
    {
      interface: 'textarea',
      type: 'string',
      name: 'description',
      uiSchema: {
        type: 'string',
        title: '{{t("Description")}}',
        'x-component': 'Input',
      },
    },
    {
      type: 'boolean',
      name: 'enabled',
      uiSchema: {
        type: 'boolean',
        title: '{{t("Enabled")}}',
        'x-component': 'Checkbox',
      },
    },
  ],
};

export const createFormSchema: ISchema = {
  type: 'object',
  properties: {
    drawer: {
      type: 'void',
      'x-component': 'Action.Drawer',
      'x-decorator': 'Form',
      'x-decorator-props': {
        useValues(options) {
          const ctx = useActionContext();
          const { type: authType } = useContext(AuthTypeContext);
          return useRequest(
            () =>
              Promise.resolve({
                data: {
                  name: `s_${uid()}`,
                  authType,
                },
              }),
            { ...options, refreshDeps: [ctx.visible] },
          );
        },
      },
      title: '{{t("Add new")}}',
      properties: {
        name: {
          'x-component': 'CollectionField',
          'x-decorator': 'FormItem',
        },
        authType: {
          'x-component': 'CollectionField',
          'x-decorator': 'FormItem',
          'x-component-props': {
            options: '{{ types }}',
          },
        },
        title: {
          'x-component': 'CollectionField',
          'x-decorator': 'FormItem',
        },
        description: {
          'x-component': 'CollectionField',
          'x-decorator': 'FormItem',
        },
        enabled: {
          'x-component': 'CollectionField',
          'x-decorator': 'FormItem',
        },
        options: {
          type: 'object',
          'x-component': 'Options',
        },
        footer: {
          type: 'void',
          'x-component': 'Action.Drawer.Footer',
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
      },
    },
  },
};

export const updateAuthenticator: ISchema = {
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
          'x-acl-action': `authenticators:update`,
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
                name: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                },
                authType: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  'x-component-props': {
                    options: '{{ types }}',
                  },
                },
                title: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                },
                description: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                },
                enabled: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                },
                options: {
                  type: 'object',
                  'x-component': 'Options',
                },
              },
            },
          },
        },
      },
    },
  },
};

export const authenticatorsSchema: ISchema = {
  type: 'void',
  name: 'authenticators',
  'x-decorator': 'TableBlockProvider',
  'x-decorator-props': {
    collection: collection,
    dragSort: true,
    action: 'list',
    params: {
      pageSize: 50,
      sort: 'sort',
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
        delete: {
          type: 'void',
          title: '{{t("Delete")}}',
          'x-action': 'destroy',
          'x-decorator': 'ACLActionProvider',
          'x-component': 'Action',
          'x-use-component-props': 'useBulkDestroyActionProps',
          'x-component-props': {
            icon: 'DeleteOutlined',
            confirm: {
              title: "{{t('Delete')}}",
              content: "{{t('Are you sure you want to delete it?')}}",
            },
          },
        },
        create: {
          type: 'void',
          title: '{{t("Add new")}}',
          'x-component': 'AddNew',
          'x-component-props': {
            type: 'primary',
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
              type: 'number',
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
        authType: {
          title: '{{t("Auth Type")}}',
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            authType: {
              type: 'string',
              'x-component': 'Select',
              'x-read-pretty': true,
              enum: '{{ types }}',
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
        description: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            description: {
              type: 'boolean',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        enabled: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            enabled: {
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
                updateAuthenticator,
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
                  'x-disabled': '{{ useCanNotDelete() }}',
                },
              },
            },
          },
        },
      },
    },
  },
};
