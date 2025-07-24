import { defineCollection } from '@tachybase/database';
import { uid } from '@tachybase/utils';

export default defineCollection({
  dumpRules: {
    group: 'third-party',
  },
  name: 'applications',
  model: 'ApplicationModel',
  autoGenId: false,
  sortable: 'sort',
  filterTargetKey: 'name',
  createdBy: true,
  updatedBy: true,
  fields: [
    {
      type: 'uid',
      name: 'name',
      primaryKey: true,
    },
    {
      type: 'string',
      name: 'displayName',
    },
    {
      type: 'string',
      name: 'cname',
      unique: true,
    },
    {
      type: 'string',
      name: 'preset',
      defaultValue: 'tachybase',
    },
    {
      type: 'string',
      name: 'tmpl',
    },
    {
      type: 'boolean',
      name: 'pinned',
    },
    {
      type: 'string',
      name: 'icon',
      interface: 'icon',
    },
    {
      type: 'string',
      name: 'color',
      interface: 'color',
    },
    {
      type: 'string',
      name: 'status',
      defaultValue: 'pending',
    },
    {
      type: 'json',
      name: 'options',
    },
    {
      type: 'boolean',
      name: 'isTemplate',
      defaultValue: false,
    },
    {
      type: 'string',
      // APPKEY的后缀,为了防止被推断出来
      name: 'appKeySuffix',
      defaultValue: () => {
        return uid(16); // Longer suffix for improved security
      },
    },
    {
      type: 'belongsToMany',
      name: 'partners',
      target: 'users',
      foreignKey: 'applicationName',
      otherKey: 'userId',
      targetKey: 'id',
      through: 'applicationsPartners',
    },
  ],
});
