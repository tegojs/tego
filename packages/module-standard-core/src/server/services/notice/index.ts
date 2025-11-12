import { TOKENS, type Tego } from '@tego/core';

import { Gateway } from '../gateway/gateway';
import { WSServer } from '../gateway/ws-server';

export enum NoticeLevel {
  INFO = 'info',
  WARNING = 'warning',
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum NoticeType {
  STATUS = 'status',
  TOAST = 'toast',
  NOTIFICATION = 'notification',
  CUSTOM = 'custom',
  MODAL = 'modal',
}

export class NoticeManager {
  constructor(
    private tego: Tego,
    private ws: WSServer,
  ) {}

  #emit(msg: {
    type: NoticeType;
    title?: string;
    content?: string;
    level?: NoticeLevel;
    duration?: number;
    eventType?: string;
    event?: unknown;
  }) {
    this.ws?.sendToConnectionsByTag('app', this.tego.name, {
      type: 'notice',
      payload: msg,
    });
  }

  notify(eventType: string, event: unknown) {
    this.#emit({
      type: NoticeType.CUSTOM,
      eventType,
      event,
    });
  }

  status(content: string, level: NoticeLevel, duration: number) {
    this.#emit({ type: NoticeType.STATUS, content, level, duration });
  }

  toast(content: string, level: NoticeLevel, duration: number) {
    this.#emit({ type: NoticeType.TOAST, content, level, duration });
  }

  notification(title: string, content: string, level: NoticeLevel, duration: number) {
    this.#emit({ type: NoticeType.NOTIFICATION, title, content, level, duration });
  }

  modal(title: string, content: string, level: NoticeLevel, duration: number) {
    this.#emit({ type: NoticeType.MODAL, title, content, level, duration });
  }
}

export const registerNoticeManager = (tego: Tego, gateway: Gateway) => {
  const ws = gateway.getWebSocketServer();
  const noticeManager = new NoticeManager(tego, ws);
  tego.container.set({ id: TOKENS.NoticeManager, value: noticeManager });
  return noticeManager;
};
