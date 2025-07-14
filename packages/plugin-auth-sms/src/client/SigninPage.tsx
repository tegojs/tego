import React from 'react';
import { SchemaComponent } from '@tachybase/client';
import { Authenticator, useSignIn } from '@tachybase/module-auth/client';
import { ISchema } from '@tachybase/schema';

import { Checkbox } from 'antd';

import VerificationCode from './VerificationCode';

const HtmlAgreementCheckbox = ({ value, onChange, htmlCode = '' }: any) => {
  return (
    <Checkbox checked={value} onChange={(e) => onChange(e.target.checked)}>
      <span dangerouslySetInnerHTML={{ __html: htmlCode }} />
    </Checkbox>
  );
};

const phoneForm: ISchema = {
  type: 'object',
  name: 'phoneForm',
  'x-component': 'Form',
  properties: {
    phone: {
      type: 'string',
      required: true,
      'x-component': 'Input',
      'x-validator': 'phone',
      'x-decorator': 'FormItem',
      'x-component-props': { placeholder: '{{t("Phone")}}', style: {} },
    },
    code: {
      type: 'string',
      required: true,
      'x-component': 'VerificationCode',
      'x-component-props': {
        actionType: 'auth:signIn',
        targetFieldName: 'phone',
      },
      'x-decorator': 'FormItem',
    },
    agree: {
      type: 'boolean',
      'x-component': 'HtmlAgreementCheckbox',
      'x-component-props': {
        htmlCode: '{{ agreeCode }}',
      },
      'x-visible': '{{ agreeMust }}',
    },
    actions: {
      title: '{{t("Sign in")}}',
      type: 'void',
      'x-component': 'Action',
      'x-component-props': {
        htmlType: 'submit',
        block: true,
        type: 'primary',
        useAction: '{{ useSMSSignIn }}',
        style: { width: '100%' },
      },
      'x-reactions': [
        {
          dependencies: ['agree'],
          fulfill: {
            state: {
              disabled: '{{ agreeMust && $deps[0] !== true }}',
            },
          },
        },
      ],
    },
    tip: {
      type: 'void',
      'x-component': 'div',
      'x-content': '{{t("User will be registered automatically if not exists.", {ns: "auth-sms"})}}',
      'x-component-props': { style: { color: '#ccc' } },
      'x-visible': '{{ autoSignup }}',
    },
  },
};

export const SigninPage = (props: { authenticator: Authenticator }) => {
  const authenticator = props.authenticator;
  const { name, options } = authenticator;
  const autoSignup = !!options?.autoSignup;
  const agreeMust = !!options.agreeMust;
  const agreeCode = options.agreeCode;
  const useSMSSignIn = () => {
    return useSignIn(name);
  };
  return (
    <SchemaComponent
      schema={phoneForm}
      scope={{ useSMSSignIn, autoSignup, agreeMust, agreeCode }}
      components={{ VerificationCode, HtmlAgreementCheckbox }}
    />
  );
};
