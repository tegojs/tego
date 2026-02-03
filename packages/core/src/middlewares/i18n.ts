import { Locale } from '../locale';

export async function i18n(ctx, next) {
  // Provide fallback ctx.t that uses app.i18n directly if localeManager is not available
  if (!ctx.tego || !ctx.tego.localeManager) {
    if (ctx.tego?.i18n) {
      ctx.t = ctx.tego.i18n.t.bind(ctx.tego.i18n);
      ctx.i18n = ctx.tego.i18n;
    }
    await next();
    return;
  }

  ctx.getCurrentLocale = () => {
    const lng =
      ctx.get('X-Locale') ||
      (ctx.request.query.locale as string) ||
      ctx.tego.i18n?.language ||
      ctx.acceptsLanguages().shift() ||
      'en-US';
    return lng;
  };
  const lng = ctx.getCurrentLocale();
  const localeManager = ctx.tego.localeManager as Locale;
  const i18n = await localeManager.getI18nInstance(lng);
  ctx.i18n = i18n;
  ctx.t = i18n.t.bind(i18n);
  if (lng !== '*' && lng) {
    i18n.changeLanguage(lng);
    await localeManager.loadResourcesByLang(lng);
  }
  await next();
}
