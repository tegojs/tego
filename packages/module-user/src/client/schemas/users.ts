import { ISchema, uid } from '@tachybase/schema';

export const userCollection = {
  name: 'users',
  fields: [
    {
      name: 'id',
      type: 'bigInt',
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
      uiSchema: { type: 'number', title: '{{t("ID")}}', 'x-component': 'InputNumber', 'x-read-pretty': true },
      interface: 'id',
    },
    {
      interface: 'input',
      type: 'string',
      name: 'nickname',
      uiSchema: {
        type: 'string',
        title: '{{t("Nickname")}}',
        'x-component': 'Input',
      },
    },
    {
      interface: 'input',
      type: 'string',
      name: 'username',
      unique: true,
      uiSchema: {
        type: 'string',
        title: '{{t("Username")}}',
        'x-component': 'Input',
        'x-validator': { username: true },
        required: true,
      },
    },
    {
      interface: 'email',
      type: 'string',
      name: 'email',
      unique: true,
      uiSchema: {
        type: 'string',
        title: '{{t("Email")}}',
        'x-component': 'Input',
        'x-validator': 'email',
        required: true,
      },
    },
    {
      interface: 'phone',
      type: 'string',
      name: 'phone',
      unique: true,
      uiSchema: {
        type: 'string',
        title: '{{t("Phone")}}',
        'x-component': 'Input',
        'x-validator': 'phone',
        required: true,
      },
    },
    {
      interface: 'password',
      type: 'password',
      name: 'password',
      hidden: true,
      uiSchema: {
        type: 'string',
        title: '{{t("Password")}}',
        'x-component': 'Password',
      },
    },
    {
      interface: 'm2m',
      type: 'belongsToMany',
      name: 'roles',
      target: 'roles',
      foreignKey: 'userId',
      otherKey: 'roleName',
      onDelete: 'CASCADE',
      sourceKey: 'id',
      targetKey: 'name',
      through: 'rolesUsers',
      uiSchema: {
        type: 'array',
        title: '{{t("Roles")}}',
        'x-component': 'AssociationField',
        'x-component-props': {
          multiple: true,
          fieldNames: {
            label: 'title',
            value: 'name',
          },
        },
      },
    },
    // {
    //   name: 'departments',
    //   type: 'belongsToMany',
    //   interface: 'm2m',
    //   target: 'departments',
    //   foreignKey: 'userId',
    //   otherKey: 'departmentId',
    //   onDelete: 'CASCADE',
    //   sourceKey: 'id',
    //   targetKey: 'id',
    //   through: 'departmentsUsers',
    //   uiSchema: {
    //     type: 'array',
    //     title: '{{t("Departments")}}',
    //     'x-component': 'DepartmentField',
    //   },
    // },
  ],
};

