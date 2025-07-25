import { PinnedPluginListProvider, SchemaComponentOptions } from '@tachybase/client';

import { UserManualLink } from './UserManualLink';

export const ProviderUserManual = (props) => {
  return (
    <PinnedPluginListProvider
      items={{
        userManual: {
          order: 10,
          component: 'UserManualLink',
          pin: true,
          snippet: 'pm',
          belongTo: 'pinnedmenu',
        },
      }}
    >
      <SchemaComponentOptions
        components={{
          UserManualLink,
        }}
      >
        {props.children}
      </SchemaComponentOptions>
    </PinnedPluginListProvider>
  );
};
