import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { Department } from '@prisma/client';

export class AssignDispatchDto {
  @ApiProperty({ description: 'The complaint ID being assigned' })
  @IsString()
  @IsNotEmpty()
  complaintId: string;

  @ApiProperty({ enum: Department, description: 'The department to assign to' })
  @IsEnum(Department)
  @IsNotEmpty()
  department: Department;
}
