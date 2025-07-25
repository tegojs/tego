import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ISchema, observer, RecursionField, Schema, uid, useField, useFieldSchema } from '@tachybase/schema';

import { TinyColor } from '@ctrl/tinycolor';
import { useDndContext, useDndMonitor, useDraggable, useDroppable } from '@dnd-kit/core';
import _ from 'lodash';

import { useSchemaInitializerRender } from '../../../../application';
import { useFormBlockContext, useFormBlockType } from '../../../../block-provider';
import { SchemaComponent, useDesignable } from '../../../../schema-component';
import { useToken } from '../../../../schema-component/antd/__builtins__';
import { EditableGridDndContext } from './EditableDndContext';
import useStyles from './EditableGrid.style';

const EditableGridRowContext = createContext<any>({});
EditableGridRowContext.displayName = 'EditableGridRowContext';
const EditableGridColContext = createContext<any>({});
EditableGridColContext.displayName = 'EditableGridColContext';
const EditableGridContext = createContext<any>({});
EditableGridContext.displayName = 'EditableGridContext';

const breakRemoveOnGrid = (s: Schema) => s['x-component'] === 'EditableGrid';
const breakRemoveOnRow = (s: Schema) => s['x-component'] === 'EditableGrid.Row';

const MemorizedRecursionField = React.memo(RecursionField);
MemorizedRecursionField.displayName = 'MemorizedRecursionField';

const ColDivider = (props) => {
  const { token } = useToken();
  const dragIdRef = useRef<string | null>(null);
  const { cx } = useStyles();
  const { isOver, setNodeRef } = useDroppable({
    id: props.id,
    data: props.data,
  });
  const { designable } = useDesignable();
  const dividerRef = useRef<HTMLElement>();

  const droppableStyle = useMemo(() => {
    if (!isOver) return {};
    return {
      backgroundColor: new TinyColor(token.colorSettings).setAlpha(0.1).toHex8String(),
    };
  }, [isOver]);

  const dndContext = useDndContext();
  const activeSchema: Schema | undefined = dndContext.active?.data.current?.schema?.parent;
  const blocksLength: number = activeSchema ? Object.keys(activeSchema.properties).length : 0;

  let visible = true;
  if (blocksLength === 1) {
    if (props.first) {
      visible = activeSchema !== props.cols[0];
    } else {
      const currentSchema = props.cols[props.index];
      const downSchema = props.cols[props.index + 1];
      visible = activeSchema !== currentSchema && downSchema !== activeSchema;
    }
  }
  const prevSchema = props.cols[props.index];
  const nextSchema = props.cols[props.index + 1];
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    isDragging,
  } = useDraggable({
    disabled: props.first || props.last || !designable,
    id: props.id,
    data: {
      dividerRef,
      prevSchema,
      nextSchema,
    },
  });

  const [clientWidths, setClientWidths] = useState([0, 0]);

  useDndMonitor({
    onDragStart(event) {
      if (event.active.data.current.dividerRef?.current !== dividerRef.current) {
        return;
      }
      dragIdRef.current = event.active.id as string;
      const el = dividerRef.current;
      const prev = el.previousElementSibling as HTMLDivElement;
      const next = el.nextElementSibling as HTMLDivElement;
      setClientWidths([prev.clientWidth, next.clientWidth]);
    },
    onDragMove(event) {
      if (!isDragging) {
        return;
      }
      if (dragIdRef.current === event.active.id) {
        dragIdRef.current = dragIdRef.current + '_move';
      }
      const el = dividerRef.current;
      const prev = el.previousElementSibling as HTMLDivElement;
      const next = el.nextElementSibling as HTMLDivElement;
      prev.style.width = `${clientWidths[0] + event.delta.x}px`;
      next.style.width = `${clientWidths[1] - event.delta.x}px`;
    },
    onDragEnd(event) {
      if (!dragIdRef.current) return;
      if (dragIdRef.current?.startsWith(event.active.id as string)) {
        if (!dragIdRef.current.endsWith('_move')) {
          return;
        }
      }
      if (clientWidths[0] <= 0 || clientWidths[1] <= 0) {
        return;
      }
      setClientWidths([0, 0]);
      if (!prevSchema || !nextSchema) {
        return;
      }
      const el = dividerRef.current;
      const prev = el.previousElementSibling as HTMLDivElement;
      const next = el.nextElementSibling as HTMLDivElement;
      prevSchema['x-component-props'] = prevSchema['x-component-props'] || {};
      nextSchema['x-component-props'] = nextSchema['x-component-props'] || {};
      const dividerWidth = (el.clientWidth * (props.cols.length + 1)) / props.cols.length;
      const preWidth = (
        (100 * (prev.getBoundingClientRect().width + dividerWidth)) /
        el.parentElement.clientWidth
      ).toFixed(2);
      const nextWidth = (
        (100 * (next.getBoundingClientRect().width + dividerWidth)) /
        el.parentElement.clientWidth
      ).toFixed(2);

      _.set(prevSchema, 'x-component-props.width', preWidth);
      _.set(nextSchema, 'x-component-props.width', nextWidth);
      // dn.emit('batchPatch', {
      //   schemas: [
      //     {
      //       ['x-uid']: prevSchema['x-uid'],
      //       'x-component-props': {
      //         ...prevSchema['x-component-props'],
      //       },
      //     },
      //     {
      //       ['x-uid']: nextSchema['x-uid'],
      //       'x-component-props': {
      //         ...nextSchema['x-component-props'],
      //       },
      //     },
      //   ],
      // });
    },
  });

  return (
    <div
      ref={(el) => {
        if (visible) {
          setNodeRef(el);
          dividerRef.current = el;
        }
      }}
      className={cx('tb-col-divider', 'ColDivider')}
      style={droppableStyle}
    >
      <div
        ref={setDraggableNodeRef}
        {...listeners}
        {...attributes}
        tabIndex={-1}
        className={props.first || props.last || !designable ? null : 'DraggableNode'}
      ></div>
    </div>
  );
};

