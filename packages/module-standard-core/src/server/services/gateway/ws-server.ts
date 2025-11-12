import { EventEmitter } from 'node:events';
import http from 'node:http';
import { parse } from 'node:url';

import WebSocket from 'ws';

interface TaggedConnection {
  socket: WebSocket;
  tags: Map<string, string>;
}

export class WSServer extends EventEmitter {
  public readonly wss: WebSocket.Server;
  private connections = new Set<TaggedConnection>();

  constructor(
    server: http.Server,
    private wsPath: string,
  ) {
    super();
    this.wss = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const { pathname } = parse(request.url || '/');
      if (pathname !== this.wsPath) {
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });

    this.wss.on('connection', (socket, request) => {
      const { query } = parse(request.url || '/', true);
      const connection: TaggedConnection = {
        socket,
        tags: new Map(),
      };

      if (typeof query?.app === 'string') {
        connection.tags.set('app', query.app);
      }

      this.connections.add(connection);
      socket.on('close', () => this.connections.delete(connection));
      socket.on('error', () => this.connections.delete(connection));
    });
  }

  sendToConnectionsByTag(tag: string, value: string, payload: any) {
    const message = JSON.stringify(payload);
    for (const connection of this.connections) {
      if (connection.tags.get(tag) === value && connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(message);
      }
    }
  }

  broadcast(payload: any) {
    const message = JSON.stringify(payload);
    for (const connection of this.connections) {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(message);
      }
    }
  }

  close() {
    for (const connection of this.connections) {
      connection.socket.close();
    }
    this.connections.clear();
    this.wss.close();
  }
}
