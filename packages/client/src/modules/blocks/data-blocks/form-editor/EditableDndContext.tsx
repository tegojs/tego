import { useState } from 'react';
import { ISchema, observer, Schema, uid } from '@tachybase/schema';

import { DndContext as DndKitContext, DragEndEvent, DragOverlay, rectIntersection } from '@dnd-kit/core';
import { Props } from '@dnd-kit/core/dist/components/DndContext/DndContext';
import { cloneDeep, get, set } from 'lodash';
import { useTranslation } from 'react-i18next';

import { useAPIClient } from '../../../../api-client';
import { createDesignable, useDesignable } from '../../../../schema-component';
import { createEditableDesignable } from './EditableDesignable';

const useDragEnd = (props?: any) => {
  const { refresh } = useDesignable();
  const api = useAPIClient();
  const { t } = useTranslation();

  return (event: DragEndEvent) => {
    const { active, over } = event;
    const activeSchema = active?.data?.current?.schema;
    const overSchema = over?.data?.current?.schema;
    const insertAdjacent = over?.data?.current?.insertAdjacent;
    const breakRemoveOn = over?.data?.current?.breakRemoveOn;
    const wrapSchema = over?.data?.current?.wrapSchema;
    const onSuccess = over?.data?.current?.onSuccess;
    const removeParentsIfNoChildren = over?.data?.current?.removeParentsIfNoChildren ?? true;
    if (!activeSchema || !overSchema) {
      props?.onDragEnd?.(event);
      return;
    }

    if (activeSchema === overSchema) {
      props?.onDragEnd?.(event);
      return;
    }

    if (activeSchema.parent === overSchema && insertAdjacent === 'beforeEnd') {
      props?.onDragEnd?.(event);
      return;
    }

    // const dn = createDesignable({
    //   t,
    //   api,
    //   refresh,
    //   current: overSchema,
    // });
    const eddn = createEditableDesignable({
      t,
      api,
      refresh,
      current: overSchema,
    });

    // dn.loadAPIClientEvents();

    if (activeSchema.parent === overSchema.parent) {
      eddn.insertBeforeBeginOrAfterEnd(activeSchema);
      props?.onDragEnd?.(event);
      return;
    }

    if (insertAdjacent) {
      eddn.insertAdjacent(insertAdjacent, activeSchema, {
        wrap: wrapSchema,
        breakRemoveOn,
        removeParentsIfNoChildren,
        onSuccess,
      });
      props?.onDragEnd?.(event);
      return;
    }
  };
};

export const EditableGridDndContext = observer(
  (props: Props) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(true);
    return (
      <DndKitContext
        collisionDetection={rectIntersection}
        {...props}
        onDragStart={(event) => {
          const { active } = event;
          const activeSchema = active?.data?.current?.schema;
          setVisible(!!activeSchema);
          if (props?.onDragStart) {
            props?.onDragStart?.(event);
          }
        }}
        onDragEnd={useDragEnd(props)}
      >
        <DragOverlay
          dropAnimation={{
            duration: 10,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {/* {visible && <span style={{ whiteSpace: 'nowrap' }}>{t('Dragging')}</span>} */}
        </DragOverlay>
        {props.children}
      </DndKitContext>
    );
  },
  { displayName: 'DndContext' },
);
