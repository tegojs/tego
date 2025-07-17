import React from 'react';
import { SchemaComponentOptions, useActionContext, useRequest } from '@tachybase/client';
import { uid } from '@tachybase/utils/client';

import { collectionMultiApp } from '../base/collections/collectionMultiApp';
import { formSchema } from '../base/schemas/schemaForm';

export const schemaViewMultiAppPane = {
  type: 'void',
  properties: {
    multiApp: {
      'x-decorator': 'TableBlockProvider',
      'x-decorator-props': {
        collection: collectionMultiApp,
        action: 'list',
        params: {
          pageSize: 20,
          sort: ['-createdAt'],
          filter: "{{ admin ? {} : { '$or': [ { createdById: userId }, { 'partners.id': { '$in': [userId] } } ] } }}",
        },
        rowKey: 'name',
      },
      'x-component': 'AppList',
    },
  },
};
