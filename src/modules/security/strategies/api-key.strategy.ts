import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(req: any) {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const validatedApiKey = await this.authService.validateApiKey(apiKey);
    if (!validatedApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return {
      id: validatedApiKey.user.id,
      email: validatedApiKey.user.email,
      role: validatedApiKey.user.role,
      apiKeyId: validatedApiKey.id,
      permission: validatedApiKey.permission,
      firstName: validatedApiKey.user.firstName,
      lastName: validatedApiKey.user.lastName,
    };
  }
}