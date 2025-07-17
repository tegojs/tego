import React from 'react';

import { useParams } from 'react-router-dom';

import { AppNotFound } from '..';
import { DataBlockProvider } from '../../data-source';
import { RecordContext_deprecated } from '../../record-provider';
import { RemoteSchemaComponent } from '../../schema-component';
import { PathHandler } from './utils';

export const DynamicPage = () => {
  const params = useParams<{ '*': string; name: string }>();
  if (params['*']) {
    const path = PathHandler.getInstance().parse(params['*'], params.name);
    if (!path) {
      return <AppNotFound />;
    }
    return (
      // FIXME 这里是通过 DataBlock + RecordContext 来让它工作，实际上需要重构一个新的上下文，原来的卡片上下文用在这里无助于内部卡片判断
      <DataBlockProvider params={{ filterByTk: path.filterByTk }} action="get" collection={path.collection}>
        <RecordContext_deprecated.Provider value={{ id: path.filterByTk }}>
          <RemoteSchemaComponent uid={params.name} onlyRenderProperties />
        </RecordContext_deprecated.Provider>
      </DataBlockProvider>
    );
  } else {
    return <RemoteSchemaComponent uid={params.name} onlyRenderProperties />;
  }
};
