import { Registry } from '@tachybase/utils';

import { Evaluator } from '../utils';
import formulajs from '../utils/formulajs';
import string from '../utils/string';

export { evaluate, appendArrayColumn } from '../utils';
export type { Evaluator } from '../utils';

export const evaluators = new Registry<Evaluator>();

evaluators.register('formula.js', formulajs);
evaluators.register('string', string);

export default evaluators;
