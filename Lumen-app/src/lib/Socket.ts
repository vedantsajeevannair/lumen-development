export interface SocketConnection {
  readonly url: string;
}

export function createSocketConnection(url: string): SocketConnection {
  return { url };
}