const RowDivider = (props) => {
  const { token } = useToken();
  const { isOver, setNodeRef } = useDroppable({
    id: props.id,
    data: props.data,
  });
  const { cx } = useStyles();
  const [active, setActive] = useState(false);

  const droppableStyle = useMemo(() => {
    if (!isOver)
      return {
        zIndex: active ? 1000 : -1,
      };

    return {
      zIndex: active ? 1000 : -1,
      backgroundColor: new TinyColor(token.colorSettings).setAlpha(0.1).toHex8String(),
    };
  }, [active, isOver]);

  const dndContext = useDndContext();
  const currentSchema = props.rows[props.index];
  const activeSchema = dndContext.active?.data.current?.schema?.parent.parent;

  const colsLength: number = activeSchema
    ?.mapProperties((schema) => {
      return schema['x-component'] === 'EditableGrid.Col';
    })
    .filter(Boolean).length;

  let visible = true;

  // col > 1 时不需要隐藏
  if (colsLength === 1) {
    if (props.first) {
      visible = activeSchema !== props.rows[0];
    } else {
      const downSchema = props.rows[props.index + 1];
      visible = activeSchema !== currentSchema && downSchema !== activeSchema;
    }
  }

  useDndMonitor({
    onDragStart(event) {
      setActive(true);
    },
    onDragMove(event) {},
    onDragOver(event) {},
    onDragEnd(event) {
      setActive(false);
    },
    onDragCancel(event) {
      setActive(false);
    },
  });

  return (
    <span ref={visible ? setNodeRef : null} className={cx('tb-row-divider', 'RowDivider')} style={droppableStyle} />
  );
};

const wrapRowSchema = (schema: Schema) => {
  const row = new Schema({
    type: 'void',
    name: `row_${uid()}`,
    'x-uid': uid(),
    'x-component': 'EditableGrid.Row',
  });
  const col = row.addProperty(uid(), {
    type: 'void',
    'x-uid': uid(),
    'x-component': 'EditableGrid.Col',
  });
  if (Schema.isSchemaInstance(schema)) {
    schema.parent = col;
  }
  col.addProperty(schema.name, schema);
  return row;
};

