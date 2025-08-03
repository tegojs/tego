import { parse } from '@tachybase/utils';

import _ from 'lodash';

export class Environment {
  private vars = {};

  setVariable(key: string, value: string) {
    this.vars[key] = value;
  }

  removeVariable(key: string) {
    delete this.vars[key];
  }

  getVariablesAndSecrets() {
    return this.vars;
  }

  getVariables() {
    return this.vars;
  }

  renderJsonTemplate(template: any, options?: { omit?: string[] }) {
    if (options?.omit) {
      const omitTemplate = _.omit(template, options.omit);
      const parsed = parse(omitTemplate)({
        $env: this.vars,
      });
      for (const key of options.omit) {
        _.set(parsed, key, _.get(template, key));
      }
      return parsed;
    }
    return parse(template)({
      $env: this.vars,
    });
  }
}
