import { ISchema } from '@tachybase/schema';

import { trackingLogCollection } from '../collections/trackingLog.collection';
import { NAMESPACE } from '../locale';

export const viewTrackingLog: ISchema = {
  type: 'void',
  title: '{{ t("View") }}',
  'x-action': 'view',
  'x-component': 'Action.Link',
  'x-component-props': {
    openMode: 'drawer',
  },
  'x-decorator': 'ACLActionProvider',
  properties: {
    drawer: {
      type: 'void',
      title: `{{ t("View instrumentation", { ns: "${NAMESPACE}" }) }}`,
      'x-component': 'Action.Container',
      'x-component-props': {
        openMode: 'drawer',
        className: 'tb-action-popup',
      },
      properties: {
        card: {
          type: 'void',
          'x-acl-action-props': {
            skipScopeCheck: false,
          },
          'x-acl-action': `${trackingLogCollection.name}:list`,
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
          'x-decorator-props': {
            action: 'get',
            dataSource: 'main',
            collection: trackingLogCollection,
          },
          'x-component': 'CardItem',
          properties: {
            form: {
              type: 'void',
              'x-component': 'FormV2',
              'x-use-component-props': 'useEditFormBlockProps',
              properties: {
                id: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  'x-read-pretty': true,
                },
                key: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  'x-read-pretty': true,
                },
                type: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  'x-read-pretty': true,
                },
                values: {
                  'x-component': 'CollectionField',
                  'x-decorator': 'FormItem',
                  'x-read-pretty': true,
                  'x-component-props': {
                    style: {
                      height: '300px',
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
