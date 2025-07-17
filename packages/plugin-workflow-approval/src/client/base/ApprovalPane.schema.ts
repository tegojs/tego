import React from 'react';
import {
  OpenMode,
  useActionContext,
  useAPIClient,
  useCollectionRecordData,
  useDataBlockRequest,
  useDataBlockResource,
  useFilterByTk,
} from '@tachybase/client';
import { collectionWorkflows } from '@tachybase/module-workflow/client';
import { ISchema, useForm } from '@tachybase/schema';

import { message } from 'antd';
import { saveAs } from 'file-saver';

import { NAMESPACE, tval, useTranslation } from '../locale';
import { schemaExecution } from './Execution.schema';

export const approvalFieldset: Record<string, ISchema> = {
  title: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
  },
  type: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    // TODO: use constant
    default: 'approval',
    'x-hidden': true,
  },
  sync: {
    type: 'boolean',
    title: tval('Execute mode'),
    description: `{{ t("Execute workflow asynchronously or synchronously based on trigger type, and could not be changed after created.", { ns: "${NAMESPACE}" }) }}`,
    default: false,
    'x-hidden': true,
    'x-decorator': 'FormItem',
    'x-component': 'Select',
    'x-component-props': {
      options: [
        {
          label: `{{ t("Asynchronously", { ns: "${NAMESPACE}" }) }}`,
          value: false,
          tooltip: `{{ t("Will be executed in the background as a queued task.", { ns: "${NAMESPACE}" }) }}`,
        },
        {
          label: `{{ t("Synchronously", { ns: "${NAMESPACE}" }) }}`,
          value: true,
          tooltip: `{{ t("For user actions that require immediate feedback. Can not use asynchronous nodes in such mode, and it is not recommended to perform time-consuming operations under synchronous mode.", { ns: "${NAMESPACE}" }) }}`,
        },
      ],
    },
  },
  enabled: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
  },
  description: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
  },
  color: {
    type: 'string',
    title: `{{ t("Color") }}`,
    'x-component': 'ColorPicker',
    'x-decorator': 'FormItem',
    default: '#e5e5e5',
  },
  icon: {
    type: 'string',
    title: `{{ t("Icon") }}`,
    'x-component': 'IconPicker',
    'x-decorator': 'FormItem',
  },
};

const createApproval: ISchema = {
  type: 'void',
  'x-action': 'create',
  'x-acl-action': 'create',
  title: tval('Add new'),
  'x-component': 'Action',
  'x-component-props': {
    openMode: OpenMode.DRAWER_MODE,
    type: 'primary',
    component: 'CreateRecordAction',
    icon: 'PlusOutlined',
  },
  'x-align': 'right',
  properties: {
    drawer: {
      type: 'void',
      title: tval('Add record'),
      'x-component': 'Action.Container',
      'x-component-props': {
        className: 'tb-action-popup',
      },
      properties: {
        body: {
          type: 'void',
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useCreateFormBlockDecoratorProps',
          'x-decorator-props': {
            dataSource: 'main',
            collection: collectionWorkflows,
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
                      marginBottom: 24,
                    },
                  },
                  properties: {
                    cancel: {
                      title: tval('Cancel'),
                      'x-component': 'Action',
                      'x-use-component-props': 'useCancelActionProps',
                    },
                    submit: {
                      title: tval('Submit'),
                      'x-component': 'Action',
                      'x-use-component-props': 'useCreateActionProps',
                      'x-component-props': {
                        type: 'primary',
                        htmlType: 'submit',
                      },
                    },
                  },
                },
                title: approvalFieldset.title,
                type: approvalFieldset.type,
                sync: approvalFieldset.sync,
                description: approvalFieldset.description,
                color: approvalFieldset.color,
                icon: approvalFieldset.icon,
              },
            },
          },
        },
      },
    },
  },
};

const updateApproval: ISchema = {
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
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
          'x-decorator-props': {
            action: 'get',
            dataSource: 'main',
            collection: collectionWorkflows,
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
                      'x-action-settings': {
                        isDeltaChanged: true,
                      },
                    },
                  },
                },
                title: approvalFieldset.title,
                type: approvalFieldset.type,
                sync: approvalFieldset.sync,
                description: approvalFieldset.description,
                color: approvalFieldset.color,
                icon: approvalFieldset.icon,
              },
            },
          },
        },
      },
    },
  },
};

