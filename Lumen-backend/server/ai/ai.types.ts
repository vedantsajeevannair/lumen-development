export interface BoundingBox {
  label: string;
  confidence: number;
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface PredictionMetadata {
  processingTimeMs: number;
  device: string;
  type: 'image' | 'video' | 'yolo';
  sampleRateFps?: number;
}
