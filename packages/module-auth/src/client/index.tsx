import { ComponentType, lazy } from 'react';
import { Plugin } from '@tachybase/client';
import { Registry } from '@tachybase/utils/client';

import { presetAuthType } from '../preset';
import { Authenticator as AuthenticatorType } from './authenticator';
import { AuthProvider } from './AuthProvider';
import { Options, SignInForm, SignUpForm } from './basic';
import { AuthenticatorBind } from './bind/AuthenticatorBind';
import { authCheckMiddleware } from './interceptors';
import { NAMESPACE } from './locale';
import { AuthLayout, SignInPage, SignUpPage } from './pages';
import { Authenticator } from './settings/Authenticator';
import { TokenPolicySettings } from './settings/token-policy';

export type AuthOptions = {
  components: Partial<{
    SignInForm: ComponentType<{ authenticator: AuthenticatorType }>;
    SignInButton: ComponentType<{ authenticator: AuthenticatorType }>;
    SignUpForm: ComponentType<{ authenticatorName: string }>;
    AdminSettingsForm: ComponentType;
    // 在此处添加 绑定/解绑 表单
    BindForm: ComponentType<{ authenticator: AuthenticatorType }>;
  }>;
};

export class PluginAuthClient extends Plugin {
  authTypes = new Registry<AuthOptions>();

  registerType(authType: string, options: AuthOptions) {
    this.authTypes.register(authType, options);
  }

  async load() {
    this.app.systemSettingsManager.add('system-services.' + NAMESPACE, {
      icon: 'LoginOutlined',
      title: `{{t("Authentication", { ns: "${NAMESPACE}" })}}`,
      Component: Authenticator,
      aclSnippet: 'pm.auth.authenticators',
    });

    this.app.userSettingsManager.add(NAMESPACE, {
      icon: 'LoginOutlined',
      title: `{{t("Authentication login bind", { ns: "${NAMESPACE}" })}}`,
      Component: AuthenticatorBind,
      aclSnippet: 'pm.auth.authenticators',
    });

    this.router.add('auth', {
      Component: 'AuthLayout',
    });
    this.router.add('auth.signin', {
      path: '/signin',
      Component: 'SignInPage',
    });
    this.router.add('auth.signup', {
      path: '/signup',
      Component: 'SignUpPage',
    });

    this.app.addComponents({
      AuthLayout,
      SignInPage,
      SignUpPage,
    });

    this.app.providers.unshift([AuthProvider, {}]);

    this.registerType(presetAuthType, {
      components: {
        SignInForm: SignInForm,
        SignUpForm: SignUpForm,
        AdminSettingsForm: Options,
      },
    });

    this.app.systemSettingsManager.add(`security.token-policy`, {
      title: `{{t("Token policy", { ns: "${NAMESPACE}" })}}`,
      Component: TokenPolicySettings,
      aclSnippet: `pm.security.token-policy`,
      icon: 'ApiOutlined',
      sort: 0,
    });

    const [fulfilled, rejected] = authCheckMiddleware({ app: this.app });
    this.app.apiClient.axios.interceptors.response['handlers'].unshift({
      fulfilled,
      rejected,
      synchronous: false,
      runWhen: null,
    });
  }
}

export { AuthenticatorsContext, useAuthenticator } from './authenticator';
export type { Authenticator } from './authenticator';
export { useSignIn, useRedirect } from './basic';

export default PluginAuthClient;
