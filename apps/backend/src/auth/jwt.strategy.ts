import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service.js';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  // Must match User.tokenVersion; bumped to revoke outstanding tokens.
  tv: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly usersService: UsersService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is suspended');
    }
    if (payload.tv !== user.tokenVersion) {
      throw new UnauthorizedException('Session has ended, please sign in again');
    }
    return { id: user.id, email: user.email, username: user.username, role: user.role };
  }
}
