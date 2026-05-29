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
  const fn = new Function('getMathjsIndexValue', ...Object.keys(scope), `return ${exp}`);
  return fn(getMathjsIndexValue, ...Object.values(scope));
}, {});
