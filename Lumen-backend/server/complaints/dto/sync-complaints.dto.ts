import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateComplaintDto } from './create-complaint.dto';

export class SyncComplaintsDto {
  @ApiProperty({
    type: [CreateComplaintDto],
    description: 'Array of complaints created offline',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateComplaintDto)
  complaints: CreateComplaintDto[];
}
