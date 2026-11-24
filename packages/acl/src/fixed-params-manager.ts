import { assign, mergeStrategies } from '@tachybase/utils';

type Context = any;
export type Merger = () => object;

export type ActionPath = string;

const SPLIT = ':';

export default class FixedParamsManager {
  merger = new Map<ActionPath, Array<Merger>>();

  addParams(resource: string, action: string, merger: Merger) {
    const path = this.getActionPath(resource, action);
    this.merger.set(path, [...this.getParamsMerger(resource, action), merger]);
  }

  getParamsMerger(resource: string, action: string) {
    const path = this.getActionPath(resource, action);
    return this.merger.get(path) || [];
  }

  protected getActionPath(resource: string, action: string) {
    return `${resource}${SPLIT}${action}`;
  }

  getParams(resource: string, action: string, extraParams: any = {}) {
    const results = {};
    for (const merger of this.getParamsMerger(resource, action)) {
      FixedParamsManager.mergeParams(results, merger());
    }

    if (extraParams) {
      FixedParamsManager.mergeParams(results, extraParams);
    }

    return results;
  }

  static mergeParams(a: any, b: any) {
    assign(a, b, {
      filter: 'andMerge',
      fields: 'intersect',
      appends: 'union',
      except: 'union',
      whitelist: (current, incoming) => {
        if ((Array.isArray(current) && current.length === 0) || (Array.isArray(incoming) && incoming.length === 0)) {
          return [];
        }
        return mergeStrategies.get('intersect')(current, incoming);
      },
      blacklist: 'intersect',
      sort: 'overwrite',
    });
  }
}
