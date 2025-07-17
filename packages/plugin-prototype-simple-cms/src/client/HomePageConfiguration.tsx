import React from 'react';
import { OpenMode, SchemaComponent } from '@tachybase/client';

export const HomePageConfiguration = (props) => {
  return (
    <SchemaComponent
      schema={{
        version: '2.0',
        type: 'void',
        'x-decorator': 'TableBlockProvider',
        'x-acl-action': 'home_page_presentations:list',
        'x-decorator-props': {
          collection: 'home_page_presentations',
          resource: 'home_page_presentations',
          action: 'list',
          params: {
            pageSize: 20,
          },
          rowKey: 'id',
          showIndex: true,
          dragSort: false,
          disableTemplate: false,
        },

        'x-component': 'CardItem',
        'x-filter-targets': [],
        properties: {
          actions: {
            version: '2.0',
            type: 'void',
            'x-initializer': 'TableActionInitializers',
            'x-component': 'ActionBar',
            'x-component-props': {
              style: {
                marginBottom: 'var(--tb-spacing)',
              },
            },
            properties: {
              bia185yhk1i: {
                version: '2.0',
                type: 'void',
                'x-action': 'create',
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
                    version: '2.0',
                    type: 'void',
                    title: '{{ t("Add record") }}',
                    'x-component': 'Action.Container',
                    'x-component-props': {
                      className: 'tb-action-popup',
                    },
                    properties: {
                      tabs: {
                        version: '2.0',
                        type: 'void',
                        'x-component': 'Tabs',
                        'x-component-props': {},
                        'x-initializer': 'TabPaneInitializersForCreateFormBlock',
                        properties: {
                          tab1: {
                            version: '2.0',
                            type: 'void',
                            title: '{{t("Add new")}}',
                            'x-component': 'Tabs.TabPane',

                            'x-component-props': {},
                            properties: {
                              grid: {
                                version: '2.0',
                                type: 'void',
                                'x-component': 'Grid',
                                'x-initializer': 'CreateFormBlockInitializers',
                                properties: {
                                  ij6ctts16tv: {
                                    version: '2.0',
                                    type: 'void',
                                    'x-component': 'Grid.Row',
                                    properties: {
                                      mrm9wm6wk4r: {
                                        version: '2.0',
                                        type: 'void',
                                        'x-component': 'Grid.Col',
                                        properties: {
                                          jab8tlxoft2: {
                                            version: '2.0',
                                            type: 'void',
                                            'x-acl-action-props': {
                                              skipScopeCheck: true,
                                            },
                                            'x-acl-action': 'home_page_presentations:create',
                                            'x-decorator': 'FormBlockProvider',
                                            'x-decorator-props': {
                                              resource: 'home_page_presentations',
                                              collection: 'home_page_presentations',
                                            },

                                            'x-component': 'CardItem',
                                            'x-component-props': {},
                                            properties: {
                                              '8qckd230c0v': {
                                                version: '2.0',
                                                type: 'void',
                                                'x-component': 'FormV2',
                                                'x-component-props': {
                                                  useProps: '{{ useFormBlockProps }}',
                                                },
                                                properties: {
                                                  grid: {
                                                    version: '2.0',
                                                    type: 'void',
                                                    'x-component': 'Grid',
                                                    'x-initializer': 'FormItemInitializers',
                                                    properties: {
                                                      '7ijaitrd558': {
                                                        version: '2.0',
                                                        type: 'void',
                                                        'x-component': 'Grid.Row',
                                                        properties: {
                                                          ib3pda67y9v: {
                                                            version: '2.0',
                                                            type: 'void',
                                                            'x-component': 'Grid.Col',
                                                            properties: {
                                                              title: {
                                                                version: '2.0',
                                                                type: 'string',

                                                                'x-component': 'CollectionField',
                                                                'x-decorator': 'FormItem',
                                                                'x-collection-field': 'home_page_presentations.title',
                                                                'x-component-props': {},
                                                                'x-uid': 'vxy8me9095c',
                                                                'x-async': false,
                                                                'x-index': 1,
                                                              },
                                                            },
                                                            'x-uid': 'ycic8uhzuvi',
                                                            'x-async': false,
                                                            'x-index': 1,
                                                          },
                                                        },
                                                        'x-uid': '8tec19ad33p',
                                                        'x-async': false,
                                                        'x-index': 1,
                                                      },
                                                      dgch495uwir: {
                                                        version: '2.0',
                                                        type: 'void',
                                                        'x-component': 'Grid.Row',
                                                        properties: {
                                                          ullibu2n4sg: {
                                                            version: '2.0',
                                                            type: 'void',
                                                            'x-component': 'Grid.Col',
                                                            properties: {
                                                              pictures: {
                                                                version: '2.0',
                                                                type: 'string',

                                                                'x-component': 'CollectionField',
                                                                'x-decorator': 'FormItem',
                                                                'x-collection-field':
                                                                  'home_page_presentations.pictures',
                                                                'x-component-props': {
                                                                  action: 'attachments:create',
                                                                },
                                                                'x-uid': '2ys0er1yt11',
                                                                'x-async': false,
                                                                'x-index': 1,
                                                              },
                                                            },
                                                            'x-uid': '5suog4i8d3x',
                                                            'x-async': false,
                                                            'x-index': 1,
                                                          },
                                                        },
                                                        'x-uid': 'gikgxfwjxnh',
                                                        'x-async': false,
                                                        'x-index': 2,
                                                      },
                                                    },
                                                    'x-uid': 'q0jjxfzgxec',
                                                    'x-async': false,
                                                    'x-index': 1,
                                                  },
                                                  actions: {
                                                    version: '2.0',
                                                    type: 'void',
                                                    'x-initializer': 'CreateFormActionInitializers',
                                                    'x-component': 'ActionBar',
                                                    'x-component-props': {
                                                      layout: 'one-column',
                                                      style: {
                                                        marginTop: 24,
                                                      },
                                                    },
                                                    properties: {
                                                      '6zu1h8l4sjs': {
                                                        version: '2.0',
                                                        title: '{{ t("Submit") }}',
                                                        'x-action': 'submit',
                                                        'x-component': 'Action',

                                                        'x-component-props': {
                                                          type: 'primary',
                                                          htmlType: 'submit',
                                                          useProps: '{{ useCreateActionProps }}',
                                                        },
                                                        'x-action-settings': {
                                                          triggerWorkflows: [],
                                                        },
                                                        type: 'void',
                                                        'x-uid': 'ycwy5sel90f',
                                                        'x-async': false,
                                                        'x-index': 1,
                                                      },
                                                    },
                                                    'x-uid': 'huu8pqmx0to',
                                                    'x-async': false,
                                                    'x-index': 2,
                                                  },
                                                },
                                                'x-uid': '9936zs1ncni',
                                                'x-async': false,
                                                'x-index': 1,
                                              },
                                            },
                                            'x-uid': '2tjk5abg4db',
                                            'x-async': false,
                                            'x-index': 1,
                                          },
                                        },
                                        'x-uid': '8lqi5ffepko',
                                        'x-async': false,
                                        'x-index': 1,
                                      },
                                    },
                                    'x-uid': '4sho4nn7ffs',
                                    'x-async': false,
                                    'x-index': 1,
                                  },
                                },
                                'x-uid': 'w8hhrq8tv7w',
                                'x-async': false,
                                'x-index': 1,
                              },
                            },
                            'x-uid': 'ujexdqygj0s',
                            'x-async': false,
                            'x-index': 1,
                          },
                        },
                        'x-uid': 'n1re231jc8z',
                        'x-async': false,
                        'x-index': 1,
                      },
                    },
                    'x-uid': 'kc5guu7w3ll',
                    'x-async': false,
                    'x-index': 1,
                  },
                },
                'x-uid': 'yr7deayw8b2',
                'x-async': false,
                'x-index': 1,
              },
            },
            'x-uid': 'nm9vaco6bnm',
            'x-async': false,
            'x-index': 1,
          },
          yx9ugoktyio: {
            version: '2.0',
            type: 'array',
            'x-initializer': 'TableColumnInitializers',
            'x-component': 'TableV2',
            'x-component-props': {
              rowKey: 'id',
              rowSelection: {
                type: 'checkbox',
              },
              useProps: '{{ useTableBlockProps }}',
            },
            properties: {
              actions: {
                version: '2.0',
                type: 'void',
                title: '{{ t("Actions") }}',
                'x-action-column': 'actions',
                'x-decorator': 'TableV2.Column.ActionBar',
                'x-component': 'TableV2.Column',

                'x-initializer': 'TableActionColumnInitializers',
                properties: {
                  actions: {
                    version: '2.0',
                    type: 'void',
                    'x-decorator': 'DndContext',
                    'x-component': 'Space',
                    'x-component-props': {
                      split: '|',
                    },
                    properties: {
                      yaif2vuaskw: {
                        version: '2.0',
                        type: 'void',
                        title: '{{ t("Edit") }}',
                        'x-action': 'update',

                        'x-component': 'Action.Link',
                        'x-component-props': {
                          openMode: OpenMode.DRAWER_MODE,
                          icon: 'EditOutlined',
                        },
                        'x-decorator': 'ACLActionProvider',
                        'x-designer-props': {
                          linkageAction: true,
                        },
                        properties: {
                          drawer: {
                            version: '2.0',
                            type: 'void',
                            title: '{{ t("Edit record") }}',
                            'x-component': 'Action.Container',
                            'x-component-props': {
                              className: 'tb-action-popup',
                            },
                            properties: {
                              tabs: {
                                version: '2.0',
                                type: 'void',
                                'x-component': 'Tabs',
                                'x-component-props': {},
                                'x-initializer': 'popup:addTab',
                                properties: {
                                  tab1: {
                                    version: '2.0',
                                    type: 'void',
                                    title: '{{t("Edit")}}',
                                    'x-component': 'Tabs.TabPane',

                                    'x-component-props': {},
                                    properties: {
                                      grid: {
                                        version: '2.0',
                                        type: 'void',
                                        'x-component': 'Grid',
                                        'x-initializer': 'RecordBlockInitializers',
                                        properties: {
                                          og49nkup6th: {
                                            version: '2.0',
                                            type: 'void',
                                            'x-component': 'Grid.Row',
                                            properties: {
                                              a7woyamsray: {
                                                version: '2.0',
                                                type: 'void',
                                                'x-component': 'Grid.Col',
                                                properties: {
                                                  '2pn91gtfnml': {
                                                    version: '2.0',
                                                    type: 'void',
                                                    'x-acl-action-props': {
                                                      skipScopeCheck: false,
                                                    },
                                                    'x-acl-action': 'home_page_presentations:update',
                                                    'x-decorator': 'FormBlockProvider',
                                                    'x-decorator-props': {
                                                      useSourceId: '{{ useSourceIdFromParentRecord }}',
                                                      useParams: '{{ useParamsFromRecord }}',
                                                      action: 'get',
                                                      resource: 'home_page_presentations',
                                                      collection: 'home_page_presentations',
                                                    },

                                                    'x-component': 'CardItem',
                                                    'x-component-props': {},
                                                    properties: {
                                                      j7rysan6k0n: {
                                                        version: '2.0',
                                                        type: 'void',
                                                        'x-component': 'FormV2',
                                                        'x-component-props': {
                                                          useProps: '{{ useFormBlockProps }}',
                                                        },
                                                        properties: {
                                                          grid: {
                                                            version: '2.0',
                                                            type: 'void',
                                                            'x-component': 'Grid',
                                                            'x-initializer': 'FormItemInitializers',
                                                            properties: {
                                                              og920rtknti: {
                                                                version: '2.0',
                                                                type: 'void',
                                                                'x-component': 'Grid.Row',
                                                                properties: {
                                                                  t32058hd12p: {
                                                                    version: '2.0',
                                                                    type: 'void',
                                                                    'x-component': 'Grid.Col',
                                                                    properties: {
                                                                      title: {
                                                                        version: '2.0',
                                                                        type: 'string',

                                                                        'x-component': 'CollectionField',
                                                                        'x-decorator': 'FormItem',
                                                                        'x-collection-field':
                                                                          'home_page_presentations.title',
                                                                        'x-component-props': {},
                                                                        'x-uid': '70xzdgy6vgh',
                                                                        'x-async': false,
                                                                        'x-index': 1,
                                                                      },
                                                                    },
                                                                    'x-uid': '7e6gwdvzppj',
                                                                    'x-async': false,
                                                                    'x-index': 1,
                                                                  },
                                                                },
                                                                'x-uid': 'k4m8a8dwsun',
                                                                'x-async': false,
                                                                'x-index': 1,
                                                              },
                                                              giboazc3b0y: {
                                                                version: '2.0',
                                                                type: 'void',
                                                                'x-component': 'Grid.Row',
                                                                properties: {
                                                                  lpkhllvqdga: {
                                                                    version: '2.0',
                                                                    type: 'void',
                                                                    'x-component': 'Grid.Col',
                                                                    properties: {
                                                                      pictures: {
                                                                        version: '2.0',
                                                                        type: 'string',

                                                                        'x-component': 'CollectionField',
                                                                        'x-decorator': 'FormItem',
                                                                        'x-collection-field':
                                                                          'home_page_presentations.pictures',
                                                                        'x-component-props': {
                                                                          action: 'attachments:create',
                                                                        },
                                                                        'x-uid': 'w6mytf69k6m',
                                                                        'x-async': false,
                                                                        'x-index': 1,
                                                                      },
                                                                    },
                                                                    'x-uid': 'jzv9t7stcz0',
                                                                    'x-async': false,
                                                                    'x-index': 1,
                                                                  },
                                                                },
                                                                'x-uid': 'chxq8h76j8o',
                                                                'x-async': false,
                                                                'x-index': 2,
                                                              },
                                                            },
                                                            'x-uid': 'eceqgc8ontl',
                                                            'x-async': false,
                                                            'x-index': 1,
                                                          },
                                                          actions: {
                                                            version: '2.0',
                                                            type: 'void',
                                                            'x-initializer': 'UpdateFormActionInitializers',
                                                            'x-component': 'ActionBar',
                                                            'x-component-props': {
                                                              layout: 'one-column',
                                                              style: {
                                                                marginTop: 24,
                                                              },
                                                            },
                                                            properties: {
                                                              zusitgob1u5: {
                                                                version: '2.0',
                                                                title: '{{ t("Submit") }}',
                                                                'x-action': 'submit',
                                                                'x-component': 'Action',

                                                                'x-component-props': {
                                                                  type: 'primary',
                                                                  htmlType: 'submit',
                                                                  useProps: '{{ useUpdateActionProps }}',
                                                                },
                                                                'x-action-settings': {
                                                                  triggerWorkflows: [],
                                                                },
                                                                type: 'void',
                                                                'x-uid': 'pwuvu6v6eit',
                                                                'x-async': false,
                                                                'x-index': 1,
                                                              },
                                                            },
                                                            'x-uid': 'njgslgv92jr',
                                                            'x-async': false,
                                                            'x-index': 2,
                                                          },
                                                        },
                                                        'x-uid': '49xyfm0iyd4',
                                                        'x-async': false,
                                                        'x-index': 1,
                                                      },
                                                    },
                                                    'x-uid': 'zux6vavjvq7',
                                                    'x-async': false,
                                                    'x-index': 1,
                                                  },
                                                },
                                                'x-uid': 'u9yk8wjhla7',
                                                'x-async': false,
                                                'x-index': 1,
                                              },
                                            },
                                            'x-uid': 'indaws297z5',
                                            'x-async': false,
                                            'x-index': 1,
                                          },
                                        },
                                        'x-uid': 'cn3gijbx29e',
                                        'x-async': false,
                                        'x-index': 1,
                                      },
                                    },
                                    'x-uid': 'hkvq7lffm90',
                                    'x-async': false,
                                    'x-index': 1,
                                  },
                                },
                                'x-uid': 'yg2hljxi2le',
                                'x-async': false,
                                'x-index': 1,
                              },
                            },
                            'x-uid': '4v136x5hvps',
                            'x-async': false,
                            'x-index': 1,
                          },
                        },
                        'x-uid': 'ggpjjpvi54e',
                        'x-async': false,
                        'x-index': 1,
                      },
                    },
                    'x-uid': '7s3zizxt9l9',
                    'x-async': false,
                    'x-index': 1,
                  },
                },
                'x-uid': 'dm7808xtgog',
                'x-async': false,
                'x-index': 1,
              },
              r79uwspdiik: {
                version: '2.0',
                type: 'void',
                'x-decorator': 'TableV2.Column.Decorator',

                'x-component': 'TableV2.Column',
                properties: {
                  title: {
                    version: '2.0',
                    'x-collection-field': 'home_page_presentations.title',
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
                    'x-uid': 'o34iouv6l1z',
                    'x-async': false,
                    'x-index': 1,
                  },
                },
                'x-uid': 'zfy17cqeelp',
                'x-async': false,
                'x-index': 2,
              },
              qni8cvpu4vk: {
                version: '2.0',
                type: 'void',
                'x-decorator': 'TableV2.Column.Decorator',

                'x-component': 'TableV2.Column',
                properties: {
                  pictures: {
                    version: '2.0',
                    'x-collection-field': 'home_page_presentations.pictures',
                    'x-component': 'CollectionField',
                    'x-component-props': {
                      size: 'small',
                      action: 'attachments:create',
                    },
                    'x-read-pretty': true,
                    'x-decorator': null,
                    'x-decorator-props': {
                      labelStyle: {
                        display: 'none',
                      },
                    },
                    'x-uid': 'ocqfnyahz32',
                    'x-async': false,
                    'x-index': 1,
                  },
                },
                'x-uid': 'r23g6b37mnt',
                'x-async': false,
                'x-index': 3,
              },
            },
            'x-uid': 'uq0ueuxd6jy',
            'x-async': false,
            'x-index': 2,
          },
        },
        name: 'ed94xx03myk',
        'x-uid': 'hmriicsupa7',
        'x-async': false,
        'x-index': 1,
      }}
    />
  );
};
