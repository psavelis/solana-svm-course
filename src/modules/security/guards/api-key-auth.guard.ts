import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ApiKeyAuthGuard extends AuthGuard('api-key') {
  canActivate(context: ExecutionContext) {
    // Allow access to auth endpoints without API key
    const request = context.switchToHttp().getRequest();
    const path = request.route?.path;

    if (path && (path.includes('/auth/login') || path.includes('/auth/register'))) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or missing API key');
    }
    return user;
  }
}
