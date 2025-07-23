import { Schema } from '@tachybase/schema';

import { useToken } from '../../__builtins__';
import { SchemaComponent } from '../../../core';
import FixedBlock from '../FixedBlock';

export const PageContent = (props) => {
  const { loading, disablePageHeader, enablePageTabs, fieldSchema, activeKey, height, children } = props;
  const { token } = useToken();

  if (loading) {
    return;
  }
  if (!disablePageHeader && enablePageTabs) {
    return fieldSchema.mapProperties((schema) => {
      if (schema.name !== activeKey) {
        return null;
      }
      return (
        <FixedBlock key={schema.name} height={`calc(${height}px + 46px + ${token.marginLG}px * 2)`}>
          <SchemaComponent
            schema={
              new Schema({
                properties: {
                  [schema.name]: schema,
                },
              })
            }
          />
        </FixedBlock>
      );
    });
  }
  return (
    <FixedBlock height={`calc(${height}px + 46px + ${token.marginLG}px * 2)`}>
      <div className={`pageWithFixedBlockCss tb-page-content`}>{children}</div>
    </FixedBlock>
  );
};
