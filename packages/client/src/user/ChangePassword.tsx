import React, { useContext, useMemo, useState } from 'react';
import { ISchema, uid, useForm } from '@tachybase/schema';

import { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  ActionContextProvider,
  DropdownVisibleContext,
  SchemaComponent,
  useActionContext,
  useApp,
  useCurrentUserContext,
} from '../';
import { useAPIClient } from '../api-client';
import VerificationCode from './VerificationCode';

const useCloseAction = () => {
  const { setVisible } = useActionContext();
  const form = useForm();
  return {
    async run() {
      setVisible(false);
      form.submit((values) => {
        console.warn(values);
      });
    },
  };
};

const useSaveCurrentUserValues = () => {
  const { setVisible } = useActionContext();
  const form = useForm();
  const api = useAPIClient();
  const currentUser = useCurrentUserContext();
  const hideOldPassword = currentUser?.data?.data?.password === null;
  return {
    async run() {
      await form.submit();
      await api.resource('auth').changePassword({
        values: form.values,
      });
      if (hideOldPassword) {
        currentUser.mutate({
          data: {
            ...currentUser.data.data,
            password: '',
          },
        });
      }
      await form.reset();
      setVisible(false);
    },
  };
};

const schema: ISchema = {
  type: 'object',
  properties: {
    [uid()]: {
      'x-decorator': 'Form',
      'x-component': 'Action.Drawer',
      type: 'void',
      title: '{{t("Change password")}}',
      properties: {
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
              dependencies: ['.verifyMethod', '.phoneExist', '.phone'],
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
                          (smsVerifyEnabled && $deps[0] !== 'password')
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
        footer: {
          'x-component': 'Action.Drawer.Footer',
          type: 'void',
          properties: {
            cancel: {
              title: '{{t("Cancel")}}',
              'x-component': 'Action',
              'x-component-props': {
                useAction: '{{ useCloseAction }}',
              },
            },
            submit: {
              title: '{{t("Submit")}}',
              'x-component': 'Action',
              'x-component-props': {
                type: 'primary',
                useAction: '{{ useSaveCurrentUserValues }}',
              },
            },
          },
        },
      },
    },
  },
};

export const useChangePassword = () => {
  const ctx = useContext(DropdownVisibleContext);
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();
  const pm = useApp().pluginManager;
  const otp = pm.get('@tachybase/plugin-otp');
  const sms = pm.get('@tachybase/plugin-auth-sms');
  const smsVerifyEnabled = !!otp && !!sms;
  const currentUser = useCurrentUserContext();
  const oldPassword = currentUser?.data?.data?.password !== null;
  const phoneNumber = currentUser?.data?.data?.phone;
  // const codeDescription = phoneNumber ? `将发送验证码给手机${phoneNumber}` : '请先在个人资料填写手机号';
  const codeDescription = phoneNumber
    ? t('Send verfication code to phone: {{phoneNumber}}', { phoneNumber })
    : t('Please fill in your mobile phone number in your personal information first');
  return useMemo<MenuProps['items'][0]>(() => {
    return {
      key: 'password',
      eventKey: 'ChangePassword',
      onClick: () => {
        setVisible(true);
        ctx?.setVisible(false);
      },
      label: (
        <>
          {t('Change password')}
          <ActionContextProvider value={{ visible, setVisible }}>
            <div onClick={(e) => e.stopPropagation()}>
              <SchemaComponent
                scope={{
                  useCloseAction,
                  useSaveCurrentUserValues,
                  oldPassword,
                  codeDescription,
                  phoneNumber,
                  smsVerifyEnabled,
                }}
                components={{ VerificationCode }}
                schema={schema}
              />
            </div>
          </ActionContextProvider>
        </>
      ),
    };
  }, [visible, oldPassword]);
};
