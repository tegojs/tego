import { ISchema } from '@tachybase/schema';

import { i18nText } from '../../locale';

export const formSchema: ISchema = {
  type: 'void',
  'x-component': 'div',
  properties: {
    displayName: {
      'x-component': 'CollectionField',
      'x-decorator': 'FormItem',
    },
    name: {
      'x-component': 'CollectionField',
      'x-decorator': 'FormItem',
      'x-disabled': '{{ !createOnly }}',
      'x-hidden': '{{ !admin }}',
    },
    // 'options.standaloneDeployment': {
    //   'x-component': 'Checkbox',
    //   'x-decorator': 'FormItem',
    //   'x-content': i18nText('Standalone deployment'),
    // },
    // 'options.autoStart': {
    //   title: i18nText('Start mode'),
    //   'x-component': 'Radio.Group',
    //   'x-decorator': 'FormItem',
    //   default: false,
    //   enum: [
    //     { label: i18nText('Start on first visit'), value: false },
    //     { label: i18nText('Start with main application'), value: true },
    //   ],
    //   'x-hidden': '{{ !admin }}',
    // },
    cnamePrefix: {
      title: i18nText('Custom domain prefix'),
      'x-component': 'Input',
      'x-decorator': 'FormItem',
      'x-validator': `{{(value) => {
        if (!value) { 
          return null;
        }
        if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(value)) {
          return t("Custom domain prefix must be 1-63 characters, lowercase letters, numbers, or hyphens (-), and cannot start or end with a hyphen (-)");
        }
      }}}`,
      'x-component-props': {
        addonAfter: `.${window.location.hostname}`,
      },
      'x-reactions': [
        {
          dependencies: ['cname'],
          fulfill: {
            state: {
              value: '{{ ($deps[0] && $deps[0].replace(new RegExp("\\."+window.location.hostname+"$"), "")) || "" }}',
            },
          },
        },
      ],
    },
    cname: {
      'x-hidden': true,
      'x-component': 'Input',
      'x-decorator': 'FormItem',
      'x-read-pretty': true,
      // 依赖cnamePrefix取${cnamePrefix}.${window.location.hostname}
      'x-reactions': {
        dependencies: ['cnamePrefix'],
        fulfill: {
          state: {
            value: `{{$deps[0] ? $deps[0] + ".${window.location.hostname}" : null}}`,
          },
        },
      },
    },
    tmpl: {
      title: i18nText('Template'),
      'x-component': 'RemoteSelect',
      'x-component-props': {
        placeholder: i18nText('Can be empty, or selected from the template library or personal applications'),
        fieldNames: {
          label: 'displayName',
          value: 'name',
        },
        service: {
          resource: 'applications',
          params: {
            filter: {
              $or: [{ isTemplate: true }, { createdById: '{{ userId }}' }],
            },
          },
        },
      },
      'x-decorator': 'FormItem',
      'x-disabled': '{{ !createOnly }}',
    },
    'options.startEnvs': {
      type: 'string',
      title: i18nText('Start environment variables'),
      'x-component': 'Input.TextArea',
      'x-decorator': 'FormItem',
      'x-hidden': true, // main and multi use same env cause problem
    },
    pinned: {
      'x-component': 'CollectionField',
      'x-decorator': 'FormItem',
      'x-hidden': '{{ !admin }}',
    },
    isTemplate: {
      'x-component': 'CollectionField',
      'x-decorator': 'FormItem',
      'x-hidden': '{{ !admin }}',
    },
    icon: {
      type: 'string',
      title: `{{ t("Icon") }}`,
      'x-component': 'IconPicker',
      'x-decorator': 'FormItem',
    },
    color: {
      type: 'string',
      title: `{{ t("Color") }}`,
      'x-component': 'ColorPicker',
      'x-decorator': 'FormItem',
      default: '#e5e5e5',
    },
  },
};
