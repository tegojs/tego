import { RemoteSchemaComponent } from '@tachybase/client';

import { useParams } from 'react-router';

export function ShareSchemaComponent() {
  const params = useParams();

  return <RemoteSchemaComponent uid={params.name} />;
}