const create: ISchema = {
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
      title: '{{ t("Add user") }}',
      'x-component': 'Action.Container',
      'x-component-props': {
        className: 'tb-action-popup',
      },
      properties: {
        body: {
          type: 'void',
          'x-acl-action-props': {
            skipScopeCheck: true,
          },
          'x-acl-action': `users:create`,
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useCreateFormBlockDecoratorProps',
          'x-decorator-props': {
            dataSource: 'main',
            collection: userCollection,
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
                      title: '{{ t("Cancel") }}',
                      'x-component': 'Action',
                      'x-use-component-props': 'useCancelActionProps',
                    },
                    submit: {
                      title: '{{ t("Submit") }}',
                      'x-component': 'Action',
                      'x-use-component-props': 'useCreateActionProps',
                      'x-component-props': {
                        type: 'primary',
                        htmlType: 'submit',
                      },
                      'x-action-settings': {
                        assignedValues: {},
                        triggerWorkflows: [],
                        pageMode: false,
                      },
                    },
                  },
                },
                nickname: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                },
                username: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                },
                email: {
                  title: '{{t("Email")}}',
                  'x-component': 'Input',
                  'x-validator': 'email',
                  'x-decorator': 'FormItem',
                  required: false,
                },
                phone: {
                  title: '{{t("Phone")}}',
                  'x-component': 'Input',
                  'x-validator': 'phone',
                  'x-decorator': 'FormItem',
                  'x-component-props': {
                    autocomplete: 'off',
                  },
                  required: false,
                },
                password: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  'x-component-props': {
                    autocomplete: 'new-password',
                  },

                  required: true,
                },
                roles: {
                  'x-component': 'CollectionField',
                  'x-collection-field': 'users.roles',
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

export const changePassword: ISchema = {
  type: 'void',
  title: '{{ t("Change password") }}',
  'x-action': 'update',
  'x-component': 'Action.Link',
  'x-component-props': {
    openMode: 'drawer',
  },
  'x-decorator': 'ACLActionProvider',
  properties: {
    drawer: {
      type: 'void',
      title: '{{ t("Change password") }}',
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
          'x-acl-action': `users:update`,
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
          'x-decorator-props': {
            action: 'get',
            dataSource: 'main',
            collection: userCollection,
            params: {
              append: ['password'],
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
                password: {
                  'x-component': 'CollectionField',
                  'x-component-props': {
                    component: 'PasswordField',
                  },
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

export const usersSchema: ISchema = {
  type: 'void',
  properties: {
    block1: {
      type: 'void',
      'x-decorator': 'TableBlockProvider',
      'x-component': 'CardItem',
      'x-decorator-props': {
        collection: userCollection,
        action: 'list',
        params: {
          pageSize: 50,
          appends: ['roles'],
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
              'x-component': 'Action',
              'x-use-component-props': 'useBulkDestroyActionProps',
              'x-component-props': {
                confirm: {
                  title: "{{t('Delete users')}}",
                  content: "{{t('Are you sure you want to delete it?')}}",
                },
                icon: 'DeleteOutlined',
              },
            },
            create,
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
            column1: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              properties: {
                nickname: {
                  type: 'number',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            column2: {
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
            column3: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              properties: {
                email: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            column4: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              title: '{{t("Roles")}}',
              properties: {
                roles: {
                  type: 'array',
                  'x-component': 'UserRolesField',
                },
              },
            },
            column5: {
              type: 'void',
              title: '{{t("Actions")}}',
              'x-component': 'TableV2.Column',
              properties: {
                actions: {
                  type: 'void',
                  'x-component': 'Space',
                  properties: {
                    update: {
                      type: 'void',
                      title: '{{t("Edit profile")}}',
                      'x-acl-action-props': {
                        skipScopeCheck: false,
                      },
                      'x-acl-action': 'users:update',
                      'x-decorator': 'FormBlockProvider',
                      'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
                      'x-decorator-props': {
                        action: 'get',
                        dataSource: 'main',
                        collection: 'users',
                      },
                      'x-component': 'Action.Link',
                      'x-component-props': {
                        type: 'primary',
                      },
                      properties: {
                        drawer: {
                          type: 'void',
                          'x-component': 'Action.Drawer',
                          'x-decorator': 'FormV2',
                          'x-use-decorator-props': 'useEditFormBlockProps',
                          title: '{{t("Edit profile")}}',
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
                            nickname: {
                              'x-component': 'CollectionField',
                              'x-decorator': 'FormItem',
                            },
                            username: {
                              'x-component': 'CollectionField',
                              'x-decorator': 'FormItem',
                            },
                            email: {
                              title: '{{t("Email")}}',
                              'x-component': 'Input',
                              'x-validator': 'email',
                              'x-decorator': 'FormItem',
                              required: false,
                            },
                            phone: {
                              title: '{{t("Phone")}}',
                              'x-component': 'Input',
                              'x-validator': 'phone',
                              'x-decorator': 'FormItem',
                              required: false,
                            },
                            roles: {
                              'x-component': 'CollectionField',
                              'x-decorator': 'FormItem',
                              'x-collection-field': 'users.roles',
                            },
                          },
                        },
                      },
                    },
                    changePassword,
                    delete: {
                      type: 'void',
                      title: '{{ t("Delete") }}',
                      'x-acl-action': 'users:destroy',
                      'x-action': 'destroy',
                      'x-decorator': 'ACLActionProvider',
                      'x-component': 'Action.Link',
                      'x-use-component-props': 'useDestroyActionProps',
                      'x-component-props': {
                        confirm: {
                          title: "{{t('Delete')}}",
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
    },
  },
};

export const getRoleUsersSchema = (): ISchema => ({
  type: 'void',
  properties: {
    [uid()]: {
      type: 'void',
      'x-decorator': 'RoleUsersTableBlockProvider',
      'x-component': 'CardItem',
      'x-use-decorator-props': 'useRoleUsersServiceProps',
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
            [uid()]: {
              type: 'void',
              title: '{{ t("Filter") }}',
              'x-action': 'filter',
              'x-component': 'Filter.Action',
              'x-use-component-props': 'useFilterActionProps',
              'x-component-props': {
                icon: 'FilterOutlined',
              },
              'x-align': 'left',
            },
            actions: {
              type: 'void',
              'x-component': 'Space',
              properties: {
                remove: {
                  type: 'void',
                  title: '{{t("Remove")}}',
                  'x-component': 'Action',
                  'x-use-component-props': 'useBulkRemoveUsers',
                  'x-component-props': {
                    icon: 'MinusOutlined',
                    confirm: {
                      title: "{{t('Remove')}}",
                      content: "{{t('Are you sure you want to remove these users?')}}",
                    },
                    style: {
                      marginRight: 8,
                    },
                  },
                },
                create: {
                  type: 'void',
                  title: '{{t("Add users")}}',
                  'x-component': 'Action',
                  'x-component-props': {
                    type: 'primary',
                    icon: 'PlusOutlined',
                  },
                  properties: {
                    drawer: {
                      type: 'void',
                      'x-component': 'Action.Drawer',
                      'x-decorator': 'FormV2',
                      title: '{{t("Add users")}}',
                      properties: {
                        resource: {
                          type: 'void',
                          'x-decorator': 'TableBlockProvider',
                          'x-component': 'CardItem',
                          'x-use-decorator-props': 'useRoleUsersProps',
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
                                    $and: [{ username: { $includes: '' } }, { nickname: { $includes: '' } }],
                                  },
                                  'x-action': 'filter',
                                  'x-component': 'Filter.Action',
                                  'x-use-component-props': 'useFilterActionProps',
                                  'x-component-props': {
                                    icon: 'FilterOutlined',
                                  },
                                  'x-align': 'left',
                                },
                                cancel: {
                                  title: '{{ t("Cancel") }}',
                                  'x-component': 'Action',
                                  'x-use-component-props': 'useCancelActionProps',
                                },
                                submit: {
                                  title: '{{ t("Submit") }}',
                                  'x-component': 'Action',
                                  'x-use-component-props': 'useAddRoleUsers',
                                  'x-component-props': {
                                    type: 'primary',
                                    htmlType: 'submit',
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
                                phone: {
                                  type: 'void',
                                  'x-decorator': 'TableV2.Column.Decorator',
                                  'x-component': 'TableV2.Column',
                                  properties: {
                                    phone: {
                                      type: 'string',
                                      'x-component': 'CollectionField',
                                      'x-read-pretty': true,
                                    },
                                  },
                                },
                                email: {
                                  type: 'void',
                                  'x-decorator': 'TableV2.Column.Decorator',
                                  'x-component': 'TableV2.Column',
                                  properties: {
                                    email: {
                                      type: 'string',
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
                    },
                  },
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
            rowSelection: {
              type: 'checkbox',
            },
          },
          properties: {
            username: {
              type: 'void',
              title: '{{t("Username")}}',
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
              title: '{{t("Nickname")}}',
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
            actions: {
              type: 'void',
              title: '{{t("Actions")}}',
              'x-component': 'Table.Column',
              properties: {
                actions: {
                  type: 'void',
                  'x-component': 'Space',
                  'x-component-props': {
                    split: '|',
                  },
                  properties: {
                    remove: {
                      type: 'void',
                      title: '{{ t("Remove") }}',
                      'x-component': 'Action.Link',
                      'x-use-component-props': 'useRemoveUser',
                      'x-component-props': {
                        confirm: {
                          title: "{{t('Remove user')}}",
                          content: "{{t('Are you sure you want to remove it?')}}",
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
});
