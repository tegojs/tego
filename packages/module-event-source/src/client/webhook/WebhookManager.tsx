import React, { useContext, useEffect, useState } from 'react';
import {
  ExtendCollectionsProvider,
  SchemaComponent,
  TableBlockProvider,
  useBlockRequestContext,
  useCollectionRecord,
  useCollectionRecordData,
  useCollections,
  useCompile,
  useDataBlock,
  useDataBlockRequest,
  useDataBlockResource,
  usePlugin,
  useTableBlockContext,
  withDynamicSchemaProps,
  WorkflowSelect,
} from '@tachybase/client';
import { CodeMirror } from '@tachybase/components';
import {
  ExecutionLink,
  ExecutionRetryAction,
  executionSchema,
  ExecutionStatusColumn,
  OpenDrawer,
} from '@tachybase/module-workflow/client';
import { ISchema, useField, useForm } from '@tachybase/schema';

import { Alert as AntdAlert, Button, Space, Tag, Typography } from 'antd';

import ModuleEventSourceClient from '..';
import { lang, tval } from '../locale';
import { dispatchers } from './collections/dispatchers';
import { TypeContainer } from './components/TypeContainer';

// TODO
export const ExecutionResourceProvider = ({ params, filter = {}, ...others }) => {
  const webhook = useCollectionRecordData();
  const props = {
    ...others,
    params: {
      ...params,
      filter: {
        ...params?.filter,
        key: webhook.workflowKey,
      },
    },
  };

  return <TableBlockProvider {...props} />;
};

export const useTestActionProps = () => {
  const form = useForm();
  const webhook = useCollectionRecordData();
  const resource = useDataBlockResource();
  return {
    async onClick() {
      const res = await resource.test({
        values: {
          body: JSON.parse(form.values.body || '{}'),
          params: JSON.parse(form.values.params || '{}'),
          name: webhook.name,
        },
      });
      alert(JSON.stringify(res.data));
    },
  };
};

const properties = {
  name: {
    type: 'string',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'webhooks.name',
    'x-component-props': {},
  },
  enabled: {
    type: 'string',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'webhooks.enabled',
    'x-component-props': {},
  },
  workflowKey: {
    type: 'string',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'webhooks.workflowKey',
  },
  type: {
    type: 'string',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-collection-field': 'webhooks.type',
  },
  options: {
    type: 'object',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-reactions': {
      dependencies: ['type'],
      fulfill: {
        schema: {
          'x-component-props': '{{ useTypeOptions($deps[0]) }}',
        },
      },
    },
    'x-collection-field': 'webhooks.options',
  },
  code: {
    type: 'string',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-decorator-props': {
      tooltip: 'ctx.request\nctx.body\nlib.JSON\nlib.Math\nlib.dayjs',
    },
    'x-collection-field': 'webhooks.code',
  },
  effectConfig: {
    title: tval('Effect config'),
    type: 'string',
    'x-component': 'CodeMirror',
    'x-component-props': {
      options: {
        readOnly: true,
      },
    },
    'x-decorator': 'FormItem',
    'x-decorator-props': {
      tooltip: tval('The real effect of the server, not the preset configuration'),
    },
    'x-collection-field': 'webhooks.effectConfig',
  },
};

