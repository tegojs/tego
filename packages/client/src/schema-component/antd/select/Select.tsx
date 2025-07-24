import { connect, isValid, mapProps, mapReadPretty, toArr, useFieldSchema } from '@tachybase/schema';
import { isPlainObject } from '@tachybase/utils/client';

import { CloseCircleFilled, CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { Select as AntdSelect, Empty, Radio, Spin, Tag, type SelectProps } from 'antd';

import FormulaSelect from './FormulaSelect';
import { ReadPretty } from './ReadPretty';
import { defaultFieldNames, FieldNames, getCurrentOptions } from './utils';

type Props = SelectProps<any, any> & {
  objectValue?: boolean;
  onChange?: (v: any) => void;
  multiple: boolean;
  rawOptions: any[];
  fieldNames: FieldNames;
};

const isEmptyObject = (val: any) => !isValid(val) || (typeof val === 'object' && Object.keys(val).length === 0);

const ObjectSelect = (props: Props) => {
  const { value, options, onChange, fieldNames, mode, loading, rawOptions, defaultValue, ...others } = props;
  const toValue = (v: any) => {
    if (isEmptyObject(v)) {
      return;
    }
    const values = toArr(v)
      .filter((item) => item)
      .map((val) => {
        return isPlainObject(val) ? val[fieldNames.value] : val;
      });
    const currentOptions = getCurrentOptions(values, options, fieldNames)?.map((val) => {
      return {
        label: val[fieldNames.label],
        value: val[fieldNames.value],
      };
    });
    if (['tags', 'multiple'].includes(mode) || props.multiple) {
      return currentOptions;
    }
    return currentOptions.shift();
  };
  return (
    <AntdSelect
      // @ts-ignore
      role="button"
      data-testid={`select-object-${mode || 'single'}`}
      value={toValue(value)}
      defaultValue={toValue(defaultValue)}
      allowClear={{
        clearIcon: <CloseCircleFilled role="button" aria-label="icon-close-select" />,
      }}
      labelInValue
      notFoundContent={loading ? <Spin /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      options={options}
      fieldNames={fieldNames}
      showSearch
      popupMatchSelectWidth={false}
      filterOption={(input, option) => (option?.[fieldNames.label || 'label'] ?? '').includes(input)}
      filterSort={(optionA, optionB) =>
        (optionA?.[fieldNames.label || 'label'] ?? '')
          .toLowerCase()
          .localeCompare((optionB?.[fieldNames.label || 'label'] ?? '').toLowerCase())
      }
      onChange={(changed) => {
        const current = getCurrentOptions(
          toArr(changed).map((v) => v.value),
          rawOptions || options,
          fieldNames,
        );
        if (['tags', 'multiple'].includes(mode as string) || props.multiple) {
          onChange?.(current);
        } else {
          onChange?.(current.shift() || null);
        }
      }}
      mode={mode}
      tagRender={(props) => {
        return (
          // @ts-ignore
          <Tag
            role="button"
            aria-label={props.label}
            closeIcon={<CloseOutlined role="button" aria-label="icon-close-tag" />}
            {...props}
          >
            {props.label}
          </Tag>
        );
      }}
      {...others}
    />
  );
};

const filterOption = (input, option) => (option?.label ?? '').toLowerCase().includes((input || '').toLowerCase());

const InternalSelect = connect(
  (props: Props) => {
    const { objectValue, loading, value, rawOptions, defaultValue, ...others } = props;
    let mode: any = props.multiple ? 'multiple' : props.mode;
    if (mode && !['multiple', 'tags', 'CustomTitle'].includes(mode)) {
      mode = undefined;
    }
    let options = props.options ? [...props.options] : [];
    if (['CustomTitle'].includes(props.mode) && ('formula' in others.fieldNames || 'collection' in props)) {
      return <FormulaSelect {...props} />;
    }
    if (objectValue) {
      return (
        <ObjectSelect
          rawOptions={rawOptions}
          {...others}
          defaultValue={defaultValue}
          value={value}
          mode={mode}
          loading={loading}
        />
      );
    }
    const toValue = (v) => {
      if (['tags', 'multiple'].includes(props.mode) || props.multiple) {
        if (v) {
          return toArr(v);
        }
        return undefined;
      }
      return v;
    };

    return (
      <AntdSelect
        // @ts-ignore
        role="button"
        data-testid={`select-${mode || 'single'}`}
        showSearch
        filterOption={filterOption}
        allowClear={{
          clearIcon: <CloseCircleFilled role="button" aria-label="icon-close-select" />,
        }}
        options={options}
        popupMatchSelectWidth={false}
        notFoundContent={loading ? <Spin /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        value={toValue(value)}
        defaultValue={toValue(defaultValue)}
        tagRender={(props) => {
          return (
            // @ts-ignore
            <Tag
              role="button"
              aria-label={props.label}
              closeIcon={<CloseOutlined role="button" aria-label="icon-close-tag" />}
              {...props}
            >
              {props.label}
            </Tag>
          );
        }}
        {...others}
        onChange={(changed) => {
          props.onChange?.(changed === undefined ? null : changed);
        }}
        mode={mode}
      />
    );
  },
  mapProps(
    {
      dataSource: 'options',
    },
    (props, field) => {
      return {
        ...props,
        fieldNames: { ...defaultFieldNames, ...props.fieldNames },
        suffixIcon: field?.['loading'] || field?.['validating'] ? <LoadingOutlined /> : props.suffixIcon,
      };
    },
  ),
  mapReadPretty(ReadPretty),
);

const InternalRadioGroup = connect(
  (props: any) => {
    const { options, value, onChange } = props;

    // NOTE: This is a hack, make radio group can cancel choice.
    const handleCancel = (e) => {
      e.stopPropagation();
      const currentValue = e.target.value;
      if (e.target.type === 'radio' && currentValue === value) {
        onChange?.('');
      }
    };

    return (
      <div onClick={handleCancel}>
        <Radio.Group {...props} value={value} options={options} />
      </div>
    );
  },
  mapProps({
    dataSource: 'options',
    onInput: 'onChange',
    value: 'value',
  }),
  mapReadPretty(ReadPretty),
);

export const Select = (props) => {
  switch (props.mode) {
    case 'Radio group':
      return <InternalRadioGroup {...props} />;
    case 'Select':
    default:
      return <InternalSelect {...props} />;
  }
};

Select.ReadPretty = ReadPretty;

export default Select;
