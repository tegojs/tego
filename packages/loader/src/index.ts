import { createRequire } from 'node:module';
import { resolve } from 'node:path';

type LoaderFunction = (request: string, parent: NodeModule | null, isMain: boolean) => unknown;

export const defineLoader = (
  whitelists: Set<string>,
  originalLoad: LoaderFunction,
  lookingPaths: string[],
): LoaderFunction =>
  function (request, parent, isMain) {
    // 使用白名单拦截，以及所有符合 '@tachybase/' 前缀的包
    // TODO 未来支持动态的前缀判定或者更严格的判定
    if (whitelists.has(request) || request.startsWith('@tachybase/') || request.startsWith('@tego/')) {
      try {
        const resolvedFromApp = require.resolve(request, { paths: lookingPaths });
        return originalLoad(resolvedFromApp, parent, isMain);
      } catch (err) {
        for (const basePath of lookingPaths) {
          // 支持非 node_modules 的加载
          try {
            const pluginRoot = resolve(basePath, request);
            const fakeRequire = createRequire(pluginRoot + '/index.js');
            const resolved = fakeRequire.resolve(pluginRoot);
            return originalLoad(resolved, parent, isMain);
          } catch {}
        }
        // 这里不应该发生，但是我们依旧提供回退的机制，使用默认行为来加载模块
        if (err.code === 'MODULE_NOT_FOUND') {
          return originalLoad(request, parent, isMain);
        }
      }
    }

    // 相对路径、绝对路径不动
    return originalLoad(request, parent, isMain);
  };

/**
 * 与 defineLoader 相同逻辑的 resolve 方法
 * @returns 返回解析后的绝对路径
 */
export const defineResolver = (
  whitelists: Set<string>,
  originalResolve: typeof require.resolve,
  lookingPaths: string[],
) => {
  return function resolveRequest(request: string): string {
    if (whitelists.has(request) || request.startsWith('@tachybase/') || request.startsWith('@tego/')) {
      try {
        return originalResolve(request, { paths: lookingPaths });
      } catch (err: any) {
        for (const basePath of lookingPaths) {
          try {
            const pluginRoot = resolve(basePath, request);
            const fakeRequire = createRequire(pluginRoot + '/index.js');
            return fakeRequire.resolve(pluginRoot);
          } catch {}
        }
        // 回退
        if (err.code === 'MODULE_NOT_FOUND') {
          return originalResolve(request);
        }
        throw err;
      }
    }
    // 默认逻辑
    return originalResolve(request);
  };
};
