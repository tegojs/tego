import { ACL } from '../../../acl/src';
import { mockDatabase } from '../mock-database';

describe('ACL resolver update whitelist integration', () => {
  it('rejects update values outside the stored field grant when a resolver replaces params', async () => {
    const db = mockDatabase({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const documents = db.collection({
      name: 'documents',
      timestamps: false,
      fields: [
        { name: 'id', type: 'integer', primaryKey: true },
        { name: 'name', type: 'string' },
        { name: 'tenantId', type: 'string' },
      ],
    });

    try {
      await db.sync();
      await documents.model.create({ id: 1, name: 'Original', tenantId: 'tenant-a' });

      const acl = new ACL();
      acl.define({ role: 'writer', actions: { 'documents:update': { fields: ['name'] } } });
      acl.registerActionParamsResolver(() => ({ fields: ['name', 'tenantId'] }));

      const params = acl.can({ role: 'writer', resource: 'documents', action: 'update' })?.params;
      await documents.repository.update({
        filterByTk: 1,
        values: { name: 'Updated', tenantId: 'tenant-b' },
        ...params,
      });

      const updated = await documents.model.findByPk(1);
      expect(updated.getDataValue('name')).toBe('Updated');
      expect(updated.getDataValue('tenantId')).toBe('tenant-a');
    } finally {
      await db.close();
    }
  });
});
