import { Context, Next } from '@tachybase/actions';
import { koaMulter as multer } from '@tachybase/utils';

export async function uploadMiddleware(ctx: Context, next: Next) {
  if (ctx.action.resourceName === 'pm' && ['add', 'update'].includes(ctx.action.actionName)) {
    const upload = multer().single('file');
    return upload(ctx, next);
  }
  return next();
}
