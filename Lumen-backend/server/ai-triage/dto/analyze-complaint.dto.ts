import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AnalyzeComplaintDto {
  @ApiProperty({ description: 'The raw description submitted by the citizen' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Optional image URL for computer vision analysis',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
