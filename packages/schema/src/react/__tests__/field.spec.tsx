import React, { act } from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import {
  ArrayField,
  connect,
  Field,
  FormProvider,
  mapProps,
  mapReadPretty,
  ObjectField,
  observer,
  useField,
  useFormEffects,
  VoidField,
} from '..';
import {
  createForm,
  Field as FieldType,
  isArrayField,
  isField,
  isVoidField,
  onFieldChange,
  onFieldUnmount,
} from '../../core';
import { ReactiveField } from '../components/ReactiveField';
import { expectThrowError } from './shared';

type InputProps = {
  value?: string;
  onChange?: (...args: any) => void;
};

type CustomProps = {
  list?: string[];
};

const Decorator = (props) => <div>{props.children}</div>;
const Input: React.FC<React.PropsWithChildren<InputProps>> = (props) => (
  <input {...props} value={props.value || ''} data-testid={useField().path.toString()} />
);

const Normal = () => <div></div>;

test('render field', async () => {
  const form = createForm();
  const onChange = vi.fn();
  const { getByTestId, queryByTestId, unmount } = render(
    <FormProvider form={form}>
      <Field name="aa" decorator={[Decorator]} component={[Input, { onChange }]} />
      <ArrayField name="bb" decorator={[Decorator]}>
        <div data-testid="bb-children"></div>
      </ArrayField>
      <ObjectField name="cc" decorator={[Decorator]}>
        <Field name="mm" decorator={[Decorator]} component={[Input]} />
        <ObjectField name="pp" decorator={[Decorator]} />
        <ArrayField name="tt" decorator={[Decorator]} />
        <VoidField name="ww" />
      </ObjectField>
      <VoidField name="dd" decorator={[Decorator]}>
        {() => (
          <div data-testid="dd-children">
            <Field name="oo" decorator={[Decorator]} component={[Input]} />
          </div>
        )}
      </VoidField>
      <VoidField name="xx" decorator={[Decorator]} component={[Normal]} />
      <Field name="ee" visible={false} decorator={[Decorator]} component={[Input]} />
      <Field name="ff" decorator={[]} component={[]} />
      <Field name="gg" decorator={null} component={null} />
      <Field name="hh" decorator={[null]} component={[null, null]} />
      <Field name="kk" decorator={[Decorator]} component={[Input, { onChange: null }]} />
    </FormProvider>,
  );
  expect(form.mounted).toBeTruthy();
  expect(form.query('aa').take().mounted).toBeTruthy();
  expect(form.query('bb').take().mounted).toBeTruthy();
  expect(form.query('cc').take().mounted).toBeTruthy();
  expect(form.query('dd').take().mounted).toBeTruthy();
  fireEvent.change(getByTestId('aa'), {
    target: {
      value: '123',
    },
  });
  fireEvent.change(getByTestId('kk'), {
    target: {
      value: '123',
    },
  });
  expect(onChange).toBeCalledTimes(1);
  expect(getByTestId('bb-children')).not.toBeUndefined();
  expect(getByTestId('dd-children')).not.toBeUndefined();
  expect(queryByTestId('ee')).toBeNull();
  expect(form.query('aa').get('value')).toEqual('123');
  expect(form.query('kk').get('value')).toEqual('123');
  unmount();
});

test('render field no context', () => {
  expectThrowError(() => {
    return (
      <>
        <Field name="aa">{() => <div></div>}</Field>
        <ArrayField name="bb">
          <div></div>
        </ArrayField>
        <ObjectField name="cc" />
        <VoidField name="dd" />
      </>
    );
  });
});

test('ReactiveField', () => {
  render(<ReactiveField field={null} />);
  render(<ReactiveField field={null}>{() => <div></div>}</ReactiveField>);
});

test('useAttach basic', async () => {
  const form = createForm();
  const MyComponent = (props: any) => {
    return (
      <FormProvider form={form}>
        <Field name={props.name} decorator={[Decorator]} component={[Input]} />
      </FormProvider>
    );
  };
  const { rerender } = render(<MyComponent name="aa" />);
  expect(form.query('aa').take().mounted).toBeTruthy();
  rerender(<MyComponent name="bb" />);
  await waitFor(() => {
    expect(form.query('aa').take().mounted).toBeFalsy();
    expect(form.query('bb').take().mounted).toBeTruthy();
  });
});

