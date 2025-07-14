import { Plugin } from '../application/Plugin';
import { DataSource } from '../data-source/data-source/DataSource';
import { DEFAULT_DATA_SOURCE_KEY, DEFAULT_DATA_SOURCE_TITLE } from '../data-source/data-source/DataSourceManager';
import {
  CheckboxFieldInterface,
  CheckboxGroupFieldInterface,
  ChinaRegionFieldInterface,
  CollectionSelectFieldInterface,
  ColorFieldInterface,
  CreatedAtFieldInterface,
  CreatedByFieldInterface,
  DatetimeFieldInterface,
  EmailFieldInterface,
  IconFieldInterface,
  IdFieldInterface,
  InputFieldInterface,
  IntegerFieldInterface,
  JsonFieldInterface,
  LinkToFieldInterface,
  M2MFieldInterface,
  M2OFieldInterface,
  MarkdownFieldInterface,
  MultipleSelectFieldInterface,
  NanoidFieldInterface,
  NumberFieldInterface,
  O2MFieldInterface,
  O2OFieldInterface,
  OBOFieldInterface,
  OHOFieldInterface,
  PasswordFieldInterface,
  PercentFieldInterface,
  PhoneFieldInterface,
  RadioGroupFieldInterface,
  RichTextFieldInterface,
  SelectFieldInterface,
  SortFieldInterface,
  SubTableFieldInterface,
  TableoidFieldInterface,
  TextareaFieldInterface,
  TimeFieldInterface,
  UnixTimestampFieldInterface,
  UpdatedAtFieldInterface,
  UpdatedByFieldInterface,
  UrlFieldInterface,
  UUIDFieldInterface,
} from './interfaces';
import { InheritanceCollectionMixin } from './mixins/InheritanceCollectionMixin';
import {
  ExpressionCollectionTemplate,
  GeneralCollectionTemplate,
  ImportCollectionTemplate,
  SqlCollectionTemplate,
  TreeCollectionTemplate,
  ViewCollectionTemplate,
} from './templates';
import { ImportXlsxTemplate } from './templates/xlsx';

class MainDataSource extends DataSource {
  async getDataSource() {
    const service = await this.app.apiClient.request({
      resource: 'collections',
      action: 'list',
      params: {
        paginate: false,
        appends: ['fields', 'category'],
        filter: {
          // inherit: false,
        },
        sort: ['sort'],
      },
    });
    const collections = service?.data?.data || [];
    return {
      collections,
    };
  }
}

export class CollectionPlugin extends Plugin {
  async load() {
    this.dataSourceManager.addCollectionMixins([InheritanceCollectionMixin]);
    this.addFieldInterfaces();
    this.addCollectionTemplates();
    this.addFieldInterfaces();
    this.addFieldInterfaceGroups();

    this.dataSourceManager.addDataSource(MainDataSource, {
      key: DEFAULT_DATA_SOURCE_KEY,
      displayName: DEFAULT_DATA_SOURCE_TITLE,
    });

    this.app.dataSourceManager.collectionFieldInterfaceManager.addFieldInterfaceComponentOption('m2o', {
      label: '{{t("CustomTitle")}}',
      value: 'CustomTitle',
    });
    this.app.dataSourceManager.collectionFieldInterfaceManager.addFieldInterfaceComponentOption('m2m', {
      label: '{{t("CustomTitle")}}',
      value: 'CustomTitle',
    });
    this.app.dataSourceManager.collectionFieldInterfaceManager.addFieldInterfaceComponentOption('o2m', {
      label: '{{t("CustomTitle")}}',
      value: 'CustomTitle',
    });
    this.app.dataSourceManager.collectionFieldInterfaceManager.addFieldInterfaceComponentOption('o2o', {
      label: '{{t("CustomTitle")}}',
      value: 'CustomTitle',
    });
    this.app.dataSourceManager.collectionFieldInterfaceManager.addFieldInterfaceComponentOption('obo', {
      label: '{{t("CustomTitle")}}',
      value: 'CustomTitle',
    });
    this.app.dataSourceManager.collectionFieldInterfaceManager.addFieldInterfaceComponentOption('select', {
      label: '{{t("CustomTitle")}}',
      value: 'CustomTitle',
    });
    this.app.dataSourceManager.collectionFieldInterfaceManager.addFieldInterfaceComponentOption('checkbox', {
      label: '{{t("CustomTitle")}}',
      value: 'CustomTitle',
    });
    this.app.dataSourceManager.collectionFieldInterfaceManager.addFieldInterfaceComponentOption('radioGroup', {
      label: '{{t("CustomTitle")}}',
      value: 'CustomTitle',
    });
    this.app.dataSourceManager.collectionFieldInterfaceManager.addFieldInterfaceComponentOption('multipleSelect', {
      label: '{{t("CustomTitle")}}',
      value: 'CustomTitle',
    });
  }

  addFieldInterfaceGroups() {
    this.dataSourceManager.addFieldInterfaceGroups({
      basic: {
        label: '{{t("Basic")}}',
      },
      choices: {
        label: '{{t("Choices")}}',
      },
      media: {
        label: '{{t("Media")}}',
      },
      datetime: {
        label: '{{t("Date & Time")}}',
      },
      relation: {
        label: '{{t("Relation")}}',
      },
      advanced: {
        label: '{{t("Advanced type")}}',
      },
      systemInfo: {
        label: '{{t("System info")}}',
      },
      others: {
        label: '{{t("Others")}}',
      },
    });
  }

  addFieldInterfaces() {
    this.dataSourceManager.addFieldInterfaces([
      CheckboxFieldInterface,
      CheckboxGroupFieldInterface,
      ChinaRegionFieldInterface,
      CollectionSelectFieldInterface,
      ColorFieldInterface,
      CreatedAtFieldInterface,
      CreatedByFieldInterface,
      DatetimeFieldInterface,
      EmailFieldInterface,
      IconFieldInterface,
      IdFieldInterface,
      InputFieldInterface,
      IntegerFieldInterface,
      JsonFieldInterface,
      LinkToFieldInterface,
      M2MFieldInterface,
      M2OFieldInterface,
      MarkdownFieldInterface,
      MultipleSelectFieldInterface,
      NumberFieldInterface,
      O2MFieldInterface,
      O2OFieldInterface,
      OHOFieldInterface,
      OBOFieldInterface,
      PasswordFieldInterface,
      PercentFieldInterface,
      PhoneFieldInterface,
      RadioGroupFieldInterface,
      RichTextFieldInterface,
      SelectFieldInterface,
      SubTableFieldInterface,
      TableoidFieldInterface,
      TextareaFieldInterface,
      TimeFieldInterface,
      UpdatedAtFieldInterface,
      UpdatedByFieldInterface,
      UrlFieldInterface,
      SortFieldInterface,
      UUIDFieldInterface,
      NanoidFieldInterface,
      UnixTimestampFieldInterface,
    ]);
  }

  addCollectionTemplates() {
    this.dataSourceManager.addCollectionTemplates([
      GeneralCollectionTemplate,
      ExpressionCollectionTemplate,
      SqlCollectionTemplate,
      TreeCollectionTemplate,
      ViewCollectionTemplate,
      ImportCollectionTemplate,
      ImportXlsxTemplate,
    ]);
  }
}
