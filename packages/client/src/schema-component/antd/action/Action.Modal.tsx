import React, { useState } from 'react';
import { observer, RecursionField, useField, useFieldSchema } from '@tachybase/schema';

import { CloseOutlined, FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Button, Modal, ModalProps } from 'antd';
import classNames from 'classnames';

import { OpenSize, useActionContext } from '.';
import { useStyles } from './Action.Modal.style';
import { useSetAriaLabelForModal } from './hooks/useSetAriaLabelForModal';
import { ComposedActionDrawer } from './types';

const openSizeWidthMap = new Map<OpenSize, string>([
  ['small', '40%'],
  ['middle', '60%'],
  ['large', '80%'],
]);
export const ActionModal: ComposedActionDrawer<ModalProps> = observer(
  (props) => {
    const { footerNodeName = 'Action.Modal.Footer', width, fullScreenButton = true, ...others } = props;
    const { styles } = useStyles();
    const { visible, setVisible, openSize = 'middle', modalProps } = useActionContext();
    const actualWidth = width ?? openSizeWidthMap.get(openSize);
    const schema = useFieldSchema();
    const field = useField();
    const footerSchema = schema.reduceProperties((buf, s) => {
      if (s['x-component'] === footerNodeName) {
        return s;
      }
      return buf;
    });

    if (process.env.__E2E__) {
      useSetAriaLabelForModal(visible);
    }

    return (
      <Modal
        className={classNames(others.className, modalProps?.className, styles.container, 'amplifier-block')}
        style={{
          ...modalProps?.style,
          ...others?.style,
        }}
        width={actualWidth}
        title={
          <div style={{ display: 'flex' }}>
            <span style={{ flex: 1 }}>{field.title}</span>
            <>
              {fullScreenButton && <Amplifier />}
              <Button
                type="text"
                icon={<CloseOutlined />}
                className={css`
                  background: none;
                  border: none;
                `}
                onClick={() => setVisible(false, true)}
              />
            </>
          </div>
        }
        {...(others as ModalProps)}
        {...modalProps}
        destroyOnClose
        open={visible}
        closable={false}
        footer={
          footerSchema ? (
            <RecursionField
              basePath={field.address}
              schema={schema}
              onlyRenderProperties
              filterProperties={(s) => {
                return s['x-component'] === footerNodeName;
              }}
            />
          ) : (
            false
          )
        }
      >
        <div className={styles.modalClassName}>
          <RecursionField
            basePath={field.address}
            schema={schema}
            onlyRenderProperties
            filterProperties={(s) => {
              return s['x-component'] !== footerNodeName;
            }}
          />
        </div>
      </Modal>
    );
  },
  { displayName: 'ActionModal' },
);

ActionModal.Footer = observer(
  () => {
    const field = useField();
    const schema = useFieldSchema();
    return <RecursionField basePath={field.address} schema={schema} onlyRenderProperties />;
  },
  { displayName: 'ActionModal.Footer' },
);

export default ActionModal;

export const Amplifier = () => {
  const [isAmplifier, setIsAmplifier] = useState(false);
  const [blockWidth, setBlockWidth] = useState('');
  return (
    <Button
      icon={isAmplifier ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
      type="text"
      className={css`
        background: none;
        border: none;
      `}
      onClick={(e) => {
        const element = (e.target as HTMLElement).closest('.ant-modal-content') as HTMLElement;
        const modal = document.querySelector('.ant-modal') as HTMLElement;
        const mask = document.querySelector('.ant-modal-mask') as HTMLElement;
        if (isAmplifier) {
          modal.style.width = blockWidth;
          element.style.width = '';
          modal.style.top = '';
          modal.style.padding = '';
          modal.style.margin = '';
          mask.style.backgroundColor = '';
        } else {
          setBlockWidth(modal.getBoundingClientRect().width + 'px');
          element.style.width = '100vw';
          modal.style.width = '100%';
          modal.style.top = '0';
          modal.style.padding = '0';
          modal.style.margin = '0';
          mask.style.backgroundColor = '#f3f3f3';
        }
        setIsAmplifier(!isAmplifier);
      }}
    />
  );
};
