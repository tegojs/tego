import { Context } from '@tachybase/actions';
import { traverseJSON } from '@tachybase/database';

export const dataTemplate = async (ctx: Context, next) => {
  const { resourceName, actionName } = ctx.action;
  const { isTemplate, fields } = ctx.action.params;

  await next();

  if (isTemplate && actionName === 'get' && fields.length > 0) {
    ctx.body = traverseJSON(JSON.parse(JSON.stringify(ctx.body)), {
      collection: ctx.db.getCollection(resourceName),
      include: fields,
    });
  }
};
