import React from 'react';
import {
  OpenMode,
  useCollectionRecordData,
  useDataBlockRequest,
  useDataBlockResource,
  useRecord,
} from '@tachybase/client';
import { executionSchema } from '@tachybase/module-workflow/client';
import { ISchema } from '@tachybase/schema';

import { Button, Space } from 'antd';

import { lang, tval } from '../locale';

const properties = {
  name: {
    type: 'string',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'cronJobs.name',
    'x-component-props': {},
  },
  enabled: {
    type: 'boolean',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'cronJobs.enabled',
    'x-component-props': {},
  },
  description: {
    type: 'string',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'cronJobs.description',
    'x-component-props': {},
  },
  workflowKey: {
    type: 'string',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'cronJobs.workflowKey',
  },
  startsOn: {
    type: 'DateTime',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'cronJobs.startsOn',
    'x-component-props': {},
  },
  repeat: {
    type: 'string',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'cronJobs.repeat',
    'x-component-props': {},
    'x-reactions': [
      {
        target: 'endsOn',
        fulfill: {
          state: {
            visible: '{{!!$self.value}}',
          },
        },
      },
      {
        target: 'limit',
        fulfill: {
          state: {
            visible: '{{!!$self.value}}',
          },
        },
      },
    ],
  },
  endsOn: {
    type: 'DateTime',
    'x-component': 'EndsByField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'cronJobs.endsOn',
    'x-component-props': {},
  },
  limit: {
    type: 'number',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'cronJobs.limit',
    'x-component-props': {},
  },
};

const createForm: ISchema = {
  type: 'void',
  'x-acl-action-props': {
    skipScopeCheck: true,
  },
  'x-acl-action': 'cronJobs:create',
  'x-decorator': 'FormBlockProvider',
  'x-use-decorator-props': 'useCreateFormBlockDecoratorProps',
  'x-decorator-props': {
    dataSource: 'main',
    collection: 'cronJobs',
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
          'x-acl-action': 'cronJobs:update',
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
          'x-decorator-props': {
            action: 'get',
            dataSource: 'main',
            collection: 'cronJobs',
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
  'x-acl-action': 'cronJobs:list',
  'x-use-decorator-props': 'useTableBlockDecoratorProps',
  'x-decorator-props': {
    collection: 'cronJobs',
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
        name: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            name: {
              'x-collection-field': 'cronJobs.name',
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
              'x-collection-field': 'cronJobs.enabled',
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
        workflowKeyColumn: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          'x-component-props': {
            width: 20,
          },
          properties: {
            workflowKey: {
              'x-collection-field': 'cronJobs.workflowKey',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
              'x-decorator': 'OpenDrawer',
              'x-decorator-props': {
                component: function Com({ children, onClick }) {
                  const cronjob = useCollectionRecordData();
                  return (
                    <Space size="small">
                      {children}
                      {cronjob.workflowKey ? (
                        <Button type="link" onClick={onClick} style={{ padding: 0, marginLeft: '-4px' }}>
                          ({lang('View executions')})
                        </Button>
                      ) : null}
                    </Space>
                  );
                },
              },
              properties: {
                drawer: executionSchema,
              },
            },
          },
        },
        lastTime: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          'x-component-props': {
            width: 20,
          },
          properties: {
            lastTime: {
              'x-collection-field': 'cronJobs.lastTime',
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
        nextTime: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            nextTime: {
              'x-collection-field': 'cronJobs.nextTime',
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
        allExecuted: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          'x-component-props': {
            width: 20,
          },
          properties: {
            allExecuted: {
              'x-collection-field': 'cronJobs.allExecuted',
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
        limit: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          'x-component-props': {
            width: 20,
          },
          properties: {
            limit: {
              'x-collection-field': 'cronJobs.limit',
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
        limitExecuted: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          'x-component-props': {
            width: 20,
          },
          properties: {
            limitExecuted: {
              'x-collection-field': 'cronJobs.limitExecuted',
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
    table,
  },
};
