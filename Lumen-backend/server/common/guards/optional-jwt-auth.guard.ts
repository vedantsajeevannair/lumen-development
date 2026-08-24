import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (authHeader) {
      // If a token was provided but it's invalid/expired, we MUST throw an error
      // so the client can refresh the token. We only allow anonymous if no token was sent.
      if (err || !user) {
        throw err || new UnauthorizedException('Token is invalid or expired');
      }
      return user;
    }

    // No token provided, proceed anonymously
    return null;
  }
}
