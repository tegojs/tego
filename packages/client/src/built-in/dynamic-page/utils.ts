interface PathParams {
  schemaId: string; // 必需字段
  collection?: string; // 可选字段
  filterByTk?: string; // 可选字段
  sourceId?: string; // 可选字段
  tab?: string; // 可选字段
}

interface ParsedPath extends PathParams {} // 直接扩展 PathParams，可灵活调整需求

export class PathHandler {
  private static instance: PathHandler;

  // 私有构造函数，禁止外部实例化
  private constructor() {}

  // 获取单例实例
  public static getInstance(): PathHandler {
    if (!PathHandler.instance) {
      PathHandler.instance = new PathHandler();
    }
    return PathHandler.instance;
  }

  /**
   * 解析通配符路径为对象
   * @param wildcardPath 通配符部分的路径字符串（例如 "collection/abc/tab/tab1"）
   * @param schemaId 从路由参数中提取的必选字段
   * @returns 解析结果对象
   */
  public parse(wildcardPath: string, schemaId: string): ParsedPath | false {
    if (!schemaId) {
      throw new Error('schemaId is required.');
    }

    const segments = wildcardPath.split('/').filter(Boolean); // 拆分路径并过滤空值
    let found = false;
    const result: ParsedPath = { schemaId };

    for (let i = 0; i < segments.length; i += 2) {
      const key = segments[i];
      const value = segments[i + 1];
      if (!value) continue; // 跳过没有值的键

      let validKey = true;
      switch (key) {
        case 'collection':
          result.collection = value;
          break;
        case 'filter-by-tk':
          result.filterByTk = value;
          break;
        case 'source-id':
          result.sourceId = value;
          break;
        case 'tab':
          result.tab = value;
          break;
        default:
          validKey = false;
          console.warn(`Unknown key: ${key}`);
      }
      if (validKey) {
        found = true;
      }
    }

    return found ? result : false;
  }

  /**
   * 根据对象生成通配符路径部分
   * @param params 输入的字段对象（不包含 schemaId）
   * @returns 生成的通配符路径字符串
   */
  public toWildcardPath(params: Omit<PathParams, 'schemaId'>): string {
    const { collection, filterByTk, sourceId, tab } = params;

    const segments: string[] = [];
    if (collection) segments.push('collection', collection);
    if (filterByTk) segments.push('filter-by-tk', filterByTk);
    if (sourceId) segments.push('source-id', sourceId);
    if (tab) segments.push('tab', tab);

    return segments.join('/');
  }
}
