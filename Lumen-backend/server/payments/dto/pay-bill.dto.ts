import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsEnum, IsString } from 'class-validator';
import { PaymentType } from '@prisma/client';

export class PayBillDto {
  @ApiProperty({ description: 'The amount being paid' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ enum: PaymentType, description: 'The type of municipal bill' })
  @IsEnum(PaymentType)
  @IsNotEmpty()
  type: PaymentType;

  @ApiProperty({
    description: 'The transaction reference from payment gateway',
  })
  @IsString()
  @IsNotEmpty()
  transactionId: string;
}
