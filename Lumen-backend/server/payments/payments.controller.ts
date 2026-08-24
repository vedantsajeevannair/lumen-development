import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PayBillDto } from './dto/pay-bill.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import * as PrismaClient from '@prisma/client';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('bills')
  @ApiOperation({ summary: 'Get pending municipal bills for the user' })
  async getPendingBills(@CurrentUser() user: PrismaClient.User) {
    return this.paymentsService.getPendingBills(user.id);
  }

  @Post('create-payment-intent')
  @ApiOperation({ summary: 'Create Stripe Payment Intent' })
  async createPaymentIntent(
    @Body() dto: { amount: number; type: string },
    @CurrentUser() user: PrismaClient.User,
  ) {
    return this.paymentsService.createPaymentIntent(
      user.id,
      dto.amount,
      dto.type,
    );
  }

  @Post('pay')
  @ApiOperation({ summary: 'Process a municipal payment' })
  async payBill(
    @Body() dto: PayBillDto,
    @CurrentUser() user: PrismaClient.User,
  ) {
    return this.paymentsService.payBill(dto, user);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get payment history' })
  async getPaymentHistory(@CurrentUser() user: PrismaClient.User) {
    return this.paymentsService.getPaymentHistory(user.id);
  }
}
