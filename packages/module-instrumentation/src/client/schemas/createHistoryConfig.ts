import { OpenMode } from '@tachybase/client';
import { ISchema } from '@tachybase/schema';

import { historyConfigCollection } from '../collections/historyConfig.collection';

export const createHistoryConfig: ISchema = {
  type: 'void',
  'x-action': 'create',
  'x-acl-action': 'create',
  title: "{{t('Add new')}}",
  'x-component': 'Action',
  'x-decorator': 'ACLActionProvider',
  'x-component-props': {
    openMode: OpenMode.DRAWER_MODE,
    type: 'primary',
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
          'x-acl-action': `${historyConfigCollection.name}:create`,
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useCreateFormBlockDecoratorProps',
          'x-decorator-props': {
            dataSource: 'main',
            collection: historyConfigCollection,
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
                historyOptions: {
                  type: 'json',
                  default: {
                    filterKey: '',
                    filterValues: {
                      $and: [{ meta: { userId: { $gt: 1 } } }],
                    },
                    dedupBy: '',
                    minCount: 1,
                    timeGroup: '',
                    timeFilter: {
                      after: '',
                      before: '',
                      on: '',
                      today: true,
                      rangeDays: '',
                    },
                  },
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