const wrapColSchema = (schema: Schema) => {
  const s = new Schema({
    type: 'void',
    name: `col_${uid()}`,
    'x-uid': uid(),
    'x-component': 'EditableGrid.Col',
  });
  // parent 更新了，需要重新指定
  if (Schema.isSchemaInstance(schema)) {
    schema.parent = s;
  }
  s.addProperty(schema.name, schema);
  return s;
};

const useRowProperties = () => {
  const fieldSchema = useFieldSchema();
  return useMemo(() => {
    return fieldSchema.reduceProperties((buf, s) => {
      if (s['x-component'] === 'EditableGrid.Row' && !s['x-hidden']) {
        buf.push(s);
      }
      return buf;
    }, []);
  }, [Object.keys(fieldSchema.properties || {}).join(',')]);
};

const useColProperties = () => {
  const fieldSchema = useFieldSchema();
  return useMemo(() => {
    return fieldSchema.reduceProperties((buf, s) => {
      if (s['x-component'] === 'EditableGrid.Col' && !s['x-hidden']) {
        buf.push(s);
      }
      return buf;
    }, []);
  }, [Object.keys(fieldSchema.properties || {}).join(',')]);
};

const DndWrapper = (props) => {
  if (props.dndContext === false) {
    return <>{props.children}</>;
  }
  return <EditableGridDndContext {...props.dndContext}>{props.children}</EditableGridDndContext>;
};

const useEditableGridContext = () => {
  return useContext(EditableGridContext);
};

const useEditableGridRowContext = () => {
  return useContext(EditableGridRowContext);
};

