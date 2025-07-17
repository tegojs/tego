import { observer, RecursionField, useField, useFieldSchema } from '@tachybase/schema';

import { OpenMode, useActionContext } from '.';
import { useIsMobile } from '../../../block-provider';
import { PageStyle } from '../../../built-in/page-style/PageStyle.provider';
import { usePageStyle } from '../../../built-in/page-style/usePageStyle';
import { ActionDrawer } from './Action.Drawer';
import { ActionModal } from './Action.Modal';
import { ActionPage } from './Action.Page';
import { ActionSheet } from './Action.Sheet';
import { ComposedActionDrawer } from './types';

export const ActionContainer: ComposedActionDrawer = observer(
  (props: any) => {
    const { openMode } = useActionContext();

    const isMobile = useIsMobile();
    const pageStyle = usePageStyle();

    if (openMode === OpenMode.DRAWER_MODE) {
      return <ActionDrawer footerNodeName={'Action.Container.Footer'} {...props} />;
    }
    if (openMode === OpenMode.MODAL) {
      return <ActionModal footerNodeName={'Action.Container.Footer'} {...props} />;
    }
    if (openMode === OpenMode.SHEET) {
      return <ActionSheet footerNodeName={'Action.Container.Footer'} {...props} />;
    }

    if (openMode === OpenMode.PAGE) {
      return <ActionPage footerNodeName={'Action.Container.Footer'} {...props} />;
    }

    if (!openMode || [OpenMode.DEFAULT, OpenMode.DRAWER].includes(openMode)) {
      if (isMobile || pageStyle === PageStyle.TAB_STYLE) {
        return <ActionPage footerNodeName={'Action.Container.Footer'} {...props} />;
      }
      return <ActionDrawer footerNodeName={'Action.Container.Footer'} {...props} />;
    }

    return <ActionPage footerNodeName={'Action.Container.Footer'} {...props} />;
  },
  { displayName: 'ActionContainer' },
);

ActionContainer.Footer = observer(
  () => {
    const field = useField();
    const schema = useFieldSchema();
    return <RecursionField basePath={field.address} schema={schema} onlyRenderProperties />;
  },
  { displayName: 'ActionContainer.Footer' },
);

export default ActionContainer;
