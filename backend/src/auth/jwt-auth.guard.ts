import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, _context: ExecutionContext) {
    if (err || !user) {
      const isExpired = info?.name === 'TokenExpiredError';
      throw new UnauthorizedException({
        code: isExpired ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID',
        message: isExpired
          ? 'Your session has expired. Please log in again.'
          : 'Authentication required.',
      });
    }
    return user;
  }
}
