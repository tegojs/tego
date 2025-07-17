import { tval } from '../locale';

export const authMainAppManagerSchema = {
  type: 'object',
  properties: {
    authMainApp: {
      type: 'void',
      title: tval('Auth by main app'),
      'x-decorator': 'CardItem',
      'x-component': 'FormV2',
      'x-use-component-props': 'useAuthMainAppValues',
      properties: {
        selfSignIn: {
          type: 'boolean',
          title: tval('Allow the validator of this system to log in.'),
          'x-decorator': 'FormItem',
          'x-component': 'Checkbox',
        },
        authMainApp: {
          type: 'boolean',
          title: tval('Enable Single Sign-On (SSO)'),
          'x-decorator': 'FormItem',
          'x-component': 'Checkbox',
          'x-hidden': '{{ isMainApp }}',
        },
        footer: {
          type: 'void',
          'x-component': 'ActionBar',
          properties: {
            submit: {
              title: '{{t("Submit")}}',
              'x-component': 'Action',
              'x-component-props': {
                type: 'primary',
                useAction: '{{ useSaveAuthMainAppValues }}',
              },
            },
          },
        },
      },
    },
  },
};
