export function moduleNotFound(request: string): NodeJS.ErrnoException {
  const error = new Error(`Cannot find module '${request}'`) as NodeJS.ErrnoException;
  error.code = 'MODULE_NOT_FOUND';
  return error;
}
