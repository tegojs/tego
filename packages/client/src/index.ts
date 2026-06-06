import React from 'react';

export { APIClient, getSubAppName } from '@tachybase/sdk';
export type { APIClientOptions, IResource } from '@tachybase/sdk';
export { getRequireJs } from '@tachybase/requirejs';
export type { RequireJS } from '@tachybase/requirejs';

export {
  CollectionsGraph,
  Registry,
  convertUTCToLocal,
  error,
  flatten,
  forEach,
  fuzzysearch,
  getDefaultFormat,
  getScrollParent,
  getValuesByPath,
  isArray,
  isPlainObject,
  isPortalInBody,
  isString,
  isURL,
  merge,
  moment2str,
  nextTick,
  parse,
  str2moment,
  toFixedByStep,
  toGmt,
  toLocal,
  uid,
  unflatten,
} from '@tachybase/utils/client';
export type { ArrayBaseMixins, IArrayBaseAdditionProps } from '@tachybase/components/lib/array-base';
export type { ReactFC } from '@tachybase/schema';
export { evaluate, evaluators, getOptions } from '@tachybase/evaluators/client';
export type { Evaluator } from '@tachybase/evaluators/client';

const lazyComponent = (modulePath: string, exportName: string) => {
  let cached: any;
  const load = () => {
    if (!cached) {
      cached = require(modulePath)[exportName];
    }
    return cached;
  };
  const Component = React.forwardRef<any, any>((props, ref) => React.createElement(load(), { ...props, ref }));
  return new Proxy(Component, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }
      return load()?.[prop];
    },
  });
};

export const dayjsable = (...args: any[]) => require('@tachybase/components/lib/__builtins__').dayjsable(...args);
export const formatDayjsValue = (...args: any[]) =>
  require('@tachybase/components/lib/__builtins__').formatDayjsValue(...args);
export const usePrefixCls = (...args: any[]) => require('@tachybase/components/lib/__builtins__').usePrefixCls(...args);
export const useFormLayout = (...args: any[]) =>
  require('@tachybase/components/lib/form-layout').useFormLayout(...args);

export const ArrayBase = lazyComponent('@tachybase/components/lib/array-base', 'ArrayBase');
export const ArrayCollapse = lazyComponent('@tachybase/components/lib/array-collapse', 'ArrayCollapse');
export const ArrayItems = lazyComponent('@tachybase/components/lib/array-items', 'ArrayItems');
export const ArrayTable = lazyComponent('@tachybase/components/lib/array-table', 'ArrayTable');
export const Checkbox = lazyComponent('@tachybase/components/lib/checkbox', 'Checkbox');
export const CodeEditor = lazyComponent('@tachybase/components/lib/code-mirror', 'CodeEditor');
export const CodeMirror = lazyComponent('@tachybase/components/lib/code-mirror', 'CodeMirror');
export const DatePicker = lazyComponent('@tachybase/components/lib/date-picker', 'DatePicker');
export const Editable = lazyComponent('@tachybase/components/lib/editable', 'Editable');
export const Form = lazyComponent('@tachybase/components/lib/form', 'Form');
export const FormButtonGroup = lazyComponent('@tachybase/components/lib/form-button-group', 'FormButtonGroup');
export const FormCollapse = lazyComponent('@tachybase/components/lib/form-collapse', 'FormCollapse');
export const FormDrawer = lazyComponent('@tachybase/components/lib/form-drawer', 'FormDrawer');
export const FormItem = lazyComponent('@tachybase/components/lib/form-item', 'FormItem');
export const FormLayout = lazyComponent('@tachybase/components/lib/form-layout', 'FormLayout');
export const FormTab = lazyComponent('@tachybase/components/lib/form-tab', 'FormTab');
export const Input = lazyComponent('@tachybase/components/lib/input', 'Input');
export const Lightbox = lazyComponent('@tachybase/components/lib/lightbox', 'Lightbox');
export const NumberPicker = lazyComponent('@tachybase/components/lib/number-picker', 'NumberPicker');
export const Radio = lazyComponent('@tachybase/components/lib/radio', 'Radio');
export const Reset = lazyComponent('@tachybase/components/lib/reset', 'Reset');
export const Space = lazyComponent('@tachybase/components/lib/space', 'Space');
export const Submit = lazyComponent('@tachybase/components/lib/submit', 'Submit');
export const Switch = lazyComponent('@tachybase/components/lib/switch', 'Switch');
export const TreeSelect = lazyComponent('@tachybase/components/lib/tree-select', 'TreeSelect');