export const EditableGrid: any = observer(
  (props: any) => {
    const { distributed, showDivider = true } = props;
    const gridRef = useRef(null);
    const field = useField();
    const fieldSchema = useFieldSchema();
    const { render } = useSchemaInitializerRender(fieldSchema['x-initializer'], fieldSchema['x-initializer-props']);
    const InitializerComponent = (props) => render(props);
    const addr = field.address.toString();
    const rows = useRowProperties();
    const { setPrintContent } = useFormBlockContext();
    const { styles, cx } = useStyles();
    const distributedValue =
      distributed === undefined
        ? fieldSchema?.parent['x-component'] === 'Page' || fieldSchema?.parent['x-component'] === 'Tabs.TabPane'
        : distributed;

    useEffect(() => {
      gridRef.current && setPrintContent?.(gridRef.current);
    }, [gridRef.current]);

    return (
      <EditableGridContext.Provider
        value={{ ref: gridRef, fieldSchema, renderSchemaInitializer: render, InitializerComponent, showDivider }}
      >
        <div className={cx('tb-grid', styles.editableGrid)} style={{ position: 'relative' }} ref={gridRef}>
          <DndWrapper dndContext={props.dndContext}>
            {showDivider ? (
              <RowDivider
                rows={rows}
                first
                id={`${addr}_0`}
                data={{
                  breakRemoveOn: breakRemoveOnGrid,
                  wrapSchema: wrapRowSchema,
                  insertAdjacent: 'afterBegin',
                  schema: fieldSchema,
                }}
              />
            ) : null}
            {rows.map((schema, index) => {
              return (
                <React.Fragment key={index}>
                  {distributedValue ? (
                    <SchemaComponent name={schema.name} schema={schema} distributed />
                  ) : (
                    <MemorizedRecursionField name={schema.name} schema={schema} />
                  )}
                  {showDivider ? (
                    <RowDivider
                      rows={rows}
                      index={index}
                      id={`${addr}_${index + 1}`}
                      data={{
                        breakRemoveOn: breakRemoveOnGrid,
                        wrapSchema: wrapRowSchema,
                        insertAdjacent: 'afterEnd',
                        schema,
                      }}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </DndWrapper>
          {render()}
        </div>
      </EditableGridContext.Provider>
    );
  },
  { displayName: 'EditableGrid' },
);

EditableGrid.Row = observer(
  () => {
    const field = useField();
    const fieldSchema = useFieldSchema();
    const addr = field.address.toString();
    const cols = useColProperties();
    const { showDivider } = useEditableGridContext();
    const { type } = useFormBlockType();
    const { cx } = useStyles();

    return (
      <EditableGridRowContext.Provider value={{ schema: fieldSchema, cols }}>
        <div
          className={cx('tb-grid-row', 'CardRow', {
            showDivider,
          })}
        >
          {showDivider && (
            <ColDivider
              cols={cols}
              first
              id={`${addr}_0`}
              data={{
                breakRemoveOn: breakRemoveOnRow,
                wrapSchema: wrapColSchema,
                insertAdjacent: 'afterBegin',
                schema: fieldSchema,
              }}
            />
          )}
          {cols.map((schema, index) => {
            return (
              <React.Fragment key={index}>
                <RecursionField
                  name={schema.name}
                  schema={schema}
                  mapProperties={(schema) => {
                    if (type === 'update') {
                      schema.default = null;
                    }
                    return schema;
                  }}
                />
                {showDivider && (
                  <ColDivider
                    cols={cols}
                    index={index}
                    last={index === cols.length - 1}
                    id={`${addr}_${index + 1}`}
                    data={{
                      breakRemoveOn: breakRemoveOnRow,
                      wrapSchema: wrapColSchema,
                      insertAdjacent: 'afterEnd',
                      schema,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </EditableGridRowContext.Provider>
    );
  },
  { displayName: 'EditableGrid.Row' },
);

EditableGrid.Col = observer(
  (props: any) => {
    const { cols = [] } = useContext(EditableGridRowContext);
    const { showDivider } = useEditableGridContext();
    const schema = useFieldSchema();
    const field = useField();
    const { token } = useToken();
    const { cx } = useStyles();

    const style = useMemo(() => {
      let width = '';
      if (cols?.length) {
        const w = schema?.['x-component-props']?.['width'] || 100 / cols.length;
        width = `calc(${w}% - ${token.marginLG}px *  ${(showDivider ? cols.length + 1 : 0) / cols.length})`;
      }
      return { width };
    }, [cols?.length, schema?.['x-component-props']?.['width']]);
    const { isOver, setNodeRef } = useDroppable({
      id: field.address.toString(),
      data: {
        insertAdjacent: 'beforeEnd',
        schema,
        wrapSchema: (s) => s,
      },
    });
    const [active, setActive] = useState(false);

    const droppableStyle = useMemo(() => {
      if (!isOver)
        return {
          height: '100%',
        };

      return {
        background: `linear-gradient(to top,  ${new TinyColor(token.colorSettings)
          .setAlpha(0.1)
          .toHex8String()} 20%, transparent 20%)`,
        borderTopRightRadius: '10px',
        borderTopLeftRadius: '10px',
        height: '100%',
      };
    }, [active, isOver]);

    useDndMonitor({
      onDragStart(event) {
        setActive(true);
      },
      onDragMove(event) {},
      onDragOver(event) {},
      onDragEnd(event) {
        setActive(false);
      },
      onDragCancel(event) {
        setActive(false);
      },
    });

    return (
      <EditableGridColContext.Provider value={{ cols, schema }}>
        <div ref={setNodeRef} style={{ ...style, ...droppableStyle }} className={cx('tb-grid-col', 'CardCol')}>
          {props.children}
        </div>
      </EditableGridColContext.Provider>
    );
  },
  { displayName: 'EditableGrid.Col' },
);

EditableGrid.wrap = (schema: ISchema) => {
  return {
    type: 'void',
    'x-component': 'EditableGrid.Row',
    properties: {
      [uid()]: {
        type: 'void',
        'x-component': 'EditableGrid.Col',
        properties: {
          [schema.name || uid()]: schema,
        },
      },
    },
  };
};