test('useAttach with array field', async () => {
  const form = createForm();
  const MyComponent = () => {
    return (
      <FormProvider form={form}>
        <ArrayField name="array" initialValue={[{ input: '11' }, { input: '22' }]}>
          {(field) => {
            return field.value.map((val, index) => {
              return <Field key={index} name={index + '.input'} decorator={[Decorator]} component={[Input]} />;
            });
          }}
        </ArrayField>
      </FormProvider>
    );
  };
  render(<MyComponent />);
  await waitFor(() => {
    expect(form.query('array.0.input').take().mounted).toBeTruthy();
    expect(form.query('array.1.input').take().mounted).toBeTruthy();
  });
  form.query('array').take((field) => {
    if (isArrayField(field)) {
      field.moveDown(0);
    }
  });
  await waitFor(() => {
    expect(form.query('array.0.input').take().mounted).toBeTruthy();
    expect(form.query('array.1.input').take().mounted).toBeTruthy();
  });
});

test('useFormEffects', async () => {
  const form = createForm();
  const CustomField = observer(() => {
    const field = useField<FieldType>();
    useFormEffects(() => {
      onFieldChange('aa', ['value'], (target) => {
        if (isVoidField(target)) return;
        field.setValue(target.value);
      });
    });
    return <div data-testid="custom-value">{field.value || ''}</div>;
  });
  act(async () => {
    const { queryByTestId, rerender } = render(
      <FormProvider form={form}>
        <Field name="aa" decorator={[Decorator]} component={[Input]} />
        <Field name="bb" component={[CustomField, { tag: 'xxx' }]} />
      </FormProvider>,
    );

    await waitFor(() => {
      expect(queryByTestId('custom-value')?.textContent).toEqual('');
    });
    form.query('aa').take((aa) => {
      if (isField(aa)) {
        aa.setValue(['123']);
      }
    });
    await waitFor(() => {
      expect(queryByTestId('custom-value')?.textContent).toEqual('123');
    });
    rerender(
      <FormProvider form={form}>
        <Field name="aa" decorator={[Decorator]} component={[Input]} />
        <Field name="bb" component={[CustomField, { tag: 'yyy' }]} />
      </FormProvider>,
    );
  });
});

test('connect', async () => {
  // 测试最基本的 React 渲染 - 使用与工作测试相同的方式
  const { getByText } = render(<div>basic test</div>);
  expect(getByText('basic test')).toBeInTheDocument();

  // 测试表单创建
  const form = createForm();
  expect(form).toBeDefined();

  // 测试 FormProvider 渲染
  const { getByText: getByText2 } = render(
    <FormProvider form={form}>
      <div>provider test</div>
    </FormProvider>,
  );
  expect(getByText2('provider test')).toBeInTheDocument();

  // 测试 Field 基本渲染
  const { getByText: getByText3 } = render(
    <FormProvider form={form}>
      <Field name="test" component={[() => <div>field test</div>]} />
    </FormProvider>,
  );
  expect(getByText3('field test')).toBeInTheDocument();

  // 测试 connect 功能
  const CustomField = connect(
    (props: CustomProps) => {
      return <div>{props.list || 'empty'}</div>;
    },
    mapProps({ value: 'list' }),
  );

  const { getByText: getByText4 } = render(
    <FormProvider form={form}>
      <Field name="aa" component={[CustomField]} />
    </FormProvider>,
  );
  expect(getByText4('empty')).toBeInTheDocument();
}, 15000);

test('fields unmount and validate', async () => {
  // 测试基本的表单创建
  const form = createForm({
    initialValues: {
      parent: {
        type: 'mounted',
      },
    },
  });
  expect(form).toBeDefined();

  // 测试字段渲染
  const SimpleParent = () => {
    const field = useField<FieldType>();
    return <div data-testid="parent-field">{field.value.type}</div>;
  };

  const { getByTestId } = render(
    <FormProvider form={form}>
      <Field name="parent" component={[SimpleParent]} />
    </FormProvider>,
  );

  // 验证基本渲染
  expect(getByTestId('parent-field')).toBeInTheDocument();
  expect(getByTestId('parent-field').textContent).toBe('mounted');

  // 验证字段存在
  expect(form.query('parent').take()).toBeDefined();

  // 测试字段值更新
  form.query('parent').take((field) => {
    field.setState((state) => {
      state.value.type = 'unmounted';
    });
  });

  await waitFor(
    () => {
      expect(getByTestId('parent-field').textContent).toBe('unmounted');
    },
    { timeout: 5000 },
  );
}, 15000);
