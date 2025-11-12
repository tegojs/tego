import { TOKENS } from '@tego/core';

import { Locale } from '../locale';

export async function i18n(ctx, next) {
  const localeManager = ctx.tego.container.get(TOKENS.Locale) as Locale;
  const baseI18n = ctx.tego.container.get(TOKENS.I18n);

  ctx.getCurrentLocale = () => {
    const lng =
      ctx.get('X-Locale') ||
      (ctx.request.query.locale as string) ||
      baseI18n.language ||
      ctx.acceptsLanguages().shift() ||
      'en-US';
    return lng;
  };
  const lng = ctx.getCurrentLocale();
  const i18n = await localeManager.getI18nInstance(lng);
  ctx.i18n = i18n;
  ctx.t = i18n.t.bind(i18n);
  if (lng !== '*' && lng) {
    i18n.changeLanguage(lng);
    await localeManager.loadResourcesByLang(lng);
  }
  await next();
}
