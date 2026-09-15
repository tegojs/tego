import lodash from 'lodash';

/** A target query's association aliases are relative to that target; joined root queries need the full path. */
export function rebaseAssociationScope(where: any, path: string): any {
  if (Array.isArray(where)) {
    return where.map((item) => rebaseAssociationScope(item, path));
  }
  if (!lodash.isPlainObject(where)) {
    return where;
  }
  const result = {};
  for (const key of Reflect.ownKeys(where)) {
    const rebased =
      typeof key === 'string' && key.startsWith('$') && key.endsWith('$') ? `$${path}.${key.slice(1, -1)}$` : key;
    result[rebased] = rebaseAssociationScope(where[key], path);
  }
  return result;
}
