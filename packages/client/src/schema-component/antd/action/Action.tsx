import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { observer, RecursionField, useField, useFieldSchema, useForm } from '@tachybase/schema';
import { isPortalInBody } from '@tachybase/utils/client';

import { App, Button } from 'antd';
import classnames from 'classnames';
import { default as lodash } from 'lodash';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { StablePopover, useActionContext } from '../..';
import { useDesignable } from '../../';
import { useApp } from '../../../application';
import { withDynamicSchemaProps } from '../../../application/hoc/withDynamicSchemaProps';
import { useACLActionParamsContext } from '../../../built-in/acl';
import { PathHandler } from '../../../built-in/dynamic-page/utils';
import { useCollection, useCollectionRecordData } from '../../../data-source';
import { Icon } from '../../../icon';
import { RecordProvider } from '../../../record-provider';
import { useLocalVariables, useVariables } from '../../../variables';
import { SortableItem } from '../../common';
import { useCompile, useComponent, useDesigner } from '../../hooks';
import { useProps } from '../../hooks/useProps';
import { ActionArea } from './Action.Area';
import ActionContainer from './Action.Container';
import { ActionDesigner } from './Action.Designer';
import { ActionDrawer } from './Action.Drawer';
import { ActionLink } from './Action.Link';
import { ActionModal } from './Action.Modal';
import { ActionPage } from './Action.Page';
import useStyles from './Action.style';
import { ActionContextProvider } from './context';
import { useA } from './hooks';
import { useGetAriaLabelOfAction } from './hooks/useGetAriaLabelOfAction';
import { ComposedAction } from './types';
import { linkageAction } from './utils';

