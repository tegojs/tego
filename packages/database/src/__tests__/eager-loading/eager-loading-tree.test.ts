import Database, { mockDatabase } from '@tachybase/database';

import { Op } from 'sequelize';

import { EagerLoadingTree } from '../../eager-loading/eager-loading-tree';

describe('Eager loading tree', () => {
  let db: Database;
  beforeEach(async () => {
    db = mockDatabase({
      tablePrefix: '',
    });

    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  it('advertises support for target association read scopes to consumers', () => {
    const source = db.collection({ name: 'scope_capability_source' });
    expect((source.repository as any).supportsAssociationReadScope).toBe(true);
  });

  it.each(['hasMany', 'belongsTo', 'belongsToMany'])(
    'scopes %s target records appended to a shared source',
    async (type) => {
      const source = db.collection({
        name: 'source',
        fields: [
          { type: 'string', name: 'name' },
          type === 'belongsTo'
            ? { type, name: 'target', target: 'target' }
            : {
                type,
                name: 'targets',
                target: 'target',
                ...(type === 'belongsToMany'
                  ? { through: 'source_targets', foreignKey: 'sourceId', otherKey: 'targetId' }
                  : {}),
              },
        ],
      });
      const target = db.collection({ name: 'target', fields: [{ type: 'string', name: 'tenantId' }] });
      await db.sync();
      const visible = await target.repository.create({ values: { tenantId: 'current' } });
      const foreign = await target.repository.create({ values: { tenantId: 'foreign' } });
      await source.repository.create({
        values:
          type === 'belongsTo'
            ? [
                { name: 'visible', target: visible },
                { name: 'foreign', target: foreign },
              ]
            : { name: 'shared', targets: [visible, foreign] },
      });
      const records = await source.repository.find({
        appends: [type === 'belongsTo' ? 'target' : 'targets'],
        context: { getAssociationReadScope: async () => ({ filter: { tenantId: 'current' } }) },
      });
      if (type === 'belongsTo') {
        expect(
          records
            .find((record) => record.get('name') === 'visible')
            .get('target')
            ?.get('id'),
        ).toBe(visible.get('id'));
        expect(records.find((record) => record.get('name') === 'foreign').get('target')).toBeNull();
      } else {
        expect(records[0].get('targets').map((item) => item.get('tenantId'))).toEqual(['current']);
      }
    },
  );

  it('applies the target scope before association filtering and pagination', async () => {
    const source = db.collection({
      name: 'source',
      fields: [{ type: 'hasMany', name: 'targets', target: 'target' }],
    });
    db.collection({ name: 'target', fields: [{ type: 'string', name: 'tenantId' }] });
    await db.sync();
    await source.repository.create({
      values: [{ targets: [{ tenantId: 'foreign' }] }, { targets: [{ tenantId: 'current' }] }],
    });

    const context = { getAssociationReadScope: async () => ({ filter: { tenantId: 'current' } }) };
    const [records, count] = await source.repository.findAndCount({
      filter: { 'targets.tenantId': 'foreign' },
      appends: ['targets'],
      limit: 1,
      context,
    });

    expect(count).toBe(0);
    expect(records).toEqual([]);
  });

  it('restricts appended target fields using its read scope', async () => {
    const source = db.collection({ name: 'source', fields: [{ type: 'hasMany', name: 'targets', target: 'target' }] });
    db.collection({
      name: 'target',
      fields: [
        { type: 'string', name: 'visible' },
        { type: 'string', name: 'secret' },
      ],
    });
    await db.sync();
    await source.repository.create({ values: { targets: [{ visible: 'yes', secret: 'hidden' }] } });

    const records = await source.repository.find({
      appends: ['targets'],
      context: { getAssociationReadScope: async () => ({ fields: ['visible'] }) },
    });
    const target = records[0].get('targets')[0].toJSON();
    expect(target.visible).toBe('yes');
    expect(target.secret).toBeUndefined();
    expect(target[source.model.associations.targets.foreignKey]).toBeUndefined();
    expect(Object.keys(target)).toEqual(['visible']);
  });

  it('does not load nested associations omitted from the target field grants', async () => {
    const source = db.collection({ name: 'source', fields: [{ type: 'hasMany', name: 'targets', target: 'target' }] });
    db.collection({ name: 'target', fields: [{ type: 'belongsTo', name: 'owner', target: 'owner' }] });
    db.collection({ name: 'owner', fields: [{ type: 'string', name: 'secret' }] });
    await db.sync();
    await source.repository.create({ values: { targets: [{ owner: { secret: 'hidden' } }] } });

    const rows = await source.repository.find({
      appends: ['targets', 'targets.owner.secret'],
      context: { getAssociationReadScope: async () => ({ fields: ['id'], appends: [] }) },
    });
    expect(rows[0].get('targets')[0].toJSON().owner).toBeUndefined();
  });

  it('uses association joins in the target read scope for appended data and root filters', async () => {
    const source = db.collection({ name: 'source', fields: [{ type: 'hasMany', name: 'targets', target: 'target' }] });
    db.collection({
      name: 'target',
      fields: [
        { type: 'string', name: 'title' },
        { type: 'belongsTo', name: 'owner', target: 'owner' },
      ],
    });
    db.collection({ name: 'owner', fields: [{ type: 'string', name: 'tenantId' }] });
    await db.sync();
    await source.repository.create({
      values: [
        { targets: [{ title: 'visible', owner: { tenantId: 'current' } }] },
        { targets: [{ title: 'foreign', owner: { tenantId: 'foreign' } }] },
      ],
    });

    const context = {
      getAssociationReadScope: async (collection) =>
        collection.name === 'target' ? { filter: { 'owner.tenantId': 'current' } } : {},
    };
    const [rows, count] = await source.repository.findAndCount({
      appends: ['targets'],
      filter: { 'targets.title': 'foreign' },
      context,
    });
    expect(count).toBe(0);
    expect(rows).toEqual([]);

    const all = await source.repository.find({ appends: ['targets'], context });
    expect(all.map((item) => item.get('targets').map((target) => target.get('title')))).toEqual([['visible'], []]);
    expect(all[0].get('targets')[0].toJSON().owner).toBeUndefined();
  });

  it('serializes a parent record after loading a scoped belongsTo target with association joins', async () => {
    const source = db.collection({
      name: 'source',
      fields: [{ type: 'belongsTo', name: 'target', target: 'target' }],
    });
    db.collection({
      name: 'target',
      fields: [
        { type: 'string', name: 'title' },
        { type: 'belongsTo', name: 'owner', target: 'owner' },
      ],
    });
    db.collection({ name: 'owner', fields: [{ type: 'string', name: 'tenantId' }] });
    await db.sync();
    await source.repository.create({
      values: { target: { title: 'visible', owner: { tenantId: 'current' } } },
    });

    const rows = await source.repository.find({
      appends: ['target'],
      context: {
        getAssociationReadScope: async (collection) =>
          collection.name === 'target' ? { filter: { 'owner.tenantId': 'current' } } : {},
      },
    });

    Object.defineProperty(rows[0].get('target'), 'serializationTrap', {
      enumerable: true,
      get: () => {
        throw new Error('Association models must not be cloned as plain objects');
      },
    });
    const serialized = JSON.parse(JSON.stringify(rows[0]));
    expect(serialized.target.title).toBe('visible');
    expect(serialized.target.owner).toBeUndefined();
    expect(serialized.target._previousDataValues).toBeUndefined();
    expect(() => rows[0].set('target', rows[0].get('target'))).not.toThrow();
  });

  it('does not allow root filters to probe target fields hidden by the target scope', async () => {
    const source = db.collection({ name: 'source', fields: [{ type: 'hasMany', name: 'targets', target: 'target' }] });
    db.collection({ name: 'target', fields: [{ type: 'string', name: 'secret' }] });
    await db.sync();
    await source.repository.create({ values: { targets: [{ secret: 'foreign' }] } });

    await expect(
      source.repository.findAndCount({
        filter: { 'targets.secret': 'foreign' },
        context: { getAssociationReadScope: async () => ({ fields: ['id'] }) },
      }),
    ).rejects.toThrow('Association field is not readable');
  });

  it('does not allow root filters or sorting to probe nested relations omitted from target appends', async () => {
    const source = db.collection({ name: 'source', fields: [{ type: 'belongsTo', name: 'target', target: 'target' }] });
    db.collection({ name: 'target', fields: [{ type: 'belongsTo', name: 'owner', target: 'owner' }] });
    db.collection({ name: 'owner', fields: [{ type: 'string', name: 'secret' }] });
    await db.sync();
    await source.repository.create({ values: { target: { owner: { secret: 'hidden' } } } });
    const context = {
      getAssociationReadScope: async (collection) => (collection.name === 'target' ? { appends: [] } : {}),
    };

    await expect(source.repository.find({ filter: { 'target.owner.secret': 'hidden' }, context })).rejects.toThrow(
      'Association field is not readable',
    );
    await expect(
      source.repository.find({ appends: ['target'], sort: ['target.owner.secret'], context }),
    ).rejects.toThrow('Association field is not readable');
    await expect(source.repository.find({ sort: ['target.owner.secret'], context })).rejects.toThrow(
      'Association field is not readable',
    );
  });

  it('limits nested appended fields to complete target ACL paths', async () => {
    const source = db.collection({ name: 'source', fields: [{ type: 'belongsTo', name: 'target', target: 'target' }] });
    db.collection({ name: 'target', fields: [{ type: 'belongsTo', name: 'owner', target: 'owner' }] });
    db.collection({
      name: 'owner',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'string', name: 'secret' },
      ],
    });
    await db.sync();
    await source.repository.create({ values: { target: { owner: { name: 'visible', secret: 'hidden' } } } });
    const context = {
      getAssociationReadScope: async (collection) => (collection.name === 'target' ? { appends: ['owner.name'] } : {}),
    };

    const rows = await source.repository.find({
      appends: ['target', 'target.owner.name', 'target.owner.secret'],
      context,
    });
    const owner = rows[0].get('target').get('owner').toJSON();
    expect(owner.name).toBe('visible');
    expect(owner.secret).toBeUndefined();
    await expect(source.repository.find({ filter: { 'target.owner.secret': 'hidden' }, context })).rejects.toThrow(
      'Association field is not readable',
    );
  });

  it('does not expand allowed appends into recursively loaded associations', async () => {
    const source = db.collection({
      name: 'source',
      fields: [{ type: 'belongsTo', name: 'target', target: 'target' }],
    });
    const target = db.collection({
      name: 'target',
      fields: [{ type: 'belongsTo', name: 'source', target: 'source' }],
    });
    await db.sync();
    const targetRecord = await target.repository.create({ values: {} });
    await source.repository.create({ values: { targetId: targetRecord.get('id') } });
    const scopedCollections: string[] = [];
    const context = {
      getAssociationReadScope: async (collection) => {
        scopedCollections.push(collection.name);
        if (scopedCollections.length > 4) {
          throw new Error('association read scopes recursed through allowed appends');
        }
        return collection.name === 'target' ? { appends: ['source'] } : { appends: ['target'] };
      },
    };

    const [rows, count] = await source.repository.findAndCount({
      filter: { target: { id: targetRecord.get('id') } },
      appends: ['target'],
      context,
    });

    expect(count).toBe(1);
    expect(rows[0].get('target')?.get('id')).toBe(targetRecord.get('id'));
    expect(Object.hasOwn(rows[0].get('target').dataValues, 'source')).toBe(false);
    expect(scopedCollections).toEqual(['target', 'target']);
  });

  it('keeps association joins required by read-scope filters without expanding allowed appends', async () => {
    const records = db.collection({
      name: 'records',
      fields: [{ type: 'belongsTo', name: 'project', target: 'projects' }],
    });
    const projects = db.collection({
      name: 'projects',
      fields: [
        { type: 'string', name: 'name' },
        {
          type: 'belongsToMany',
          name: 'users',
          target: 'users',
          through: 'projects_users',
          foreignKey: 'projectId',
          otherKey: 'userId',
        },
        { type: 'hasMany', name: 'records', target: 'records', foreignKey: 'projectId' },
      ],
    });
    const users = db.collection({ name: 'users' });
    await db.sync();
    const currentUser = await users.repository.create({ values: {} });
    const project = await projects.repository.create({
      values: { name: 'visible', users: [currentUser] },
    });
    await records.repository.create({ values: { projectId: project.get('id') } });
    const scopedCollections: string[] = [];
    const context = {
      getAssociationReadScope: async (collection) => {
        scopedCollections.push(collection.name);
        if (scopedCollections.length > 6) {
          throw new Error('association read scopes recursed through allowed appends');
        }
        if (collection.name === 'projects') {
          return { filter: { users: { id: currentUser.get('id') } }, appends: ['records', 'users'] };
        }
        if (collection.name === 'users') {
          return { appends: ['projects'] };
        }
        return { appends: ['project'] };
      },
    };

    const countSpy = vi.spyOn(records.model, 'count');
    const findSpy = vi.spyOn(records.model, 'findAll');

    const [rows, count] = await records.repository.findAndCount({
      filter: { project: { name: 'visible' } },
      appends: ['project'],
      context,
    });

    expect(count).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].get('project')?.get('id')).toBe(project.get('id'));
    expect(Object.hasOwn(rows[0].get('project').dataValues, 'records')).toBe(false);
    expect(Object.hasOwn(rows[0].get('project').dataValues, 'users')).toBe(false);
    const countOptions = countSpy.mock.calls[0][0] as any;
    const projectInclude = countOptions.include.find((item) => item.association === 'project');
    expect(projectInclude.where?.[Op.and]?.[1]?.['$project.users.id$']).toBeUndefined();
    expect(countOptions.where[Op.and][1]).toHaveProperty('$project.users.id$', currentUser.get('id'));
    const rootFindOptions = findSpy.mock.calls[0][0] as any;
    const rootProjectInclude = rootFindOptions.include.find((item) => item.association === 'project');
    expect(rootProjectInclude.where?.[Op.and]?.[1]?.['$project.users.id$']).toBeUndefined();
    expect(rootFindOptions.where[Op.and][1]).toHaveProperty('$project.users.id$', currentUser.get('id'));
    expect(scopedCollections).toEqual(['projects', 'users', 'projects']);
  });

  it('scopes the relation joined for root sorting before ordering and paging', async () => {
    const source = db.collection({
      name: 'source',
      fields: [{ type: 'belongsTo', name: 'target', target: 'target' }],
    });
    db.collection({
      name: 'target',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'string', name: 'tenantId' },
      ],
    });
    await db.sync();
    await source.repository.create({
      values: [
        { target: { name: 'aaa-foreign', tenantId: 'foreign' } },
        { target: { name: 'bbb-visible', tenantId: 'current' } },
      ],
    });

    const rows = await source.repository.find({
      appends: ['target'],
      sort: ['target.name'],
      limit: 1,
      context: { getAssociationReadScope: async () => ({ filter: { tenantId: 'current' } }) },
    });
    expect(rows[0].get('target')?.get('name')).toBe('bbb-visible');
  });

  it('scopes a sort-only relation when another relation participates in the root filter', async () => {
    const source = db.collection({
      name: 'source',
      fields: [
        { type: 'belongsTo', name: 'reference', target: 'target' },
        { type: 'hasMany', name: 'items', target: 'item' },
      ],
    });
    db.collection({
      name: 'target',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'string', name: 'tenantId' },
      ],
    });
    db.collection({ name: 'item', fields: [{ type: 'string', name: 'name' }] });
    await db.sync();
    const foreign = await source.repository.create({
      values: { reference: { name: 'aaa-foreign', tenantId: 'foreign' }, items: [{ name: 'one' }] },
    });
    const visible = await source.repository.create({
      values: { reference: { name: 'bbb-visible', tenantId: 'current' }, items: [{ name: 'one' }] },
    });

    const rows = await source.repository.find({
      filter: { 'items.name': 'one' },
      sort: ['reference.name'],
      limit: 1,
      context: {
        getAssociationReadScope: async (collection) =>
          collection.name === 'target' ? { filter: { tenantId: 'current' } } : {},
      },
    });
    expect(foreign.id).not.toBe(visible.id);
    expect(rows.map((row) => row.id)).toEqual([visible.id]);
  });

  it('scopes a relation used only for sorting without exposing the relation', async () => {
    const source = db.collection({ name: 'source', fields: [{ type: 'belongsTo', name: 'target', target: 'target' }] });
    db.collection({
      name: 'target',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'string', name: 'tenantId' },
      ],
    });
    await db.sync();
    await source.repository.create({ values: { target: { name: 'aaa-foreign', tenantId: 'foreign' } } });
    const visible = await source.repository.create({
      values: { target: { name: 'bbb-visible', tenantId: 'current' } },
    });

    const rows = await source.repository.find({
      sort: ['target.name'],
      limit: 1,
      context: { getAssociationReadScope: async () => ({ filter: { tenantId: 'current' } }) },
    });
    expect(rows.map((row) => row.id)).toEqual([visible.id]);
    expect(rows[0].toJSON().target).toBeUndefined();
  });

  it('preserves explicit root association where while applying a read scope', async () => {
    const source = db.collection({ name: 'source', fields: [{ type: 'hasMany', name: 'targets', target: 'target' }] });
    db.collection({
      name: 'target',
      fields: [
        { type: 'string', name: 'label' },
        { type: 'string', name: 'tenantId' },
      ],
    });
    await db.sync();
    await source.repository.create({
      values: [
        { targets: [{ label: 'match', tenantId: 'current' }] },
        { targets: [{ label: 'other', tenantId: 'current' }] },
      ],
    });

    const rows = await source.repository.find({
      include: [{ association: 'targets', where: { label: 'match' } }],
      context: { getAssociationReadScope: async () => ({ filter: { tenantId: 'current' } }) },
    });
    expect(rows).toHaveLength(1);
  });

  it('keeps the second root query scoped when sorting also loads a to-many association', async () => {
    const source = db.collection({
      name: 'source',
      fields: [
        { type: 'belongsTo', name: 'reference', target: 'target' },
        { type: 'hasMany', name: 'items', target: 'item' },
      ],
    });
    db.collection({
      name: 'target',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'string', name: 'tenantId' },
      ],
    });
    db.collection({ name: 'item', fields: [{ type: 'string', name: 'name' }] });
    await db.sync();
    await source.repository.create({
      values: [
        { reference: { name: 'aaa-foreign', tenantId: 'foreign' }, items: [{ name: 'one' }] },
        { reference: { name: 'bbb-visible', tenantId: 'current' }, items: [{ name: 'one' }] },
      ],
    });

    const rootQueries: any[] = [];
    source.model.addHook('beforeFind', (options) => rootQueries.push(options));

    const rows = await source.repository.find({
      appends: ['reference', 'items'],
      filter: { 'items.name': 'one' },
      sort: ['reference.name'],
      context: {
        getAssociationReadScope: async (collection) =>
          collection.name === 'target' ? { filter: { tenantId: 'current' } } : {},
      },
    });
    expect(rows.map((item) => item.get('reference')?.get('name') || null)).toEqual(['bbb-visible', null]);
    expect(rootQueries).toHaveLength(2);
    expect(
      rootQueries[1].include.find(
        (item) => (typeof item.association === 'string' ? item.association : item.as) === 'reference',
      )?.where,
    ).toBeDefined();
  });

  it('should sort has many default by primary key', async () => {
    const Source = db.collection({
      name: 'source',
      fields: [
        { type: 'string', name: 'name' },
        {
          type: 'hasMany',
          name: 'targets',
          target: 'target',
          foreignKey: 'source_id',
        },
      ],
    });

    const Target = db.collection({
      name: 'target',
      fields: [{ type: 'integer', name: 'seq_number' }],
    });

    await db.sync();

    const target1 = await Target.repository.create({ values: { seq_number: 1 } });
    const target2 = await Target.repository.create({ values: { seq_number: 3 } });

    await target1.update({ values: { seq_number: 2 } });

    await Source.repository.create({
      values: { name: 's1', targets: [{ id: target2.get('id') }, { id: target1.get('id') }] },
    });

    const source = await Source.repository.findOne({
      appends: ['targets'],
    });

    expect(source.get('targets').map((item: any) => item.get('id'))).toEqual([1, 2]);
  });

  it('should sort belongs to many default by target primary key', async () => {
    const Through = db.collection({
      name: 'through',
      fields: [{ type: 'string', name: 'name' }],
    });

    const Source = db.collection({
      name: 'source',
      fields: [
        { type: 'string', name: 'name' },
        {
          type: 'belongsToMany',
          name: 'targets',
          target: 'target',
          through: 'through',
          foreignKey: 'source_id',
          otherKey: 'target_id',
          sourceKey: 'id',
          targetKey: 'id',
        },
      ],
    });

    const Target = db.collection({
      name: 'target',
      fields: [{ type: 'integer', name: 'seq_number' }],
    });

    await db.sync({
      force: true,
    });

    const targets = await Target.repository.create({
      values: [
        { seq_number: 1 },
        { seq_number: 2 },
        { seq_number: 3 },
        { seq_number: 4 },
        { seq_number: 5 },
        { seq_number: 6 },
      ],
    });

    await Source.repository.create({
      values: {
        name: 'source1',
        targets: [targets[2], targets[0], targets[1]],
      },
    });

    const source = await Source.repository.findOne({
      appends: ['targets'],
    });

    expect(source.targets.map((t) => t.get('id'))).toEqual([1, 2, 3]);
  });

  it('should handle eager loading with long field', async () => {
    const Through = db.collection({
      name: 'abc_abcd_abcd_abcdefg_abc_abc_a_abcdefghijk',
    });

    const A = db.collection({
      name: 'a',
      fields: [
        { type: 'string', name: 'name' },
        {
          type: 'belongsToMany',
          name: 'bs',
          target: 'b',
          through: 'abc_abcd_abcd_abcdefg_abc_abc_a_abcdefghijk',
          foreignKey: 'abc_abcd_abcdefg_abcd_abc',
          sourceKey: 'id',
          otherKey: 'b_id',
          targetKey: 'id',
        },
      ],
    });

    const B = db.collection({
      name: 'b',
      fields: [{ type: 'string', name: 'name' }],
    });

    await db.sync();

    await A.repository.create({
      values: {
        name: 'a1',
        bs: [{ name: 'b1' }, { name: 'b2' }],
      },
    });

    const a = await A.repository.findOne({
      appends: ['bs'],
    });

    expect(a.get('bs')).toHaveLength(2);
    const data = a.toJSON();

    // @ts-ignore
    const as = A.model.associations.bs.oneFromTarget.as;

    expect(data['bs'][0][as]).toBeDefined();
  });

  it('should handle fields filter', async () => {
    const User = db.collection({
      name: 'users',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'hasOne', name: 'profile' },
      ],
    });

    const Profile = db.collection({
      name: 'profiles',
      fields: [
        { type: 'integer', name: 'age' },
        { type: 'string', name: 'address' },
      ],
    });

    await db.sync();

    const users = await User.repository.create({
      values: [
        {
          name: 'u1',
          profile: { age: 1, address: 'u1 address' },
        },
        {
          name: 'u2',
          profile: { age: 2, address: 'u2 address' },
        },
      ],
    });

    const findOptions = User.repository.buildQueryOptions({
      fields: ['profile', 'profile.age', 'name'],
    });

    const eagerLoadingTree = EagerLoadingTree.buildFromSequelizeOptions({
      model: User.model,
      rootAttributes: findOptions.attributes,
      includeOption: findOptions.include,
      db: db,
      rootQueryOptions: findOptions,
    });

    await eagerLoadingTree.load();
    const root = eagerLoadingTree.root;

    const u1 = root.instances.find((item) => item.get('name') === 'u1');
    const data = u1.toJSON();
    expect(data['id']).not.toBeDefined();
    expect(data['name']).toBeDefined();
    expect(data['profile']).toBeDefined();
    expect(data['profile']['age']).toBeDefined();
  });

  it('should load has many', async () => {
    const User = db.collection({
      name: 'users',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'hasMany', name: 'posts' },
      ],
    });

    const Post = db.collection({
      name: 'posts',
      fields: [{ type: 'string', name: 'title' }],
    });

    await db.sync();

    await User.repository.create({
      values: [
        {
          name: 'u1',
          posts: [{ title: 'u1p1' }, { title: 'u1p2' }],
        },
        {
          name: 'u2',
          posts: [{ title: 'u2p1' }, { title: 'u2p2' }],
        },
      ],
    });

    const findOptions = User.repository.buildQueryOptions({
      appends: ['posts'],
    });

    const eagerLoadingTree = EagerLoadingTree.buildFromSequelizeOptions({
      model: User.model,
      rootAttributes: findOptions.attributes,
      includeOption: findOptions.include,
      db: db,
      rootQueryOptions: findOptions,
    });

    await eagerLoadingTree.load();

    const root = eagerLoadingTree.root;
    const u1 = root.instances.find((item) => item.get('name') === 'u1');
    const u1Posts = u1.get('posts') as any;
    expect(u1Posts.length).toBe(2);

    const u1JSON = u1.toJSON();
    expect(u1JSON['posts'].length).toBe(2);
  });

  it('should load has one', async () => {
    const User = db.collection({
      name: 'users',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'hasOne', name: 'profile' },
      ],
    });

    const Profile = db.collection({
      name: 'profiles',
      fields: [{ type: 'integer', name: 'age' }],
    });

    await db.sync();

    const users = await User.repository.create({
      values: [
        {
          name: 'u1',
          profile: { age: 1 },
        },
        {
          name: 'u2',
          profile: { age: 2 },
        },
      ],
    });

    const findOptions = User.repository.buildQueryOptions({
      appends: ['profile'],
    });

    const eagerLoadingTree = EagerLoadingTree.buildFromSequelizeOptions({
      model: User.model,
      rootAttributes: findOptions.attributes,
      includeOption: findOptions.include,
      db: db,
      rootQueryOptions: findOptions,
    });

    await eagerLoadingTree.load();

    const root = eagerLoadingTree.root;
    const u1 = root.instances.find((item) => item.get('name') === 'u1');
    const u1Profile = u1.get('profile') as any;
    expect(u1Profile).toBeDefined();
    expect(u1Profile.get('age')).toBe(1);
  });

  it('should load belongs to', async () => {
    const Post = db.collection({
      name: 'posts',
      fields: [
        { type: 'string', name: 'title' },
        {
          type: 'belongsTo',
          name: 'user',
        },
      ],
    });

    const User = db.collection({
      name: 'users',
      fields: [{ type: 'string', name: 'name' }],
    });

    await db.sync();

    await Post.repository.create({
      values: [
        {
          title: 'p1',
          user: {
            name: 'u1',
          },
        },
        {
          title: 'p2',
          user: {
            name: 'u2',
          },
        },
      ],
    });

    const findOptions = Post.repository.buildQueryOptions({
      appends: ['user'],
    });

    const eagerLoadingTree = EagerLoadingTree.buildFromSequelizeOptions({
      model: Post.model,
      rootAttributes: findOptions.attributes,
      includeOption: findOptions.include,
      db: db,
      rootQueryOptions: findOptions,
    });

    await eagerLoadingTree.load();

    const root = eagerLoadingTree.root;
    const p1 = root.instances.find((item) => item.get('title') === 'p1');
    const p1User = p1.get('user') as any;
    expect(p1User).toBeDefined();
    expect(p1User.get('name')).toBe('u1');
  });

  it('should load belongs to many', async () => {
    const Post = db.collection({
      name: 'posts',
      fields: [
        { type: 'string', name: 'title' },
        { type: 'belongsToMany', name: 'tags' },
      ],
    });

    const Tag = db.collection({
      name: 'tags',
      fields: [{ type: 'string', name: 'name' }],
    });

    await db.sync();

    const tags = await Tag.repository.create({
      values: [
        {
          name: 't1',
        },
        {
          name: 't2',
        },
        {
          name: 't3',
        },
      ],
    });

    await Post.repository.create({
      values: [
        {
          title: 'p1',
          tags: [{ id: tags[0].id }, { id: tags[1].id }],
        },
        {
          title: 'p2',
          tags: [{ id: tags[1].id }, { id: tags[2].id }],
        },
      ],
    });

    const findOptions = Post.repository.buildQueryOptions({
      appends: ['tags'],
    });

    const eagerLoadingTree = EagerLoadingTree.buildFromSequelizeOptions({
      model: Post.model,
      rootAttributes: findOptions.attributes,
      includeOption: findOptions.include,
      db: db,
      rootQueryOptions: findOptions,
    });

    await eagerLoadingTree.load();
    const root = eagerLoadingTree.root;

    const p1 = root.instances.find((item) => item.get('title') === 'p1');
    const p1Tags = p1.get('tags') as any;
    expect(p1Tags).toBeDefined();
    expect(p1Tags.length).toBe(2);
    expect(p1Tags.map((t) => t.get('name'))).toEqual(['t1', 't2']);

    const p2 = root.instances.find((item) => item.get('title') === 'p2');
    const p2Tags = p2.get('tags') as any;
    expect(p2Tags).toBeDefined();
    expect(p2Tags.length).toBe(2);
    expect(p2Tags.map((t) => t.get('name'))).toEqual(['t2', 't3']);
  });

  it('should build eager loading tree', async () => {
    const User = db.collection({
      name: 'users',
      fields: [
        {
          type: 'string',
          name: 'name',
        },
        {
          type: 'hasMany',
          name: 'posts',
        },
      ],
    });

    const Post = db.collection({
      name: 'posts',
      fields: [
        {
          type: 'array',
          name: 'tags',
        },
        {
          type: 'string',
          name: 'title',
        },
        {
          type: 'belongsToMany',
          name: 'tags',
        },
      ],
    });

    const Tag = db.collection({
      name: 'tags',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'belongsTo', name: 'tagCategory' },
      ],
    });

    const TagCategory = db.collection({
      name: 'tagCategories',
      fields: [{ type: 'string', name: 'name' }],
    });

    await db.sync();

    await User.repository.create({
      values: [
        {
          name: 'u1',
          posts: [
            {
              title: 'u1p1',
              tags: [
                { name: 't1', tagCategory: { name: 'c1' } },
                { name: 't2', tagCategory: { name: 'c2' } },
              ],
            },
          ],
        },
        {
          name: 'u2',
          posts: [
            {
              title: 'u2p1',
              tags: [
                { name: 't3', tagCategory: { name: 'c3' } },
                { name: 't4', tagCategory: { name: 'c4' } },
              ],
            },
          ],
        },
      ],
    });

    const findOptions = User.repository.buildQueryOptions({
      appends: ['posts.tags.tagCategory'],
    });

    const eagerLoadingTree = EagerLoadingTree.buildFromSequelizeOptions({
      model: User.model,
      rootAttributes: findOptions.attributes,
      includeOption: findOptions.include,
      db: db,
      rootQueryOptions: findOptions,
    });

    expect(eagerLoadingTree.root.children).toHaveLength(1);
    expect(eagerLoadingTree.root.children[0].model).toBe(Post.model);
    expect(eagerLoadingTree.root.children[0].children[0].model).toBe(Tag.model);
    expect(eagerLoadingTree.root.children[0].children[0].children[0].model).toBe(TagCategory.model);

    await eagerLoadingTree.load();

    expect(eagerLoadingTree.root.instances).toHaveLength(2);
    const u1 = eagerLoadingTree.root.instances.find((item) => item.get('name') === 'u1');
    expect(u1.get('posts')).toHaveLength(1);
    expect(u1.get('posts')[0].get('tags')).toHaveLength(2);
    expect(u1.get('posts')[0].get('tags')[0].get('tagCategory')).toBeDefined();
    expect(u1.get('posts')[0].get('tags')[0].get('tagCategory').get('name')).toBe('c1');
  });
});
