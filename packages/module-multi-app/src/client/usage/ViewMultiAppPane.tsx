import { SchemaComponent, useCurrentUserContext } from '@tachybase/client';

import { AppList } from './AppList';
import { schemaViewMultiAppPane } from './ViewMultiAppPane.schema';

export const ViewMultiAppPane = () => {
  const currentUser = useCurrentUserContext();
  const userId = currentUser?.data?.data?.id;
  return (
    <SchemaComponent
      schema={schemaViewMultiAppPane}
      scope={{
        userId,
        admin: false,
      }}
      components={{
        AppList,
      }}
    />
  );
};
