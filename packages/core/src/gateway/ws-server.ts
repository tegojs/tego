import { IncomingMessage } from 'node:http';
import { Logger } from '@tachybase/logger';

import lodash from 'lodash';
import { nanoid } from 'nanoid';
import WebSocket, { WebSocketServer } from 'ws';

import { Gateway } from '.';
import { AppSupervisor } from '../app-supervisor';
import { applyErrorWithArgs, getErrorWithCode } from './errors';
import { IncomingRequest } from './types';

declare class WebSocketWithId extends WebSocket {
  id: string;
}

interface WebSocketClient {
  ws: WebSocketWithId;
  tags: Set<string>;
  url: string;
  headers: any;
  app?: string;
}

// WebSocket 事件类型
type WSEventType = 'close' | 'error' | 'message' | 'connection';

// WebSocket 事件处理函数类型
type WSEventHandler = (ws: WebSocketWithId, ...args: any[]) => Promise<void> | void;

// 每个应用的事件处理函数集合
interface AppWSEventHandlers {
  [appName: string]: {
    [eventType: string]: Set<WSEventHandler>;
  };
}

function getPayloadByErrorCode(code, options) {
  const error = getErrorWithCode(code);
  return lodash.omit(applyErrorWithArgs(error, options), ['status', 'maintaining']);
}

export class WSServer {
  wss: WebSocket.Server;
  webSocketClients = new Map<string, WebSocketClient>();
  static KEY_CORE_MESSAGE = 'KEY_CORE_MESSAGE';
  private currentId = nanoid();
  logger: Logger;

  // 存储每个应用注册的事件处理函数
  private appEventHandlers: AppWSEventHandlers = {};

  constructor() {
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (ws: WebSocketWithId, request: IncomingMessage) => {
      const client = this.addNewConnection(ws, request);

      console.log(`new client connected ${ws.id}`);

      // 为新连接添加基本事件监听
      ws.on('error', (error) => {
        this.removeConnection(ws.id);
        // 触发应用级别的错误事件处理函数
        if (client && client.app) {
          this.triggerAppEventHandlers(client.app, 'error', ws, error);
        }
      });

      ws.on('close', (code, reason) => {
        // 触发应用级别的关闭事件处理函数
        if (client && client.app) {
          this.triggerAppEventHandlers(client.app, 'close', ws, code, reason);
        }
        this.removeConnection(ws.id);
      });

      ws.on('message', (data) => {
        // 触发应用级别的消息事件处理函数
        if (client && client.app) {
          this.triggerAppEventHandlers(client.app, 'message', ws, data);
        }
      });

      // 触发应用级别的连接事件处理函数
      if (client && client.app) {
        this.triggerAppEventHandlers(client.app, 'connection', ws, request);
      }
    });

    Gateway.getInstance().on('appSelectorChanged', () => {
      // reset connection app tags
      this.loopThroughConnections(async (client) => {
        const handleAppName = await Gateway.getInstance().getRequestHandleAppName({
          url: client.url,
          headers: client.headers,
        });

        for (const tag of client.tags) {
          if (tag.startsWith('app#')) {
            client.tags.delete(tag);
          }
        }

        client.tags.add(`app#${handleAppName}`);

        AppSupervisor.getInstance().bootStrapApp(handleAppName);
      });
    });

    AppSupervisor.getInstance().on('appError', async ({ appName, error }) => {
      this.sendToConnectionsByTag('app', appName, {
        type: 'notification',
        payload: {
          message: error.message,
          type: 'error',
        },
      });
    });

    AppSupervisor.getInstance().on('appMaintainingMessageChanged', async ({ appName, message, command, status }) => {
      const app = await AppSupervisor.getInstance().getApp(appName, {
        withOutBootStrap: true,
      });

      const payload = getPayloadByErrorCode(status, {
        app,
        message,
        command,
      });

      this.sendToConnectionsByTag('app', appName, {
        type: 'maintaining',
        payload,
      });
    });

