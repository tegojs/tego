import { ISchema } from '@tachybase/schema';

import { trackingConfigCollection } from '../collections/trackingConfig.collection';

export const createTrackingConfig: ISchema = {
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
        body: {
          type: 'void',
          'x-acl-action-props': {
            skipScopeCheck: true,
          },
          'x-acl-action': `${trackingConfigCollection.name}:create`,
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useCreateFormBlockDecoratorProps',
          'x-decorator-props': {
            dataSource: 'main',
            collection: trackingConfigCollection,
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
                title: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                },
                resourceName: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  required: true,
                },
                action: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  required: true,
                },
                apiConfig: {
                  type: 'boolean',
                  default: true,
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                },
                trackingOptions: {
                  type: 'json',
                  default: {
                    meta: ['userId', 'recordId', 'createdAt', 'user-agent'],
                    payload: ['resourceName'],
                    filter: {
                      $and: [{ meta: { userId: { $gt: 1 } } }],
                    },
                  },
                  description: `e.g. 
                    filter: {
                      "$and": [
                        { "meta": { "userId": { "$gt": 1 } } },
                        { "payload": { "resourceName": { "$eq": "xxxxxx" } } },
                      ]}`,
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  'x-component-props': {
                    style: {
                      height: '300px',
                    },
                  },
                  'x-reactions': [
                    {
                      dependencies: ['apiConfig'],
                      fulfill: {
                        state: {
                          visible: '{{!!$deps[0]}}',
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
};
