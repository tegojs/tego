import React from 'react';
import {
  Input,
  useActionContext,
  useCollectionRecordData,
  useDataBlockRequest,
  useDataBlockResource,
} from '@tachybase/client';
import { ISchema } from '@tachybase/schema';

import { message } from 'antd';
import { Link } from 'react-router-dom';

import { getExecutionTime } from '../components/ExecutionTime';
import { ExecutionStatusOptions } from '../constants';
import { NAMESPACE, useTranslation } from '../locale';
import { getWorkflowDetailPath } from '../utils';

export const executionCollection = {
  name: 'executions',
  fields: [
    {
      interface: 'id',
      type: 'bigInt',
      name: 'id',
      uiSchema: {
        type: 'number',
        title: '{{t("ID")}}',
        'x-component': 'Input',
        'x-component-props': {},
        'x-read-pretty': true,
      } as ISchema,
    },
    {
      interface: 'createdAt',
      type: 'datetime',
      name: 'createdAt',
      uiSchema: {
        type: 'datetime',
        title: `{{t("Triggered at", { ns: "${NAMESPACE}" })}}`,
        'x-component': 'DatePicker',
        'x-component-props': {},
        'x-read-pretty': true,
      } as ISchema,
    },
    {
      interface: 'bigInt',
      type: 'bigInt',
      name: 'executionCost',
      uiSchema: {
        type: 'bigInt',
        title: `{{t("Execution time", { ns: "${NAMESPACE}" })}}`,
        'x-component': ({ value }) => {
          const record = useCollectionRecordData();
          const timeCount = getExecutionTime(value, record);
          return <Input type="text" value={timeCount} />;
        },
        'x-read-pretty': true,
      } as ISchema,
    },
    {
      interface: 'm2o',
      type: 'belongsTo',
      name: 'workflowId',
      uiSchema: {
        type: 'number',
        title: `{{t("Version", { ns: "${NAMESPACE}" })}}`,
        ['x-component']({ value }) {
          const { setVisible } = useActionContext();
          return <Link to={getWorkflowDetailPath(value)} onClick={() => setVisible(false)}>{`#${value}`}</Link>;
        },
      } as ISchema,
    },
    {
      type: 'number',
      name: 'status',
      interface: 'select',
      uiSchema: {
        title: `{{t("Status", { ns: "${NAMESPACE}" })}}`,
        type: 'string',
        'x-component': 'Select',
        'x-decorator': 'FormItem',
        enum: ExecutionStatusOptions,
      } as ISchema,
    },
  ],
};
export const getExecutionSchema = (params?) => {
  const { isShowActionClear = true } = params || {};
  return {
    type: 'void',
    name: 'executionHistoryDrawer',
    title: `{{t("Execution history", { ns: "${NAMESPACE}" })}}`,
    'x-component': 'Action.Drawer',
    properties: {
      content: {
        type: 'void',
        'x-decorator': 'ExecutionResourceProvider',
        'x-decorator-props': {
          collection: executionCollection,
          dataSource: 'main',
          action: 'list',
          params: {
            appends: ['workflow.id', 'workflow.title'],
            pageSize: 20,
            sort: ['-createdAt'],
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
                'x-component-props': {
                  icon: 'FilterOutlined',
                },
                'x-align': 'left',
              },
              refresher: {
                type: 'void',
                title: '{{ t("Refresh") }}',
                'x-action': 'refresh',
                'x-component': 'Action',
                'x-use-component-props': 'useRefreshActionProps',
                'x-designer': 'Action.Designer',
                'x-component-props': {
                  icon: 'ReloadOutlined',
                },
                'x-align': 'right',
              },
              clear: {
                type: 'void',
                title: '{{t("Clear")}}',
                'x-component': 'Action',
                'x-component-props': {
                  isShow: isShowActionClear,
                  useAction() {
                    const { t } = useTranslation();
                    const { refresh, params } = useDataBlockRequest();
                    const resource = useDataBlockResource();
                    const { setVisible } = useActionContext();
                    return {
                      async run() {
                        await resource.destroy({ filter: params?.filter });
                        message.success(t('Operation succeeded'));
                        refresh();
                        setVisible(false);
                      },
                    };
                  },
                  confirm: {
                    title: `{{t("Clear all executions", { ns: "${NAMESPACE}" })}}`,
                    content: `{{t("Clear executions will not reset executed count, and started executions will not be deleted, are you sure you want to delete them all?", { ns: "${NAMESPACE}" })}}`,
                  },
                },
              },
            },
          },
          table: {
            type: 'array',
            'x-component': 'TableV2',
            'x-use-component-props': 'useTableBlockProps',
            'x-component-props': {
              rowKey: 'id',
            },
            properties: {
              actions: {
                type: 'void',
                title: '{{ t("Actions") }}',
                'x-component': 'TableV2.Column',
                'x-component-props': {
                  width: 50,
                },
                properties: {
                  actions: {
                    type: 'void',
                    'x-component': 'Space',
                    'x-component-props': {
                      split: '|',
                    },
                    properties: {
                      link: {
                        type: 'void',
                        'x-component': 'ExecutionLink',
                      },
                      retry: {
                        type: 'void',
                        title: `{{t("Retry", { ns: "${NAMESPACE}" })}}`,
                        'x-component': 'Action.Link',
                        'x-use-component-props': 'ExecutionRetryAction',
                      },
                    },
                  },
                },
              },
              id: {
                type: 'void',
                'x-decorator': 'TableV2.Column.Decorator',
                'x-component': 'TableV2.Column',
                'x-component-props': {
                  width: 50,
                },
                properties: {
                  id: {
                    type: 'number',
                    'x-component': 'CollectionField',

                    'x-read-pretty': true,
                  },
                },
              },
              createdAt: {
                type: 'void',
                'x-decorator': 'TableV2.Column.Decorator',
                'x-component': 'TableV2.Column',
                'x-component-props': {
                  width: 100,
                },
                properties: {
                  createdAt: {
                    type: 'datetime',
                    'x-component': 'CollectionField',
                    'x-component-props': {
                      showTime: true,
                    },
                    'x-read-pretty': true,
                  },
                },
              },
              executionCost: {
                type: 'void',
                title: `{{t("Executed time", { ns: "${NAMESPACE}" })}}`,
                'x-decorator': 'TableV2.Column.Decorator',
                'x-component': 'TableV2.Column',
                'x-component-props': {
                  width: 50,
                },
                properties: {
                  executionCost: {
                    type: 'bigInt',
                    'x-component': 'CollectionField',
                    'x-read-pretty': true,
                  },
                },
              },
              workflowId: {
                type: 'void',
                'x-decorator': 'TableV2.Column.Decorator',
                'x-component': 'TableV2.Column',
                'x-component-props': {
                  width: 50,
                },
                properties: {
                  workflowId: {
                    type: 'number',
                    'x-component': 'CollectionField',
                    'x-read-pretty': true,
                  },
                },
              },
              status: {
                type: 'void',
                title: `{{t("Status", { ns: "${NAMESPACE}" })}}`,
                'x-decorator': 'TableV2.Column.Decorator',
                'x-component': 'TableV2.Column',
                'x-component-props': {
                  width: 50,
                },
                properties: {
                  status: {
                    type: 'number',
                    'x-decorator': 'ExecutionStatusColumn',
                    'x-component': 'CollectionField',
                    'x-read-pretty': true,
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

export const executionSchema = getExecutionSchema();
