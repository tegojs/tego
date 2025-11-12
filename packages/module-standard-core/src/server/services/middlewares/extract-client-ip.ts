import { Context, Next } from '@tachybase/actions';

export function extractClientIp() {
  return async function extractClientIp(ctx: Context, next: Next) {
    const forwardedFor = ctx.get('X-Forwarded-For');
    const ipArray = forwardedFor ? forwardedFor.split(',') : [];
    const clientIp = ipArray.length > 0 ? ipArray[0].trim() : ctx.request.ip;
    ctx.state.clientIp = clientIp;

    await next();
  };
}
