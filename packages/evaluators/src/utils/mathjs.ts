import { evaluate as mathEvaluate } from 'mathjs';

import { evaluate } from '.';

function getMathjsIndexValue(target: any, index: number) {
  if (index < 1) {
    throw new Error('Index out of range');
  }
  return target?.[index - 1];
}

export default evaluate.bind(function (expression: string, scope = {}) {
  const exp = expression.replace(/(\$\$\d+)\[(\d+)\]/g, (_, name, index) => {
    return `getMathjsIndexValue(${name}, ${index})`;
  });
  const safeScope: Record<string, any> = { getMathjsIndexValue };
  const varMap: Record<string, string> = {};
  let counter = 0;
  const safeExp = exp.replace(/\$\$\d+/g, (match) => {
    if (!varMap[match]) {
      const safeKey = `__v${counter++}`;
      varMap[match] = safeKey;
      safeScope[safeKey] = scope[match];
    }
    return varMap[match];
  });
  return mathEvaluate(safeExp, safeScope);
}, {});
