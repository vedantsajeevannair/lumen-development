import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../audit/audit.service';
import type { User } from '@prisma/client';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, params, user } = req;

    return next.handle().pipe(
      tap({
        next: (res) => {
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            const currentUser = user as User;
            const sanitizedBody =
              method !== 'DELETE' ? this.sanitizeBody(body) : undefined;
            this.auditService
              .logAction(
                method,
                url,
                params?.id,
                currentUser?.id,
                {
                  body: sanitizedBody,
                },
                req,
                'SUCCESS',
              )
              .catch((err) =>
                this.logger.error('Failed to save audit log', err),
              );
          }
        },
        error: (err) => {
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            const currentUser = user as User;
            const sanitizedBody =
              method !== 'DELETE' ? this.sanitizeBody(body) : undefined;
            this.auditService
              .logAction(
                method,
                url,
                params?.id,
                currentUser?.id,
                {
                  body: sanitizedBody,
                  error: err.message,
                },
                req,
                'FAILURE',
              )
              .catch((e) =>
                this.logger.error('Failed to save audit log (FAILURE)', e),
              );
          }
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    if (Array.isArray(body)) {
      return body.map((item) => this.sanitizeBody(item));
    }

    const sensitiveKeys = [
      'password',
      'otp',
      'token',
      'secret',
      'key',
      'biometric',
      'credential',
      'auth',
    ];
    const sanitized = {};

    for (const key of Object.keys(body)) {
      const value = body[key];
      const isSensitive = sensitiveKeys.some((sKey) =>
        key.toLowerCase().includes(sKey),
      );

      if (isSensitive) {
        sanitized[key] = '********';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeBody(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
