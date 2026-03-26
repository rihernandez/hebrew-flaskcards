import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  OnModuleDestroy,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class AuthTokenGuard implements CanActivate, OnModuleDestroy {
  private readonly redis: Redis;
  private readonly failLimit = Number(process.env.AUTH_FAIL_LIMIT ?? 10);
  private readonly failWindowSeconds = Number(process.env.AUTH_FAIL_WINDOW_SECONDS ?? 60);
  private readonly authClient: ClientProxy;

  async onModuleDestroy() {
    await this.redis.quit().catch(() => undefined);
  }

  constructor(@Inject('AUTH_CLIENT') authClient: ClientProxy) {
    this.authClient = authClient;
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      lazyConnect: false,
      maxRetriesPerRequest: 1,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.authorization as string | undefined;
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const ip = extractClientIp(req);
    const userAgent = req.headers?.['user-agent'] as string | undefined;
    const path = req.originalUrl ?? req.url;
    const tokenHash = sha256(token);
    const rateKey = `rl:failed_token:${tokenHash}:${ip}`;

    const currentAttempts = await this.getAttempts(rateKey);
    if (currentAttempts >= this.failLimit) {
      await this.auditFailedAttempt({
        sourceService: 'state-gateway',
        ip,
        userAgent,
        path,
        reason: 'RATE_LIMIT_BLOCKED',
        tokenHash,
      });
      throw new HttpException('Too many failed token attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    let validation: any;
    try {
      validation = await firstValueFrom(
        this.authClient
          .send({ cmd: 'auth.validate_token' }, { token })
          .pipe(timeout(5000)),
      );
    } catch {
      const attempts = await this.incrementAttempts(rateKey);
      await this.auditFailedAttempt({
        sourceService: 'state-gateway',
        ip,
        userAgent,
        path,
        reason: 'TOKEN_INVALID_OR_EXPIRED',
        tokenHash,
      });
      if (attempts >= this.failLimit) {
        throw new HttpException('Too many failed token attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!validation?.valid || !validation?.user?._id) {
      const attempts = await this.incrementAttempts(rateKey);
      await this.auditFailedAttempt({
        sourceService: 'state-gateway',
        ip,
        userAgent,
        path,
        reason: 'TOKEN_VALIDATION_PAYLOAD_INVALID',
        tokenHash,
      });
      if (attempts >= this.failLimit) {
        throw new HttpException('Too many failed token attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new UnauthorizedException('Invalid token payload');
    }

    await this.redis.del(rateKey).catch(() => undefined);

    req.user = {
      userId: String(validation.user._id),
      email: validation.user.email,
      profile: validation.user,
    };

    return true;
  }

  private async getAttempts(rateKey: string): Promise<number> {
    const value = await this.redis.get(rateKey);
    return Number(value ?? 0);
  }

  private async incrementAttempts(rateKey: string): Promise<number> {
    const attempts = await this.redis.incr(rateKey);
    if (attempts === 1) {
      await this.redis.expire(rateKey, this.failWindowSeconds);
    }
    return attempts;
  }

  private async auditFailedAttempt(payload: {
    sourceService: string;
    ip?: string;
    userAgent?: string;
    path?: string;
    reason: string;
    tokenHash: string;
  }) {
    await firstValueFrom(
      this.authClient
        .emit({ cmd: 'auth.audit_failed_token' }, payload)
        .pipe(timeout(1000)),
    ).catch(() => undefined);
  }
}

function extractBearerToken(header?: string): string | null {
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

function extractClientIp(req: any): string {
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
