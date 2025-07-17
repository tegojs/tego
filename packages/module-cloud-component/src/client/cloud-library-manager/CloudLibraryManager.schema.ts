import { OpenMode } from '@tachybase/client';

import { tval } from '../locale';
import { fieldsets } from './CloudLibraryManager.fields';

const importComponent = {
  type: 'void',
  'x-action': 'import',
  'x-acl-action': 'import',
  title: "{{t('Import')}}",
  'x-component': 'Action',
  'x-decorator': 'ACLActionProvider',
  'x-component-props': {
    type: 'primary',
    icon: 'importoutlined',
    disabled: true,
  },
  'x-align': 'right',
  'x-acl-action-props': {
    skipScopeCheck: true,
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
        card: {
          type: 'void',
          'x-acl-action-props': {
            skipScopeCheck: true,
          },
          'x-acl-action': 'cloudLibraries:create',
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useCreateFormBlockDecoratorProps',
          'x-decorator-props': {
            dataSource: 'main',
            collection: 'cloudLibraries',
          },
          'x-component': 'CardItem',
          properties: {
            form: {
              type: 'void',
              'x-component': 'FormV2',
              'x-use-component-props': 'useCreateFormBlockProps',
              properties: {
                editor: {
                  type: 'void',
                  'x-component': 'FormTab',
                  properties: {
                    actions: {
                      type: 'void',
                      'x-component': 'FormTab.TabExtraContent',
                      properties: {
                        submit: {
                          title: '{{ t("Submit") }}',
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
                    name: {
                      type: 'void',
                      'x-component': 'FormTab.TabPane',
                      'x-component-props': {
                        tab: tval('Basic'),
                      },
                      properties: {
                        module: fieldsets.module,
                        name: fieldsets.name,
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
const edit = {
  type: 'void',
  title: '{{ t("Edit") }}',
  'x-action': 'update',
  'x-component': 'Action.Link',
  'x-component-props': {
    openMode: OpenMode.SHEET,
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
          'x-acl-action': 'cloudLibraries:update',
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
          'x-decorator-props': {
            action: 'get',
            dataSource: 'main',
            collection: 'cloudLibraries',
          },
          'x-component': 'CardItem',
          properties: {
            form: {
              type: 'void',
              'x-component': 'FormV2',
              'x-use-component-props': 'useEditFormBlockProps',
              properties: {
                editor: {
                  type: 'void',
                  'x-component': 'FormTab',
                  properties: {
                    actions: {
                      type: 'void',
                      'x-component': 'FormTab.TabExtraContent',
                      properties: {
                        actions: {
                          type: 'void',
                          'x-component': 'Space',
                          properties: {
                            save: {
                              // TODO 修改成创建或者保存
                              title: tval('Save'),
                              'x-action': 'submit',
                              'x-component': 'Action',
                              'x-use-component-props': 'useUpdateActionProps',
                              'x-component-props': {
                                type: 'primary',
                                htmlType: 'submit',
                              },
                              type: 'void',
                            },
                            history: {
                              // TODO 查看版本，可以选择特定版本并且覆盖当前信息，不自动发版
                              title: tval('History'),
                              'x-action': 'submit',
                              'x-component': 'Action',
                              'x-use-component-props': 'useUpdateActionProps',
                              'x-component-props': {
                                type: 'primary',
                                htmlType: 'submit',
                                disabled: true,
                              },
                              type: 'void',
                            },
                            publish: {
                              // TODO 需要弹窗说明版本信息，不支持版本号
                              title: tval('Publish'),
                              'x-action': 'submit',
                              'x-component': 'Action',
                              'x-use-component-props': 'useUpdateActionProps',
                              'x-component-props': {
                                disabled: true,
                                type: 'primary',
                                htmlType: 'submit',
                              },
                              type: 'void',
                            },
                          },
                        },
                      },
                    },
                    name: {
                      type: 'void',
                      'x-component': 'FormTab.TabPane',
                      'x-component-props': {
                        tab: tval('Basic'),
                      },
                      properties: {
                        module: fieldsets.module,
                        name: fieldsets.name,
                        enabled: fieldsets.enabled,
                        isClient: fieldsets.isClient,
                        isServer: fieldsets.isServer,
                        clientPlugin: fieldsets.clientPlugin,
                        serverPlugin: fieldsets.serverPlugin,
                        component: fieldsets.component,
                      },
                    },
                    code: {
                      type: 'void',
                      'x-component': 'FormTab.TabPane',
                      'x-component-props': {
                        tab: tval('Develop'),
                      },
                      properties: {
                        code: fieldsets.code,
                      },
                    },
                    data: {
                      type: 'void',
                      'x-component': 'FormTab.TabPane',
                      'x-component-props': {
                        tab: tval('Data'),
                      },
                      properties: {
                        data: fieldsets.data,
                      },
                    },
                    description: {
                      type: 'void',
                      'x-component': 'FormTab.TabPane',
                      'x-component-props': {
                        tab: tval('Document'),
                      },
                      properties: {
                        description: fieldsets.description,
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
export const table = {
  type: 'void',
  'x-decorator': 'TableBlockProvider',
  'x-acl-action': 'cloudLibraries:list',
  'x-use-decorator-props': 'useTableBlockDecoratorProps',
  'x-decorator-props': {
    collection: 'cloudLibraries',
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
        import: importComponent,
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
        module: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            module: {
              'x-collection-field': 'cloudLibraries.module',
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
        name: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            name: {
              'x-collection-field': 'cloudLibraries.name',
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
          'x-component-props': {
            width: 20,
          },
          properties: {
            enabled: {
              'x-collection-field': 'cloudLibraries.enabled',
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
        isClient: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          'x-component-props': {
            width: 20,
          },
          properties: {
            isClient: {
              'x-collection-field': 'cloudLibraries.isClient',
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
        isServer: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          'x-component-props': {
            width: 20,
          },
          properties: {
            isServer: {
              'x-collection-field': 'cloudLibraries.isServer',
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
                edit,
                delete: {
                  type: 'void',
                  title: 'Delete',
                  'x-action': 'destroy',
                  'x-acl-action': 'cloudLibraries:destroy',
                  'x-decorator': 'ACLActionProvider',
                  'x-component': 'Action.Link',
                  'x-visible': '{{ !($record.enabled) }}',
                  'x-component-props': {
                    confirm: {
                      title: 'Delete',
                      content: 'Are you sure you want to delete it?',
                    },
                  },
                  'x-use-component-props': 'useComponentDestroyProps',
                },
                // TODO: 云组件导出按钮
                // export: {
                //   type: 'void',
                //   title: 'Export',
                //   'x-action': 'destroy',
                //   'x-component': 'Action.Link',
                //   'x-component-props': {
                //     disabled: true,
                //   },
                //   'x-decorator': 'ACLActionProvider',
                //   'x-use-component-props': 'useDestroyActionProps',
                // },
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
