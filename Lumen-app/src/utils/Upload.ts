export interface UploadDescriptor {
  readonly fileName: string;
  readonly progress: number;
}

export function createUploadDescriptor(fileName: string, progress = 0): UploadDescriptor {
  return { fileName, progress };
}
