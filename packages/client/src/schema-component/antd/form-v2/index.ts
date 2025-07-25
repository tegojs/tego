import { Form as FormV2 } from './Form';
import { DetailsDesigner, FormDesigner, ReadPrettyFormDesigner } from './Form.Designer';
import { FilterDesigner } from './Form.FilterDesigner';
import { fetchTemplateData, Templates, type ITemplate } from './Templates';

FormV2.Designer = FormDesigner;
FormV2.FilterDesigner = FilterDesigner;
FormV2.ReadPrettyDesigner = ReadPrettyFormDesigner;
FormV2.Templates = Templates;

export { DetailsDesigner, FormV2, fetchTemplateData };
export type { ITemplate };
export * from './Form.Settings';
export * from './FormField';
export { getTempFieldState } from './utils';
