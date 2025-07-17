import { useEffect, useState } from 'react';
import { SchemaComponent, useAPIClient, useCurrentUserContext } from '@tachybase/client';
import { Authenticator, useRedirect } from '@tachybase/module-auth/client';
import { ISchema } from '@tachybase/schema';

import { message } from 'antd';

import { useTranslation } from './locale';

type MainUserInfo = {
  username: string;
  nickname: string;
  phone: string;
  token: string;
};

const signInFormSchema: ISchema = {
  type: 'object',
  name: 'mainAppForm',
  'x-component': 'FormV2',
  properties: {
    username: {
      type: 'void',
      'x-component': 'div',
      'x-content': '{{ mainUser?.username }}',
    },
    phone: {
      type: 'void',
      'x-component': 'div',
      'x-content': '{{ mainUser?.phone }}',
    },
    actions: {
      type: 'void',
      'x-component': 'div',
      properties: {
        submit: {
          title: '{{t("Sign in")}}',
          type: 'void',
          'x-component': 'Action',
          'x-component-props': {
            htmlType: 'submit',
            block: true,
            type: 'primary',
            useAction: `{{ useMainAppSignIn }}`,
            style: { width: '100%' },
          },
        },
      },
    },
  },
};

export const SignInForm = (props) => {
  const { t } = useTranslation();
  const api = useAPIClient();

  const [mainUser, setMainUser] = useState<MainUserInfo>(null);

  const useMainAppSignIn = () => {
    const api = useAPIClient();
    const redirect = useRedirect();
    const { refreshAsync } = useCurrentUserContext();
    return {
      async run() {
        api.auth.setToken(mainUser.token);
        await refreshAsync();
        redirect();
      },
    };
  };

  useEffect(() => {
    const fetchAuthConfig = async () => {
      try {
        const result = await api.request({
          method: 'post',
          url: 'authMainAppConfig:getMainUser',
          data: {
            token: api.auth.getMainToken(),
          },
        });
        setMainUser(result?.data?.data);
      } catch (error) {
        console.error('Error fetching auth config:', error);
        message.error('Failed to fetch authentication information. Please try again.');
      }
    };
    fetchAuthConfig();
  }, [api]);

  if (!mainUser) {
    return <div>Loading...</div>;
  }
  return <SchemaComponent schema={signInFormSchema} scope={{ mainUser, useMainAppSignIn }} />;
};
