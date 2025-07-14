import { CollectionOptions, defineCollection } from '@tachybase/database';

export default defineCollection({
  dumpRules: {
    group: 'log',
  },
  name: 'metricsConfig',
  createdAt: true,
  updatedAt: true,
  model: 'CollectionModel',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: '配置标题',
      required: true,
    },
    {
      name: 'resourceName',
      type: 'string',
      title: '资源名称',
      required: true,
    },
    {
      name: 'action',
      type: 'string',
      title: '操作名称',
      required: true,
    },
    {
      name: 'enabled',
      type: 'boolean',
      title: '是否启用',
      defaultValue: true,
    },
    {
      name: 'trackingOptions',
      type: 'jsonb',
      title: '追踪选项',
      defaultValue: {
        meta: [],
        payload: [],
        filter: {},
      },
    },
  ],
  indexes: [
    {
      fields: ['resourceName', 'action'],
      unique: true,
    },
    {
      fields: ['enabled'],
    },
  ],
} as CollectionOptions);
