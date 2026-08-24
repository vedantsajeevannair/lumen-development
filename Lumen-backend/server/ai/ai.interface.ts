import { BoundingBox, PredictionMetadata } from './ai.types';

export interface FastApiPredictionResponse {
  damageClass: string;
  confidenceScore: number;
  severity?: number;
  blur_score?: number;
  is_blurry?: boolean;
  boundingBoxes: BoundingBox[];
  metadata: PredictionMetadata;
}
