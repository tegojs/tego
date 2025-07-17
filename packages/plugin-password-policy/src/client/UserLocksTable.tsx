import React from 'react';
import { ExtendCollectionsProvider, SchemaComponent, useTranslation } from '@tachybase/client';

import { userLockCollection } from './collections/userLocks';
import { tval } from './locale';

const createForm = {
  type: 'void',
  'x-acl-action-props': {
    skipScopeCheck: true,
  },
  'x-acl-action': 'userLocks:create',
  'x-decorator': 'FormBlockProvider',
  'x-use-decorator-props': 'useCreateFormBlockDecoratorProps',
  'x-decorator-props': {
    dataSource: 'main',
    collection: 'userLocks',
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
        userId: {
          type: 'string',
          title: tval('Username or Email'),
          required: true,
          'x-component': 'RemoteSelect',
          'x-decorator': 'FormItem',
          'x-component-props': {
            placeholder: tval('Please enter username, nickname or email'),
            fieldNames: {
              label: 'nickname',
              value: 'id',
            },
            service: {
              resource: 'users',
              action: 'list',
              params: {
                filter: {
                  $or: [
                    {
                      lock: {
                        id: {
                          $notExists: true,
                        },
                      },
                    },
                    {
                      lock: {
                        expireAt: {
                          $lt: '{{ new Date() }}',
                        },
                      },
                    },
                  ],
                },
                pageSize: 20,
                sort: ['-id'],
                appends: ['lock'],
              },
            },
            manual: false,
          },
        },
        expireAt: {
          type: 'string',
          title: tval('Lock Until'),
          required: true,
          'x-component': 'DatePicker',
          'x-decorator': 'FormItem',
          'x-component-props': {
            showTime: true,
            disabledDate: '{{ (current) => current && current < new Date() }}',
            placeholder: tval('Please select lock expiration time'),
          },
        },
      },
    },
  },
};

const create = {
  type: 'void',
  'x-action': 'create',
  'x-acl-action': 'create',
  title: tval('Lock New User'),
  'x-component': 'Action',
  'x-decorator': 'ACLActionProvider',
  'x-component-props': {
    openMode: 'drawer',
    type: 'primary',
    icon: 'PlusOutlined',
  },
  'x-align': 'right',
  'x-acl-action-props': {
    skipScopeCheck: true,
  },
  properties: {
    drawer: {
      type: 'void',
      title: tval('Lock New User'),
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

const editAction = {
  type: 'void',
  title: `{{ t("Edit") }}`,
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
      title: `{{ t("Edit") }}`,
      'x-component': 'Action.Container',
      'x-component-props': {
        className: 'tb-action-popup',
      },
      properties: {
        form: {
          type: 'void',
          'x-acl-action-props': {
            skipScopeCheck: false,
          },
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
          'x-decorator-props': {
            dataSource: 'main',
            collection: 'userLocks',
            action: 'get',
            useParams: '{{ useParamsFromRecord }}',
            params: {
              appends: ['user'],
            },
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
                      title: '{{t("Submit")}}',
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
                        skipValidator: false,
                      },
                      type: 'void',
                    },
                  },
                },
                // username: {
                //   type: 'string',
                //   title: '{{ t("Username") }}',
                //   'x-component': 'CollectionField',
                //   'x-read-pretty': true,
                //   'x-decorator': 'FormItem',
                // },
                // nickname: {
                //   type: 'string',
                //   title: '{{ t("Nickname") }}',
                //   'x-component': 'CollectionField',
                //   'x-read-pretty': true,
                //   'x-decorator': 'FormItem',
                // },
                expireAt: {
                  type: 'date',
                  title: tval('Lock Until'),
                  required: true,
                  'x-component': 'DatePicker',
                  'x-component-props': {
                    showTime: true,
                    disabledDate: '{{ (current) => current && current < new Date() }}',
                    placeholder: tval('Please select lock expiration time'),
                  },
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

const table = {
  type: 'void',
  'x-decorator': 'TableBlockProvider',
  'x-acl-action': 'userLocks:list',
  'x-use-decorator-props': 'useTableBlockDecoratorProps',
  'x-decorator-props': {
    dataSource: 'main',
    collection: 'userLocks',
    action: 'list',
    params: {
      pageSize: 20,
      appends: ['user'],
    },
    rowKey: 'id',
    showIndex: true,
    dragSort: false,
  },
  'x-component': 'CardItem',
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
        filter: {
          type: 'void',
          title: `{{ t("Filter") }}`,
          'x-action': 'filter',
          'x-component': 'Filter.Action',
          'x-use-component-props': 'useFilterActionProps',
          'x-component-props': {
            icon: 'FilterOutlined',
          },
          'x-align': 'left',
        },
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
          'x-align': 'right',
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
        username: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            username: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        nickname: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            nickname: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        updatedAt: {
          type: 'void',
          title: tval('Updated At'),
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            updatedAt: {
              'x-collection-field': 'userLocks.updatedAt',
              'x-component': 'CollectionField',
              'x-component-props': {
                ellipsis: true,
                showTime: true,
              },
              'x-read-pretty': true,
              'x-decorator': null,
            },
          },
        },
        expireAt: {
          type: 'void',
          title: tval('Lock Expires At'),
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            expireAt: {
              'x-collection-field': 'userLocks.expireAt',
              'x-component': 'CollectionField',
              'x-component-props': {
                ellipsis: true,
                showTime: true,
              },
              'x-read-pretty': true,
              'x-decorator': null,
            },
          },
        },
        actions: {
          type: 'void',
          title: `{{ t("Actions") }}`,
          'x-action-column': 'actions',
          'x-decorator': 'TableV2.Column.ActionBar',
          'x-component': 'TableV2.Column',
          'x-component-props': {
            width: 200,
            fixed: 'right',
          },
          properties: {
            actions: {
              type: 'void',
              'x-component': 'Space',
              'x-component-props': {
                split: '|',
              },
              properties: {
                edit: editAction,
                destroy: {
                  type: 'void',
                  title: tval('Unlock'),
                  'x-action': 'destroy',
                  'x-component': 'Action.Link',
                  'x-component-props': {
                    danger: true,
                    confirm: {
                      title: tval('Unlock User'),
                      content: tval('Are you sure you want to unlock this user?'),
                    },
                  },
                  'x-decorator': 'ACLActionProvider',
                  'x-use-component-props': 'useDestroyActionProps',
                },
              },
            },
          },
        },
      },
    },
  },
};

const schema = {
  type: 'void',
  properties: {
    userLocks: table,
  },
};

export const UserLockTable: React.FC = () => {
  return (
    <ExtendCollectionsProvider collections={[userLockCollection]}>
      <SchemaComponent schema={schema} />
    </ExtendCollectionsProvider>
  );
};
