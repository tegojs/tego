import http, { IncomingMessage, ServerResponse } from 'node:http';

import { ApplicationOptions } from '../application';

export interface Handler {
  name: string;
  prefix: string;
  callback: (req: IncomingMessage, res: ServerResponse) => void;
}
export interface AppSelectorMiddlewareContext {
  req: IncomingRequest;
  resolvedAppName: string | null;
}
export interface RunOptions {
  mainAppOptions: ApplicationOptions;
}
export interface StartHttpServerOptions {
  port: number;
  host: string;
  callback?: (server: http.Server) => void;
}
export type AppSelectorMiddleware = (ctx: AppSelectorMiddlewareContext, next: () => Promise<void>) => void;
export type AppSelector = (req: IncomingRequest) => string | Promise<string>;
export interface IncomingRequest {
  url: string;
  headers: any;
}
