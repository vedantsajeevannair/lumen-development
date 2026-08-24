export interface ImageReference {
  readonly uri: string;
  readonly width?: number;
  readonly height?: number;
}

export function createImageReference(uri: string, width?: number, height?: number): ImageReference {
  return { uri, width, height };
}
