import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateZoneDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  zones: string[];
}
