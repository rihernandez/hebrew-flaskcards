import { Controller, UnauthorizedException } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthRpcController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'auth.validate_token' })
  async validateToken(@Payload() body: { token?: string }) {
    try {
      return await this.authService.validateAccessToken(body?.token ?? '');
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @EventPattern({ cmd: 'auth.audit_failed_token' })
  async auditFailedToken(@Payload() body: {
    sourceService?: string;
    ip?: string;
    userAgent?: string;
    path?: string;
    reason?: string;
    tokenHash?: string;
  }) {
    await this.authService.logFailedTokenValidation(body ?? {});
  }
}