const createForm: ISchema = {
  type: 'void',
  'x-acl-action-props': {
    skipScopeCheck: true,
  },
  'x-acl-action': 'webhooks:create',
  'x-decorator': 'FormBlockProvider',
  'x-use-decorator-props': 'useCreateFormBlockDecoratorProps',
  'x-decorator-props': {
    dataSource: 'main',
    collection: dispatchers.name,
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

const editAction: ISchema = {
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
          'x-acl-action': 'webhooks:update',
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
          'x-decorator-props': {
            action: 'get',
            dataSource: 'main',
            collection: dispatchers,
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

const deleteAction: ISchema = {
  title: '{{ t("Delete") }}',
  'x-action': 'destroy',
  'x-component': 'Action.Link',
  'x-use-component-props': 'useDestroyActionProps',
  'x-component-props': {
    icon: 'DeleteOutlined',
    confirm: {
      title: "{{t('Delete record')}}",
      content: "{{t('Are you sure you want to delete it?')}}",
    },
  },
  'x-action-settings': {
    triggerWorkflows: [],
  },
  'x-decorator': 'ACLActionProvider',
  type: 'void',
};

const testAction: ISchema = {
  type: 'void',
  title: '{{ t("Test") }}',
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
          'x-acl-action': 'webhooks:update',
          'x-decorator': 'FormBlockProvider',
          'x-decorator-props': {
            action: 'get',
            dataSource: 'main',
            collection: dispatchers.name,
          },
          'x-component': 'CardItem',
          properties: {
            testForm: {
              type: 'void',
              'x-component': 'FormV2',
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
                      'x-use-component-props': 'useTestActionProps',
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
                params: {
                  type: 'string',
                  'x-component': 'CodeMirror',
                  'x-component-props': {
                    defaultValue: '{}',
                  },
                  'x-decorator': 'FormItem',
                  'x-decorator-props': {
                    label: 'query',
                  },
                },
                body: {
                  type: 'string',
                  'x-component': 'CodeMirror',
                  'x-component-props': {
                    defaultValue: '{}',
                  },
                  'x-decorator': 'FormItem',
                  'x-decorator-props': {
                    label: 'body',
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

const schema: ISchema = {
  type: 'void',
  properties: {
    table: {
      type: 'void',
      'x-decorator': 'TableBlockProvider',
      'x-acl-action': 'webhooks:list',
      'x-use-decorator-props': 'useTableBlockDecoratorProps',
      'x-decorator-props': {
        collection: dispatchers,
        dataSource: 'main',
        action: 'list',
        params: {
          pageSize: 20,
          appends: ['updatedBy'],
          sort: ['-createdAt'],
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
            filter: {
              type: 'void',
              title: '{{ t("Filter") }}',
              default: {
                $and: [{ name: { $includes: '' } }],
              },
              'x-action': 'filter',
              'x-component': 'Filter.Action',
              'x-use-component-props': 'useFilterActionProps',
              'x-component-props': {
                icon: 'FilterOutlined',
              },
              'x-align': 'left',
            },
            fuzzySearch: {
              type: 'void',
              'x-component': 'FuzzySearchInput',
              'x-align': 'left',
            },
            refresh: {
              type: 'void',
              title: '{{ t("Refresh") }}',
              'x-component': 'Action',
              'x-component-props': {
                icon: 'ReloadOutlined',
              },
              'x-use-component-props': 'useRefreshActionProps',
            },
            create: {
              type: 'void',
              'x-action': 'create',
              'x-acl-action': 'create',
              title: "{{t('Add new')}}",
              'x-component': 'Action',
              'x-decorator': 'ACLActionProvider',
              'x-component-props': {
                openMode: 'drawer',
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
            },
          },
        },
        alert: {
          type: 'void',
          'x-component': 'Alert',
          'x-use-component-props': 'useShowAlertProps',
          'x-component-props': {
            message: tval(
              'configuration has changed, please click the restart in the upper right corner, or configure the service with EVENT_SOURCE_REALTIME=1 to start in real time',
            ),
            type: 'warning',
            showIcon: true,
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
            nameColumn: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                width: 50,
                sorter: true,
              },
              properties: {
                name: {
                  'x-collection-field': 'webhooks.name',
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
            enabledColumn: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                width: 20,
              },
              properties: {
                enabled: {
                  type: 'boolean',
                  'x-collection-field': 'webhooks.enabled',
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
                  'x-collection-field': 'webhooks.workflowKey',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                  'x-decorator': 'OpenDrawer',
                  'x-decorator-props': {
                    component: ({ children, onClick }) => {
                      const webhook = useCollectionRecordData();
                      return (
                        <Space size="small">
                          {children}
                          {webhook.workflowKey ? (
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
            typeColumn: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                width: 20,
                sorter: true,
              },
              properties: {
                type: {
                  'x-collection-field': 'webhooks.type',
                  'x-component': 'CollectionField',
                  'x-component-props': {},
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
            effectColumn: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                width: 20,
                sorter: true,
              },
              properties: {
                effect: {
                  type: 'boolean',
                  'x-collection-field': 'webhooks.effect',
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
            updatedAt: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                sorter: true,
                width: 20,
                align: 'center',
                style: {
                  display: 'grid',
                  placeItems: 'center',
                },
              },
              properties: {
                updatedAt: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            updatedBy: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                sorter: true,
                width: 20,
                align: 'center',
                style: {
                  display: 'grid',
                  placeItems: 'center',
                },
              },
              properties: {
                updatedBy: {
                  type: 'string',
                  'x-collection-field': 'webhooks.updatedBy',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            actionColumn: {
              type: 'void',
              title: '{{ t("Actions") }}',
              'x-decorator': 'TableV2.Column.ActionBar',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                width: 150,
                fixed: 'right',
              },
              'x-action-column': 'actions',
              properties: {
                space: {
                  type: 'void',
                  'x-component': 'Space',
                  properties: {
                    editAction,
                    deleteAction,
                    testAction,
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

const useShowAlertProps = (props) => {
  const service: any = useDataBlockRequest();
  const isChanged = service?.data?.meta?.changed;

  return {
    style: {
      ...props.style,
      visibility: isChanged ? 'visible' : 'hidden',
    },
  };
};

export const WebhookManager = () => {
  const plugin = usePlugin(ModuleEventSourceClient);
  const typeList = [];
  for (const type of plugin.triggers.getKeys()) {
    typeList.push({
      label: plugin.triggers.get(type).title,
      description: plugin.triggers.get(type).description,
      value: type,
    });
  }

  const useTypeOptions = (type) => {
    return {
      options: plugin.triggers?.get(type)?.options,
    };
  };

  const useTriggersOptions = () => {
    const compile = useCompile();
    const result = Array.from(plugin.triggers.getEntities())
      .map(([value, { title, ...options }]) => ({
        value,
        label: compile(title),
        color: 'gold',
        options,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return result;
  };

  return (
    <ExtendCollectionsProvider collections={[dispatchers]}>
      <SchemaComponent
        name="eventSource"
        schema={schema}
        scope={{
          useTestActionProps,
          useTriggersOptions,
          useTypeOptions,
          ExecutionRetryAction,
          useShowAlertProps,
        }}
        components={{
          Alert: withDynamicSchemaProps(AntdAlert),
          ExecutionStatusColumn,
          ExecutionResourceProvider,
          OpenDrawer,
          ExecutionLink,
          WorkflowSelect,
          CodeMirror,
          TypeContainer,
        }}
      />
    </ExtendCollectionsProvider>
  );
};
