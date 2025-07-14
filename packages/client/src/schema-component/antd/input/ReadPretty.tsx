import React from 'react';
import { usePrefixCls } from '@tachybase/components';
import { useFieldSchema } from '@tachybase/schema';

import { css } from '@emotion/css';
import { Image, Typography } from 'antd';
import { InputProps, TextAreaProps } from 'antd/es/input';
import cls from 'classnames';

import { useCompile } from '../..';
import { EllipsisWithTooltip } from './EllipsisWithTooltip';
import { HTMLEncode } from './shared';

export const ReadPretty = () => null;

const _Input = (props: InputProps & { ellipsis?: any }) => {
  const prefixCls = usePrefixCls('description-input', props);
  const compile = useCompile();
  return (
    <div
      className={cls(prefixCls, props.className)}
      style={{
        display: 'flex',
        alignItems: 'center',
        overflowWrap: 'break-word',
        whiteSpace: 'normal',
        ...props.style,
      }}
    >
      {compile(props.addonBefore)}
      {compile(props.prefix)}
      <EllipsisWithTooltip ellipsis={props.ellipsis}>{compile(props.value)}</EllipsisWithTooltip>
      {compile(props.suffix)}
      {compile(props.addonAfter)}
    </div>
  );
};

const _TextArea = (
  props: TextAreaProps & {
    ellipsis?: any;
    text?: any;
    addonBefore?: any;
    suffix?: any;
    addonAfter?: any;
    autop?: boolean;
  },
) => {
  const prefixCls = usePrefixCls('description-textarea', props);
  const compile = useCompile();
  const value = compile(props.value ?? '');
  const { autop = true, ellipsis, text } = props;
  const html = (
    <div
      style={{ lineHeight: 1.612 }}
      dangerouslySetInnerHTML={{
        __html: HTMLEncode(value).split('\n').join('<br/>'),
      }}
    />
  );

  const content = ellipsis ? (
    <EllipsisWithTooltip ellipsis={ellipsis} popoverContent={autop ? html : value}>
      {text || value}
    </EllipsisWithTooltip>
  ) : autop ? (
    html
  ) : (
    value
  );
  return (
    <div className={cls(prefixCls, props.className)} style={{ overflowWrap: 'break-word', ...props.style }}>
      {props.addonBefore}
      {props.prefix}
      {content}
      {props.suffix}
      {props.addonAfter}
    </div>
  );
};

function convertToText(html: string) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = temp.innerText;
  return text?.replace(/[\n\r]/g, '') || '';
}

const _Html = (props: InputProps & { autop: boolean; ellipsis: boolean }) => {
  const prefixCls = usePrefixCls('description-textarea', props);
  const compile = useCompile();
  const value = compile(props.value ?? '');
  const { autop = true, ellipsis } = props;
  const html = (
    <div
      dangerouslySetInnerHTML={{
        __html: value,
      }}
    />
  );
  const text = convertToText(value);
  const content = (
    <EllipsisWithTooltip ellipsis={ellipsis} popoverContent={autop ? html : value}>
      {ellipsis ? text : html}
    </EllipsisWithTooltip>
  );
  return (
    <div className={cls(prefixCls, props.className)} style={{ overflowWrap: 'break-word', ...props.style }}>
      {props.addonBefore}
      {props.prefix}
      {content}
      {props.suffix}
      {props.addonAfter}
    </div>
  );
};

const _URL = (props: InputProps) => {
  const prefixCls = usePrefixCls('description-url', props);
  const content = props.value && (
    <Typography.Link ellipsis target={'_blank'} href={props.value as any}>
      {props.value?.toString()}
    </Typography.Link>
  );
  return (
    <div className={cls(prefixCls, props.className)} style={props.style}>
      {props.addonBefore}
      {props.prefix}
      {content}
      {props.suffix}
      {props.addonAfter}
    </div>
  );
};

const _JSON = (props) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const prefixCls = usePrefixCls('json', props);
  return (
    <pre
      className={cls(
        prefixCls,
        props.className,
        css`
          margin-bottom: 0;
          line-height: 1.5;
          font-size: 90%;
        `,
      )}
      style={props.style}
    >
      {props.value != null ? JSON.stringify(props.value, null, props.space ?? 2) : ''}
    </pre>
  );
};

const sizes = {
  small: 24,
  middle: 48,
  large: 72,
  oversized: 120,
};

const _Preview = (props: any) => {
  const fieldSchema = useFieldSchema();
  const size = fieldSchema['x-component-props']?.['size'] || 'small';
  const objectFit = fieldSchema['x-component-props']?.['objectFit'] || 'cover';

  if (!props.value) {
    return props.value;
  }

  return (
    <Image
      style={
        ['small', 'middle', 'large', 'oversized'].includes(size)
          ? {
              width: sizes[size],
              height: sizes[size],
              objectFit,
            }
          : {}
      }
      src={props.value}
    />
  );
};

ReadPretty.Input = _Input;
ReadPretty.TextArea = _TextArea;
ReadPretty.URL = _URL;
ReadPretty.Html = _Html;
ReadPretty.JSON = _JSON;
ReadPretty.Preview = _Preview;