export const Action: ComposedAction = withDynamicSchemaProps(
  observer((props: any) => {
    const {
      isShow = true,
      popover,
      confirm,
      openMode: om,
      containerRefKey,
      component,
      useAction = useA,
      className,
      icon,
      title,
      onClick,
      style,
      openSize: os,
      disabled: propsDisabled,
      actionCallback,
      /** 如果为 true 则说明该按钮是树表格的 Add child 按钮 */
      addChild,
      ...others
    } = useProps(props); // 新版 UISchema（1.0 之后）中已经废弃了 useProps，这里之所以继续保留是为了兼容旧版的 UISchema
    const aclCtx = useACLActionParamsContext();
    const navigate = useNavigate();
    const { wrapSSR, componentCls, hashId } = useStyles();
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [formValueChanged, setFormValueChanged] = useState(false);
    const Designer = useDesigner();
    const field = useField<any>();
    const app = useApp();
    const pageMode = app.usePageMode();
    const { run, element } = useAction(actionCallback);
    const fieldSchema = useFieldSchema();
    const compile = useCompile();
    const form = useForm();
    // TODO 这里这么改，会影响还没重构的设置代码，但是剩下没重构的插件设置代码也没几个，可以碰到修改就行
    const record = useCollectionRecordData();
    const collection = useCollection();
    const designerProps = fieldSchema['x-designer-props'];
    const openMode = fieldSchema?.['x-component-props']?.['openMode'];
    const openSize = fieldSchema?.['x-component-props']?.['openSize'];
    const disabled = form.disabled || field.disabled || field.data?.disabled || propsDisabled;
    const linkageRules = fieldSchema?.['x-linkage-rules'] || [];
    const { designable } = useDesignable();
    const tarComponent = useComponent(component) || component;
    const { modal } = App.useApp();
    const variables = useVariables();
    const localVariables = useLocalVariables({ currentForm: { values: record } as any });
    const { getAriaLabel } = useGetAriaLabelOfAction(title);
    let actionTitle = title || compile(fieldSchema.title);
    actionTitle = lodash.isString(actionTitle) ? t(actionTitle) : actionTitle;

    useEffect(() => {
      field.stateOfLinkageRules = {};
      linkageRules
        .filter((k) => !k.disabled)
        .forEach((v) => {
          v.actions?.forEach((h) => {
            linkageAction({
              operator: h.operator,
              field,
              condition: v.condition,
              variables,
              localVariables,
            });
          });
        });
    }, [field, linkageRules, localVariables, record, variables]);

    const handleButtonClick = useCallback(
      (e: React.MouseEvent) => {
        if (isPortalInBody(e.target as Element)) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (!disabled && aclCtx) {
          const onOk = () => {
            onClick?.(e);
            // TODO: 这块需要验证下插件的设置有没有问题
            const containerSchema = fieldSchema.reduceProperties((buf, s) =>
              s['x-component'] === 'Action.Container' ? s : buf,
            );
            // TODO: 增加上下文判断
            if (pageMode?.enable && containerSchema) {
              const target = PathHandler.getInstance().toWildcardPath({
                collection: collection.name,
                filterByTk: record[collection.getPrimaryKey()],
              });
              navigate('../' + containerSchema['x-uid'] + '/' + target);
            } else {
              setVisible(true);
            }
            run();
          };
          if (confirm?.content) {
            modal.confirm({
              title: t(confirm.title, { title: actionTitle }),
              content: t(confirm.content, { title: actionTitle }),
              onOk,
            });
          } else {
            onOk();
          }
        }
      },
      [confirm, disabled, modal, onClick, run],
    );

    const buttonStyle = useMemo(() => {
      return {
        ...style,
        opacity: designable && (field?.data?.hidden || !aclCtx) && 0.1,
      };
    }, [designable, field?.data?.hidden, style]);

    const renderButton = () => {
      if (!designable && (field?.data?.hidden || !aclCtx)) {
        return null;
      }

      return (
        <SortableItem
          role="button"
          aria-label={getAriaLabel()}
          {...others}
          loading={field?.data?.loading}
          icon={icon ? <Icon type={icon} /> : null}
          disabled={disabled}
          style={buttonStyle}
          onClick={handleButtonClick}
          component={tarComponent || Button}
          className={classnames(componentCls, hashId, className, 'tb-action')}
          type={props.type === 'danger' ? undefined : props.type}
        >
          {actionTitle}
          <Designer {...designerProps} />
        </SortableItem>
      );
    };
    const result = (
      <ActionContextProvider
        button={renderButton()}
        visible={visible}
        setVisible={setVisible}
        formValueChanged={formValueChanged}
        setFormValueChanged={setFormValueChanged}
        openMode={openMode}
        openSize={openSize}
        containerRefKey={containerRefKey}
        fieldSchema={fieldSchema}
      >
        {popover && <RecursionField basePath={field.address} onlyRenderProperties schema={fieldSchema} />}
        {!popover && renderButton()}
        {!popover && props.children}
        {element}
      </ActionContextProvider>
    );

    if (!isShow) {
      return null;
    }

    if (addChild) {
      return wrapSSR(
        <RecordProvider record={null} parent={record}>
          {result}
        </RecordProvider>,
      );
    }

    return wrapSSR(result);
  }),
  { displayName: 'Action' },
);

Action.Popover = observer(
  (props) => {
    const { button, visible, setVisible } = useActionContext();
    return (
      <StablePopover
        {...props}
        destroyTooltipOnHide
        open={visible}
        onOpenChange={(visible) => {
          setVisible(visible);
        }}
        content={props.children}
      >
        {button}
      </StablePopover>
    );
  },
  { displayName: 'Action.Popover' },
);

Action.Popover.Footer = observer(
  (props) => {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          width: '100%',
        }}
      >
        {props.children}
      </div>
    );
  },
  { displayName: 'Action.Popover.Footer' },
);

Action.Link = ActionLink;
Action.Designer = ActionDesigner;
Action.Drawer = ActionDrawer;
Action.Modal = ActionModal;
Action.Container = ActionContainer;
Action.Page = ActionPage;
Action.Area = ActionArea;

export default Action;
