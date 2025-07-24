import { Plugin } from '@tachybase/client';
import evaluators from '@tachybase/evaluators/client';

import mathjs from './mathjs';

export class PluginMathjsEvaluatorClient extends Plugin {
  async load() {
    evaluators.register('math.js', mathjs);
  }
}

export default PluginMathjsEvaluatorClient;
