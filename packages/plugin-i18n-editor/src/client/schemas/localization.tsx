import { ISchema } from '@tachybase/schema';

const collectionlocalization = {
  name: 'localizationTexts',
  fields: [
    {
      interface: 'input',
      type: 'string',
      name: 'text',
      uiSchema: {
        type: 'string',
        title: '{{t("Text")}}',
        'x-component': 'Input.TextArea',
        required: true,
      },
    },
    {
      interface: 'input',
      type: 'string',
      name: 'translation',
      uiSchema: {
        type: 'string',
        title: '{{t("Translation")}}',
        'x-component': 'Input.TextArea',
      },
    },
    {
      interface: 'select',
      type: 'string',
      name: 'moduleTitle',
      uiSchema: {
        type: 'string',
        title: '{{t("Module")}}',
        'x-component': 'Select',
        enum: [
          {
            value: 'Menu',
            label: '{{t("Menu")}}',
          },
          {
            value: 'Collections & Fields',
            label: '{{t("Collections & Fields", {ns:"localization-management"})}}',
          },
        ],
      },
    },
  ],
};

export const updatelocalization: ISchema = {
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
          'x-acl-action': `localizationTexts:get`,
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
          'x-decorator-props': {
            action: 'get',
            dataSource: 'main',
            collection: collectionlocalization,
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
                      'x-use-component-props': 'useUpdateTranslationAction',
                      'x-component-props': {
                        type: 'primary',
                      },
                    },
                  },
                },
                moduleTitle: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  'x-read-pretty': true,
                },
                text: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  'x-read-pretty': true,
                },
                translation: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  required: true,
                },
              },
            },
          },
        },
      },
    },
  },
};

export const localizationSchema: ISchema = {
  type: 'void',
  name: 'localizationTexts',
  'x-decorator': 'TableBlockProvider',
  'x-decorator-props': {
    collection: collectionlocalization,
    action: 'list',
    params: {
      pageSize: 50,
      append: ['moduleTitle', 'translation'],
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
        currentLang: {
          type: 'void',
          'x-align': 'left',
          'x-component': 'CurrentLang',
        },
        filter: {
          type: 'void',
          title: '{{t("Filter")}}',
          'x-align': 'left',
          'x-component': 'Filter',
        },
        deleteTranslation: {
          type: 'void',
          title: '{{t("Delete translation")}}',
          'x-component': 'Action',
          'x-use-component-props': 'useBulkDestroyTranslationAction',
          'x-component-props': {
            icon: 'DeleteOutlined',
            confirm: {
              title: "{{t('Delete translation')}}",
              content: "{{t('Are you sure you want to delete it?')}}",
            },
          },
        },
        sync: {
          type: 'void',
          title: '{{t("Sync")}}',
          'x-component': 'Sync',
        },
        publish: {
          type: 'void',
          title: '{{t("Publish")}}',
          'x-component': 'Action',
          'x-use-component-props': 'usePublishAction',
          'x-component-props': {
            icon: 'UploadOutlined',
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
      'x-use-decorator-props': 'useTableBlockDecoratorProps',
      'x-component-props': {
        rowKey: 'translationId',
        rowSelection: {
          type: 'checkbox',
        },
      },
      properties: {
        text: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            text: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-component-props': {
                style: {
                  whiteSpace: 'pre-wrap',
                },
              },
              'x-read-pretty': true,
            },
          },
        },
        translation: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            translation: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-component-props': {
                component: 'TranslationField',
                style: {
                  whiteSpace: 'pre-wrap',
                },
              },
              'x-read-pretty': true,
            },
          },
        },
        moduleTitle: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            moduleTitle: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        actions: {
          type: 'void',
          title: '{{t("Actions")}}',
          'x-component': 'TableV2.Column',
          'x-decorator': 'TableV2.Column.Decorator',
          properties: {
            actions: {
              type: 'void',
              'x-component': 'Space',
              'x-component-props': {
                split: '|',
              },
              properties: {
                updatelocalization,
                // update: {
                //   type: 'void',
                //   title: '{{t("Edit")}}',
                //   'x-component': 'Action.Link',
                //   'x-component-props': {
                //     type: 'primary',
                //   },
                //   properties: {
                //     drawer: {
                //       type: 'void',
                //       'x-component': 'Action.Drawer',
                //       'x-decorator': 'FormV2',
                //       // 'x-decorator-props': 'useValuesFromRecord',
                //       title: '{{t("Edit")}}',
                //       properties: {
                //         moduleTitle: {
                //           'x-component': 'CollectionField',
                //           'x-decorator': 'FormItem',
                //           'x-read-pretty': true,
                //         },
                //         text: {
                //           'x-component': 'CollectionField',
                //           'x-decorator': 'FormItem',
                //           'x-read-pretty': true,
                //         },
                //         translation: {
                //           'x-component': 'CollectionField',
                //           'x-decorator': 'FormItem',
                //           required: true,
                //         },
                //         footer: {
                //           type: 'void',
                //           'x-component': 'Action.Drawer.Footer',
                //           properties: {
                //             cancel: {
                //               title: '{{t("Cancel")}}',
                //               'x-component': 'Action',
                //               'x-component-props': {
                //                 useAction: '{{ cm.useCancelAction }}',
                //               },
                //             },
                //             submit: {
                //               title: '{{t("Submit")}}',
                //               'x-component': 'Action',
                //               'x-component-props': {
                //                 type: 'primary',
                //                 useAction: '{{ useUpdateTranslationAction }}',
                //               },
                //             },
                //           },
                //         },
                //       },
                //     },
                //   },
                // },
                deleteTranslation: {
                  type: 'void',
                  title: '{{ t("Delete translation") }}',
                  'x-component': 'Action.Link',
                  'x-use-component-props': 'useDestroyTranslationAction',
                  'x-component-props': {
                    confirm: {
                      title: "{{t('Delete translation')}}",
                      content: "{{t('Are you sure you want to delete it?')}}",
                    },
                  },
                  'x-visible': '{{useHasTranslation()}}',
                },
              },
            },
          },
        },
      },
    },
  },
};
