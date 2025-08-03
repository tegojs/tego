export interface PubSubManagerOptions {
  channelPrefix?: string;
}

export interface PubSubManagerPublishOptions {
  skipSelf?: boolean;
  onlySelf?: boolean;
}

export interface PubSubManagerSubscribeOptions {
  debounce?: number;
  // 回调的真实调用者
  callbackCaller?: any;
}

export type PubSubCallback = (message: any) => Promise<void>;

export interface IPubSubAdapter {
  isConnected(): Promise<boolean> | boolean;
  connect(): Promise<any>;
  close(): Promise<any>;
  subscribe(channel: string, callback: PubSubCallback): Promise<any>;
  unsubscribe(channel: string, callback: PubSubCallback): Promise<any>;
  publish(channel: string, message: string | object): Promise<any>;
}
