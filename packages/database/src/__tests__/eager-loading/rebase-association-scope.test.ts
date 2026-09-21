import { Op } from 'sequelize';

import { rebaseAssociationScope, rebaseAssociationScopeToRoot } from '../../eager-loading/rebase-association-scope';

it('rebases association aliases without changing Date values or symbol operators', () => {
  const date = new Date('2026-01-01T00:00:00.000Z');
  const where = { [Op.and]: [{ '$owner.name$': 'allowed' }, { createdAt: { [Op.gte]: date } }] };

  expect(rebaseAssociationScope(where, 'projects')).toEqual({
    [Op.and]: [{ '$projects.owner.name$': 'allowed' }, { createdAt: { [Op.gte]: date } }],
  });
});

it('rebases direct fields and association aliases when moving a target scope to the root query', () => {
  const where = {
    [Op.and]: [{ tenantId: { [Op.in]: ['current'] } }, { '$users.id$': 13 }, { status: 'active' }],
  };

  expect(rebaseAssociationScopeToRoot(where, 'projects')).toEqual({
    [Op.and]: [
      { '$projects.tenantId$': { [Op.in]: ['current'] } },
      { '$projects.users.id$': 13 },
      { '$projects.status$': 'active' },
    ],
  });
});
