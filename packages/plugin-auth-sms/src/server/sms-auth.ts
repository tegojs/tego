import { AuthConfig, BaseAuth } from '@tachybase/auth';
import { Model, PasswordField } from '@tachybase/database';
import { AuthModel } from '@tachybase/module-auth';
import VerificationPlugin from '@tachybase/plugin-otp';

import { namespace } from '../constants';

export class SMSAuth extends BaseAuth {
  constructor(config: AuthConfig) {
    const { ctx } = config;
    super({
      ...config,
      userCollection: ctx.db.getCollection('users'),
    });
  }

  async validate() {
    const ctx = this.ctx;
    const verificationPlugin: VerificationPlugin = ctx.app.getPlugin('otp');
    if (!verificationPlugin) {
      throw new Error('sms-auth: @tachybase/plugin-otp is required');
    }
    let user: Model;
    await verificationPlugin.intercept(ctx, async () => {
      const {
        values: { phone },
      } = ctx.action.params;
      try {
        // History data compatible processing
        user = await this.userRepository.findOne({
          filter: { phone },
        });
        if (user) {
          await this.authenticator.addUser(user, {
            through: {
              uuid: phone,
            },
          });
          return;
        }
        // New data
        const { autoSignup } = this.authenticator.options?.public || {};
        const authenticator = this.authenticator as AuthModel;
        if (autoSignup) {
          user = await authenticator.findOrCreateUser(phone, {
            nickname: phone,
            phone,
          });
          return;
        }
        user = await authenticator.findUser(phone);
        if (!user) {
          throw new Error(ctx.t('The phone number is not registered, please register first', { ns: namespace }));
        }
      } catch (err) {
        console.error(err);
        throw new Error(err.message);
      }
    });
    return user;
  }

  async changePassword() {
    const ctx = this.ctx;
    const {
      values: { newPassword, phone, oldPassword, code },
    } = ctx.action.params;
    const verificationPlugin: VerificationPlugin = ctx.app.getPlugin('otp');
    const currentUser = ctx.auth.user;
    if (!currentUser) {
      ctx.throw(401);
    }
    const user = await this.userRepository.findOne({
      where: {
        phone: currentUser.phone,
      },
    });
    if (!user) {
      ctx.throw(404, ctx.t('User not found', { ns: namespace }));
    }
    const pwd = this.userCollection.getField<PasswordField>('password');

    let passwordValid = false;
    let codeValid = false;

    if (user.password && oldPassword) {
      passwordValid = (await pwd.verify(oldPassword, user.password)) as boolean;
    }

    if (code && phone) {
      try {
        await verificationPlugin.intercept(ctx, async () => {
          codeValid = true;
        });
      } catch (e) {}
    }

    if (!passwordValid && !codeValid) {
      ctx.throw(401, ctx.t('The old password or verification code is incorrect', { ns: namespace }));
    }
    user.password = newPassword;
    await user.save();
    return currentUser;
  }
}
