import { SchemaComponent, useApp } from '@tachybase/client';

import { authMainAppManagerSchema } from './AuthMainAppManager.schema';
import { useAuthMainAppValues } from './useAuthMainAppValues';
import { useSaveAuthMainAppValues } from './useSaveAuthMainAppValues';

export const AuthMainAppManager = () => {
  const app = useApp();
  const isMainApp = app.name === 'main';
  return (
    <SchemaComponent
      schema={authMainAppManagerSchema}
      scope={{
        useAuthMainAppValues,
        useSaveAuthMainAppValues,
        isMainApp,
      }}
    />
  );
};
