import http, { IncomingMessage, ServerResponse } from 'node:http';

import { ApplicationOptions } from '../application';

export interface GatewayOptions {
  host?: string;
  port?: number;
  wsPath?: string;
  ipcSocketPath?: string;
}
