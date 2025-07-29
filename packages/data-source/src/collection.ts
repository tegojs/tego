import merge from 'deepmerge';
import { default as lodash } from 'lodash';

import { CollectionField } from './collection-field';
import { DataSourceCollectionOptions, ICollection, ICollectionManager, IField, IRepository } from './types';

export class DataSourceCollection implements ICollection {
  repository: IRepository;
  fields: Map<string, IField> = new Map<string, IField>();

  constructor(
    protected options: DataSourceCollectionOptions,
    protected collectionManager: ICollectionManager,
  ) {
    this.setRepository(options.repository);
    if (options.fields) {
      for (const field of options.fields) {
        this.setField(field.name, field);
      }
    }
  }

  updateOptions(options: DataSourceCollectionOptions, mergeOptions?: any) {
    let newOptions = lodash.cloneDeep(options);
    newOptions = merge(this.options, newOptions, mergeOptions);
    this.options = newOptions;

    if (options.repository) {
      this.setRepository(options.repository);
    }

    return this;
  }

  setField(name: string, options: any) {
    const field = new CollectionField(options);
    this.fields.set(name, field);
    return field;
  }

  removeField(name: string) {
    this.fields.delete(name);
  }

  getField(name: string) {
    return this.fields.get(name);
  }

  getFieldByField(field: string): IField {
    for (const item of this.fields.values()) {
      if (item.options.field === field) {
        return item;
      }
    }
    return null;
  }

  getFields() {
    return [...this.fields.values()];
  }

  protected setRepository(repository: any) {
    this.repository = this.collectionManager.getRegisteredRepository(repository || 'Repository');
  }
}
