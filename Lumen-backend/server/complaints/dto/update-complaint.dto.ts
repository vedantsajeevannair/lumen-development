import { PartialType } from '@nestjs/swagger';
import { CreateComplaintDto } from './create-complaint.dto';
import { ComplaintStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateComplaintDto extends PartialType(CreateComplaintDto) {
  @IsEnum(ComplaintStatus)
  @IsOptional()
  status?: ComplaintStatus;
}
