import { registerActions } from '@tachybase/actions';

import { list } from '../actions/list';
import { mockServer as actionMockServer, MockServer } from './index';

describe('list action', () => {
  let app: MockServer;
  beforeEach(async () => {
    app = actionMockServer();
    registerActions(app);

    const Post = app.collection({
      name: 'posts',
      fields: [
        { type: 'string', name: 'title' },
        { type: 'hasMany', name: 'comments' },
        {
          type: 'belongsToMany',
          name: 'tags',
        },
        { type: 'string', name: 'status', defaultValue: 'draft' },
      ],
    });

    const Tag = app.collection({
      name: 'tags',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'belongsToMany', name: 'posts' },
      ],
    });

    app.collection({
      name: 'comments',
      fields: [
        { type: 'string', name: 'content' },
        { type: 'string', name: 'status', defaultValue: 'draft' },
      ],
    });

    await app.db.sync();

    const t1 = await Tag.repository.create({
      values: {
        name: 't1',
      },
    });

    const t2 = await Tag.repository.create({
      values: {
        name: 't2',
      },
    });

    const t3 = await Tag.repository.create({
      values: {
        name: 't3',
      },
    });

    const p1 = await Post.repository.create({
      values: {
        title: 'pt1',
        tags: [t1.get('id'), t2.get('id')],
      },
    });

    await Post.repository.createMany({
      records: [
        {
          title: 'pt2',
          tags: [t2.get('id')],
        },
        {
          title: 'pt3',
          tags: [t3.get('id')],
        },
      ],
    });
  });

  afterEach(async () => {
    await app.destroy();
  });

  test('list with pagination', async () => {
    const response = await app
      .agent()
      .resource('posts')
      .list({
        fields: ['id'],
        pageSize: 1,
        page: 2,
        sort: ['id'],
      });

    const body = response.body;
    expect(body.rows.length).toEqual(1);
    expect(body.rows[0]['id']).toEqual(2);
    expect(body.count).toEqual(3);
    expect(body.totalPage).toEqual(3);
  });

  test('list with non-paged', async () => {
    const response = await app.agent().resource('posts').list({
      paginate: false,
    });
    const body = response.body;
    expect(body.length).toEqual(3);
  });

  test('list by association', async () => {
    const p1 = await app.db.getRepository('posts').create({
      values: {
        title: 'pt1',
        tags: [1, 2],
      },
    });
    // const r = await app.db
    //   .getRepository<any>('posts.tags', p1.id)
    //   .find({ fields: ['id', 'postsTags.createdAt'], sort: ['id'] });
    // console.log(r.map((i) => JSON.stringify(i)));
    const response = await app
      .agent()
      .resource('posts.tags', p1.id)
      .list({ fields: ['id'], sort: ['id'] });

    const body = response.body;
    expect(body.count).toEqual(2);
    expect(body.rows).toMatchObject([{ id: 1 }, { id: 2 }]);
  });

  it('should return empty error when relation not exists', async () => {
    const response = await app
      .agent()
      .resource('posts.tags', 999)
      .list({ fields: ['id'], sort: ['id'] });

    expect(response.status).toEqual(200);
    expect(response.body.count).toEqual(0);
  });
});

