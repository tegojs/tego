import { Action } from '@tachybase/resourcer';

import { ACL } from '..';

describe('ACL action parameters before fixed restrictions', () => {
  let acl: ACL;

  beforeEach(() => {
    acl = new ACL();
    acl.setAvailableAction('view', { aliases: ['list', 'get'] });
    acl.define({
      role: 'member',
      actions: { 'documents:view': { fields: ['id', 'name'], filter: { tenantId: 'B' } } },
    });
  });

  it('preserves normal permission behavior with no resolver', () => {
    expect(acl.can({ role: 'member', resource: 'documents', action: 'list' })).toMatchObject({
      params: { fields: ['id', 'name'], filter: { tenantId: 'B' } },
    });
  });

  it('resolves the granted role scope before merging fixed restrictions and evaluates them once', () => {
    const fixed = vi.fn(() => ({ filter: { tenantId: 'fixed-owner', active: true }, fields: ['id'] }));
    acl.addFixedParams('documents', 'list', fixed);
    const ctx = { currentConfig: 'migrated' };
    acl.registerActionParamsResolver((context, params) => {
      expect(context).toMatchObject({
        acl,
        role: 'member',
        resource: 'documents',
        action: 'list',
        ctx,
        source: 'resource',
      });
      expect(params.filter).toEqual({ tenantId: 'B' });
      delete params.filter;
      return params;
    });
    expect(acl.can({ role: 'member', resource: 'documents', action: 'list', ctx })).toMatchObject({
      params: { fields: ['id'], filter: { tenantId: 'fixed-owner', active: true } },
    });
    expect(fixed).toHaveBeenCalledTimes(1);
  });

  it.each(['create', 'update'] as const)(
    'keeps stored %s field grants enforced when a resolver replaces the grant params',
    (action) => {
      acl.define({ role: 'writer', actions: { [`documents:${action}`]: { fields: ['name'] } } });
      acl.registerActionParamsResolver(() => ({ fields: ['name', 'tenantId'] }));

      expect(acl.can({ role: 'writer', resource: 'documents', action })?.params).toEqual({ whitelist: ['name'] });
    },
  );

  it('keeps a disjoint resolved write whitelist as deny-all against request fields', () => {
    acl.define({ role: 'writer', actions: { 'documents:update': { fields: ['name'] } } });
    acl.registerActionParamsResolver(() => ({ fields: ['tenantId'] }));

    const action = new Action({ whitelist: ['tenantId'] });
    action.mergeParams(acl.can({ role: 'writer', resource: 'documents', action: 'update' }).params);

    expect(action.params.whitelist).toEqual([]);
  });

  it('keeps an empty current write whitelist as deny-all across later merges', () => {
    const action = new Action({ whitelist: [] });

    action.mergeParams({ whitelist: ['tenantId'] });

    expect(action.params.whitelist).toEqual([]);
  });

  it('treats undefined whitelist operands as absent without clearing an explicit restriction', () => {
    const action = new Action({ whitelist: undefined });

    action.mergeParams({ whitelist: undefined });
    expect(action.params.whitelist).toBeUndefined();

    action.mergeParams({ whitelist: [] });
    action.mergeParams({ whitelist: undefined });
    expect(action.params.whitelist).toEqual([]);
  });

  it('does not invoke resolvers or grant denied actions or missing roles', () => {
    const resolver = vi.fn((_context, params) => params);
    acl.registerActionParamsResolver(resolver);
    expect(acl.can({ role: 'member', resource: 'documents', action: 'destroy' })).toBeNull();
    expect(acl.can({ role: 'missing', resource: 'documents', action: 'list' })).toBeNull();
    expect(resolver).not.toHaveBeenCalled();
  });

  it('keeps changes local to the current call and supports unregistering', () => {
    const remove = acl.registerActionParamsResolver((context, params) => {
      if (context.ctx?.migrated) {
        delete params.filter;
        params.fields.push('amount');
      }
      return params;
    });
    const args = { role: 'member', resource: 'documents', action: 'list' };
    expect(acl.can({ ...args, ctx: { migrated: true } }).params).toEqual({ fields: ['id', 'name', 'amount'] });
    expect(acl.can(args).params).toEqual({ fields: ['id', 'name'], filter: { tenantId: 'B' } });
    remove();
    expect(acl.can({ ...args, ctx: { migrated: true } }).params.filter).toEqual({ tenantId: 'B' });
  });

  it('identifies strategy permissions and retains their restrictions', () => {
    acl.define({ role: 'strategy', strategy: { actions: ['view:own'] } });
    const resolver = vi.fn((_context, params) => params);
    acl.registerActionParamsResolver(resolver);
    expect(acl.can({ role: 'strategy', resource: 'documents', action: 'list' }).params.filter).toEqual({
      createdById: '{{ ctx.state.currentUser.id }}',
    });
    expect(resolver.mock.calls[0][0].source).toBe('strategy');
  });

  it('uses the raw resource path for fixed restrictions', () => {
    acl.addFixedParams('parents.documents', 'list', () => ({ filter: { active: true } }));
    acl.registerActionParamsResolver((_context, params) => {
      delete params.filter;
      return params;
    });
    expect(
      acl.can({ role: 'member', resource: 'documents', rawResourceName: 'parents.documents', action: 'list' }).params
        .filter,
    ).toEqual({ active: true });
  });

  it.each([null, false, [], Promise.resolve({})])('rejects invalid or asynchronous resolver results', (value) => {
    acl.registerActionParamsResolver(() => value as never);
    expect(() => acl.can({ role: 'member', resource: 'documents', action: 'list' })).toThrow(
      'synchronous plain object',
    );
  });

  it('propagates resolver failures rather than granting an empty filter', () => {
    acl.registerActionParamsResolver(() => {
      throw new Error('Invalid access configuration');
    });
    expect(() => acl.can({ role: 'member', resource: 'documents', action: 'list' })).toThrow(
      'Invalid access configuration',
    );
  });

  it('passes the same context through getActionParams and its nested can calls', async () => {
    const ctx = {
      state: { currentRole: 'member' },
      action: { resourceName: 'documents', actionName: 'list' },
      logger: { info() {} },
      can: undefined,
    };
    const seen: unknown[] = [];
    acl.registerActionParamsResolver((context, params) => {
      seen.push(context.ctx);
      return params;
    });
    await acl.getActionParams(ctx);
    ctx.can({ resource: 'documents', action: 'get' });
    expect(seen).toEqual([ctx, ctx]);
  });
});
