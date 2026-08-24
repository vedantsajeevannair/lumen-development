export interface FileDescriptor {
  readonly name: string;
  readonly size: number;
  readonly type: string;
}

export function createFileDescriptor(name: string, size: number, type: string): FileDescriptor {
  return { name, size, type };
}
