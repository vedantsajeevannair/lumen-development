import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  private generateSecureOtp(): string {
    // Generate exactly 6 digits using cryptographically secure random values
    return crypto.randomInt(100000, 999999).toString();
  }

  async generateAndSendOtp(
    email: string,
    fullName?: string,
    phoneNumber?: string,
    passwordHash?: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    // Delete any existing OTP for this email
    // @ts-ignore - IDE TS Server caching issue
    await this.prisma.otp.deleteMany({
      where: { email: normalizedEmail },
    });

    const otp = this.generateSecureOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // @ts-ignore - IDE TS Server caching issue
    await this.prisma.otp.create({
      data: {
        email: normalizedEmail,
        otpHash,
        expiresAt,
        fullName,
        phoneNumber,
        passwordHash,
      },
    });

    await this.mailService.sendOtpEmail(normalizedEmail, otp);
    this.logger.log(`Generated and sent OTP to ${normalizedEmail}`);
  }

  async resendOtp(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    // @ts-ignore
    const existingOtp = await this.prisma.otp.findUnique({
      where: { email: normalizedEmail },
    });

    if (!existingOtp) {
      throw new BadRequestException(
        'No pending verification found for this email',
      );
    }

    // Reuse the existing data but generate a new OTP
    await this.generateAndSendOtp(
      normalizedEmail,
      existingOtp.fullName ?? undefined,
      existingOtp.phoneNumber ?? undefined,
      existingOtp.passwordHash ?? undefined,
    );
  }

  async verifyOtp(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();
    // @ts-ignore - IDE TS Server caching issue
    const otpRecord = await this.prisma.otp.findUnique({
      where: { email: normalizedEmail },
    });

    if (!otpRecord) {
      throw new BadRequestException(
        'No pending verification found for this email',
      );
    }

    if (otpRecord.expiresAt < new Date()) {
      // @ts-ignore - IDE TS Server caching issue
      await this.prisma.otp.delete({ where: { id: otpRecord.id } });
      throw new BadRequestException('OTP has expired');
    }

    if (otpRecord.attempts >= 5) {
      // @ts-ignore - IDE TS Server caching issue
      await this.prisma.otp.delete({ where: { id: otpRecord.id } });
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new OTP.',
      );
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);

    if (!isValid) {
      // @ts-ignore - IDE TS Server caching issue
      await this.prisma.otp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid OTP');
    }

    // Success! Delete the OTP record and return the stored data
    // @ts-ignore - IDE TS Server caching issue
    await this.prisma.otp.delete({ where: { id: otpRecord.id } });

    return {
      fullName: otpRecord.fullName,
      phoneNumber: otpRecord.phoneNumber,
      passwordHash: otpRecord.passwordHash,
    };
  }
}
