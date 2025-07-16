import { ISchema } from '@tachybase/schema';

import { formSchema } from './schemaForm.js';

export const tableActionColumnSchema: ISchema = {
  properties: {
    view: {
      type: 'void',
      'x-component': 'AppVisitor',
      'x-component-props': {
        admin: '{{ admin }}',
      },
    },
    update: {
      type: 'void',
      title: '{{t("Edit")}}',
      'x-component': 'Action.Link',
      properties: {
        drawer: {
          type: 'void',
          'x-component': 'Action.Drawer',
          'x-decorator': 'Form',
          'x-decorator-props': {
            useValues: '{{ cm.useValuesFromRecord }}',
          },
          title: '{{t("Edit")}}',
          properties: {
            formSchema,
            footer: {
              type: 'void',
              'x-component': 'Action.Drawer.Footer',
              properties: {
                cancel: {
                  title: '{{t("Cancel")}}',
                  'x-component': 'Action',
                  'x-use-component-props': 'useCancelActionProps',
                },
                submit: {
                  title: '{{t("Submit")}}',
                  'x-action': 'submit',
                  'x-component': 'Action',
                  'x-use-component-props': 'useMultiAppUpdateAction',
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
    delete: {
      type: 'void',
      title: '{{ t("Delete") }}',
      'x-component': 'Action.Link',
      // 'x-hidden': '{{ !admin }}',
      // 'x-decorator': 'ACLActionProvider',
      'x-use-component-props': 'useDestroyActionProps',
      'x-component-props': {
        confirm: {
          title: "{{t('Delete')}}",
          content: "{{t('Are you sure you want to delete it?')}}",
        },
      },
    },
    share: {
      type: 'void',
      title: '{{t("Share")}}',
      'x-component': 'Action.Link',
      properties: {
        drawer: {
          type: 'void',
          'x-component': 'Action.Drawer',
          'x-decorator': 'Form',
          'x-decorator-props': {
            useValues: '{{ cm.useValuesFromRecord }}',
          },
          title: '{{t("Share")}}',
          properties: {
            partners: {
              'x-component': 'CollectionField',
              'x-decorator': 'FormItem',
              'x-collection-field': 'applications.partners',
            },
            footer: {
              type: 'void',
              'x-component': 'Action.Drawer.Footer',
              properties: {
                cancel: {
                  title: '{{t("Cancel")}}',
                  'x-component': 'Action',
                  'x-use-component-props': 'useCancelActionProps',
                },
                submit: {
                  title: '{{t("Submit")}}',
                  'x-action': 'submit',
                  'x-component': 'Action',
                  'x-use-component-props': 'useMultiAppUpdateAction',
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
};