export const schemaApprovalPanne = {
  type: 'void',
  properties: {
    approvalProvider: {
      type: 'void',
      'x-decorator': 'TableBlockProvider',
      'x-component': 'CardItem',
      'x-decorator-props': {
        collection: collectionWorkflows,
        action: 'list',
        params: {
          filter: {
            current: true,
            type: 'approval',
          },
          sort: ['-initAt'],
          except: ['config'],
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
            filter: {
              type: 'void',
              title: '{{ t("Filter") }}',
              default: {
                $and: [{ title: { $includes: '' } }],
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
              'x-action': 'refresh',
              'x-component': 'Action',
              'x-settings': 'actionSettings:refresh',
              'x-component-props': {
                icon: 'ReloadOutlined',
              },
              'x-use-component-props': 'useRefreshActionProps',
            },
            delete: {
              type: 'void',
              title: '{{t("Delete")}}',
              'x-action': 'destroy',
              'x-decorator': 'ACLActionProvider',
              'x-component': 'Action',
              'x-use-component-props': 'useDestroyActionProps',
              'x-component-props': {
                icon: 'DeleteOutlined',
                confirm: {
                  title: "{{t('Delete record')}}",
                  content: "{{t('Are you sure you want to delete it?')}}",
                },
              },
            },
            load: {
              type: 'void',
              title: `{{t("Load", { ns: "${NAMESPACE}" })}}`,
              'x-component': 'Action',
              'x-component-props': {
                icon: 'UploadOutlined',
                openSize: 'small',
              },
              properties: {
                modal: {
                  type: 'void',
                  title: `{{t("Load a workflow", { ns: "${NAMESPACE}" })}}`,
                  'x-decorator': 'FormV2',
                  'x-component': 'Action.Modal',
                  properties: {
                    title: {
                      type: 'string',
                      title: '{{t("Title")}}',
                      'x-decorator': 'FormItem',
                      'x-component': 'Input',
                    },
                    file: {
                      type: 'object',
                      title: '{{ t("File") }}',
                      required: true,
                      'x-decorator': 'FormItem',
                      'x-component': 'Upload.Attachment',
                      'x-component-props': {
                        action: 'attachments:create',
                        multiple: false,
                      },
                    },
                    footer: {
                      type: 'void',
                      'x-component': 'Action.Modal.Footer',
                      properties: {
                        submit: {
                          type: 'void',
                          title: '{{t("Submit")}}',
                          'x-component': 'Action',
                          'x-component-props': {
                            type: 'primary',
                            useAction() {
                              const { t } = useTranslation();
                              const api = useAPIClient();
                              const { refresh } = useDataBlockRequest();
                              const resource = useDataBlockResource();
                              const filterByTk = useFilterByTk();
                              const { setVisible } = useActionContext();
                              const { values } = useForm();
                              return {
                                async run() {
                                  const { data } = await api.request({
                                    url: values.file.url,
                                    baseURL: '/',
                                  });
                                  await resource.load({ filterByTk, values: { ...values, workflow: data } });
                                  message.success(t('Operation succeeded'));
                                  refresh();
                                  setVisible(false);
                                },
                              };
                            },
                          },
                        },
                        cancel: {
                          type: 'void',
                          title: '{{t("Cancel")}}',
                          'x-component': 'Action',
                          'x-use-component-props': 'useCancelActionProps',
                        },
                      },
                    },
                  },
                },
              },
            },
            create: createApproval,
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
              'x-component-props': {
                sorter: true,
              },
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
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            enabled: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                sorter: true,
                width: 20,
              },
              properties: {
                enabled: {
                  type: 'boolean',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                  default: false,
                },
              },
            },
            allExecuted: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                sorter: true,
                width: 20,
              },
              properties: {
                allExecuted: {
                  type: 'number',
                  'x-decorator': 'OpenDrawer',
                  'x-decorator-props': {
                    component: function Com(props) {
                      const record = useCollectionRecordData();
                      return React.createElement('a', {
                        'aria-label': `executed-${record.title}`,
                        ...props,
                      });
                    },
                  },
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                  properties: {
                    drawer: schemaExecution,
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
                  'x-collection-field': 'workflows.updatedBy',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            actions: {
              type: 'void',
              title: '{{ t("Actions") }}',
              'x-component': 'TableV2.Column',
              'x-component-props': {
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
                    configure: {
                      type: 'void',
                      'x-component': 'WorkflowLink',
                    },
                    update: updateApproval,
                    revision: {
                      type: 'void',
                      title: `{{t("Duplicate", { ns: "${NAMESPACE}" })}}`,
                      'x-component': 'Action.Link',
                      'x-component-props': {
                        openSize: 'small',
                      },
                      properties: {
                        modal: {
                          type: 'void',
                          title: `{{t("Duplicate to new workflow", { ns: "${NAMESPACE}" })}}`,
                          'x-decorator': 'FormV2',
                          'x-component': 'Action.Modal',
                          properties: {
                            title: {
                              type: 'string',
                              title: '{{t("Title")}}',
                              'x-decorator': 'FormItem',
                              'x-component': 'Input',
                            },
                            footer: {
                              type: 'void',
                              'x-component': 'Action.Modal.Footer',
                              properties: {
                                submit: {
                                  type: 'void',
                                  title: '{{t("Submit")}}',
                                  'x-component': 'Action',
                                  'x-component-props': {
                                    type: 'primary',
                                    useAction() {
                                      const { t } = useTranslation();
                                      const { refresh } = useDataBlockRequest();
                                      const resource = useDataBlockResource();
                                      const { setVisible } = useActionContext();
                                      const filterByTk = useFilterByTk();
                                      const { values } = useForm();
                                      return {
                                        async run() {
                                          await resource.revision({ filterByTk, values });
                                          message.success(t('Operation succeeded'));
                                          refresh();
                                          setVisible(false);
                                        },
                                      };
                                    },
                                  },
                                },
                                cancel: {
                                  type: 'void',
                                  title: '{{t("Cancel")}}',
                                  'x-component': 'Action',
                                  'x-component-props': {
                                    useAction: '{{ useCancelAction }}',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    delete: {
                      type: 'void',
                      title: '{{t("Delete")}}',
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
                    dump: {
                      type: 'void',
                      title: '{{ t("Dump") }}',
                      'x-component': 'Action.Link',
                      'x-component-props': {
                        useAction() {
                          const { t } = useTranslation();
                          const resource = useDataBlockResource();
                          const filterByTk = useFilterByTk();

                          return {
                            async run() {
                              const { data } = await resource.dump({ filterByTk });
                              const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
                              saveAs(blob, data.data.title + '-' + data.data.key + '.json');
                              message.success(t('Operation succeeded'));
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
      },
    },
  },
};
