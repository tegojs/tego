import { ACL } from '../acl';
import FixedParamsManager from '../fixed-params-manager';

describe('fixed params', () => {
  it('should merge params', async () => {
    const fixedParamsManager = new FixedParamsManager();

    fixedParamsManager.addParams('collections', 'destroy', () => {
      return {
        filter: {
          'name.$ne': 'users',
        },
      };
    });

    fixedParamsManager.addParams('collections', 'destroy', () => {
      return {
        filter: {
          'name.$ne': 'roles',
        },
      };
    });

    const params = fixedParamsManager.getParams('collections', 'destroy');
    expect(params).toEqual({
      filter: {
        $and: [
          {
            'name.$ne': 'users',
          },
          {
            'name.$ne': 'roles',
          },
        ],
      },
    });
  });

  it('should add fixed params to acl action', async () => {
    const acl = new ACL();

    const adminRole = acl.define({
      role: 'admin',
      actions: {
        'collections:destroy': {},
      },
    });

    let canResult = acl.can({
      role: 'admin',
      resource: 'collections',
      action: 'destroy',
    });

    expect(canResult).toEqual({ role: 'admin', resource: 'collections', action: 'destroy' });

    acl.addFixedParams('collections', 'destroy', () => {
      return {
        filter: {
          'name.$ne': 'users',
        },
      };
    });

    canResult = acl.can({
      role: 'admin',
      resource: 'collections',
      action: 'destroy',
    });

    expect(canResult).toEqual({
      role: 'admin',
      resource: 'collections',
      action: 'destroy',
      params: {
        filter: {
          'name.$ne': 'users',
        },
      },
    });
  });
  it('keeps an empty write whitelist as deny-all when fixed params allow fields', () => {
    const acl = new ACL();
    acl.define({ role: 'writer', actions: { 'documents:update': { fields: [] } } });
    acl.addFixedParams('documents', 'update', () => ({ whitelist: ['secret'] }));

    expect(acl.can({ role: 'writer', resource: 'documents', action: 'update' })?.params?.whitelist).toEqual([]);
  });

  it('keeps an empty fixed write whitelist as deny-all', () => {
    const acl = new ACL();
    acl.define({ role: 'writer', actions: { 'documents:update': { fields: ['secret'] } } });
    acl.addFixedParams('documents', 'update', () => ({ whitelist: [] }));

    expect(acl.can({ role: 'writer', resource: 'documents', action: 'update' })?.params?.whitelist).toEqual([]);
  });
});
