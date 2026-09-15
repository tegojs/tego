import { Op } from 'sequelize';

import { rebaseAssociationScope } from '../../eager-loading/rebase-association-scope';

it('rebases association aliases without changing Date values or symbol operators', () => {
  const date = new Date('2026-01-01T00:00:00.000Z');
  const where = { [Op.and]: [{ '$owner.name$': 'allowed' }, { createdAt: { [Op.gte]: date } }] };

  expect(rebaseAssociationScope(where, 'projects')).toEqual({
    [Op.and]: [{ '$projects.owner.name$': 'allowed' }, { createdAt: { [Op.gte]: date } }],
  });
});
