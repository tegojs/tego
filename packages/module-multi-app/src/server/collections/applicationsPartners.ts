import { defineCollection } from '@tachybase/database';

export default defineCollection({
  dumpRules: {
    group: 'third-party',
  },
  name: 'applicationsPartners',
  autoGenId: false,
  createdBy: true,
  updatedBy: true,
  fields: [
    {
      name: 'applicationName',
      type: 'string',
      primaryKey: true,
    },
    {
      name: 'userId',
      type: 'bigInt',
      primaryKey: true,
    },
  ],
});
