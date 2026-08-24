import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as path from 'path';

@Injectable()
export class MailService {
  private transporter!: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.initEthereal();
  }

  private async initEthereal() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      this.logger.warn(
        'No SMTP credentials found in .env. Falling back to Ethereal fake SMTP for testing.',
      );
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.logger.log(
        `Ethereal SMTP configured. Host: smtp.ethereal.email, User: ${testAccount.user}`,
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    this.logger.log(`SMTP Email configured. Host: ${host}, User: ${user}`);
  }

  async sendOtpEmail(to: string, otp: string) {
    const htmlTemplate = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <tr>
          <td align="center">
            <div style="max-width: 500px; background-color: #ffffff; padding: 40px; border-radius: 24px; box-shadow: 0 10px 40px rgba(15, 23, 42, 0.04); border: 1px solid #f1f5f9; text-align: center;">
              <!-- Header Brand Logo -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <img src="cid:lumen_logo" alt="LUMEN Logo" width="80" height="80" style="display: block; border-radius: 50%; border: 2px solid #e2e8f0;" />
                  </td>
                </tr>
              </table>

              <!-- Welcome Text -->
              <h1 style="color: #0f172a; margin: 0 0 12px 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">Welcome to LUMEN</h1>
              <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
                To securely verify your smart city account, please use the following one-time password (OTP).
              </p>

              <!-- OTP Code Display -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 28px; border-radius: 20px;">
                    <span style="font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 44px; font-weight: 800; letter-spacing: 12px; color: #38bdf8; display: inline-block; padding-left: 12px; text-shadow: 0 2px 10px rgba(56, 189, 248, 0.2);">${otp}</span>
                  </td>
                </tr>
              </table>

              <!-- Expiration Warning -->
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 32px 0;">
                This secure code will expire in <strong style="color: #64748b;">5 minutes</strong>.<br />
                If you did not initiate this request, please ignore this email.
              </p>

              <!-- Footer -->
              <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
                <p style="color: #94a3b8; font-size: 11px; line-height: 1.6; margin: 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                  LUMEN Civic Infrastructure & Security
                </p>
                <p style="color: #cbd5e1; font-size: 10px; margin: 4px 0 0 0;">
                  Official Government Communications • Automated Transmission
                </p>
              </div>
            </div>
          </td>
        </tr>
      </table>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: '"LUMEN Security" <noreply@lumen.gov>',
        to,
        subject: 'LUMEN - Verify your account (OTP)',
        html: htmlTemplate,
        attachments: [
          {
            filename: 'lumen_logo.png',
            path: path.join(__dirname, 'lumen_logo.png'),
            cid: 'lumen_logo',
          },
        ],
      });

      this.logger.log(`OTP Email sent to ${to}.`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error);
      throw error;
    }
  }
}