describe('list-tree', () => {
  it('advertises support for scoped tree traversal to tenant guards', () => {
    expect((list as any).supportsScopedTreeRead).toBe(true);
  });
  let app;
  beforeEach(async () => {
    app = actionMockServer();
    registerActions(app);
  });

  afterEach(async () => {
    await app.destroy();
  });

  it('does not expose ancestors outside the collection read scope in a filtered tree', async () => {
    const categories = app.collection({
      name: 'categories',
      tree: 'adjacency-list',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'string', name: 'tenantId' },
        { type: 'belongsTo', name: 'parent', treeParent: true },
        { type: 'hasMany', name: 'children', treeChildren: true },
      ],
    });
    await app.db.sync();
    const hiddenParent = await categories.repository.create({ values: { name: 'hidden', tenantId: 'other' } });
    await categories.repository.create({
      values: { name: 'matching', tenantId: 'current', parentId: hiddenParent.id },
    });
    const visibleTenants = ['current'];
    app.middleware.splice(app.middleware.length - 1, 0, async (ctx, next) => {
      ctx.getTreeReadScope = () => ({ filter: { tenantId: { $in: visibleTenants } } });
      await next();
    });

    const response = await app
      .agent()
      .resource('categories')
      .list({ tree: true, filter: { name: 'matching' } });

    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body.rows)).not.toContain('hidden');
    expect(response.body.rows.map((row) => row.name)).toEqual(['matching']);
    expect(response.body.count).toBe(1);

    visibleTenants.push('other');
    const inherited = await app
      .agent()
      .resource('categories')
      .list({ tree: true, filter: { name: 'matching' } });
    expect(inherited.status).toBe(200);
    expect(inherited.body.rows[0]?.name).toBe('hidden');
    expect(inherited.body.rows[0]?.children[0]?.name).toBe('matching');
  });

  it('respects requested fields when expanding a filtered tree', async () => {
    const categories = app.collection({
      name: 'categories',
      tree: 'adjacency-list',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'string', name: 'secret' },
        { type: 'integer', name: 'parentId' },
      ],
    });
    await app.db.sync();
    const parent = await categories.repository.create({ values: { name: 'parent', secret: 'hidden' } });
    await categories.repository.create({ values: { name: 'matching', secret: 'hidden', parentId: parent.id } });

    const response = await app
      .agent()
      .resource('categories')
      .list({
        tree: true,
        filter: { name: 'matching' },
        fields: ['id', 'name'],
      });

    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body.rows)).not.toContain('hidden');
    expect(JSON.stringify(response.body.rows)).not.toContain('parentId');
    expect(response.body.count).toBe(1);

    app.resourcer.use(async (ctx, next) => {
      ctx.action.params.fields = [];
      await next();
    });
    const emptyFields = await app
      .agent()
      .resource('categories')
      .list({
        tree: true,
        filter: { name: 'matching' },
      });
    expect(emptyFields.status).toBe(200);
    expect(JSON.stringify(emptyFields.body.rows)).not.toContain('hidden');
    expect(JSON.stringify(emptyFields.body.rows)).not.toContain('name');
    expect(JSON.stringify(emptyFields.body.rows)).not.toContain('"id"');
    expect(response.body.totalPage).toBe(1);
  });

  it('expands a filtered tree using a custom parent foreign key', async () => {
    const categories = app.collection({
      name: 'categories',
      tree: 'adjacency-list',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'belongsTo', name: 'parent', foreignKey: 'cid', treeParent: true },
        { type: 'hasMany', name: 'children', foreignKey: 'cid', treeChildren: true },
      ],
    });
    await app.db.sync();
    const parent = await categories.repository.create({ values: { name: 'parent' } });
    await categories.repository.create({ values: { name: 'matching', cid: parent.id } });

    const response = await app
      .agent()
      .resource('categories')
      .list({ tree: true, filter: { name: 'matching' } });
    expect(response.status).toBe(200);
    expect(response.body.rows[0]?.name).toBe('parent');
    expect(response.body.rows[0]?.children[0]?.name).toBe('matching');
  });

  it('paginates filtered tree roots while retaining the total count', async () => {
    const categories = app.collection({
      name: 'categories',
      tree: 'adjacency-list',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'integer', name: 'parentId' },
      ],
    });
    await app.db.sync();
    await categories.repository.create({ values: [{ name: 'matching' }, { name: 'matching' }] });

    const response = await app
      .agent()
      .resource('categories')
      .list({
        tree: true,
        filter: { name: 'matching' },
        sort: ['id'],
        page: 2,
        pageSize: 1,
      });
    expect(response.status).toBe(200);
    expect(response.body.rows).toHaveLength(1);
    expect(response.body.rows[0].id).toBe(2);
    expect(response.body.count).toBe(2);
    expect(response.body.totalPage).toBe(2);
  });

  it('should be tree', async () => {
    const values = [
      {
        name: '1',
        __index: '0',
        children: [
          {
            name: '1-1',
            __index: '0.children.0',
            children: [
              {
                name: '1-1-1',
                __index: '0.children.0.children.0',
                children: [
                  {
                    name: '1-1-1-1',
                    __index: '0.children.0.children.0.children.0',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: '2',
        __index: '1',
        children: [
          {
            name: '2-1',
            __index: '1.children.0',
            children: [
              {
                name: '2-1-1',
                __index: '1.children.0.children.0',
                children: [
                  {
                    name: '2-1-1-1',
                    __index: '1.children.0.children.0.children.0',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const db = app.db;
    const collection = db.collection({
      name: 'categories',
      tree: 'adjacency-list',
      fields: [
        {
          type: 'string',
          name: 'name',
        },
        {
          type: 'string',
          name: 'description',
        },
        {
          type: 'belongsTo',
          name: 'parent',
          treeParent: true,
        },
        {
          type: 'hasMany',
          name: 'children',
          treeChildren: true,
        },
      ],
    });
    await db.sync();

    await db.getRepository('categories').create({
      values,
    });

    const response = await app
      .agent()
      .resource('categories')
      .list({
        tree: true,
        fields: ['id', 'name'],
        sort: ['id'],
      });

    expect(response.status).toEqual(200);
    expect(response.body.rows).toMatchObject(values);
  });

  it('should be tree', async () => {
    const values = [
      {
        name: '1',
        __index: '0',
        children2: [
          {
            name: '1-1',
            __index: '0.children2.0',
            children2: [
              {
                name: '1-1-1',
                __index: '0.children2.0.children2.0',
                children2: [
                  {
                    name: '1-1-1-1',
                    __index: '0.children2.0.children2.0.children2.0',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: '2',
        __index: '1',
        children2: [
          {
            name: '2-1',
            __index: '1.children2.0',
            children2: [
              {
                name: '2-1-1',
                __index: '1.children2.0.children2.0',
                children2: [
                  {
                    name: '2-1-1-1',
                    __index: '1.children2.0.children2.0.children2.0',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const db = app.db;
    const collection = db.collection({
      name: 'categories',
      tree: 'adjacency-list',
      fields: [
        {
          type: 'string',
          name: 'name',
        },
        {
          type: 'string',
          name: 'description',
        },
        {
          type: 'belongsTo',
          name: 'parent',
          foreignKey: 'cid',
          treeParent: true,
        },
        {
          type: 'hasMany',
          name: 'children2',
          foreignKey: 'cid',
          treeChildren: true,
        },
      ],
    });
    await db.sync();

    await db.getRepository('categories').create({
      values,
    });

    const response = await app
      .agent()
      .resource('categories')
      .list({
        tree: true,
        fields: ['id', 'name'],
        sort: ['id'],
      });

    expect(response.status).toEqual(200);
    expect(response.body.rows).toMatchObject(values);
  });
});