    AppSupervisor.getInstance().on('appStatusChanged', async ({ appName, status, options }) => {
      const app = await AppSupervisor.getInstance().getApp(appName, {
        withOutBootStrap: true,
      });

      const payload = getPayloadByErrorCode(status, { app, appName });
      this.sendToConnectionsByTag('app', appName, {
        type: 'maintaining',
        payload: {
          ...payload,
          ...options,
        },
      });
    });

    AppSupervisor.getInstance().on('afterAppAdded', (app) => {
      this.bindAppWSEvents(app);
    });
  }

  /**
   * 为指定应用注册 WebSocket 事件处理函数
   * @param appName 应用名称
   * @param eventType 事件类型
   * @param handler 事件处理函数
   */
  registerAppEventHandler(appName: string, eventType: WSEventType, handler: WSEventHandler) {
    if (!this.appEventHandlers[appName]) {
      this.appEventHandlers[appName] = {};
    }

    if (!this.appEventHandlers[appName][eventType]) {
      this.appEventHandlers[appName][eventType] = new Set();
    }

    this.appEventHandlers[appName][eventType].add(handler);
    console.log(`Registered ${eventType} handler for app ${appName}`);

    return this;
  }

  /**
   * 移除指定应用的 WebSocket 事件处理函数
   * @param appName 应用名称
   * @param eventType 事件类型
   * @param handler 事件处理函数
   */
  removeAppEventHandler(appName: string, eventType: WSEventType, handler: WSEventHandler) {
    if (this.appEventHandlers[appName] && this.appEventHandlers[appName][eventType]) {
      this.appEventHandlers[appName][eventType].delete(handler);
      console.log(`Removed ${eventType} handler for app ${appName}`);
    }

    return this;
  }

  /**
   * 触发指定应用的事件处理函数
   * 只有当客户端与应用名称匹配时，才会触发相应的事件处理函数
   * @param appName 应用名称
   * @param eventType 事件类型
   * @param ws WebSocket 实例
   * @param args 事件参数
   */
  private triggerAppEventHandlers(appName: string, eventType: WSEventType, ws: WebSocketWithId, ...args: any[]) {
    if (!appName || !this.appEventHandlers[appName] || !this.appEventHandlers[appName][eventType]) {
      return;
    }

    // 获取客户端所属的应用
    const client = this.webSocketClients.get(ws.id);
    if (!client) {
      return;
    }

    // 如果 WebSocket 客户端的应用与事件处理函数的应用不匹配，则不触发
    // 这样可以避免触发与当前客户端无关的应用的事件处理函数
    if (client.app !== appName) {
      return;
    }

    // console.log(`Triggering ${eventType} handlers for app ${appName}, client ${ws.id}`);
    for (const handler of this.appEventHandlers[appName][eventType]) {
      try {
        handler(ws, ...args);
      } catch (error) {
        console.error(`Error in ${appName} WebSocket ${eventType} handler:`, error);
      }
    }
  }

  bindAppWSEvents(app) {
    if (app.listenerCount('ws:setTag') > 0) {
      return;
    }

    app.on('ws:setTag', ({ clientId, tagKey, tagValue }) => {
      this.setClientTag(clientId, tagKey, tagValue);
    });

    app.on('ws:removeTag', ({ clientId, tagKey }) => {
      this.removeClientTag(clientId, tagKey);
    });

    app.on('ws:sendToTag', ({ tagKey, tagValue, message }) => {
      this.sendToConnectionsByTags(
        [
          { tagName: tagKey, tagValue },
          { tagName: 'app', tagValue: app.name },
        ],
        message,
      );
    });

    app.on('ws:sendToClient', ({ clientId, message }) => {
      this.sendToClient(clientId, message);
    });

    app.on('ws:sendToCurrentApp', ({ message }) => {
      this.sendToConnectionsByTag('app', app.name, message);
    });

    app.on('ws:sendToTags', ({ tags, message }) => {
      this.sendToConnectionsByTags(tags, message);
    });

    app.on('ws:authorized', ({ clientId, userId }) => {
      this.sendToClient(clientId, { type: 'authorized' });
    });

    // 添加注册 WebSocket 事件处理函数的方法
    app.on('ws:registerEventHandler', ({ eventType, handler }) => {
      this.registerAppEventHandler(app.name, eventType, handler);
    });

    // 添加移除 WebSocket 事件处理函数的方法
    app.on('ws:removeEventHandler', ({ eventType, handler }) => {
      this.removeAppEventHandler(app.name, eventType, handler);
    });
  }

  addNewConnection(ws: WebSocketWithId, request: IncomingMessage) {
    const id = nanoid();

    ws.id = id;

    this.webSocketClients.set(id, {
      ws,
      tags: new Set(),
      url: request.url,
      headers: request.headers,
    });

    this.setClientApp(this.webSocketClients.get(id));

    return this.webSocketClients.get(id);
  }

  setClientTag(clientId: string, tagKey: string, tagValue: string) {
    const client = this.webSocketClients.get(clientId);
    if (!client) {
      return;
    }
    client.tags.add(`${tagKey}#${tagValue}`);
    console.log(`client tags: ${Array.from(client.tags)}`);
  }

  removeClientTag(clientId: string, tagKey: string) {
    const client = this.webSocketClients.get(clientId);
    if (!client) {
      return;
    }
    // remove all tags with the given tagKey
    client.tags.forEach((tag) => {
      if (tag.startsWith(`${tagKey}#`)) {
        client.tags.delete(tag);
      }
    });
  }

  async setClientApp(client: WebSocketClient) {
    const req: IncomingRequest = {
      url: client.url,
      headers: client.headers,
    };

    const handleAppName = await Gateway.getInstance().getRequestHandleAppName(req);

    client.app = handleAppName;
    console.log(`client tags: app#${handleAppName}`);
    client.tags.add(`app#${handleAppName}`);

    const hasApp = AppSupervisor.getInstance().hasApp(handleAppName);

    if (!hasApp) {
      AppSupervisor.getInstance().bootStrapApp(handleAppName);
    }

    const appStatus = AppSupervisor.getInstance().getAppStatus(handleAppName, 'initializing');

    if (appStatus === 'not_found') {
      this.sendMessageToConnection(client, {
        type: 'maintaining',
        payload: getPayloadByErrorCode('APP_NOT_FOUND', { appName: handleAppName }),
      });
      return;
    }

    if (appStatus === 'initializing') {
      this.sendMessageToConnection(client, {
        type: 'maintaining',
        payload: getPayloadByErrorCode('APP_INITIALIZING', { appName: handleAppName }),
      });

      return;
    }

    const app = await AppSupervisor.getInstance().getApp(handleAppName);

    this.sendMessageToConnection(client, {
      type: 'maintaining',
      payload: getPayloadByErrorCode(appStatus, { app }),
    });
  }

  removeConnection(id: string) {
    console.log(`client disconnected ${id}`);
    this.webSocketClients.delete(id);
  }

  sendMessageToConnection(client: WebSocketClient, sendMessage: object) {
    client.ws.send(JSON.stringify(sendMessage));
  }

  sendToConnectionsByTag(tagName: string, tagValue: string, sendMessage: object) {
    const tagString = `${tagName}#${tagValue}`;
    this.webSocketClients.forEach((client) => {
      if (client.tags.has(tagString)) {
        this.sendMessageToConnection(client, sendMessage);
      }
    });
  }

  sendToConnectionsByTags(tags: Array<{ tagName: string; tagValue: string }>, sendMessage: object) {
    const tagStrings = tags.map(({ tagName, tagValue }) => `${tagName}#${tagValue}`);
    this.webSocketClients.forEach((client) => {
      if (tagStrings.every((tagString) => client.tags.has(tagString))) {
        this.sendMessageToConnection(client, sendMessage);
      }
    });
  }

  sendToClient(clientId: string, sendMessage: object) {
    const client = this.webSocketClients.get(clientId);
    if (client) {
      this.sendMessageToConnection(client, sendMessage);
    }
  }

  loopThroughConnections(callback: (client: WebSocketClient) => void) {
    this.webSocketClients.forEach((client) => {
      callback(client);
    });
  }

  close() {
    this.wss.close();
  }
}
