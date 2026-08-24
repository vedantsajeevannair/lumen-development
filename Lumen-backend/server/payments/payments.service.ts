import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PayBillDto } from './dto/pay-bill.dto';
import type { User, PaymentType } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // Mock fetching pending bills
  async getPendingBills(userId: string) {
    // Generate some mock bills for the user
    return [
      {
        id: 'bill_1',
        type: 'WATER_BILL',
        amount: 850.5,
        dueDate: new Date(Date.now() + 86400000 * 5),
        description: 'Monthly Water Usage - Sector 4',
      },
      {
        id: 'bill_2',
        type: 'PROPERTY_TAX',
        amount: 15400.0,
        dueDate: new Date(Date.now() + 86400000 * 15),
        description: 'Annual Property Tax (2025-2026)',
      },
    ];
  }

  async createPaymentIntent(userId: string, amount: number, type: string) {
    const stripe = new Stripe(
      process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key',
      {
        apiVersion: '2022-11-15' as any,
      },
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amounts in cents
      currency: 'inr',
      metadata: { userId, type },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  async payBill(dto: PayBillDto, user: User) {
    // Record payment in database
    return this.prisma.paymentTransaction.create({
      data: {
        userId: user.id,
        amount: dto.amount,
        type: dto.type,
        transactionId: dto.transactionId,
        status: 'COMPLETED',
        receiptUrl: `https://lumen-mock-s3.com/receipts/${dto.transactionId}.pdf`,
      },
    });
  }

  async getPaymentHistory(userId: string) {
    return this.prisma.paymentTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
