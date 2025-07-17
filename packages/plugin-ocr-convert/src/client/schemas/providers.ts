import { useActionContext, useRequest, useValuesFromRecord } from '@tachybase/client';
import { ISchema, uid } from '@tachybase/schema';

import { PROVIDER_TYPE_TENCENT } from '../../constants';
import { lang, NAMESPACE } from '../locale';

export const collectionOcrProviders = {
  name: 'ocr_providers',
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
        enum: [{ label: `{{t("Tencent Cloud OCR", { ns: "${NAMESPACE}" })}}`, value: PROVIDER_TYPE_TENCENT }],
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
          'x-acl-action': `ocr_providers:update`,
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
          'x-decorator-props': {
            action: 'get',
            dataSource: 'main',
            collection: collectionOcrProviders,
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

export const schemaOcrProviders = {
  type: 'void',
  name: 'ocr_providers',
  'x-decorator': 'TableBlockProvider',
  'x-component': 'CardItem',
  'x-decorator-props': {
    collection: collectionOcrProviders,
    action: 'list',
    params: {
      filter: {},
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
        filter: {
          type: 'void',
          title: '{{ t("Filter") }}',
          default: {
            $and: [
              {
                title: {
                  $includes: '',
                },
              },
            ],
          },
          'x-action': 'filter',
          'x-component': 'Filter.Action',
          'x-use-component-props': 'useFilterActionProps',
          'x-component-props': {
            icon: 'FilterOutlined',
          },
          'x-align': 'left',
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

const providers: ISchema = {
  type: 'void',
  properties: {
    ocrTable: {
      type: 'void',
      'x-component': 'DataBlockProvider',
      'x-component-props': {
        collection: 'ocr_providers',
        action: 'list',
        params: {
          paginate: {
            page: 1,
            pageSize: 20,
          },
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
            create: {
              type: 'void',
              title: lang('Add provider'),
              'x-component': 'Action',
              'x-component-props': {
                type: 'primary',
                icon: 'PlusOutlined',
                style: {
                  width: '100%',
                },
              },
              properties: {
                drawer: {
                  type: 'void',
                  'x-component': 'Action.Drawer',
                  'x-component-props': {
                    title: lang('Add OCR provider'),
                  },
                  properties: {
                    form: {
                      type: 'void',
                      'x-component': 'Form',
                      'x-component-props': {
                        useValues(options) {
                          return useRequest(
                            () => {
                              return Promise.resolve({
                                data: {
                                  id: uid(),
                                },
                              });
                            },
                            {
                              ...options,
                              manual: false,
                            },
                          );
                        },
                      },
                      properties: {
                        name: {
                          type: 'string',
                          title: lang('Provider name'),
                          'x-decorator': 'FormItem',
                          'x-component': 'Input',
                          required: true,
                        },
                        type: {
                          type: 'string',
                          title: lang('Provider type'),
                          'x-decorator': 'FormItem',
                          'x-component': 'Select',
                          'x-component-props': {
                            style: {
                              width: '100%',
                            },
                          },
                          enum: [
                            {
                              label: lang('Tencent Cloud OCR'),
                              value: 'tencent-cloud',
                            },
                          ],
                          required: true,
                          default: 'tencent-cloud',
                        },
                        options: {
                          type: 'void',
                          'x-component': 'ProviderOptions',
                        },
                        footer: {
                          type: 'void',
                          'x-component': 'Action.Drawer.Footer',
                          properties: {
                            cancel: {
                              title: lang('Cancel'),
                              'x-component': 'Action',
                              'x-component-props': {
                                useAction: '{{ useCloseAction }}',
                              },
                            },
                            submit: {
                              title: lang('Submit'),
                              'x-component': 'Action',
                              'x-component-props': {
                                type: 'primary',
                                useAction: '{{ useCreateProviderAction }}',
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
        table: {
          type: 'void',
          'x-component': 'Table',
          'x-component-props': {
            rowKey: 'id',
            useDataSource: '{{ useDataBlockSource }}',
          },
          properties: {
            name: {
              type: 'void',
              'x-component': 'Table.Column',
              'x-component-props': {
                title: lang('Provider name'),
                render: '{{ cell }}',
              },
            },
            type: {
              type: 'void',
              'x-component': 'Table.Column',
              'x-component-props': {
                title: lang('Provider type'),
                render(value) {
                  const types = {
                    'tencent-cloud': lang('Tencent Cloud OCR'),
                  };
                  return types[value] || value;
                },
              },
            },
            actions: {
              type: 'void',
              title: lang('Actions'),
              'x-component': 'Table.Column',
              properties: {
                actions: {
                  type: 'void',
                  'x-component': 'Space',
                  'x-component-props': {
                    split: '|',
                  },
                  properties: {
                    view: {
                      type: 'void',
                      title: lang('View'),
                      'x-component': 'Action.Link',
                      'x-component-props': {
                        openMode: 'drawer',
                      },
                      properties: {
                        drawer: {
                          type: 'void',
                          'x-component': 'Action.Drawer',
                          'x-component-props': {
                            title: lang('View OCR provider'),
                          },
                          properties: {
                            form: {
                              type: 'void',
                              'x-component': 'Form',
                              'x-component-props': {
                                useValues: '{{ useValuesFromRecord }}',
                              },
                              properties: {
                                name: {
                                  type: 'string',
                                  title: lang('Provider name'),
                                  'x-decorator': 'FormItem',
                                  'x-component': 'Input',
                                  'x-component-props': {
                                    disabled: true,
                                  },
                                },
                                type: {
                                  type: 'string',
                                  title: lang('Provider type'),
                                  'x-decorator': 'FormItem',
                                  'x-component': 'Select',
                                  'x-component-props': {
                                    style: {
                                      width: '100%',
                                    },
                                    disabled: true,
                                  },
                                  enum: [
                                    {
                                      label: lang('Tencent Cloud OCR'),
                                      value: 'tencent-cloud',
                                    },
                                  ],
                                },
                                options: {
                                  type: 'void',
                                  'x-component': 'ProviderOptions',
                                  'x-component-props': {
                                    readOnly: true,
                                  },
                                },
                                footer: {
                                  type: 'void',
                                  'x-component': 'Action.Drawer.Footer',
                                  properties: {
                                    cancel: {
                                      title: lang('Close'),
                                      'x-component': 'Action',
                                      'x-component-props': {
                                        useAction: '{{ useCloseAction }}',
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
                    edit: {
                      type: 'void',
                      title: lang('Edit'),
                      'x-component': 'Action.Link',
                      'x-component-props': {
                        openMode: 'drawer',
                      },
                      properties: {
                        drawer: {
                          type: 'void',
                          'x-component': 'Action.Drawer',
                          'x-component-props': {
                            title: lang('Edit OCR provider'),
                          },
                          properties: {
                            form: {
                              type: 'void',
                              'x-component': 'Form',
                              'x-component-props': {
                                useValues: '{{ useValuesFromRecord }}',
                              },
                              properties: {
                                name: {
                                  type: 'string',
                                  title: lang('Provider name'),
                                  'x-decorator': 'FormItem',
                                  'x-component': 'Input',
                                  required: true,
                                },
                                type: {
                                  type: 'string',
                                  title: lang('Provider type'),
                                  'x-decorator': 'FormItem',
                                  'x-component': 'Select',
                                  'x-component-props': {
                                    style: {
                                      width: '100%',
                                    },
                                    disabled: true,
                                  },
                                  enum: [
                                    {
                                      label: lang('Tencent Cloud OCR'),
                                      value: 'tencent-cloud',
                                    },
                                  ],
                                },
                                options: {
                                  type: 'void',
                                  'x-component': 'ProviderOptions',
                                },
                                footer: {
                                  type: 'void',
                                  'x-component': 'Action.Drawer.Footer',
                                  properties: {
                                    cancel: {
                                      title: lang('Cancel'),
                                      'x-component': 'Action',
                                      'x-component-props': {
                                        useAction: '{{ useCloseAction }}',
                                      },
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
                              },
                            },
                          },
                        },
                      },
                    },
                    delete: {
                      type: 'void',
                      title: lang('Delete'),
                      'x-component': 'Action.Link',
                      'x-component-props': {
                        confirm: {
                          title: lang('Delete confirmation'),
                          content: lang('Are you sure you want to delete this OCR provider?'),
                        },
                        useAction: '{{ useDestroyActionProps }}',
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

export default providers;
