import React from 'react';
import {
  SchemaComponent,
  useAPIClient,
  useApp,
  useCurrentUserContext,
  useTranslation,
  VerificationCode,
} from '@tachybase/client';
import { ISchema, useForm } from '@tachybase/schema';
import { uid } from '@tachybase/utils/client';

import { App } from 'antd';

export const ChangePassword = () => {
  const currentUser = useCurrentUserContext();
  const pm = useApp().pluginManager;
  const otp = pm.get('@tachybase/plugin-otp');
  const sms = pm.get('@tachybase/plugin-auth-sms');
  const smsVerifyEnabled = !!otp && !!sms;
  const oldPassword = currentUser?.data?.data?.password !== null;
  const phoneNumber = currentUser?.data?.data?.phone;
  // const codeDescription = phoneNumber ? `将发送验证码给手机${phoneNumber}` : '请先在个人资料填写手机号';
  const { t } = useTranslation();
  const codeDescription = phoneNumber
    ? t('Send verfication code to phone: {{phoneNumber}}', { phoneNumber })
    : t('Please fill in your mobile phone number in your personal information first');
  return (
    <SchemaComponent
      schema={schema}
      scope={{ useSaveCurrentUserValues, oldPassword, codeDescription, phoneNumber, smsVerifyEnabled }}
      components={{ VerificationCode }}
    />
  );
};

const useSaveCurrentUserValues = () => {
  const form = useForm();
  const api = useAPIClient();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const currentUser = useCurrentUserContext();
  const hideOldPassword = currentUser?.data?.data?.password === null;
  return {
    async run() {
      await form.submit();
      const result = await api.resource('auth').changePassword({
        values: form.values,
      });
      if (result.status === 200) {
        message.success(t('Edited successfully'));
        if (hideOldPassword) {
          currentUser.mutate({
            data: {
              ...currentUser.data.data,
              password: '',
            },
          });
        }
      }
      await form.reset();
    },
  };
};

const schema: ISchema = {
  type: 'object',
  properties: {
    [uid()]: {
      type: 'void',
      'x-component': 'CardItem',
      'x-decorator': 'Form',
      title: '{{t("Change password")}}',
      properties: {
        action: {
          type: 'void',
          properties: {
            submit: {
              title: '{{t("Submit")}}',
              'x-component': 'Action',
              'x-component-props': {
                type: 'primary',
                style: { left: '96%' },
                useAction: '{{ useSaveCurrentUserValues }}',
              },
            },
          },
        },
        verifyMethod: {
          type: 'string',
          required: true,
          title: '{{t("Verify method")}}',
          enum: [
            { label: '{{t("Use old password")}}', value: 'password' },
            { label: '{{t("Use verification code")}}', value: 'code' },
          ],
          'x-component': 'Radio.Group',
          'x-decorator': 'FormItem',
          'x-reactions': [
            {
              dependencies: ['.phoneExist', '.oldPasswordExist'],
              fulfill: {
                state: {
                  hidden: '{{ !($deps[0] && $deps[1] && smsVerifyEnabled) }}',
                  value: '{{ undefined }}',
                },
              },
            },
          ],
        },
        phoneExist: {
          type: 'boolean',
          default: '{{ !!phoneNumber }}',
          'x-hidden': true,
        },
        phone: {
          type: 'string',
          title: '{{t("Phone")}}',
          default: '{{ phoneNumber }}',
          'x-component': 'Input',
          'x-validator': 'phone',
          'x-decorator': 'FormItem',
          'x-hidden': true,
        },
        code: {
          type: 'string',
          title: '{{t("Verification code")}}',
          description: '{{codeDescription}}',
          'x-component': 'VerificationCode',
          'x-component-props': {
            actionType: 'auth:changePassword',
            targetFieldName: 'phone',
          },
          required: true,
          'x-decorator': 'FormItem',
          'x-reactions': [
            {
              dependencies: ['.verifyMethod', '.phoneExist'],
              fulfill: {
                state: {
                  hidden: `{{ 
                          !$deps[1] || 
                          !smsVerifyEnabled ||
                          ($deps[0] !== 'code' && $deps[0] !== undefined) // 有 verifyMethod 但未选 code
                        }}`,
                },
              },
            },
          ],
        },
        oldPasswordExist: {
          type: 'boolean',
          default: '{{ oldPassword }}',
          'x-hidden': true,
        },
        oldPassword: {
          type: 'string',
          title: '{{t("Old password")}}',
          required: true,
          'x-component': 'Password',
          'x-decorator': 'FormItem',
          'x-reactions': [
            {
              dependencies: ['.verifyMethod', '.oldPasswordExist'],
              fulfill: {
                state: {
                  hidden: `{{ 
                          !$deps[1] || 
                          (smsVerifyEnabled && $deps[0] !== 'password' && $deps[0] !== undefined)
                        }}`,
                },
              },
            },
          ],
        },
        newPassword: {
          type: 'string',
          title: '{{t("New password")}}',
          required: true,
          'x-component': 'Password',
          'x-decorator': 'FormItem',
          'x-component-props': { checkStrength: true, style: {} },
          'x-reactions': [
            {
              dependencies: ['.confirmPassword'],
              fulfill: {
                state: {
                  selfErrors: '{{$deps[0] && $self.value && $self.value !== $deps[0] ? t("Password mismatch") : ""}}',
                },
              },
            },
          ],
        },
        confirmPassword: {
          type: 'string',
          required: true,
          title: '{{t("Confirm password")}}',
          'x-component': 'Password',
          'x-decorator': 'FormItem',
          'x-component-props': { checkStrength: true, style: {} },
          'x-reactions': [
            {
              dependencies: ['.newPassword'],
              fulfill: {
                state: {
                  selfErrors: '{{$deps[0] && $self.value && $self.value !== $deps[0] ? t("Password mismatch") : ""}}',
                },
              },
            },
          ],
        },
      },
    },
  },
};
