import { defineCollection } from '@tachybase/database';

export default defineCollection({
  dumpRules: {
    group: 'third-party',
  },
  name: 'applicationsPartners',
  autoGenId: false,
  createdBy: true,
  updatedBy: true,
  fields: [],
});
