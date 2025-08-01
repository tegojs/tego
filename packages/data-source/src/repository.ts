import * as console from 'node:console';

import { IModel, IRepository } from './types';

export class Repository implements IRepository {
  async create(options) {
    console.log('Repository.create....');
  }
  async update(options) {}
  async find(options?: any): Promise<IModel[]> {
    return [];
  }
  async findOne(options?: any): Promise<IModel> {
    return {};
  }
  async destroy(options) {}

  count(options?: any): Promise<number> {
    return Promise.resolve(undefined);
  }

  findAndCount(options?: any): Promise<[IModel[], number]> {
    return Promise.resolve([[], undefined]);
  }
}
