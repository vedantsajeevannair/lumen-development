import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsObject,
  IsEnum,
} from 'class-validator';
import { AI_PREDICTION_STATUS } from '../ai.constants';
import type { BoundingBox, PredictionMetadata } from '../ai.types';

export class CreatePredictionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  complaintId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  damageClass: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  confidenceScore: number;

  @ApiProperty()
  @IsArray()
  boundingBoxes: BoundingBox[];

  @ApiProperty()
  @IsObject()
  metadata: PredictionMetadata;

  @ApiProperty()
  @IsEnum(Object.values(AI_PREDICTION_STATUS))
  status: string;
}
