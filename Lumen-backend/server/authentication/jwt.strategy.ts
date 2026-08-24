import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-jwt-secret',
    });
  }

  async validate(payload: any) {
    // Supabase JWT payload includes the user email
    const email = payload.email;
    if (!email) throw new UnauthorizedException('Invalid token payload');

    let user = await this.usersService.findByEmail(email);

    // Automatically sync/create user if not exists in PostgreSQL
    if (!user) {
      user = await this.usersService.create({
        email: email,
      });
    }

    if (!user.isActive || user.isDeleted) {
      throw new UnauthorizedException('User is inactive or deleted');
    }

    return user;
  }
}
