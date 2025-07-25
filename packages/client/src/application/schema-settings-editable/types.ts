import { ISchema } from '@tachybase/schema';

export interface EditableSchemaSettingOptions<T = {}> {
  name: string;
  // Component?: ComponentType<T>;
  componentProps?: T;
  items: any[];
  style?: React.CSSProperties;
}

interface EditableSchemaSettingsItemCommon<T = {}> {
  name: string;
  sort?: number;
  useVisible?: () => boolean;
  useSchema?: () => ISchema;
  children?: EditableSchemaSettingsItemType[];
  useChildren?: () => EditableSchemaSettingsItemType[];
  /**
   * @default true
   */
  hideIfNoChildren?: boolean;
  componentProps?: Omit<T, 'children'>;
  useComponentProps?: () => Omit<T, 'children'>;
}

export type EditableSchemaSettingsItemType = EditableSchemaSettingsItemCommon;
export type EditableSchemaSettingsItemTypeWithoutName = Omit<EditableSchemaSettingsItemCommon, 'name'>;
